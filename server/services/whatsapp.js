import { db } from "../../database/db.js";

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function safeJson(value) {
  try { return JSON.stringify(value).slice(0, 20000); } catch { return "{}"; }
}

async function settings() {
  return (await db.query("SELECT * FROM whatsapp_settings WHERE id = 1 LIMIT 1"))[0] || null;
}

async function recordAttempt(input, provider, status = "PENDING") {
  const result = await db.execute(`INSERT INTO whatsapp_log
    (recipient_phone, customer_id, template_id, event_type, reference_type, reference_id, provider, status, request_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.to, input.customerId || null, input.template?.id || null, input.eventType || "MANUAL", input.referenceType || "", input.referenceId || "", provider, status, safeJson({ template: input.template?.name, variables: input.variables, hasText: Boolean(input.text) })]);
  return result.lastID;
}

async function updateAttempt(id, status, response = {}, error = "") {
  await db.execute(`UPDATE whatsapp_log SET status=?, provider_message_id=?, error_message=?, response_payload=?, sent_at=CASE WHEN ?='SENT' THEN CURRENT_TIMESTAMP ELSE sent_at END WHERE id=?`,
    [status, response.messageId || "", String(error || "").slice(0, 2000), safeJson(response), status, id]);
}

async function sendMeta(config, input) {
  if (!config.meta_phone_number_id || !config.meta_access_token || !config.api_version) throw new Error("Meta WhatsApp credentials or API version are incomplete");
  const payload = input.template ? {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.template.meta_template_name,
      language: { code: input.template.language_code },
      components: input.variables?.length ? [{ type: "body", parameters: input.variables.map(value => ({ type: "text", text: String(value) })) }] : []
    }
  } : { messaging_product: "whatsapp", to: input.to, type: "text", text: { body: input.text } };
  const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(config.api_version)}/${encodeURIComponent(config.meta_phone_number_id)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.meta_access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Meta WhatsApp returned HTTP ${response.status}`);
  return { messageId: body?.messages?.[0]?.id || "", statusCode: response.status };
}

async function sendTwilio(config, input) {
  if (!config.twilio_account_sid || !config.twilio_auth_token || !config.twilio_whatsapp_from) throw new Error("Twilio WhatsApp credentials are incomplete");
  if (!input.text) throw new Error("Twilio manual text is required; configure rendered event text for this provider");
  const form = new URLSearchParams({ To: `whatsapp:+${input.to}`, From: config.twilio_whatsapp_from, Body: input.text });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.twilio_account_sid)}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${config.twilio_account_sid}:${config.twilio_auth_token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Twilio returned HTTP ${response.status}`);
  return { messageId: body.sid || "", statusCode: response.status };
}

export async function sendWhatsApp(input) {
  const to = normalizePhone(input.to);
  if (to.length < 10 || to.length > 15) return { success: false, error: "A valid WhatsApp recipient is required" };
  const config = await settings();
  const provider = String(config?.provider || "").toUpperCase();
  const normalized = { ...input, to };
  const logId = await recordAttempt(normalized, provider || "UNCONFIGURED");
  if (!config || !Number(config.enabled)) {
    await updateAttempt(logId, "FAILED", {}, "WhatsApp is not enabled");
    return { success: false, error: "WhatsApp is not enabled", logId };
  }
  try {
    const result = provider === "META" ? await sendMeta(config, normalized) : provider === "TWILIO" ? await sendTwilio(config, normalized) : (() => { throw new Error("Unsupported WhatsApp provider"); })();
    await updateAttempt(logId, "SENT", result);
    return { success: true, provider, logId, messageId: result.messageId };
  } catch (error) {
    await updateAttempt(logId, "FAILED", {}, error.message);
    console.error("WhatsApp send failed:", error.message);
    return { success: false, provider, logId, error: error.message };
  }
}

export async function sendWhatsAppEvent({ purpose, to, customerId, referenceType, referenceId, variables = [], text = "" }) {
  const template = (await db.query("SELECT * FROM whatsapp_template WHERE purpose = ? AND is_active = 1 ORDER BY id DESC LIMIT 1", [purpose]))[0];
  if (!template) return { success: false, skipped: true, error: `No active WhatsApp template for ${purpose}` };
  return sendWhatsApp({ to, customerId, template, variables, text, eventType: purpose, referenceType, referenceId });
}
