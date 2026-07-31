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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Languages className="h-5 w-5 text-emerald-600" />
          <span>App Preferences & Language</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Configure default application preferences and notification alerts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Selection Box */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Languages className="w-4 h-4 text-emerald-600" />
            <span>Interface Language</span>
          </h4>

          <div className="space-y-2 font-medium text-xs">
            <label className="flex items-center justify-between p-3.5 rounded-xl border bg-emerald-50 border-emerald-300 text-slate-900 cursor-default shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-base">🇬🇧</span>
                <div>
                  <p className="font-bold">English</p>
                  <p className="text-[10px] text-slate-500 font-medium">Default Active Language</p>
                </div>
              </div>
              <input type="radio" name="lang" checked={true} readOnly className="accent-emerald-600" />
            </label>
          </div>
        </div>

        {/* Notifications Box */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>Notification Toggles</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Order Live Status Updates</p>
                <p className="text-[10px] text-slate-500 font-medium">Instant SMS/WhatsApp when order status changes</p>
              </div>
              <input 
                type="checkbox" 
                checked={orderUpdatesNotify} 
                onChange={e => setOrderUpdatesNotify(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" 
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Special Festival Deals & Offers</p>
                <p className="text-[10px] text-slate-500 font-medium">Weekly promotional discounts & festival sale codes</p>
              </div>
              <input 
                type="checkbox" 
                checked={promoOffersNotify} 
                onChange={e => setPromoOffersNotify(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
