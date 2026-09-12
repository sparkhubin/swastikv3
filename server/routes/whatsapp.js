import express from "express";
import { db } from "../../database/db.js";
import { audit, requirePermission, requireStaffAuth } from "../auth.js";
import { sendWhatsApp } from "../services/whatsapp.js";

const router=express.Router();
router.use("/whatsapp",requireStaffAuth,requirePermission("whatsapp"));

router.get("/whatsapp/custom-templates",async(_req,res)=>{
  try{res.json(await db.query("SELECT id,name,meta_template_name AS metaTemplateName,language_code AS languageCode,category,purpose,body_preview AS bodyPreview,variables_json AS variablesJson,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM whatsapp_template ORDER BY name"));}
  catch(error){console.error("WhatsApp template read failed:",error.message);res.status(500).json({error:"Unable to load templates."});}
});

router.post("/whatsapp/custom-templates",async(req,res)=>{
  const name=String(req.body?.name||"").trim(),meta=String(req.body?.metaTemplateName||req.body?.meta_template_name||"").trim(),purpose=String(req.body?.purpose||"").trim().toUpperCase();
  if(!name||!meta||!purpose)return res.status(400).json({error:"Name, provider template name, and purpose are required."});
  try{const variables=Array.isArray(req.body.variables)?req.body.variables:[];const result=await db.execute(`INSERT INTO whatsapp_template (name,meta_template_name,language_code,category,purpose,body_preview,variables_json,is_active) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(name) DO UPDATE SET meta_template_name=excluded.meta_template_name,language_code=excluded.language_code,category=excluded.category,purpose=excluded.purpose,body_preview=excluded.body_preview,variables_json=excluded.variables_json,is_active=excluded.is_active,updated_at=CURRENT_TIMESTAMP`,[name,meta,String(req.body.languageCode||"en"),String(req.body.category||""),purpose,String(req.body.bodyPreview||req.body.content||""),JSON.stringify(variables),req.body.isActive===false?0:1]);await audit("USER",req.staff.id,"UPSERT_WHATSAPP_TEMPLATE","whatsapp_template",result.lastID||name,{purpose},req);res.status(201).json({success:true});}
  catch(error){console.error("WhatsApp template save failed:",error.message);res.status(500).json({error:"Unable to save template."});}
});

router.delete("/whatsapp/custom-templates/:id",async(req,res)=>{try{await db.execute("UPDATE whatsapp_template SET is_active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?",[req.params.id]);await audit("USER",req.staff.id,"DEACTIVATE_WHATSAPP_TEMPLATE","whatsapp_template",req.params.id,{},req);res.json({success:true});}catch(error){res.status(500).json({error:"Unable to deactivate template."});}});

router.post("/whatsapp/send",async(req,res)=>{
  const to=req.body?.to||req.body?.phone;const text=String(req.body?.message||"").trim();let template=null;
  if(req.body?.templateId)template=await db.get("SELECT * FROM whatsapp_template WHERE id=? AND is_active=1",[req.body.templateId]);
  else if(req.body?.templateName)template=await db.get("SELECT * FROM whatsapp_template WHERE (name=? OR meta_template_name=?) AND is_active=1",[req.body.templateName,req.body.templateName]);
  if(!to||(!text&&!template))return res.status(400).json({error:"Recipient and message or active template are required."});
  const result=await sendWhatsApp({to,text,template,variables:Array.isArray(req.body?.variables)?req.body.variables:[],customerId:req.body?.customerId,eventType:"MANUAL",referenceType:req.body?.referenceType||"",referenceId:req.body?.referenceId||""});
  await audit("USER",req.staff.id,"SEND_WHATSAPP","whatsapp_log",result.logId,{success:result.success},req);
  res.status(result.success?200:502).json(result);
});

router.post("/whatsapp/bulk-send",async(req,res)=>{
  const recipients=req.body?.recipients||req.body?.customers;
  if(!Array.isArray(recipients)||!recipients.length||recipients.length>100)return res.status(400).json({error:"Provide 1-100 recipients."});
  let template=null;
  if(req.body?.templateName)template=await db.get("SELECT * FROM whatsapp_template WHERE (name=? OR meta_template_name=?) AND is_active=1",[req.body.templateName,req.body.templateName]);
  const text=String(req.body?.message||req.body?.fallbackMessage||"").trim();
  if(!template&&!text)return res.status(400).json({error:"An active database template or message is required."});
  const results=[];
  for(const recipient of recipients){const to=typeof recipient==="string"?recipient:recipient.phone;results.push(await sendWhatsApp({to,text,template,variables:Array.isArray(recipient.params)?recipient.params:[],eventType:"MANUAL_BULK",customerId:recipient.id}));}
  await audit("USER",req.staff.id,"BULK_SEND_WHATSAPP","whatsapp_log","",{count:results.length,success:results.filter(item=>item.success).length},req);
  res.status(results.every(item=>item.success)?200:207).json({success:results.every(item=>item.success),results});
});

