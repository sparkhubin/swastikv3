import React from 'react';
import { Languages, Bell } from 'lucide-react';

export default function PreferencesTab({
  language,
  setLanguage,
  orderUpdatesNotify,
  setOrderUpdatesNotify,
  promoOffersNotify,
  setPromoOffersNotify,
  isHindi,
  t
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2 text-glow">
          <Languages className="h-5 w-5 text-cyan-400" />
          <span>{isHindi ? "प्राथमिकताएं एवं भाषा" : "App Preferences & Language"}</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {isHindi ? "अपनी पसंदीदा भाषा एवं नोटिफिकेशन प्राथमिकताएं सेट करें" : "Configure interface display language and push message alerts"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Selection Box */}
        <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Languages className="w-4 h-4 text-cyan-400" />
            <span>{isHindi ? "ऐप इंटरफ़ेस भाषा" : "Interface Language"}</span>
          </h4>

          <div className="space-y-2 font-medium text-xs">
            <label 
              onClick={() => setLanguage('en')}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                language === 'en' 
                  ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200' 
                  : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🇬🇧</span>
                <div>
                  <p className="font-bold">English</p>
                  <p className="text-[10px] text-slate-400">Default System Language</p>
                </div>
              </div>
              <input type="radio" name="lang" checked={language === 'en'} readOnly className="accent-cyan-400" />
            </label>

            <label 
              onClick={() => setLanguage('hi')}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                language === 'hi' 
                  ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200' 
                  : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🇮🇳</span>
                <div>
                  <p className="font-bold">हिंदी (Hindi)</p>
                  <p className="text-[10px] text-slate-400">संपूर्ण इंटरफ़ेस हिंदी में</p>
                </div>
              </div>
              <input type="radio" name="lang" checked={language === 'hi'} readOnly className="accent-cyan-400" />
            </label>
          </div>
        </div>

        {/* Notifications Box */}
        <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>{isHindi ? "नोटिफिकेशन अलर्ट्स" : "Notification Toggles"}</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-white/5">
              <div>
                <p className="font-bold text-white">{isHindi ? "ऑर्डर स्थिति अपडेट्स" : "Order Live Status Updates"}</p>
                <p className="text-[10px] text-slate-400">{isHindi ? "डिस्पैच एवं डिलीवरी की रियल-टाइम सूचना" : "Instant SMS/WhatsApp when order status changes"}</p>
              </div>
              <input 
                type="checkbox" 
                checked={orderUpdatesNotify} 
                onChange={e => setOrderUpdatesNotify(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer" 
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-white/5">
              <div>
                <p className="font-bold text-white">{isHindi ? "ऑफ़र्स एवं डिस्काउंट अलर्ट्स" : "Special Festival Deals & Offers"}</p>
                <p className="text-[10px] text-slate-400">{isHindi ? "साप्ताहिक डिस्काउंट्स एवं प्रोमो कूपन" : "Weekly promotional discounts & festival sale codes"}</p>
              </div>
              <input 
                type="checkbox" 
                checked={promoOffersNotify} 
                onChange={e => setPromoOffersNotify(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
