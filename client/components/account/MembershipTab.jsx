import React from 'react';
import { Crown, CheckCircle2, Printer, ShieldCheck } from 'lucide-react';

export default function MembershipTab({
  profile,
  setProfile,
  setShowPrimePayment,
  primeSettings,
  isHindi
}) {
  const isMembershipEnabled = primeSettings?.isMembershipEnabled ?? true;
  const planFee = primeSettings?.primePlanFee ?? 299;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <span>{isHindi ? "स्वास्तिक प्राइम मेंबरशिप" : "Swastik Prime Membership"}</span>
          </h3>

          {profile.membershipStatus === 'Active' ? (
            <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              VIP GOLD MEMBER
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-extrabold text-xs uppercase tracking-wider">
              REGULAR ACCOUNT
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {isHindi ? "मुफ्त डिलीवरी, प्राथमिकता प्रेषण एवं विशेष 2X रिवॉर्ड्स अंक प्राप्त करें" : "Enjoy free fast shipping, VIP priority dispatch & 2X reward points on all orders"}
        </p>
      </div>

      {profile.membershipStatus !== 'Active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200">
              <h4 className="text-sm font-extrabold text-amber-900 uppercase tracking-wider mb-3">
                ⭐ {isHindi ? "प्राइम मेंबरशिप के विशेष फायदे" : "Prime VIP Exclusive Membership Perks"}
              </h4>

              <ul className="space-y-2.5 text-xs text-slate-800 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isHindi ? (primeSettings?.primeBenefit1Hi || "हर ऑर्डर पर 100% मुफ्त एक्सप्रेस होम डिलीवरी") : (primeSettings?.primeBenefit1En || "100% Free Express Home Delivery on all grocery orders")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isHindi ? (primeSettings?.primeBenefit2Hi || "प्राथमिकता वेयरहाउस पैकिंग और त्वरित प्रेषण") : (primeSettings?.primeBenefit2En || "Priority Warehouse Express Packing & Immediate Dispatch")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isHindi ? (primeSettings?.primeBenefit3Hi || "2X रिवॉर्ड पॉइंट्स हर ₹100 की खरीदारी पर") : (primeSettings?.primeBenefit3En || "2X Double Reward Points on every ₹100 spent")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isHindi ? "विशेष त्यौहार ऑफर्स एवं अर्ली एक्सेस" : "Festival Special Discounts & VIP Early Sale Access"}</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{isHindi ? "वार्षिक सदस्यता शुल्क" : "Annual Prime Fee"}</p>
                  <p className="text-xl font-black text-amber-600 font-mono">₹{planFee} <span className="text-xs text-slate-500 font-normal">/ {isHindi ? "वर्ष" : "year"}</span></p>
                </div>
                {isMembershipEnabled ? (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                    {isHindi ? "ऑनलाइन व ऑफलाइन उपलब्ध" : "Gateway & Cash Options Available"}
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg">
                    {isHindi ? "खरीद विकल्प बंद है" : "Self-Buying Disabled"}
                  </span>
                )}
              </div>

              {!isMembershipEnabled ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>{isHindi ? "सदस्यता स्व-खरीद बंद है" : "Self-Buying Option Disabled by Admin"}</span>
                  </p>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {isHindi 
                      ? "ऑनलाइन या ऑफलाइन मेंबरशिप स्व-खरीद एडमिन द्वारा बंद की गई है। जब स्टोर एडमिन आपके लिए मैन्युअल रूप से कार्ड जारी करेगा, तभी आपके पास वीआईपी प्राइम कार्ड एक्टिव होगा।" 
                      : "Self-buying membership is currently disabled by store management. VIP Membership Pass will only appear here when manually created or issued by store admin."}
                  </p>
                </div>
              ) : (
                <div className="pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowPrimePayment(true)}
                    className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>💳</span>
                    <span>{isHindi ? "पेमेंट गेटवे द्वारा खरीदें" : "Buy via Payment Gateway"}</span>
                  </button>

                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 rounded-2xl text-center space-y-3 relative overflow-hidden shadow-md text-white">
            <Crown className="w-12 h-12 text-white mx-auto animate-bounce" />
            <h5 className="font-black text-lg text-white">{isHindi ? "स्वास्तिक प्राइम मेंबर पास" : "Swastik Prime VIP Gold Pass"}</h5>
            <p className="text-xs text-amber-100 leading-relaxed font-medium">
              {isHindi ? "सदस्यता लेने के तुरंत बाद आपका डिजिटल मेंबरशिप कार्ड जनरेट हो जाएगा जिसे आप प्रिंट भी कर सकते हैं।" : "Instant digital pass generation with scannable verification code upon activation."}
            </p>
          </div>
        </div>
      ) : (
        /* Active Membership VIP Pass Card */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/20 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center text-white font-bold text-xl shadow-xs">
                  👑
                </div>
                <div>
                  <h4 className="font-black text-base text-white tracking-wide uppercase">Swastik Prime VIP Gold Pass</h4>
                  <p className="text-[10px] text-amber-100 font-mono tracking-wider font-semibold">MEMBER ID: SWASTIK-PRIME-{profile.phone ? profile.phone.slice(-4) : '9999'}</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-white text-slate-900 font-extrabold text-[10px] uppercase tracking-widest flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active & Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-black/15 p-3 rounded-xl border border-white/10">
                <p className="text-[9px] text-amber-100 font-extrabold uppercase tracking-wider">{isHindi ? "कार्डधारक" : "Card Holder"}</p>
                <p className="font-extrabold text-white text-sm mt-0.5">{profile.fullName || 'Valued Member'}</p>
              </div>

              <div className="bg-black/15 p-3 rounded-xl border border-white/10">
                <p className="text-[9px] text-amber-100 font-extrabold uppercase tracking-wider">{isHindi ? "जारी तिथि" : "Issued Date"}</p>
                <p className="font-bold text-white mt-0.5">{new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-black/15 p-3 rounded-xl border border-white/10">
                <p className="text-[9px] text-amber-100 font-extrabold uppercase tracking-wider">{isHindi ? "वैधता" : "Valid Till"}</p>
                <p className="font-extrabold text-amber-200 mt-0.5">{new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span>{isHindi ? "मुफ्त डिलीवरी और 2X रिवॉर्ड पॉइंट्स सक्रिय हैं" : "Free Express Shipping & 2X Reward Points actively applied"}</span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Swastik Prime Pass - ${profile.fullName}</title>
                          <style>
                            body { font-family: sans-serif; padding: 40px; background: #ffffff; color: #0f172a; text-align: center; }
                            .card { border: 2px solid #f59e0b; padding: 30px; border-radius: 20px; max-width: 450px; margin: auto; background: #fff8f0; }
                            h2 { color: #d97706; margin-bottom: 5px; }
                            .badge { background: #f59e0b; color: #000; padding: 4px 12px; font-weight: bold; border-radius: 6px; display: inline-block; }
                            .info { margin-top: 20px; text-align: left; line-height: 1.8; font-size: 14px; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <h2>Swastik Supermarket</h2>
                            <div class="badge">PRIME VIP GOLD MEMBER</div>
                            <div class="info">
                              <p><strong>Name:</strong> ${profile.fullName}</p>
                              <p><strong>Phone:</strong> ${profile.phone}</p>
                              <p><strong>Status:</strong> Active</p>
                              <p><strong>Benefits:</strong> Free Express Shipping, 2X Points</p>
                            </div>
                          </div>
                          <script>window.onload = function() { window.print(); window.close(); }</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-4 py-2 bg-white text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>{isHindi ? "कार्ड प्रिंट करें" : "Print Pass Card"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(isHindi ? "सदस्यता रीसेट करें?" : "Revert Prime Status for demo testing?")) {
                      setProfile({ ...profile, membershipStatus: 'Cancelled' });
                    }
                  }}
                  className="px-3 py-2 bg-black/20 hover:bg-black/30 text-white text-xs rounded-xl transition-all cursor-pointer font-bold"
                  title="Demo Reset"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
