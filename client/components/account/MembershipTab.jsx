import React from 'react';
import { Crown, CheckCircle2, Printer, ShieldCheck } from 'lucide-react';

export default function MembershipTab({
  profile,
  setProfile,
  setShowPrimePayment,
  isHindi
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white">
      <div className="border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2 text-glow">
            <Crown className="h-5 w-5 text-amber-400" />
            <span>{isHindi ? "स्वास्तिक प्राइम मेंबरशिप" : "Swastik Prime Membership"}</span>
          </h3>

          {profile.isPrimeActive ? (
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-amber-400/20">
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              VIP GOLD MEMBER
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold text-xs uppercase tracking-wider">
              REGULAR ACCOUNT
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {isHindi ? "मुफ्त डिलीवरी, प्राथमिकता प्रेषण एवं विशेष 2X रिवॉर्ड्स अंक प्राप्त करें" : "Enjoy free fast shipping, VIP priority dispatch & 2X reward points on all orders"}
        </p>
      </div>

      {!profile.isPrimeActive ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 p-5 rounded-2xl border border-amber-500/30">
              <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider mb-3">
                ⭐ {isHindi ? "प्राइम मेंबरशिप के विशेष फायदे" : "Prime VIP Exclusive Membership Perks"}
              </h4>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isHindi ? "हर ऑर्डर पर 100% मुफ्त एक्सप्रेस होम डिलीवरी" : "100% Free Express Home Delivery on all grocery orders"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isHindi ? "प्राथमिकता वेयरहाउस पैकिंग और त्वरित प्रेषण" : "Priority Warehouse Express Packing & Immediate Dispatch"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isHindi ? "2X रिवॉर्ड पॉइंट्स हर ₹100 की खरीदारी पर" : "2X Double Reward Points on every ₹100 spent"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isHindi ? "विशेष त्यौहार ऑफर्स एवं अर्ली एक्सेस" : "Festival Special Discounts & VIP Early Sale Access"}</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isHindi ? "वार्षिक सदस्यता शुल्क" : "Annual Prime Fee"}</p>
                  <p className="text-xl font-black text-amber-400 font-mono">₹299 <span className="text-xs text-slate-400 font-normal">/ {isHindi ? "वर्ष" : "year"}</span></p>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                  {isHindi ? "ऑनलाइन व ऑफलाइन उपलब्ध" : "Gateway & Cash Options Available"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPrimePayment(true)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>💳</span>
                  <span>{isHindi ? "पेमेंट गेटवे द्वारा खरीदें" : "Buy via Payment Gateway"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(isHindi 
                      ? "क्या आप स्टोर काउंटर / कैश ऑन डिलीवरी द्वारा ऑफलाइन भुगतान चुनकर स्वास्तिक प्राइम सक्रिय करना चाहते हैं?" 
                      : "Activate Swastik Prime with Offline / Cash at Store or COD payment option?")) {
                      setProfile(prev => ({ ...prev, isPrimeActive: true }));
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>💵</span>
                  <span>{isHindi ? "ऑफलाइन / नकद से खरीदें" : "Buy via Offline / Cash"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-amber-500/30 text-center space-y-3 relative overflow-hidden shadow-2xl">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
            <Crown className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
            <h5 className="font-extrabold text-base text-amber-300">{isHindi ? "स्वास्तिक प्राइम मेंबर पास" : "Swastik Prime VIP Gold Pass"}</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isHindi ? "सदस्यता लेने के तुरंत बाद आपका डिजिटल मेंबरशिप कार्ड जनरेट हो जाएगा जिसे आप प्रिंट भी कर सकते हैं।" : "Instant digital pass generation with scannable verification code upon activation."}
            </p>
          </div>
        </div>
      ) : (
        /* Active Membership VIP Pass Card */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 p-6 rounded-2xl border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-400/20 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xl shadow-lg">
                  👑
                </div>
                <div>
                  <h4 className="font-black text-base text-amber-300 tracking-wide uppercase">Swastik Prime VIP Gold Pass</h4>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">MEMBER ID: SWASTIK-PRIME-{profile.phone ? profile.phone.slice(-4) : '9999'}</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Active & Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{isHindi ? "कार्डधारक" : "Card Holder"}</p>
                <p className="font-extrabold text-white text-sm mt-0.5">{profile.fullName || 'Valued Member'}</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{isHindi ? "जारी तिथि" : "Issued Date"}</p>
                <p className="font-bold text-slate-200 mt-0.5">{new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{isHindi ? "वैधता" : "Valid Till"}</p>
                <p className="font-bold text-amber-400 mt-0.5">{new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-amber-400/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
                            body { font-family: sans-serif; padding: 40px; background: #0f172a; color: white; text-align: center; }
                            .card { border: 2px solid #f59e0b; padding: 30px; border-radius: 20px; max-w: 450px; margin: auto; background: #1e293b; }
                            h2 { color: #f59e0b; margin-bottom: 5px; }
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4 text-indigo-400" />
                  <span>{isHindi ? "कार्ड प्रिंट करें" : "Print Pass Card"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(isHindi ? "सदस्यता रीसेट करें?" : "Revert Prime Status for demo testing?")) {
                      setProfile({ ...profile, isPrimeActive: false });
                    }
                  }}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs rounded-xl transition-all"
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
