import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  ShieldAlert, 
  Smartphone, 
  Database, 
  RefreshCw, 
  User, 
  Download, 
  Upload, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  FileJson, 
  Lock 
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function SecurityManager({ userRole, setUserRole }) {
  const { isHindi } = useLanguage();
  const { userRole: glbRole, setUserRole: setGlbRole, changeStaffPassword, products = [], orders = [], partners = [], reviews = [], staff = [] } = useData();

  // Database Backup & Restore States
  const [isDownloading, setIsDownloading] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreJsonFile, setRestoreJsonFile] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState({ success: null, message: '' });
  const [isRestoring, setIsRestoring] = useState(false);

  const handleDownloadDatabaseBackup = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/database/backup');
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      const filename = `swastik_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Backup download error:", e);
      alert(`❌ Failed to export database backup: ${e.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRestoreJsonFile(file);
      setRestoreStatus({ success: null, message: '' });
    }
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    setRestoreStatus({ success: null, message: '' });

    if (!restoreJsonFile) {
      setRestoreStatus({ success: false, message: isHindi ? "कृपया बैकअप JSON फ़ाइल चुनें!" : "Please select a backup JSON file to restore." });
      return;
    }

    if (!restorePassword) {
      setRestoreStatus({ success: false, message: isHindi ? "सुरक्षा के लिए एडमिन पासवर्ड दर्ज करें!" : "Admin password required for restore authorization." });
      return;
    }

    setIsRestoring(true);
    try {
      const fileText = await restoreJsonFile.text();
      let backupData;
      try {
        backupData = JSON.parse(fileText);
      } catch (err) {
        setRestoreStatus({ success: false, message: isHindi ? "अमान्य JSON फ़ाइल स्वरूप!" : "Invalid JSON file format. Restoration cancelled." });
        setIsRestoring(false);
        return;
      }

      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: restorePassword.trim(),
          backupData
        })
      });

      const responseData = await res.json();

      if (res.ok) {
        setRestoreStatus({
          success: true,
          message: `✓ ${responseData.message || 'Database restored successfully!'} Refreshing data...`
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRestoreStatus({
          success: false,
          message: `❌ ${responseData.error || 'Restore failed due to authorization or schema error.'}`
        });
      }
    } catch (e) {
      console.error("Restore error:", e);
      setRestoreStatus({ success: false, message: `❌ Connection Error: ${e.message}` });
    } finally {
      setIsRestoring(false);
    }
  };

  const [staffData, setStaffData] = useState(() => {
    const savedStr = localStorage.getItem('swastik_logged_in_staff');
    return savedStr ? JSON.parse(savedStr) : null;
  });

  const handleUpdateAvatar = (url) => {
    if (!staffData) return;
    const updated = { ...staffData, avatar: url };
    setStaffData(updated);
    localStorage.setItem('swastik_logged_in_staff', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  // Change Password Form State
  const [changeForm, setChangeForm] = useState(() => {
    const savedStr = localStorage.getItem('swastik_logged_in_staff');
    const saved = savedStr ? JSON.parse(savedStr) : null;
    return {
      mobile: saved ? saved.mobile : '',
      oldPassword: '',
      newPassword: ''
    };
  });
  const [changeStatus, setChangeStatus] = useState({ success: null, message: '' });

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeStatus({ success: null, message: '' });

    if (!changeForm.mobile || !changeForm.oldPassword || !changeForm.newPassword) {
      setChangeStatus({ success: false, message: 'Please cover all password pin parameters.' });
      return;
    }

    const payload = await changeStaffPassword(
      changeForm.mobile,
      changeForm.oldPassword,
      changeForm.newPassword
    );

    if (payload.success) {
      setChangeStatus({ 
        success: true, 
        message: '✓ Success! Your system passcode has been updated on the backend server.' 
      });
      setChangeForm({
        mobile: changeForm.mobile,
        oldPassword: '',
        newPassword: ''
      });
    } else {
      setChangeStatus({ 
        success: false, 
        message: `❌ Error: ${payload.error || 'Identity mismatch rejection.'}` 
      });
    }
  };

  // OTP Form State
  const [otpPhone, setOtpPhone] = useState('');
  const [latestOtpCode, setLatestOtpCode] = useState('');
  const [otpSimLogs, setOtpSimLogs] = useState([]);
  const [otpSmsSent, setOtpSmsSent] = useState(false);

  const triggerOtpSend = async () => {
    if (!otpPhone) return;
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: otpPhone })
      });
      if (res.ok) {
        setOtpSmsSent(true);
        const timestamp = new Date().toLocaleTimeString();
        const newLog = `[${timestamp}] Outbound WhatsApp template (reference_no) dispatched to ${otpPhone}. Waiting for user verification.`;
        setOtpSimLogs(prev => [newLog, ...prev]);
      } else {
        alert("WA Gateway refused connection: try inputting a valid 10-digit number");
      }
    } catch(e) {
      console.error(e);
      setOtpSmsSent(true);
      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] Dispatched security OTP to ${otpPhone}.`;
      setOtpSimLogs(prev => [newLog, ...prev]);
    }
  };

  const verifySimulatedCode = async (enteredCode) => {
    const timestamp = new Date().toLocaleTimeString();
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: otpPhone, code: enteredCode })
      });
      if (res.ok) {
        setOtpSimLogs(prev => [`[${timestamp}] ✓ Auth SUCCESS via Gin GORM for ${otpPhone}`, ...prev]);
        alert(`OTP Verification successful across backend! Access granted.`);
        setOtpSmsSent(false);
        setLatestOtpCode('');
        setOtpPhone('');
      } else {
        setOtpSimLogs(prev => [`[${timestamp}] ❌ Auth FAILURE: invalid code "${enteredCode}" in Gin session`, ...prev]);
      }
    } catch (e) {
      console.error(e);
      if (enteredCode === latestOtpCode) {
        setOtpSimLogs(prev => [`[${timestamp}] ✓ Verification SUCCESS (Local Engine) for ${otpPhone}`, ...prev]);
        alert(`OTP Verification successful! Access granted.`);
        setOtpSmsSent(false);
        setLatestOtpCode('');
        setOtpPhone('');
      } else {
        setOtpSimLogs(prev => [`[${timestamp}] ❌ Verification FAILURE (Local Engine): invalid OTP code "${enteredCode}"`, ...prev]);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white/90">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-cyan-400" />
          <span>{isHindi ? "व्हाट्सएप ओटीपी और सुराक्षा" : "Identity Gateway & WA Gateway Console"}</span>
        </h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          {isHindi ? "ओटीपी जनरेटर की स्थिति देखें" : "Audit OTP handshakes, simulated gateways, and role-based matrix settings"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Role Matrix setting block */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 font-mono block">Permission Clearances</span>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            Modulate your active system role to inspect multi-agent visibility bounds. Secure CRUD routers verify clearances automatically.
          </p>

          <div className="space-y-2.5">
            {[
              { id: 'customer', label: isHindi ? 'सुरक्षित ग्राहक' : 'Secure Customer (Read-Only)', desc: "View lists and products, manage shopping cart." },
              { id: 'delivery', label: isHindi ? '🛵 डिलीवरी एग्जीक्यूटिव' : '🛵 Delivery Executive (Rider View)', desc: "Restricted portal to view assigned orders, track GPS navigation, and clear COD cash to admin." },
              { id: 'manager', label: isHindi ? 'ऑर्डर मैनेजर' : 'Order Dispatch Manager', desc: "Moderate dispatch tracks and SLA times." },
              { id: 'admin', label: isHindi ? 'सुपर एडमिन' : 'Super Admin (Full CRUD)', desc: "Full database WRITE/DELETE authorization and gateway configuration." }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setUserRole(r.id)}
                className={`w-full text-left p-3.5 border rounded-2xl block transition-all ${
                  userRole === r.id 
                    ? 'border-cyan-400 bg-cyan-400/10' 
                    : 'border-white/5 hover:border-white/10 bg-slate-950/20'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">{r.label}</span>
                  {userRole === r.id && <span className="text-[9px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded">ACTIVE</span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* SMS / WA Gateway block */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 font-mono block flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-cyan-300" />
            <span>WA API OTP Handshake Sim</span>
          </span>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 tracking-wider block">TEST MOBILE NUMBER</label>
              <div className="flex gap-2">
                <input 
                  type="tel" 
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  placeholder="e.g. +91 98110 32454"
                  className="bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold placeholder:text-slate-700 outline-none w-full text-white"
                />
                <button 
                  onClick={triggerOtpSend}
                  className="bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-950 px-4 py-2 text-[10px] uppercase font-black tracking-wider rounded-xl shrink-0 border border-cyan-400/20 transition-all"
                >
                  Get OTP
                </button>
              </div>
            </div>

            {otpSmsSent && (
              <div className="space-y-1.5 animate-slide-in">
                <label className="text-[9px] font-black text-pink-400 tracking-wider block">ENTER RECEIVED PASSCODE</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id="entered-sim-otp"
                    placeholder="Enter 6-digit code..."
                    className="bg-slate-950 border border-pink-400/25 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider outline-none text-white w-full"
                  />
                  <button 
                    onClick={() => {
                      const el = document.getElementById('entered-sim-otp');
                      if (el) verifySimulatedCode(el.value);
                    }}
                    className="bg-pink-500 text-white px-4 py-2 text-[10px] uppercase font-black tracking-wider rounded-xl shrink-0 transition-all active:scale-95"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {/* Handshake Logs terminal */}
            <div className="space-y-1 text-xs">
              <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Gateway Sim Logger Output:</span>
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 font-mono text-[9px] text-zinc-400 h-28 overflow-y-auto space-y-1">
                {otpSimLogs.length === 0 ? (
                  <span className="text-zinc-600 block italic">--- Ready to initiate handshakes ---</span>
                ) : (
                  otpSimLogs.map((logStr, idx) => (
                    <p key={idx} className={logStr.includes('✓') ? 'text-emerald-400' : logStr.includes('❌') ? 'text-rose-400' : 'text-zinc-400'}>{logStr}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* Staff Profile Photo setup */}
      {staffData && (
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <span>📷 Administrative Profile Photo Setup</span>
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-slate-950 border border-white/10 overflow-hidden shrink-0 relative">
              {staffData.avatar ? (
                <img src={staffData.avatar} alt="Staff profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/50">
                  {staffData.name ? staffData.name[0] : 'S'}
                </div>
              )}
            </div>
            <div className="space-y-1 grow w-full">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block font-bold">Configure Avatar Photo:</span>
              <input 
                type="text"
                placeholder="Paste avatar URL..."
                value={staffData.avatar || ''}
                onChange={(e) => handleUpdateAvatar(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 px-3.5 py-1.5 rounded-xl outline-none text-white text-xs font-mono mb-2"
              />
              <R2ImageUploader 
                onUploadComplete={handleUpdateAvatar}
                initialImageUrl={staffData.avatar}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Change Password Form Row (Requirement 2) */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
          <span>🛡️ Change System Passcode / Password (Back-end Authenticated)</span>
        </h3>
        
        <p className="text-xs text-slate-400 font-semibold leading-relaxed">
          Update your active administrative workspace password. Changing credentials syncs to relational database tables and updates active session nodes securely.
        </p>

        <form onSubmit={handleChangePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs font-semibold font-sans">
          
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Registered Staff Mobile</label>
            <input 
              type="text" 
              required
              placeholder="e.g. 9999999999"
              value={changeForm.mobile}
              onChange={(e) => setChangeForm({ ...changeForm, mobile: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 px-3.5 py-3 rounded-xl outline-none text-white text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Current Password PIN</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={changeForm.oldPassword}
              onChange={(e) => setChangeForm({ ...changeForm, oldPassword: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 px-3.5 py-3 rounded-xl outline-none text-white text-xs font-bold font-sans"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">New Password PIN</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={changeForm.newPassword}
              onChange={(e) => setChangeForm({ ...changeForm, newPassword: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 px-3.5 py-3 rounded-xl outline-none text-white text-xs font-bold font-sans"
            />
          </div>

          <div className="md:col-span-3 flex justify-between items-center gap-4 pt-2">
            {changeStatus.message && (
              <p className={`text-xs font-bold ${changeStatus.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {changeStatus.message}
              </p>
            )}
            <button 
              type="submit"
              className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl border border-cyan-300 hover:scale-101 active:scale-95 cursor-pointer ml-auto transition-all"
            >
              Update Security PIN
            </button>
          </div>

        </form>
      </div>

      {/* Database Backup & Disaster Recovery Console */}
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              <span>{isHindi ? "डेटाबेस बैकअप एवं रिकवरी केंद्र" : "Database Backup & Disaster Recovery Center"}</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold">
              {isHindi ? "अपने पूरे SQLite / SQL डेटाबेस का संपूर्ण लाइव JSON बैकअप लें या बैकअप फ़ाइल से डेटा पुनर्स्थापित करें।" : "Export complete SQLite database tables into timestamped JSON backup files or restore state securely."}
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleDownloadDatabaseBackup}
            disabled={isDownloading}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>{isDownloading ? (isHindi ? "एक्सपोर्ट हो रहा है..." : "Exporting...") : (isHindi ? "लाइव बैकअप डाउनलोड करें" : "Download Live Backup (.JSON)")}</span>
          </button>
        </div>

        {/* Database Live Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-1 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Products</span>
            <span className="text-lg font-black font-mono text-cyan-300">{products.length}</span>
          </div>
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-1 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Orders</span>
            <span className="text-lg font-black font-mono text-emerald-300">{orders.length}</span>
          </div>
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-1 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Active Partners</span>
            <span className="text-lg font-black font-mono text-amber-300">{partners.length}</span>
          </div>
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-1 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Database Path</span>
            <span className="text-[10px] font-bold font-mono text-slate-300 truncate block" title="/app/applet/swastik_local.db">swastik_local.db</span>
          </div>
        </div>

        {/* Restore Section */}
        <div className="bg-slate-950 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-amber-400" />
              <span>{isHindi ? "फ़ाइल से डेटाबेस रीस्टोर करें" : "Restore Database from Backup File"}</span>
            </h4>
            <p className="text-[10px] text-slate-400">
              {isHindi ? "पहले से डाउनलोड किए गए बैकअप JSON फ़ाइल को चुनकर डेटाबेस रीस्टोर करें। एडमिन सुरक्षा पासवर्ड अनिवार्य है।" : "Select a previously downloaded .json backup file. Authorize with admin security password to replace or restore data."}
            </p>
          </div>

          <form onSubmit={handleRestoreSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">
                  {isHindi ? "बैकअप JSON फ़ाइल *" : "Select Backup JSON File *"}
                </label>
                <div className="flex items-center gap-2 bg-slate-900 border border-white/15 rounded-xl p-2">
                  <FileJson className="h-4 w-4 text-cyan-400 shrink-0 ml-1" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">
                  {isHindi ? "एडमिन सुरक्षा पासवर्ड *" : "Admin Security Password *"}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder={isHindi ? "पासवर्ड दर्ज करें (उदा. admin123)..." : "Enter admin password (e.g. admin123)..."}
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 px-3.5 py-2.5 rounded-xl outline-none text-white text-xs font-mono placeholder:text-slate-600"
                  />
                  <Lock className="h-3.5 w-3.5 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>
            </div>

            {restoreStatus.message && (
              <div className={`p-3 rounded-xl border text-xs font-bold ${
                restoreStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {restoreStatus.message}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isRestoring || !restoreJsonFile}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? (isHindi ? "रीस्टोर हो रहा है..." : "Restoring Database...") : (isHindi ? "डेटाबेस रीस्टोर शुरू करें" : "Authorize & Restore Database")}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
