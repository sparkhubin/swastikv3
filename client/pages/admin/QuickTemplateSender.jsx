import React, { useEffect, useState } from 'react';

const emptyTemplate = { name: '', metaTemplateName: '', languageCode: 'en', category: 'UTILITY', purpose: '', bodyPreview: '', variables: '' };

export default function QuickTemplateSender({ existingCustomers = [] }) {
  const [settings, setSettings] = useState({ provider: 'META', enabled: false, apiVersion: '', metaPhoneNumberId: '', metaBusinessAccountId: '', metaAccessToken: '', twilioAccountSid: '', twilioAuthToken: '', twilioWhatsAppFrom: '' });
  const [templates, setTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [sendForm, setSendForm] = useState({ customerId: '', templateId: '', message: '', variables: '' });
  const [message, setMessage] = useState('');

  const load = async () => {
    const [settingsResponse, templatesResponse] = await Promise.all([fetch('/api/whatsapp/settings'), fetch('/api/whatsapp/custom-templates')]);
    const settingsResult = await settingsResponse.json().catch(() => ({}));
    const templatesResult = await templatesResponse.json().catch(() => []);
    if (!settingsResponse.ok || !templatesResponse.ok) throw new Error(settingsResult.error || 'Unable to load WhatsApp configuration.');
    setSettings(current => ({ ...current, ...settingsResult, metaAccessToken: '', twilioAuthToken: '' }));
    setTemplates(Array.isArray(templatesResult) ? templatesResult : []);
  };

  useEffect(() => { load().catch(error => setMessage(error.message)); }, []);

  const saveSettings = async event => {
    event.preventDefault();
    const response = await fetch('/api/whatsapp/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to save WhatsApp settings.');
    setSettings(current => ({ ...current, ...result, metaAccessToken: '', twilioAuthToken: '' }));
    setMessage('WhatsApp provider settings saved. Stored credentials remain hidden.');
  };

  const saveTemplate = async event => {
    event.preventDefault();
    const variables = templateForm.variables.split(',').map(value => value.trim()).filter(Boolean);
    const response = await fetch('/api/whatsapp/custom-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...templateForm, variables }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to save template.');
    setTemplateForm(emptyTemplate);
    await load();
    setMessage('WhatsApp template saved.');
  };

  const deactivate = async id => {
    const response = await fetch(`/api/whatsapp/custom-templates/${id}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to deactivate template.');
    await load();
    setMessage('Template deactivated.');
  };

  const send = async event => {
    event.preventDefault();
    const customer = existingCustomers.find(item => String(item.id) === String(sendForm.customerId));
    const variables = sendForm.variables.split(',').map(value => value.trim());
    if (!customer) return setMessage('Select a customer.');
    const response = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: customer.phone, customerId: customer.id, templateId: sendForm.templateId || undefined, message: sendForm.message, variables }) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Message accepted by ${result.provider}; log ${result.logId}.` : result.error || 'WhatsApp send failed.');
  };

  const input = 'w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white';
  return (
    <div className="space-y-6 text-white">
      {message && <p className="rounded-xl border border-cyan-500/20 bg-cyan-950/40 p-3 text-xs text-cyan-200">{message}</p>}
      <form onSubmit={saveSettings} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900 p-5 md:grid-cols-2">
        <h3 className="font-black md:col-span-2">WhatsApp provider settings</h3>
        <select className={input} value={settings.provider} onChange={event => setSettings({ ...settings, provider: event.target.value })}><option value="META">Meta Cloud API</option><option value="TWILIO">Twilio</option></select>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(settings.enabled)} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} /> Enabled</label>
        {settings.provider === 'META' ? <>
          <input className={input} placeholder="API version" value={settings.apiVersion || ''} onChange={event => setSettings({ ...settings, apiVersion: event.target.value })} />
          <input className={input} placeholder="Phone number ID" value={settings.metaPhoneNumberId || ''} onChange={event => setSettings({ ...settings, metaPhoneNumberId: event.target.value })} />
          <input className={input} placeholder="Business account ID" value={settings.metaBusinessAccountId || ''} onChange={event => setSettings({ ...settings, metaBusinessAccountId: event.target.value })} />
          <input type="password" className={input} placeholder={settings.metaConfigured ? 'Access token (blank retains stored value)' : 'Access token'} value={settings.metaAccessToken || ''} onChange={event => setSettings({ ...settings, metaAccessToken: event.target.value })} />
        </> : <>
          <input className={input} placeholder="Account SID" value={settings.twilioAccountSid || ''} onChange={event => setSettings({ ...settings, twilioAccountSid: event.target.value })} />
          <input type="password" className={input} placeholder={settings.twilioConfigured ? 'Auth token (blank retains stored value)' : 'Auth token'} value={settings.twilioAuthToken || ''} onChange={event => setSettings({ ...settings, twilioAuthToken: event.target.value })} />
          <input className={input} placeholder="WhatsApp sender" value={settings.twilioWhatsAppFrom || ''} onChange={event => setSettings({ ...settings, twilioWhatsAppFrom: event.target.value })} />
        </>}
        <button className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 md:col-span-2">Save provider settings</button>
      </form>

      <form onSubmit={saveTemplate} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900 p-5 md:grid-cols-2">
        <h3 className="font-black md:col-span-2">Database templates</h3>
        {['name','metaTemplateName','purpose','category','languageCode','bodyPreview','variables'].map(key => <input key={key} required={!['bodyPreview','variables'].includes(key)} className={input} placeholder={key === 'variables' ? 'Variable names, comma separated' : key} value={templateForm[key]} onChange={event => setTemplateForm({ ...templateForm, [key]: event.target.value })} />)}
        <button className="rounded-xl bg-emerald-500 px-4 py-2 font-black text-slate-950">Save template</button>
        <div className="md:col-span-2">{templates.map(template => <div key={template.id} className="mb-2 flex justify-between rounded-xl border border-white/10 p-2 text-xs"><span>{template.name} · {template.purpose}</span><button type="button" onClick={() => deactivate(template.id)} className="text-rose-300">Deactivate</button></div>)}</div>
      </form>

      <form onSubmit={send} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900 p-5 md:grid-cols-2">
        <h3 className="font-black md:col-span-2">Permission-protected manual send</h3>
        <select required className={input} value={sendForm.customerId} onChange={event => setSendForm({ ...sendForm, customerId: event.target.value })}><option value="">Select customer</option>{existingCustomers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select>
        <select className={input} value={sendForm.templateId} onChange={event => setSendForm({ ...sendForm, templateId: event.target.value })}><option value="">Plain text</option>{templates.filter(template => template.isActive).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select>
        <textarea className={`${input} md:col-span-2`} placeholder="Message text (required for plain text/Twilio)" value={sendForm.message} onChange={event => setSendForm({ ...sendForm, message: event.target.value })} />
        <input className={input} placeholder="Template values, comma separated" value={sendForm.variables} onChange={event => setSendForm({ ...sendForm, variables: event.target.value })} />
        <button className="rounded-xl bg-emerald-500 px-4 py-2 font-black text-slate-950">Send and log attempt</button>
      </form>
    </div>
  );
}
