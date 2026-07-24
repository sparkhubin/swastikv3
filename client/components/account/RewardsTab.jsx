import React from 'react';
import { Gift, Copy, Check, Share2, ArrowRight, History, Users } from 'lucide-react';

export default function RewardsTab({
  profile,
  userReferralCode,
  handleCopyCode,
  copied,
  inputReferralCode,
  setInputReferralCode,
  handleClaimReferral,
  handleWhatsAppShare,
  referralSettings,
  myReferredCustomers = [],
  isHindi
}) {
  const pointsVal = (profile.points || 0) * (referralSettings?.pointsValueInINR || 1);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2 text-glow">
          <Gift className="h-5 w-5 text-amber-400" />
          <span>{isHindi ? "रिवॉर्ड्स अंक एवं रेफ़रल सेंटर" : "Rewards Wallet & Referral Hub"}</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {isHindi ? "दोस्तों को आमंत्रित करें और हर सफल खरीदारी पर शॉपिंग पॉइंट्स प्राप्त करें" : "Invite friends and earn instant cash-convertible discount points on every order"}
        </p>
      </div>

      {/* Points Balance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-5 rounded-2xl md:col-span-1 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">{isHindi ? "कुल उपलब्ध पॉइंट्स" : "Total Available Points"}</p>
            <div className="text-3xl font-black text-amber-400 font-mono mt-1">{profile.points || 0} <span className="text-sm font-normal text-slate-300">PTS</span></div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs text-slate-300 flex justify-between items-center font-mono">
            <span>{isHindi ? "अनुमानित मूल्य:" : "Cash Value:"}</span>
            <span className="font-bold text-emerald-400">₹{pointsVal}</span>
          </div>
        </div>

        {/* User's Invite Code Box */}
        <div className="bg-slate-900/80 border border-white/10 p-5 rounded-2xl md:col-span-2 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{isHindi ? "आपका व्यक्तिगत रेफ़रल कोड" : "Your Personal Invite Code"}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="px-4 py-2.5 bg-slate-950 border border-amber-400/40 rounded-xl text-lg font-black text-amber-300 tracking-widest font-mono select-all">
                {userReferralCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (isHindi ? "कॉपी हुआ!" : "Copied!") : (isHindi ? "कोड कॉपी करें" : "Copy Code")}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isHindi ? "शेयर करें" : "Share"}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            {isHindi ? `आपका मित्र इस कोड से साइन अप करेगा तो आपको ${referralSettings?.referralPointsEarned || 50} अंक मिलेंगे!` : `Give friends your code. You get ${referralSettings?.referralPointsEarned || 50} bonus points when they complete their first purchase!`}
          </p>
        </div>
      </div>

      {/* Claim Friend's Code */}
      <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl">
        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-2">
          🎁 {isHindi ? "मित्र का रेफ़रल कोड लागू करें" : "Redeem a Friend's Referral Code"}
        </h4>
        <form onSubmit={handleClaimReferral} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={isHindi ? "रेफ़रल कोड दर्ज करें (उदा. ABHI1234)" : "Enter referral code (e.g. SWASTIK50)"}
            value={inputReferralCode}
            onChange={e => setInputReferralCode(e.target.value)}
            disabled={!!profile.referredBy}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-all font-mono uppercase"
          />
          <button
            type="submit"
            disabled={!!profile.referredBy}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
          >
            <span>{profile.referredBy ? (isHindi ? "दावा किया गया" : "Already Claimed") : (isHindi ? "पॉइंट्स प्राप्त करें" : "Redeem Points")}</span>
            {!profile.referredBy && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* My Referred Customers Section */}
      <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{isHindi ? "मेरे रेफर किए गए ग्राहक" : "My Referred Customers"}</span>
          </h4>
          <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full text-[10px] font-black font-mono">
            {myReferredCustomers.length} {isHindi ? "ग्राहक" : "Referred"}
          </span>
        </div>

        {myReferredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[9px]">
                  <th className="py-2 px-2">{isHindi ? "ग्राहक का नाम" : "Customer Name"}</th>
                  <th className="py-2 px-2">{isHindi ? "मोबाइल" : "Phone"}</th>
                  <th className="py-2 px-2">{isHindi ? "स्थिति" : "Status"}</th>
                  <th className="py-2 px-2 text-right">{isHindi ? "अर्जित अंक" : "Points Earned"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {myReferredCustomers.map((cust, idx) => (
                  <tr key={cust.id || idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-white">{cust.name}</td>
                    <td className="py-2.5 px-2 text-slate-400">{cust.phone ? cust.phone.replace(/(\d{3})(\d{4})(\d{3})/, '+$1 **** $3') : 'N/A'}</td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {isHindi ? "सक्रिय ग्राहक" : "Active Member"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">+{referralSettings?.referralPointsEarned || 50} PTS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-300">{isHindi ? "अभी तक किसी ग्राहक ने आपके कोड का उपयोग नहीं किया है।" : "No customers registered with your referral code yet."}</p>
            <p className="text-[10px] text-slate-500 mt-1">{isHindi ? `अपने मित्रों को अपना कोड (${userReferralCode}) शेयर करें और प्रत्येक सफल साइन अप पर ${referralSettings?.referralPointsEarned || 50} अंक प्राप्त करें!` : `Share your code (${userReferralCode}) with friends to earn ${referralSettings?.referralPointsEarned || 50} bonus points per referral!`}</p>
          </div>
        )}
      </div>

      {/* Points Ledger Timeline */}
      <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <span>{isHindi ? "रिवॉर्ड्स पॉइंट्स लेजर" : "Loyalty Rewards Transaction Ledger"}</span>
        </h4>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex justify-between items-center">
            <div>
              <p className="text-white font-bold">{isHindi ? "स्वागत बोनस अंक" : "Welcome Registration Bonus"}</p>
              <p className="text-[10px] text-slate-500">Account Creation Reward</p>
            </div>
            <span className="text-emerald-400 font-bold">+50 PTS</span>
          </div>

          {profile.referredBy && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex justify-between items-center">
              <div>
                <p className="text-white font-bold">{isHindi ? "रेफ़रल बोनस कोड:" : "Referred By Code:"} {profile.referredBy}</p>
                <p className="text-[10px] text-slate-500">Friend Invitation Reward</p>
              </div>
              <span className="text-emerald-400 font-bold">+{referralSettings?.referralPointsEarned || 50} PTS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
