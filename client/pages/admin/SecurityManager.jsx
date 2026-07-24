import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { ShieldAlert, Smartphone, Database, RefreshCw, User } from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function SecurityManager({ userRole, setUserRole }) {
  const { isHindi } = useLanguage();
  const { userRole: glbRole, setUserRole: setGlbRole, changeStaffPassword } = useData();

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
        const data = await res.json();
        const code = data.simulated_code;
        setLatestOtpCode(code);
        setOtpSmsSent(true);

        const timestamp = new Date().toLocaleTimeString();
        const newLog = `[${timestamp}] Outbound via Meta API (Template: reference_no): "Hello Note ${code} is Your Reference." sent to ${otpPhone}`;
        setOtpSimLogs(prev => [newLog, ...prev]);
      } else {
        alert("WA Gateway refused connection: try inputting a valid numbers block");
      }
    } catch(e) {
      console.error(e);
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setLatestOtpCode(code);
      setOtpSmsSent(true);

      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] (Local WA Simulator): sent OTP template 'reference_no' rendering "Hello Note ${code} is Your Reference." to ${otpPhone}`;
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

    </div>
  );
}
