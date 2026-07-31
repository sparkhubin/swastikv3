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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            <span>{t('profileManagement')}</span>
          </h3>
          <button 
            type="button"
            onClick={handleUpdateProfile}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {isEditing ? (isHindi ? "सहेजें" : "Save Changes") : t('editInfo')}
          </button>
        </div>

        {profileMessage && (
          <p className="mb-4 text-xs font-bold text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{profileMessage}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{t('fullName')}</label>
            {isEditing ? (
              <input 
                type="text" 
                value={profile.fullName || ''} 
                onChange={e => setProfile({...profile, fullName: e.target.value})}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            ) : (
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-900">
                {profile.fullName || 'N/A'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Email Address</label>
            {isEditing ? (
              <input 
                type="email" 
                value={profile.email || ''} 
                onChange={e => setProfile({...profile, email: e.target.value})}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
              />
            ) : (
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-900 font-mono">
                {profile.email || 'N/A'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{t('mobileNumber')}</label>
            <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-900 flex justify-between items-center font-mono">
              <span>{profile.phone}</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">VERIFIED OTP</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Default Delivery Address <span className="text-rose-600 font-black">*</span></span>
              <span className="text-[9px] text-rose-600 font-extrabold uppercase">(Required)</span>
            </label>
            {isEditing ? (
              <textarea 
                rows="2"
                required
                placeholder={isHindi ? "मकान नं., गली/मोहल्ला, लैंडमार्क, शहर, पिन कोड (अनिवार्य)" : "House No., Street/Locality, Landmark, City, Pincode (Mandatory)"}
                value={profile.address || ''} 
                onChange={e => setProfile({...profile, address: e.target.value})}
                className={`px-3.5 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none ${!profile.address || !profile.address.trim() ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`}
              />
            ) : (
              <div className={`px-4 py-3 border rounded-xl text-xs font-bold min-h-[42px] ${!profile.address ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-900'}`}>
                {profile.address || (isHindi ? '⚠️ डिलीवरी पता गायब है - कृपया अपना पता दर्ज करें' : '⚠️ Delivery Address Missing - Please click Edit to save address')}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{t('dob')}</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={profile.dob || ''} 
                  onChange={e => setProfile({...profile, dob: e.target.value})}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setProfile({ ...profile, dob: todayStr });
                  }}
                  className="px-3 py-2 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider rounded-xl hover:bg-emerald-200 transition-all cursor-pointer"
                >
                  Set Today
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-900">
                {profile.dob || 'Not set'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{t('anniversary')}</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={profile.anniversary || ''} 
                  onChange={e => setProfile({...profile, anniversary: e.target.value})}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setProfile({ ...profile, anniversary: todayStr });
                  }}
                  className="px-3 py-2 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider rounded-xl hover:bg-emerald-200 transition-all cursor-pointer"
                >
                  Set Today
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-900">
                {profile.anniversary || 'Not set'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
