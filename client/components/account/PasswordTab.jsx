import React from 'react';
import { Lock, Key, KeyRound, ShieldCheck } from 'lucide-react';

export default function PasswordTab({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  handleUpdatePassword,
  securityMessage,
  isHindi,
  t
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white">
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2 text-glow">
          <Lock className="h-5 w-5 text-cyan-400" />
          <span>{isHindi ? "सुरक्षा एवं पासवर्ड प्रबंधन" : "Password & Security Center"}</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {isHindi ? "अपने खाते की सुरक्षा बढ़ाने के लिए पासवर्ड अपडेट करें" : "Update your account credential and manage active security options"}
        </p>
      </div>

      {securityMessage && (
        <p className="mb-6 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
          {securityMessage}
        </p>
      )}

      <form onSubmit={handleUpdatePassword} className="max-w-xl space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3 h-3 text-cyan-400" />
            <span>{isHindi ? "वर्तमान पासवर्ड" : "Current Password"}</span>
          </label>
          <input 
            type="password" 
            placeholder="••••••••"
            value={currentPassword} 
            onChange={e => setCurrentPassword(e.target.value)}
            className="px-4 py-3 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all font-mono"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3 h-3 text-cyan-400" />
            <span>{isHindi ? "नया पासवर्ड" : "New Password"}</span>
          </label>
          <input 
            type="password" 
            placeholder={isHindi ? "कम से कम 6 अक्षर" : "At least 6 characters"}
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)}
            className="px-4 py-3 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all font-mono"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3 h-3 text-cyan-400" />
            <span>{isHindi ? "नए पासवर्ड की पुष्टि करें" : "Confirm New Password"}</span>
          </label>
          <input 
            type="password" 
            placeholder={isHindi ? "पुनः नया पासवर्ड दर्ज करें" : "Re-enter new password"}
            value={confirmNewPassword} 
            onChange={e => setConfirmNewPassword(e.target.value)}
            className="px-4 py-3 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all font-mono"
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-98 cursor-pointer mt-2"
        >
          🔒 {isHindi ? "पासवर्ड अपडेट करें" : "Update Account Password"}
        </button>
      </form>

      <div className="mt-8 pt-5 border-t border-white/10 flex items-center gap-3 text-slate-400 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <p>
          {isHindi ? "आपका पासवर्ड 256-बिट एन्क्रिप्शन से सुरक्षित है। आप हमेशा अपने रजिस्टर्ड मोबाइल नंबर पर OTP प्राप्त करके लॉगिन कर सकते हैं।" : "Your credentials are stored using secure encryption hash. You can always sign in using fast 4-digit OTP directly on your phone."}
        </p>
      </div>
    </div>
  );
}
