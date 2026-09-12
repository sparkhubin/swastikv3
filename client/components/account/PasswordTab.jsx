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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-600" />
          <span>{isHindi ? "सुरक्षा एवं पासवर्ड प्रबंधन" : "Password & Security Center"}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {isHindi ? "अपने खाते की सुरक्षा बढ़ाने के लिए पासवर्ड अपडेट करें" : "Update your account credentials and manage active security options"}
        </p>
      </div>

      {securityMessage && (
        <p className="mb-6 text-xs font-bold text-emerald-800 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
          {securityMessage}
        </p>
      )}

      <form onSubmit={handleUpdatePassword} className="max-w-xl space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isHindi ? "वर्तमान पासवर्ड" : "Current Password"}</span>
          </label>
          <input 
            type="password" 
            placeholder="••••••••"
            value={currentPassword} 
            onChange={e => setCurrentPassword(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isHindi ? "नया पासवर्ड" : "New Password"}</span>
          </label>
          <input 
            type="password" 
            placeholder={isHindi ? "कम से कम 6 अक्षर" : "At least 6 characters"}
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isHindi ? "नए पासवर्ड की पुष्टि करें" : "Confirm New Password"}</span>
          </label>
          <input 
            type="password" 
            placeholder={isHindi ? "पुनः नया पासवर्ड दर्ज करें" : "Re-enter new password"}
            value={confirmNewPassword} 
            onChange={e => setConfirmNewPassword(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer mt-2"
        >
          🔒 {isHindi ? "पासवर्ड अपडेट करें" : "Update Account Password"}
        </button>
      </form>

      <div className="mt-8 pt-5 border-t border-slate-200 flex items-center gap-3 text-slate-600 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="font-medium">
          {isHindi ? "आपका पासवर्ड सुरक्षित हैश के रूप में संग्रहीत है। आप अपने पंजीकृत मोबाइल नंबर पर 6-अंकीय OTP प्राप्त करके लॉगिन कर सकते हैं।" : "Your credentials are stored using secure password hashing. You can also sign in using a 6-digit OTP sent to your registered phone."}
        </p>
      </div>
    </div>
  );
}
