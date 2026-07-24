import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Settings, 
  Key, 
  Wifi, 
  CheckCircle2, 
  Trash2, 
  Play, 
  RefreshCw, 
  Database,
  Smartphone,
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function MargIntegration() {
  const [settings, setSettings] = useState({
    apiToken: "MARG-SECURE-TOKEN-12345",
    pointsRatio: 10,
    autoNotifyWhatsApp: true,
    simulateDelay: 0
  });

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Simulator state
  const [simBillNumber, setSimBillNumber] = useState(`MRG-${Math.floor(100000 + Math.random() * 900000)}`);
  const [simPhone, setSimPhone] = useState("9810120299");
  const [simName, setSimName] = useState("Pradeep Kumar");
  const [simAmount, setSimAmount] = useState("1250");
  const [simItems, setSimItems] = useState("Long Grain Basmati Rice, Premium Gala Apples");
  const [simPayloadType, setSimPayloadType] = useState("json"); // "json" or "multipart"
  const [simPdfUrl, setSimPdfUrl] = useState("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
  
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchSettingsAndLogs = async () => {
    setIsLoading(true);
    try {
      const setRes = await fetch('/api/marg/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(setData);
      }
      
      const logsRes = await fetch('/api/marg/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (e) {
      console.error("Error loading MARG integration details:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndLogs();
    const interval = setInterval(async () => {
      // Auto refresh logs for snappy feedback
      try {
        const logsRes = await fetch('/api/marg/logs');
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData);
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/marg/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        alert("✓ MARG integration credentials and loyalty rules successfully saved!");
        fetchSettingsAndLogs();
      }
    } catch (e) {
      alert("Error saving integration settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm("Are you sure you want to flush all MARG API handshake logs?")) {
      try {
        await fetch('/api/marg/logs/clear', { method: 'POST' });
        setLogs([]);
      } catch (e) {}
    }
  };

  const runSimulation = async () => {
    if (!simPhone || !simAmount || !simBillNumber) {
      alert("Please fill in the simulator parameters");
      return;
    }
    
    setIsSimulating(true);
    setSimResult(null);
    
    // Split mock items list
    const itemsList = simItems.split(',').map((it, idx) => ({
      name: it.trim(),
      price: idx === 0 ? 449 : 180,
      qty: 1,
      weight: idx === 0 ? "5kg" : "1kg"
    }));

    try {
      let res;
      if (simPayloadType === "multipart") {
        const formData = new FormData();
        formData.append("apiToken", settings.apiToken);
        formData.append("billNumber", simBillNumber);
        formData.append("customerMobile", simPhone);
        formData.append("customerName", simName);
        formData.append("billAmount", simAmount);
        formData.append("items", JSON.stringify(itemsList));
        
        // Create a simulated dummy PDF file
        const dummyBlob = new Blob(["%PDF-1.4 mock pdf invoice content"], { type: "application/pdf" });
        const mockFile = new File([dummyBlob], `MARG_INVOICE_${simBillNumber}.pdf`, { type: "application/pdf" });
        formData.append("file", mockFile);

        res = await fetch('/api/marg/bill', {
          method: 'POST',
          headers: { 
            'X-Marg-Token': settings.apiToken
            // Note: Don't set Content-Type header when sending FormData, browser sets boundary
          },
          body: formData
        });
      } else {
        const payload = {
          apiToken: settings.apiToken,
          billNumber: simBillNumber,
          customerMobile: simPhone,
          customerName: simName,
          billAmount: Number(simAmount),
          items: itemsList,
          pdfUrl: simPdfUrl
        };

        res = await fetch('/api/marg/bill', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Marg-Token': settings.apiToken
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      setSimResult({
        status: res.status,
        success: res.ok,
        data
      });

      if (res.ok) {
        // Refresh settings/logs
        fetchSettingsAndLogs();
        // Generate new random bill number for next trigger
        setSimBillNumber(`MRG-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    } catch (e) {
      setSimResult({
        status: 500,
        success: false,
        data: { error: e.message }
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getLogTypeColor = (type) => {
    switch(type) {
      case 'SUCCESS': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'ERROR': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'WHATSAPP': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const liveEndpointUrl = `${window.location.origin}/api/marg/bill`;

  return (
    <div className="space-y-6 animate-fade-in" id="marg-integration-panel">
      {/* Upper header summary */}
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-lg font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Database className="h-5 w-5 text-cyan-400 animate-pulse" />
          <span>MARG ERP Billing & WhatsApp Gateway</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-normal">
          Integrate physical in-store checkout counters with the online loyalty ecosystem. Standardize real-time billing ingestion endpoints, automatic point accruals, and Meta-simulated digital receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API configs & Simulation form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* API Credentials Card */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 shadow-xl">
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-cyan-400" />
              <span>MARG ERP Handshake Configuration</span>
            </h4>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              
              {/* Endpoint Display */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Live HTTP POST Webhook URL Endpoint
                </label>
                <div className="flex items-center gap-2 bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all select-text overflow-x-auto whitespace-nowrap">
                  <span className="text-emerald-400 uppercase font-bold text-[9px] px-1 bg-emerald-500/10 rounded">POST</span>
                  <span>{liveEndpointUrl}</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-normal mt-1">
                  Configure this endpoint in your local MARG ERP system under "Outbound Webhooks / Billing APIs".
                </p>
              </div>

              {/* Secure Handshake Token */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Secure API Authorization Token (X-Marg-Token Header)
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={settings.apiToken}
                    onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white outline-none font-mono focus:border-cyan-400/50 transition-all"
                    placeholder="Enter custom API key"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Reward points conversion */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Loyalty Accrual Ratio
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      value={settings.pointsRatio}
                      onChange={(e) => setSettings({ ...settings, pointsRatio: Number(e.target.value) })}
                      className="w-20 bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-mono focus:border-cyan-400/50 transition-all text-center"
                    />
                    <span className="text-xs text-slate-300 font-medium">₹ Spent = 1 Reward PT</span>
                  </div>
                </div>

                {/* WhatsApp notification toggle */}
                <div className="flex flex-col justify-end">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    WhatsApp Invoice Alerts
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input 
                      type="checkbox" 
                      checked={settings.autoNotifyWhatsApp}
                      onChange={(e) => setSettings({ ...settings, autoNotifyWhatsApp: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-750 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ml-2 text-xs font-bold text-slate-300">
                      {settings.autoNotifyWhatsApp ? "Auto WA Dispatch" : "Alerts Silent"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/35 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving Config..." : "Update Credentials & Rules"}
                </button>
              </div>

            </form>
          </div>

          {/* MARG Terminal Simulator */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>MARG ERP Terminal Sandbox (Outbox Simulator)</span>
              </h4>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-black tracking-widest animate-pulse">
                Sandbox Environment
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal mb-4">
              Simulate an outbound transactional payload fired from the supermarket checkout cash counter. Submit billing parameters and watch them process instantly!
            </p>

            {/* Payload Type Selector */}
            <div className="mb-4">
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">
                Simulation Method / Payload Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setSimPayloadType("json")}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    simPayloadType === "json" 
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                      : "text-slate-400 hover:text-white border border-transparent"
                  }`}
                >
                  JSON + PDF Link (URL)
                </button>
                <button
                  type="button"
                  onClick={() => setSimPayloadType("multipart")}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    simPayloadType === "multipart" 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                      : "text-slate-400 hover:text-white border border-transparent"
                  }`}
                >
                  Direct PDF File (Multipart Form)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                  MARG Bill Number
                </label>
                <input
                  type="text"
                  value={simBillNumber}
                  onChange={(e) => setSimBillNumber(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  placeholder="e.g., MRG-1092"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Customer Mobile Number
                </label>
                <input
                  type="tel"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value.replace(/\D/g,''))}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  placeholder="e.g., 9810120299"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  placeholder="e.g., Pradeep Kumar"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Bill Total Amount (₹)
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  placeholder="e.g., 1450"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                Items Purchased (Comma-separated)
              </label>
              <input
                type="text"
                value={simItems}
                onChange={(e) => setSimItems(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                placeholder="Item 1, Item 2, Item 3"
              />
            </div>

            {simPayloadType === "json" ? (
              <div className="mb-4">
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                  JSON Parameter: pdfUrl (Pre-uploaded PDF Link)
                </label>
                <input
                  type="url"
                  value={simPdfUrl}
                  onChange={(e) => setSimPdfUrl(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  placeholder="e.g., https://example.com/invoice.pdf"
                />
              </div>
            ) : (
              <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <FileText className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-200">MARG_INVOICE_{simBillNumber}.pdf</p>
                    <p className="text-[8.5px] text-slate-400">Application/PDF Binary Stream (Simulated 14 KB)</p>
                  </div>
                </div>
                <span className="text-[8.5px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                  Ready to stream
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={runSimulation}
                disabled={isSimulating}
                className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/35 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isSimulating ? "Transmitting Post..." : "Fire Outbound Bill POST"}</span>
              </button>
            </div>

            {/* Simulation feedback screen */}
            {simResult && (
              <div className={`mt-4 p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                simResult.success ? "bg-emerald-950/15 border-emerald-500/20 text-emerald-300" : "bg-rose-950/15 border-rose-500/20 text-rose-300"
              }`}>
                <div className="flex justify-between items-center font-bold">
                  <span>API Response Code: {simResult.status}</span>
                  <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-black/40">
                    {simResult.success ? "200 OK - SUCCESS" : "FAILED"}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/70 rounded border border-white/5 text-[10.5px] leading-relaxed max-h-36 overflow-y-auto">
                  <p>&gt; Response Payload:</p>
                  <pre className="text-slate-350">{JSON.stringify(simResult.data, null, 2)}</pre>
                </div>
                {simResult.success && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-sans flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Success! Loyalty Points credited! Live WhatsApp stream simulation triggered.</span>
                  </p>
                )}
              </div>
            )}

          </div>

          {/* MARG Developer API Connection Guide */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" />
              <span>MARG ERP Developer Connection Guide</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal">
              Share these connection specifications with your MARG software engineer. Your in-store computer can POST directly to this webhook endpoint, which immediately stores the invoice and sends the PDF via WhatsApp.
            </p>

            <div className="space-y-4">
              {/* Option 1 */}
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9.5px] font-black uppercase text-emerald-400 tracking-wider">Method A: Direct PDF Upload (Recommended)</span>
                  <span className="text-[8.5px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-bold">multipart/form-data</span>
                </div>
                <p className="text-[9px] text-slate-400">
                  Perfect if MARG exports a local PDF file. Upload the raw PDF file directly under the field name <code className="text-white">file</code> alongside invoice data:
                </p>
                <div className="bg-slate-950/80 p-2.5 rounded border border-white/10 text-[9.5px] font-mono text-slate-300 overflow-x-auto select-all select-text leading-relaxed mt-1">
                  <p className="text-slate-500"># Required HTTP Header: X-Marg-Token: {settings.apiToken}</p>
                  <p className="text-slate-200">
                    curl -X POST "{liveEndpointUrl}" \<br />
                    &nbsp;&nbsp;-H "X-Marg-Token: {settings.apiToken}" \<br />
                    &nbsp;&nbsp;-F "billNumber=MRG-88192" \<br />
                    &nbsp;&nbsp;-F "customerMobile={simPhone}" \<br />
                    &nbsp;&nbsp;-F "customerName={simName}" \<br />
                    &nbsp;&nbsp;-F "billAmount={simAmount}" \<br />
                    &nbsp;&nbsp;-F "file=@/path/to/invoice_receipt.pdf"
                  </p>
                </div>
              </div>

              {/* Option 2 */}
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9.5px] font-black uppercase text-cyan-400 tracking-wider">Method B: Send PDF URL (JSON Format)</span>
                  <span className="text-[8.5px] bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded uppercase font-bold">application/json</span>
                </div>
                <p className="text-[9px] text-slate-400">
                  If MARG uploads bills to your own Google Drive, Dropbox, or custom hosting server, pass the remote direct download URL under <code className="text-white">pdfUrl</code>:
                </p>
                <div className="bg-slate-950/80 p-2.5 rounded border border-white/10 text-[9.5px] font-mono text-slate-300 overflow-x-auto select-all select-text leading-relaxed mt-1">
                  <p className="text-slate-500"># Required HTTP Header: X-Marg-Token: {settings.apiToken}</p>
                  <p className="text-slate-200">
                    curl -X POST "{liveEndpointUrl}" \<br />
                    &nbsp;&nbsp;-H "X-Marg-Token: {settings.apiToken}" \<br />
                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                    &nbsp;&nbsp;-d '&#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"billNumber": "MRG-88192",<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"customerMobile": "{simPhone}",<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"customerName": "{simName}",<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"billAmount": {simAmount},<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"pdfUrl": "https://yourserver.com/receipt.pdf"<br />
                    &nbsp;&nbsp;&#125;'
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Logs console */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Terminal Console Card */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col h-[540px]">
            
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>Live Webhook handshakes terminal</span>
              </h4>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={fetchSettingsAndLogs}
                  className="p-1 text-slate-400 hover:text-white transition-all rounded bg-slate-950/40 hover:bg-slate-950 border border-white/5"
                  title="Reload Logs"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-all rounded bg-slate-950/40 hover:bg-slate-950 border border-white/5"
                  title="Flush Terminal Logs"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Scrollable logs */}
            <div className="flex-1 bg-slate-950/70 border border-white/10 rounded-xl p-3.5 font-mono text-[10.5px] overflow-y-auto space-y-2.5 custom-scrollbar select-text">
              {isLoading && logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">
                  <span>Establishing trace context...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic space-y-1 py-10">
                  <Wifi className="h-6 w-6 stroke-1 animate-pulse mb-1" />
                  <span>Terminal ready. Awaiting connection...</span>
                  <span className="text-[9.5px]">Configure your MARG software or hit the simulator.</span>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`p-2 border rounded-lg space-y-1 leading-normal transition-all ${getLogTypeColor(log.type)}`}>
                    <div className="flex justify-between items-center text-[9px] font-bold opacity-80">
                      <span className="uppercase tracking-widest">[{log.type}]</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="font-semibold break-words">{log.message}</p>
                    {log.payload && (
                      <div className="mt-1.5 p-1 bg-black/20 rounded border border-white/5 text-[9.5px] opacity-90">
                        <span className="font-bold">Bill payload details:</span>
                        <div className="grid grid-cols-2 gap-x-2 mt-0.5 text-slate-300">
                          <span>Mobile: +91 {log.payload.customerMobile}</span>
                          <span>Points Earned: {log.payload.pointsEarned} PTS</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Status indicators */}
            <div className="mt-3 flex justify-between items-center text-[10px] text-slate-400 border-t border-white/10 pt-3">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span className="font-bold text-slate-300">Swastik Webhook Active</span>
              </span>
              <span>Buffer size: 50 / 50 logs</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
