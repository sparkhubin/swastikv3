import React from 'react';
import { Gift, Copy, Check, Share2, History, Users } from 'lucide-react';

export default function RewardsTab({
  profile,
  userReferralCode,
  handleCopyCode,
  copied,
  handleWhatsAppShare,
  referralSettings,
  myReferredCustomers = [],
  isHindi
}) {
  const pointsVal = (profile.points || 0) * (referralSettings?.pointsValueInINR || 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          <span>{isHindi ? "रिवॉर्ड्स अंक एवं रेफ़रल सेंटर" : "Rewards Wallet & Referral Hub"}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {isHindi ? "दोस्तों को आमंत्रित करें और हर सफल खरीदारी पर शॉपिंग पॉइंट्स प्राप्त करें" : "Invite friends and earn instant cash-convertible discount points on every order"}
        </p>
      </div>

      {/* Points Balance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl md:col-span-1 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">{isHindi ? "कुल उपलब्ध पॉइंट्स" : "Total Available Points"}</p>
            <div className="text-3xl font-black text-amber-600 font-mono mt-1">{profile.points || 0} <span className="text-sm font-bold text-slate-500">PTS</span></div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200 text-xs text-slate-700 flex justify-between items-center font-mono font-medium">
            <span>{isHindi ? "अनुमानित मूल्य:" : "Cash Value:"}</span>
            <span className="font-extrabold text-emerald-700">₹{pointsVal}</span>
          </div>
        </div>

        {/* User's Invite Code Box */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl md:col-span-2 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{isHindi ? "आपका व्यक्तिगत रेफ़रल कोड" : "Your Personal Invite Code"}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap sm:flex-nowrap">
              <div className="px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-lg font-black text-amber-700 tracking-widest font-mono select-all shadow-xs">
                {userReferralCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-xl text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (isHindi ? "कॉपी हुआ!" : "Copied!") : (isHindi ? "कोड कॉपी करें" : "Copy Code")}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer sm:ml-auto"
              >
                <Share2 className="w-4 h-4" />
                <span>{isHindi ? "शेयर करें" : "Share"}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium mt-3">
            {isHindi ? `आपका मित्र इस कोड से साइन अप करेगा तो आपको ${referralSettings?.referralPointsEarned || 50} अंक मिलेंगे!` : `Give friends your code. You get ${referralSettings?.referralPointsEarned || 50} bonus points when they complete their first purchase!`}
          </p>
        </div>
      </div>

      {/* My Referred Customers Section */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>{isHindi ? "मेरे रेफर किए गए ग्राहक" : "My Referred Customers"}</span>
          </h4>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-black font-mono">
            {myReferredCustomers.length} {isHindi ? "ग्राहक" : "Referred"}
          </span>
        </div>

        {myReferredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase text-[9px] font-extrabold">
                  <th className="py-2 px-2">{isHindi ? "ग्राहक का नाम" : "Customer Name"}</th>
                  <th className="py-2 px-2">{isHindi ? "मोबाइल" : "Phone"}</th>
                  <th className="py-2 px-2">{isHindi ? "स्थिति" : "Status"}</th>
                  <th className="py-2 px-2 text-right">{isHindi ? "अर्जित अंक" : "Points Earned"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {myReferredCustomers.map((cust, idx) => (
                  <tr key={cust.id || idx} className="hover:bg-slate-100 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-slate-900">{cust.name}</td>
                    <td className="py-2.5 px-2 text-slate-600">{cust.phone ? cust.phone.replace(/(\d{3})(\d{4})(\d{3})/, '+$1 **** $3') : 'N/A'}</td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {isHindi ? "सक्रिय ग्राहक" : "Active Member"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-emerald-700">+{referralSettings?.referralPointsEarned || 50} PTS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-600">
            <p className="font-extrabold text-slate-800">{isHindi ? "अभी तक किसी ग्राहक ने आपके कोड का उपयोग नहीं किया है।" : "No customers registered with your referral code yet."}</p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">{isHindi ? `अपने मित्रों को अपना कोड (${userReferralCode}) शेयर करें और प्रत्येक सफल साइन अप पर ${referralSettings?.referralPointsEarned || 50} अंक प्राप्त करें!` : `Share your code (${userReferralCode}) with friends to earn ${referralSettings?.referralPointsEarned || 50} bonus points per referral!`}</p>
          </div>
        )}
      </div>

      {/* Points Ledger Timeline */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <span>{isHindi ? "रिवॉर्ड्स पॉइंट्स लेजर" : "Loyalty Rewards Transaction Ledger"}</span>
        </h4>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-slate-900 font-bold">{isHindi ? "स्वागत बोनस अंक" : "Welcome Registration Bonus"}</p>
              <p className="text-[10px] text-slate-500 font-medium font-sans">Account Creation Reward</p>
            </div>
            <span className="text-emerald-700 font-extrabold">+50 PTS</span>
          </div>

          {profile.referredBy && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-slate-900 font-bold">{isHindi ? "रेफ़रल बोनस कोड:" : "Referred By Code:"} {profile.referredBy}</p>
                <p className="text-[10px] text-slate-500 font-medium font-sans">Friend Invitation Reward</p>
              </div>
              <span className="text-emerald-700 font-extrabold">+{referralSettings?.referralPointsEarned || 50} PTS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
