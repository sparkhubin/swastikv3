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
  Server,
  Zap,
  Globe,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function PaymentSettings({ isAdminDark }) {
  const { isHindi } = useLanguage();
  const [settings, setSettings] = useState({
    enabled: true,
    appId: "",
    secretKey: "",
    environment: "TEST",
    razorpayEnabled: true,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    activeGateway: "RAZORPAY"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');
  
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
          environment: data.environment || "TEST",
          razorpayEnabled: data.razorpayEnabled ?? true,
          razorpayKeyId: data.razorpayKeyId || "",
          razorpayKeySecret: data.razorpayKeySecret || "",
          activeGateway: data.activeGateway || "RAZORPAY"
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
          ? "✓ रेज़रपे एवं भुगतान गेटवे सेटिंग्स सफलतापूर्वक अपडेट की गईं!" 
          : "✓ Razorpay & Payment Gateway configurations saved dynamically!"
        );
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

  const handleCopyWebhookUrl = (url, type) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(type);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  const bgPanelClass = isAdminDark 
    ? "bg-slate-900 border border-white/10" 
    : "bg-white border border-slate-200 shadow-sm";

  const labelClass = `text-[10px] font-black uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'} block mb-1`;
  const inputClass = `w-full border px-3.5 py-2.5 rounded-xl outline-none text-xs font-bold ${
    isAdminDark 
      ? 'bg-slate-950 border-white/10 text-white placeholder-slate-600 focus:border-cyan-400/50' 
      : 'bg-slate-50 border-slate-250 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
  }`;

  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://swastiksupermarket.com';
  const rzpWebhookUrl = `${hostOrigin}/api/razorpay/webhook`;
  const cfWebhookUrl = `${hostOrigin}/api/cashfree/webhook`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Page Header */}
      <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-cyan-300 flex items-center gap-1.5">
            <CreditCard className="h-5 w-5 text-cyan-400" />
            <span>{isHindi ? "डायनामिक रेज़रपे एवं भुगतान नियंत्रण केंद्र" : "Dynamic Razorpay & Payment Gateway Panel"}</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            {isHindi 
              ? "बिना सर्वर रिस्टार्ट के लाइव रेज़रपे / कैशफ्री API कीज़, वेबहुक और ऑन/ऑफ स्विच प्रबंधित करें" 
              : "Dynamically control Razorpay Key ID/Secret, Cashfree keys, environment modes & background webhooks"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1.5 ${
            settings.razorpayEnabled 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <Zap className="h-3 w-3" />
            <span>Razorpay: {settings.razorpayEnabled ? "Active" : "Disabled"}</span>
          </span>
          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-black uppercase ${
            settings.environment === 'PRODUCTION' 
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {settings.environment === 'PRODUCTION' ? 'PRODUCTION LIVE' : 'SANDBOX TEST'}
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
          <form onSubmit={handleSaveSettings} className={`${bgPanelClass} p-6 rounded-[24px] lg:col-span-7 space-y-6`}>
            
            {/* Active Gateway Selection Radio Grid */}
            <div className="space-y-2 border-b border-white/10 pb-5">
              <label className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                <span>{isHindi ? "प्राथमिक ऑनलाइन भुगतान गेटवे चुनें *" : "Select Active Online Payment Gateway *"}</span>
              </label>
              
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, activeGateway: 'RAZORPAY' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    settings.activeGateway === 'RAZORPAY'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                      : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    Razorpay
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1">
                    {isHindi ? "अनुशंसित (Recommended)" : "Primary Gateway"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, activeGateway: 'CASHFREE' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    settings.activeGateway === 'CASHFREE'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                      : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                    Cashfree
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1">
                    {isHindi ? "द्वितीयक विकल्प" : "Secondary PG"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, activeGateway: 'BOTH' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    settings.activeGateway === 'BOTH'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                      : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    Both PG
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1">
                    {isHindi ? "दोनों ऑन रखें" : "Customer Choice"}
                  </span>
                </button>
              </div>
            </div>

            {/* Global Environment Mode */}
            <div className="flex items-center justify-between bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl">
              <div>
                <span className="text-xs font-black uppercase text-white block">
                  {isHindi ? "पर्यावरण मोड (Environment Mode)" : "Gateway Environment Mode"}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {isHindi ? "लाइव भुगतान लेने के लिए Production मोड चुनें" : "Toggle Sandbox test payments or Live Production transactions"}
                </span>
              </div>
              <select
                value={settings.environment}
                onChange={(e) => setSettings({ ...settings, environment: e.target.value })}
                className="bg-slate-900 border border-white/20 text-white font-mono text-xs font-black px-3 py-1.5 rounded-xl outline-none"
              >
                <option value="TEST">TEST / SANDBOX</option>
                <option value="PRODUCTION">PRODUCTION (LIVE)</option>
              </select>
            </div>

            {/* RAZORPAY CONFIGURATION SECTION */}
            <div className="bg-slate-950/90 border border-cyan-500/30 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-black uppercase text-cyan-300 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>{isHindi ? "रेज़रपे भुगतान गेटवे क्रेडेंशियल्स" : "Razorpay Payment Gateway Credentials"}</span>
                </span>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.razorpayEnabled}
                    onChange={(e) => setSettings({ ...settings, razorpayEnabled: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  <span className="ml-2 text-[10px] font-black uppercase text-slate-400">{isHindi ? "चालू/बंद" : "Active"}</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>{isHindi ? "रेज़रपे की आईडी (Razorpay Key ID)" : "Razorpay Key ID"}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="h-4 w-4 text-cyan-400" />
                    </div>
                    <input 
                      type="text"
                      required={settings.razorpayEnabled}
                      value={settings.razorpayKeyId}
                      onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
                      placeholder="e.g. rzp_test_xxxxxxxxxxxx or rzp_live_xxxxxxxxxxxx"
                      className={`${inputClass} pl-10 font-mono`}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 font-bold">
                    {isHindi ? "Razorpay डैशबोर्ड -> Settings -> API Keys से Key ID कॉपी करें।" : "Find in Razorpay Dashboard -> Settings -> API Keys."}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>{isHindi ? "रेज़रपे सीक्रेट की (Razorpay Key Secret)" : "Razorpay Key Secret"}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4 text-cyan-400" />
                    </div>
                    <input 
                      type={showRzpSecret ? "text" : "password"}
                      required={settings.razorpayEnabled}
                      value={settings.razorpayKeySecret}
                      onChange={(e) => setSettings({ ...settings, razorpayKeySecret: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className={`${inputClass} pl-10 pr-10 font-mono`}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowRzpSecret(!showRzpSecret)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showRzpSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Razorpay Webhook Copy Box */}
                <div className="bg-slate-900 border border-white/10 p-3 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400">{isHindi ? "बैकग्राउंड ऑटो-अपडेट हेतु Razorpay Webhook URL:" : "Background Webhook Sync URL:"}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyWebhookUrl(rzpWebhookUrl, 'rzp')}
                      className="text-[9px] font-black text-cyan-300 hover:text-cyan-200 uppercase flex items-center gap-1 cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/10"
                    >
                      {copiedUrl === 'rzp' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedUrl === 'rzp' ? "Copied!" : "Copy Webhook URL"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={rzpWebhookUrl}
                    className="w-full bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-cyan-300 outline-none"
                  />
                  <p className="text-[8.5px] text-slate-400 font-semibold">
                    * Set active events in Razorpay dashboard: <code className="text-cyan-400 font-mono">order.paid</code>, <code className="text-cyan-400 font-mono">payment.captured</code>
                  </p>
                </div>
              </div>
            </div>

            {/* CASHFREE CONFIGURATION SECTION */}
            <div className="bg-slate-950/90 border border-emerald-500/20 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  <span>{isHindi ? "कैशफ्री गेटवे क्रेडेंशियल्स (Cashfree)" : "Cashfree PG Credentials"}</span>
                </span>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-2 text-[10px] font-black uppercase text-slate-400">{isHindi ? "चालू/बंद" : "Active"}</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>{isHindi ? "कैशफ्री ऐप आईडी (App ID)" : "Cashfree Client App ID"}</label>
                  <input 
                    type="text"
                    value={settings.appId}
                    onChange={(e) => setSettings({ ...settings, appId: e.target.value })}
                    placeholder="e.g. 129482bfbc8183017"
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>{isHindi ? "कैशफ्री सीक्रेट की (Secret Key)" : "Cashfree Secret Key"}</label>
                  <div className="relative">
                    <input 
                      type={showSecret ? "text" : "password"}
                      value={settings.secretKey}
                      onChange={(e) => setSettings({ ...settings, secretKey: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className={`${inputClass} pr-10 font-mono`}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSaving ? (isHindi ? "सहेज रहा है..." : "Saving Configurations...") : (isHindi ? "गेटवे सेटिंग्स सहेजें" : "Save Gateway Configurations Dynamic")}</span>
            </button>

          </form>

          {/* 3. Right Column: Live Webhook Testing & Status Console */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* System Status Banner */}
            <div className={`${bgPanelClass} p-5 rounded-[24px] space-y-4`}>
              <h4 className="text-xs font-black uppercase text-cyan-300 flex items-center gap-2 border-b border-white/10 pb-3">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>{isHindi ? "लाइव गेटवे स्थिति एवं स्वास्थ्य" : "Gateway Live Status & Health"}</span>
              </h4>

              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-cyan-400" />
                      Razorpay Checkout API
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {settings.razorpayConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    {settings.razorpayKeyId 
                      ? "Key ID properly configured. Store accepts UPI, Cards, NetBanking, Wallets." 
                      : "Add the database-backed gateway credentials before enabling Razorpay."}
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                      Cashfree Payment Engine
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {settings.cashfreeConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
