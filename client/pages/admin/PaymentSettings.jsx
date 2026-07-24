import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Settings, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Database,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Terminal,
  Activity,
  Server
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function PaymentSettings({ isAdminDark }) {
  const { isHindi } = useLanguage();
  const [settings, setSettings] = useState({
    enabled: true,
    appId: "",
    secretKey: "",
    environment: "TEST"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  // Simulation panel states
  const [simOrderId, setSimOrderId] = useState(`MOCK-CF-${Math.floor(100000 + Math.random() * 900000)}`);
  const [simAmount, setSimAmount] = useState("1500");
  const [simStatus, setSimStatus] = useState("SUCCESS");
  const [simResponse, setSimResponse] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payment/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          enabled: data.enabled ?? true,
          appId: data.appId || "",
          secretKey: data.secretKey || "",
          environment: data.environment || "TEST"
        });
      }
    } catch (e) {
      console.error("Error loading payment gateway configurations:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/payment/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        alert(isHindi 
          ? "✓ कैशफ्री भुगतान गेटवे सेटिंग्स सफलतापूर्वक अपडेट की गईं!" 
          : "✓ Cashfree payment gateway configurations successfully updated!"
        );
        // Force refresh configuration cache in React context
        try {
          window.location.reload(); // Refresh to broadcast new dynamic settings to storefront
        } catch (err) {}
      } else {
        alert("Failed to save payment gateway settings.");
      }
    } catch (e) {
      console.error("Network error while saving payment settings:", e);
      alert("Error saving payment gateway settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimResponse(null);
    try {
      // Dispatch a webhook payload directly to local server handler
      const res = await fetch('/api/cashfree/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: simOrderId,
          paymentStatus: simStatus,
          transactionId: `TXN_MOCK_${Math.floor(100000000 + Math.random() * 900000000)}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSimResponse(data);
        alert(isHindi 
          ? `✓ सिमुलेशन पूरा हुआ! ऑर्डर ${simOrderId} का स्टेटस: ${simStatus}`
          : `✓ Simulation webhook processed! Synced Order: ${simOrderId} Status: ${simStatus}`
        );
        // Regene next mock order ID
        setSimOrderId(`MOCK-CF-${Math.floor(100000 + Math.random() * 900000)}`);
      } else {
        setSimResponse({ error: "HTTP Error Dispatching Payload" });
      }
    } catch (err) {
      console.error(err);
      setSimResponse({ error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const bgPanelClass = isAdminDark 
    ? "bg-slate-900 border border-white/10" 
    : "bg-white border border-slate-200 shadow-sm";

  const textPrimaryClass = isAdminDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isAdminDark ? "text-slate-400" : "text-slate-600";
  const labelClass = `text-[10px] font-black uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'} block mb-1`;
  const inputClass = `w-full border px-3.5 py-2.5 rounded-xl outline-none text-xs font-bold ${
    isAdminDark 
      ? 'bg-slate-950 border-white/10 text-white placeholder-slate-600 focus:border-cyan-400/50' 
      : 'bg-slate-50 border-slate-250 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
  }`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Page Header */}
      <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-cyan-300 flex items-center gap-1.5">
            <CreditCard className="h-5 w-5" />
            <span>{isHindi ? "कैशफ्री पेमेंट गेटवे नियंत्रण" : "Dynamic Cashfree Payment Gateway Panel"}</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            {isHindi 
              ? "बिना सर्वर रिस्टार्ट के लाइव पेमेंट गेटवे क्रेडेंशियल्स और ऑन/ऑफ स्विच प्रबंधित करें" 
              : "Toggle store-wide payment acceptance, switch sandbox environments, and live update keys"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-1 rounded font-black uppercase ${
            settings.enabled 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {settings.enabled ? (isHindi ? "चालू (Enabled)" : "Gateway: Live") : (isHindi ? "बंद (Disabled)" : "Gateway: Disabled")}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 2. Main Config Form */}
          <form onSubmit={handleSaveSettings} className={`${bgPanelClass} p-6 rounded-[24px] lg:col-span-7 space-y-5`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-cyan-400" />
                {isHindi ? "गेटवे क्रेडेंशियल्स कॉन्फ़िगर करें" : "Configure PG Gateway Credentials"}
              </span>
              
              {/* Enable / Disable toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-[10px] font-black uppercase text-slate-400">{isHindi ? "ऑन / ऑफ" : "Active Toggle"}</span>
              </label>
            </div>

            {/* Warning when disabled */}
            {!settings.enabled && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-amber-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-[10.5px] leading-relaxed font-bold">
                  {isHindi 
                    ? "चेतावनी: पेमेंट गेटवे को बंद करने से ग्राहक चेकआउट पर ऑनलाइन पेमेंट विकल्प नहीं चुन पाएंगे। केवल कैश ऑन डिलीवरी (COD) उपलब्ध रहेगा।" 
                    : "Warning: Disabling Cashfree PG hides the online checkout option. Shoppers will only be able to place Cash on Delivery (COD) orders."}
                </p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{isHindi ? "कैशफ्री ऐप आईडी (App ID / Client ID)" : "Cashfree Client App ID"}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4 text-cyan-500" />
                  </div>
                  <input 
                    type="text"
                    required={settings.enabled}
                    value={settings.appId}
                    onChange={(e) => setSettings({ ...settings, appId: e.target.value })}
                    placeholder="e.g. 129482bfbc8183017"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <p className="text-[9px] text-slate-500 mt-1 font-bold">
                  {isHindi 
                    ? "अपने कैशफ्री मर्चेंट डैशबोर्ड से अपनी क्लाइंट ऐप आईडी पेस्ट करें।" 
                    : "Your unique Client ID provided by Cashfree merchant dashboard environment."}
                </p>
              </div>

              <div>
                <label className={labelClass}>{isHindi ? "कैशफ्री सीक्रेट की (Secret Key)" : "Cashfree Secret API Key"}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4 text-red-400" />
                  </div>
                  <input 
                    type={showSecret ? "text" : "password"}
                    required={settings.enabled}
                    value={settings.secretKey}
                    onChange={(e) => setSettings({ ...settings, secretKey: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••••••••••••••"
                    className={`${inputClass} pl-10 pr-10`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mt-1 font-bold">
                  {isHindi 
                    ? "सुरक्षा चेतावनी: इस की को कभी भी सार्वजनिक रूप से साझा न करें। यह सर्वर-साइड पर सुरक्षित रूप से संग्रहीत होती है।" 
                    : "Security advice: Keep this secret safely hidden. Our Fullstack Proxy proxies API queries server-side."}
                </p>
              </div>

              <div>
                <label className={labelClass}>{isHindi ? "एक्टिव पेमेंट एनवायरनमेंट (Environment)" : "Active Gateway Environment"}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Server className="h-4 w-4 text-purple-400" />
                  </div>
                  <select 
                    value={settings.environment}
                    onChange={(e) => setSettings({ ...settings, environment: e.target.value })}
                    className={`${inputClass} pl-10 cursor-pointer appearance-none`}
                  >
                    <option value="TEST">🧪 TEST (Sandbox Simulation)</option>
                    <option value="PRODUCTION">⚡ PRODUCTION (Live Customers Payment)</option>
                  </select>
                </div>
                <p className="text-[9px] text-slate-500 mt-1 font-bold">
                  {isHindi 
                    ? "विकास / टेस्टिंग के लिए 'TEST' चुनें और वास्तविक भुगतान स्वीकार करने के लिए 'PRODUCTION' चुनें।" 
                    : "Choose 'TEST' to safely execute sandbox transactions or 'PRODUCTION' to accept genuine commercial cards & UPI."}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl border border-cyan-300 hover:bg-cyan-500 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{isHindi ? "बचत हो रही है..." : "Applying Configuration..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isHindi ? "सुरक्षित रूप से सेव करें" : "Save Payment Settings & Reload"}</span>
                </>
              )}
            </button>
          </form>

          {/* 3. Real-time Sandbox Webhook Simulator */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`${bgPanelClass} p-6 rounded-[24px] space-y-4`}>
              <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
                <Terminal className="h-4 w-4 text-emerald-400" />
                {isHindi ? "लाइव गेटवे सिम्युलेटर (Instant Webhook)" : "Instant Webhook & Web Testing SDK"}
              </span>

              <p className="text-[10.5px] leading-relaxed text-slate-400 font-bold">
                {isHindi 
                  ? "कैशफ्री एपीआई वेबहुक की विश्वसनीयता की जांच करने के लिए नकली भुगतान प्रेषित करें। यह आपके डेटाबेस में तुरंत अपडेट होगा!" 
                  : "Force dispatch simulated HTTP webhook payloads to evaluate database sync speeds without placing active orders."}
              </p>

              <form onSubmit={handleSimulateWebhook} className="space-y-3">
                <div>
                  <label className={labelClass}>{isHindi ? "ऑर्डर आईडी (Order Reference)" : "Simulated Order ID"}</label>
                  <input 
                    type="text" 
                    value={simOrderId}
                    onChange={(e) => setSimOrderId(e.target.value)}
                    placeholder="MOCK-CF-12345"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>{isHindi ? "भुगतान राशि (₹)" : "Amount (₹)"}</label>
                    <input 
                      type="number" 
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="1500"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{isHindi ? "भुगतान स्थिति (Status)" : "Simulated Status"}</label>
                    <select 
                      value={simStatus}
                      onChange={(e) => setSimStatus(e.target.value)}
                      className={inputClass}
                    >
                      <option value="SUCCESS">✅ SUCCESS / PAID</option>
                      <option value="FAILED">❌ FAILED</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="w-full bg-slate-950 border border-white/15 hover:bg-slate-900 text-slate-300 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSimulating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  )}
                  <span>{isHindi ? "वेबबुक सिमुलेट करें" : "Simulate Webhook Dispatch"}</span>
                </button>
              </form>

              {simResponse && (
                <div className="bg-slate-950 border border-white/15 rounded-xl p-3 space-y-1.5 text-[10px] font-mono text-slate-400">
                  <p className="text-cyan-400 font-bold border-b border-white/5 pb-1 uppercase tracking-tight flex items-center gap-1">
                    <span>&gt; API LOCAL RESPONSE</span>
                    <span className="text-[8px] bg-cyan-500/10 px-1 py-0.5 rounded ml-auto text-cyan-300 font-sans">Synced</span>
                  </p>
                  <pre className="overflow-x-auto text-slate-300 text-[9px] max-h-[120px] scrollbar-thin">
                    {JSON.stringify(simResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Integration help info */}
            <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl text-[10.5px] leading-relaxed text-slate-400 font-medium space-y-2">
              <span className="font-black text-white uppercase text-[9px] block tracking-wider text-cyan-400">⚡ API HOOK POINTS INFORMATION</span>
              <p>
                {isHindi 
                  ? "हमारा कैशफ्री एकीकरण पूरी तरह से सुरक्षित है। ग्राहक भुगतान क्रेडेंशियल्स सर्वर साइड पर सुरक्षित रखे जाते हैं और ग्राहकों के सामने कभी भी सार्वजनिक नहीं किए जाते हैं।" 
                  : "The cashfree routes automatically fall back to sandbox simulator mode if no AppId/SecretKey credentials are set. If credentials are correct, real checkout requests will process directly with the production API."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
