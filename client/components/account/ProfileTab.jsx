import React from 'react';
import { User, Smartphone, Send } from 'lucide-react';

export default function ProfileTab({
  profile,
  setProfile,
  isEditing,
  handleUpdateProfile,
  profileMessage,
  isHindi,
  t
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2 text-glow">
            <User className="h-5 w-5 text-cyan-400" />
            <span>{t('profileManagement')}</span>
          </h3>
          <button 
            onClick={handleUpdateProfile}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            {isEditing ? (isHindi ? "सहेजें" : "Save Changes") : t('editInfo')}
          </button>
        </div>

        {profileMessage && (
          <p className="mb-4 text-xs font-bold text-cyan-400 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">{profileMessage}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('fullName')}</label>
            {isEditing ? (
              <input 
                type="text" 
                value={profile.fullName || ''} 
                onChange={e => setProfile({...profile, fullName: e.target.value})}
                className="px-3.5 py-2.5 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all"
              />
            ) : (
              <div className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-xs font-semibold text-slate-200">
                {profile.fullName || 'N/A'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</label>
            {isEditing ? (
              <input 
                type="email" 
                value={profile.email || ''} 
                onChange={e => setProfile({...profile, email: e.target.value})}
                className="px-3.5 py-2.5 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all"
              />
            ) : (
              <div className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-xs font-semibold text-slate-200 font-mono">
                {profile.email || 'N/A'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('mobileNumber')}</label>
            <div className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-xs font-semibold text-slate-200 flex justify-between items-center font-mono">
              <span>{profile.phone}</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Verified OTP</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Default Delivery Address <span className="text-red-400 font-black">*</span></span>
              <span className="text-[9px] text-red-400 font-bold uppercase">(Required)</span>
            </label>
            {isEditing ? (
              <textarea 
                rows="2"
                required
                placeholder={isHindi ? "मकान नं., गली/मोहल्ला, लैंडमार्क, शहर, पिन कोड (अनिवार्य)" : "House No., Street/Locality, Landmark, City, Pincode (Mandatory)"}
                value={profile.address || ''} 
                onChange={e => setProfile({...profile, address: e.target.value})}
                className={`px-3.5 py-2 bg-slate-900/80 border rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all resize-none ${!profile.address || !profile.address.trim() ? 'border-red-500/60 bg-red-500/5' : 'border-white/20'}`}
              />
            ) : (
              <div className={`px-4 py-3 border rounded-xl text-xs font-semibold text-slate-200 min-h-[42px] ${!profile.address ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/5'}`}>
                {profile.address || (isHindi ? '⚠️ डिलीवरी पता गायब है - कृपया अपना पता दर्ज करें' : '⚠️ Delivery Address Missing - Please click Edit to save address')}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('dob')}</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={profile.dob || ''} 
                  onChange={e => setProfile({...profile, dob: e.target.value})}
                  className="px-3.5 py-2 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setProfile({ ...profile, dob: todayStr });
                  }}
                  className="px-3 py-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-500/30 transition-all"
                >
                  Set Today
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-xs font-semibold text-slate-200">
                {profile.dob || 'Not set'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('anniversary')}</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={profile.anniversary || ''} 
                  onChange={e => setProfile({...profile, anniversary: e.target.value})}
                  className="px-3.5 py-2 bg-slate-900/80 border border-white/20 rounded-xl text-xs text-white font-semibold outline-none focus:border-cyan-400 transition-all flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setProfile({ ...profile, anniversary: todayStr });
                  }}
                  className="px-3 py-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-500/30 transition-all"
                >
                  Set Today
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-xs font-semibold text-slate-200">
                {profile.anniversary || 'Not set'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