router.get("/whatsapp/settings",requirePermission("settings"),async(_req,res)=>{const row=await db.get("SELECT * FROM whatsapp_settings WHERE id=1");res.json(row?{provider:row.provider,enabled:Boolean(row.enabled),apiVersion:row.api_version,metaPhoneNumberId:row.meta_phone_number_id,metaBusinessAccountId:row.meta_business_account_id,twilioWhatsAppFrom:row.twilio_whatsapp_from,metaConfigured:Boolean(row.meta_phone_number_id&&row.meta_access_token),twilioConfigured:Boolean(row.twilio_account_sid&&row.twilio_auth_token)}:{provider:"META",enabled:false,configured:false});});

router.post("/whatsapp/settings",requirePermission("settings"),async(req,res)=>{
  try{const current=await db.get("SELECT * FROM whatsapp_settings WHERE id=1");const provider=String(req.body?.provider||current?.provider||"META").toUpperCase();if(!["META","TWILIO"].includes(provider))return res.status(400).json({error:"Unsupported provider."});const values={enabled:Number(Boolean(req.body?.enabled)),metaPhone:String(req.body?.metaPhoneNumberId??current?.meta_phone_number_id??""),metaToken:String(req.body?.metaAccessToken||current?.meta_access_token||""),metaBusiness:String(req.body?.metaBusinessAccountId??current?.meta_business_account_id??""),apiVersion:String(req.body?.apiVersion??current?.api_version??""),twilioSid:String(req.body?.twilioAccountSid??current?.twilio_account_sid??""),twilioToken:String(req.body?.twilioAuthToken||current?.twilio_auth_token||""),twilioFrom:String(req.body?.twilioWhatsAppFrom??current?.twilio_whatsapp_from??"")};if(values.enabled&&provider==="META"&&(!values.metaPhone||!values.metaToken||!values.apiVersion))return res.status(400).json({error:"Meta phone ID, access token, and API version are required."});if(values.enabled&&provider==="TWILIO"&&(!values.twilioSid||!values.twilioToken||!values.twilioFrom))return res.status(400).json({error:"Twilio account SID, token, and sender are required."});await db.execute(`INSERT INTO whatsapp_settings (id,provider,enabled,meta_phone_number_id,meta_access_token,meta_business_account_id,api_version,twilio_account_sid,twilio_auth_token,twilio_whatsapp_from) VALUES (1,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider=excluded.provider,enabled=excluded.enabled,meta_phone_number_id=excluded.meta_phone_number_id,meta_access_token=excluded.meta_access_token,meta_business_account_id=excluded.meta_business_account_id,api_version=excluded.api_version,twilio_account_sid=excluded.twilio_account_sid,twilio_auth_token=excluded.twilio_auth_token,twilio_whatsapp_from=excluded.twilio_whatsapp_from,updated_at=CURRENT_TIMESTAMP`,[provider,values.enabled,values.metaPhone,values.metaToken,values.metaBusiness,values.apiVersion,values.twilioSid,values.twilioToken,values.twilioFrom]);await audit("USER",req.staff.id,"UPDATE_WHATSAPP_SETTINGS","whatsapp_settings",1,{provider,enabled:Boolean(values.enabled)},req);res.json({success:true,provider,enabled:Boolean(values.enabled)});}catch(error){console.error("WhatsApp settings update failed:",error.message);res.status(500).json({error:"Unable to update WhatsApp settings."});}
});

router.post("/whatsapp/test",requirePermission("settings"),async(req,res)=>{const result=await sendWhatsApp({to:req.body?.to,text:String(req.body?.message||"WhatsApp configuration test"),eventType:"CONFIG_TEST"});res.status(result.success?200:502).json(result);});
router.get("/whatsapp/outbox",async(req,res)=>{const limit=Math.min(200,Math.max(1,Number(req.query.limit)||50));const rows=await db.query("SELECT id,recipient_phone AS recipientPhone,customer_id AS customerId,template_id AS templateId,event_type AS eventType,reference_type AS referenceType,reference_id AS referenceId,provider,provider_message_id AS providerMessageId,status,error_message AS errorMessage,sent_at AS sentAt,delivered_at AS deliveredAt,read_at AS readAt,created_at AS createdAt FROM whatsapp_log ORDER BY id DESC LIMIT ?",[limit]);res.json({success:true,count:rows.length,outbox:rows});});

export default router;
