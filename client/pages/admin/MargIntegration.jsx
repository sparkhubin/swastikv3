import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, Settings } from 'lucide-react';

export default function MargIntegration() {
  const [settings, setSettings] = useState({ apiToken: '', pointsRatio: '', autoNotifyWhatsApp: false, configured: false });
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [settingsResponse, logsResponse] = await Promise.all([fetch('/api/marg/settings'), fetch('/api/marg/logs')]);
    const settingsResult = await settingsResponse.json().catch(() => ({}));
    const logsResult = await logsResponse.json().catch(() => []);
    if (!settingsResponse.ok || !logsResponse.ok) throw new Error(settingsResult.error || 'Unable to load MARG configuration.');
    setSettings(current => ({ ...current, ...settingsResult, apiToken: '' }));
    setLogs(Array.isArray(logsResult) ? logsResult : []);
  };

  useEffect(() => { load().catch(error => setMessage(error.message)); }, []);

  const save = async event => {
    event.preventDefault();
    const body = { pointsRatio: Number(settings.pointsRatio), autoNotifyWhatsApp: settings.autoNotifyWhatsApp };
    if (settings.apiToken) body.apiToken = settings.apiToken;
    const response = await fetch('/api/marg/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to save MARG configuration.');
    setSettings(current => ({ ...current, ...result.settings, apiToken: '' }));
    setMessage('MARG configuration saved. Existing token remains hidden.');
  };

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-lg font-black"><Database className="h-5 w-5 text-cyan-400" /> MARG integration</h2>
        <p className="mt-1 text-xs text-slate-400">Send production bills to <code>/api/marg/bill</code> with the configured token in <code>X-Marg-Token</code>. This screen does not generate test bills.</p>
      </div>

      <form onSubmit={save} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 md:grid-cols-2">
        <h3 className="flex items-center gap-2 font-bold md:col-span-2"><Settings className="h-4 w-4" /> Database-backed settings</h3>
        <label className="space-y-1 text-xs"><span>API token {settings.configured ? '(leave blank to retain)' : ''}</span><input type="password" required={!settings.configured} value={settings.apiToken} onChange={event => setSettings({ ...settings, apiToken: event.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2" /></label>
        <label className="space-y-1 text-xs"><span>Points ratio</span><input type="number" min="0.01" step="0.01" required value={settings.pointsRatio ?? ''} onChange={event => setSettings({ ...settings, pointsRatio: event.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(settings.autoNotifyWhatsApp)} onChange={event => setSettings({ ...settings, autoNotifyWhatsApp: event.target.checked })} /> Send configured WhatsApp notification for matched customers</label>
        <button className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950">Save configuration</button>
        {message && <p className="text-xs text-cyan-200 md:col-span-2">{message}</p>}
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Webhook history</h3><button onClick={() => load().catch(error => setMessage(error.message))} title="Refresh"><RefreshCw className="h-4 w-4" /></button></div>
        {logs.length === 0 ? <p className="text-sm text-slate-400">No MARG webhook attempts recorded.</p> : logs.map(log => <div key={log.id} className="mb-2 rounded-xl border border-white/10 p-3 text-xs"><span className="font-bold">{log.type}</span> · {log.message}<span className="float-right text-slate-500">{log.timestamp}</span></div>)}
      </div>
    </div>
  );
}
