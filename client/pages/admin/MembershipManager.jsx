import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { Crown, CheckCircle2, Shield, Users, Edit3, Award, Sparkles, AlertCircle } from 'lucide-react';

export default function MembershipManager({ userRole, isAdminDark = true }) {
  const { isHindi } = useLanguage();
  const { primeSettings, setPrimeSettings, customers, updateCustomer } = useData();

  // Settings state
  const [isMembershipEnabled, setIsMembershipEnabled] = useState(() => primeSettings?.isMembershipEnabled ?? true);
  const [primePlanFee, setPrimePlanFee] = useState(() => primeSettings?.primePlanFee ?? 299);
  
  const [pBen1En, setPBen1En] = useState(() => primeSettings?.primeBenefit1En ?? 'Free / Reduced Delivery');
  const [pBenDesc1En, setPBenDesc1En] = useState(() => primeSettings?.primeBenefitDesc1En ?? 'Maximum relief on all location groups');
  const [pBen1Hi, setPBen1Hi] = useState(() => primeSettings?.primeBenefit1Hi ?? 'जीरो डिलीवरी शुल्क');
  const [pBenDesc1Hi, setPBenDesc1Hi] = useState(() => primeSettings?.primeBenefitDesc1Hi ?? 'सभी चुनिंदा क्षेत्रों पर भारी बचत');

  const [pBen2En, setPBen2En] = useState(() => primeSettings?.primeBenefit2En ?? 'VIP Priority Dispatch');
  const [pBenDesc2En, setPBenDesc2En] = useState(() => primeSettings?.primeBenefitDesc2En ?? 'Express processing by our direct team');
  const [pBen2Hi, setPBen2Hi] = useState(() => primeSettings?.primeBenefit2Hi ?? 'अल्ट्रा-फास्ट स्लॉट');
  const [pBenDesc2Hi, setPBenDesc2Hi] = useState(() => primeSettings?.primeBenefitDesc2Hi ?? 'आपका आर्डर सबसे पहले पैक और डिलीवर होगा');

  const [pBen3En, setPBen3En] = useState(() => primeSettings?.primeBenefit3En ?? '2x Loyalty Points');
  const [pBenDesc3En, setPBenDesc3En] = useState(() => primeSettings?.primeBenefitDesc3En ?? 'Earn bonus cashbacks on every single cart');
  const [pBen3Hi, setPBen3Hi] = useState(() => primeSettings?.primeBenefit3Hi ?? 'दोगुना रिवॉर्ड');
  const [pBenDesc3Hi, setPBenDesc3Hi] = useState(() => primeSettings?.primeBenefitDesc3Hi ?? 'हर खरीद पर डबल अंक कमाएं');

  const [feedback, setFeedback] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [editingCardCustId, setEditingCardCustId] = useState(null);
  const [customCardInput, setCustomCardInput] = useState('');

  const startEditingCard = (cust) => {
    setEditingCardCustId(cust.id);
    setCustomCardInput(cust.primeMembershipNo || `SP-VIP-${cust.id || Math.floor(100+Math.random()*900)}`);
  };

  const saveCustomCard = (cust) => {
    const val = customCardInput.trim() || `SP-VIP-${cust.id}`;
    updateCustomer(cust.id, {
      ...cust,
      isPrime: true,
      primeMembershipNo: val
    });
    setEditingCardCustId(null);
    setFeedback(isHindi ? `वीआईपी कार्ड नंबर '${val}' अद्यतन किया गया!` : `VIP Card # updated to '${val}'`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setPrimeSettings({
      isMembershipEnabled,
      primePlanFee: Number(primePlanFee),
      primeBenefit1En: pBen1En,
      primeBenefitDesc1En: pBenDesc1En,
      primeBenefit1Hi: pBen1Hi,
      primeBenefitDesc1Hi: pBenDesc1Hi,
      primeBenefit2En: pBen2En,
      primeBenefitDesc2En: pBenDesc2En,
      primeBenefit2Hi: pBen2Hi,
      primeBenefitDesc2Hi: pBenDesc2Hi,
      primeBenefit3En: pBen3En,
      primeBenefitDesc3En: pBenDesc3En,
      primeBenefit3Hi: pBen3Hi,
      primeBenefitDesc3Hi: pBenDesc3Hi
    });
    setFeedback(isHindi ? "प्राइम वीआईपी सदस्यता नियम सफलतापूर्वक सहेजे गए!" : "VIP Membership settings saved successfully!");
    setTimeout(() => setFeedback(''), 3500);
  };

  const handleToggleCustomerPrime = (cust) => {
    const isPrimeNow = !cust.isPrime;
    const cardNo = cust.primeMembershipNo || `SP-VIP-${cust.id || Math.floor(100+Math.random()*900)}-${(cust.phone||'9999').slice(-4)}`;
    updateCustomer(cust.id, {
      ...cust,
      isPrime: isPrimeNow,
      primeMembershipNo: isPrimeNow ? cardNo : cust.primeMembershipNo
    });
  };

  const vipMembers = (customers || []).filter(c => c.isPrime || c.primeMembershipNo);
  const filteredCustomers = (customers || []).filter(c => 
    (c.name || '').toLowerCase().includes(searchMember.toLowerCase()) ||
    (c.phone || '').includes(searchMember) ||
    (c.primeMembershipNo || '').toLowerCase().includes(searchMember.toLowerCase())
  );

  return (
    <div className={`space-y-6 animate-fade-in ${isAdminDark ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Page Header */}
      <div className={`p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
        isAdminDark ? 'bg-slate-900/60 border-white/10 shadow-xl backdrop-blur-md' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            isAdminDark ? 'bg-amber-500/10 border-amber-400/30 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-700'
          }`}>
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h2 className={`text-xl font-black flex items-center gap-2 ${isAdminDark ? 'text-white' : 'text-slate-900'}`}>
              <span>{isHindi ? "स्वास्तिक वीआईपी मेम्बरशिप सेटिंग्स" : "VIP Membership & Prime Settings"}</span>
            </h2>
            <p className={`text-xs font-medium ${isAdminDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {isHindi ? "वार्षिक सदस्यता शुल्क, लाभ विवरण और वीआईपी मेम्बर कार्ड प्रबन्धित करें" : "Configure annual plan pricing, member benefits, self-activation rules & card directory"}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shrink-0 border ${
          isAdminDark ? 'bg-amber-500/10 border-amber-400/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold">
            {vipMembers.length} {isHindi ? "सक्रिय वीआईपी सदस्य" : "Active VIP Members"}
          </span>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
          isAdminDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className={`rounded-2xl p-6 space-y-6 border ${
        isAdminDark ? 'bg-slate-900/60 border-white/10 shadow-xl backdrop-blur-md' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h3 className={`text-sm font-extrabold uppercase tracking-wider pb-3 border-b flex items-center gap-2 ${
          isAdminDark ? 'text-pink-400 border-white/10' : 'text-slate-800 border-slate-100'
        }`}>
          <Award className="h-4 w-4 text-pink-400" />
          <span>{isHindi ? "1. योजना नियम और वार्षिक शुल्क" : "1. Membership Plan Rules & Pricing"}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Self Activation Toggle */}
          <div className={`p-4 rounded-xl space-y-2 border ${
            isAdminDark ? 'bg-slate-950/40 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isAdminDark ? 'text-cyan-300' : 'text-slate-800'}`}>
                {isHindi ? "ग्राहक स्व-सदस्यता (Self-Activation)" : "Customer Self-Activation"}
              </span>
              <button
                type="button"
                onClick={() => setIsMembershipEnabled(!isMembershipEnabled)}
                className={`w-12 h-6 rounded-full p-0.5 transition-all relative cursor-pointer ${isMembershipEnabled ? 'bg-emerald-500' : (isAdminDark ? 'bg-slate-700' : 'bg-slate-300')}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all absolute top-0.5 ${isMembershipEnabled ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className={`text-[11px] ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isMembershipEnabled
                ? (isHindi ? "🟢 चालू: ग्राहक अपने माय अकाउंट से प्राइम मेंबरशिप खरीद/सक्रिय कर सकते हैं।" : "🟢 ENABLED: Customers can self-subscribe and generate VIP passes in their account.")
                : (isHindi ? "🔴 बंद: केवल एडमिन ही ग्राहकों को वीआईपी सदस्यता प्रदान कर सकता है।" : "🔴 DISABLED: Self-subscription locked. Only Admin can assign VIP status.")
              }
            </p>
          </div>

          {/* Annual Plan Fee */}
          <div className={`p-4 rounded-xl space-y-2 border ${
            isAdminDark ? 'bg-slate-950/40 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <label className={`block text-xs font-bold uppercase tracking-wider ${isAdminDark ? 'text-cyan-300' : 'text-slate-800'}`}>
              {isHindi ? "वार्षिक सदस्यता शुल्क (₹)" : "Annual Prime Plan Fee (₹)"}
            </label>
            <input
              type="number"
              min="0"
              required
              value={primePlanFee}
              onChange={(e) => setPrimePlanFee(e.target.value)}
              className={`w-full rounded-lg p-2.5 text-sm font-mono font-bold outline-none border transition-colors ${
                isAdminDark ? 'bg-slate-900 border-white/15 text-white focus:border-cyan-400' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
            <span className={`text-[10px] block ${isAdminDark ? 'text-slate-400' : 'text-slate-400'}`}>
              {isHindi ? "प्राइम मेंबर बनने के लिए ग्राहक द्वारा भुगतान की जाने वाली राशि" : "Price displayed on Prime Banner and digital card checkout"}
            </span>
          </div>
        </div>

        {/* Benefits Configuration */}
        <h3 className={`text-sm font-extrabold uppercase tracking-wider pb-3 pt-2 border-b flex items-center gap-2 ${
          isAdminDark ? 'text-pink-400 border-white/10' : 'text-slate-800 border-slate-100'
        }`}>
          <Sparkles className="h-4 w-4 text-pink-400" />
          <span>{isHindi ? "2. प्राइम लाभ और सुविधाएं" : "2. Prime Member Benefits Highlights"}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Benefit 1 */}
          <div className={`p-4 rounded-xl space-y-3 border ${
            isAdminDark ? 'bg-slate-950/40 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-xs font-bold text-emerald-400 uppercase block">Benefit #1 (Delivery Relief)</span>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>Title (English)</label>
              <input type="text" value={pBen1En} onChange={e => setPBen1En(e.target.value)} className={`w-full rounded p-2 text-xs font-semibold border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>Description (English)</label>
              <input type="text" value={pBenDesc1En} onChange={e => setPBenDesc1En(e.target.value)} className={`w-full rounded p-2 text-xs border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>शीर्षक (Hindi)</label>
              <input type="text" value={pBen1Hi} onChange={e => setPBen1Hi(e.target.value)} className={`w-full rounded p-2 text-xs font-semibold border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>विवरण (Hindi)</label>
              <input type="text" value={pBenDesc1Hi} onChange={e => setPBenDesc1Hi(e.target.value)} className={`w-full rounded p-2 text-xs border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
          </div>

          {/* Benefit 2 */}
          <div className={`p-4 rounded-xl space-y-3 border ${
            isAdminDark ? 'bg-slate-950/40 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-xs font-bold text-purple-400 uppercase block">Benefit #2 (Priority Shipping)</span>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>Title (English)</label>
              <input type="text" value={pBen2En} onChange={e => setPBen2En(e.target.value)} className={`w-full rounded p-2 text-xs font-semibold border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>Description (English)</label>
              <input type="text" value={pBenDesc2En} onChange={e => setPBenDesc2En(e.target.value)} className={`w-full rounded p-2 text-xs border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>शीर्षक (Hindi)</label>
              <input type="text" value={pBen2Hi} onChange={e => setPBen2Hi(e.target.value)} className={`w-full rounded p-2 text-xs font-semibold border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>विवरण (Hindi)</label>
              <input type="text" value={pBenDesc2Hi} onChange={e => setPBenDesc2Hi(e.target.value)} className={`w-full rounded p-2 text-xs border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
          </div>

          {/* Benefit 3 */}
          <div className={`p-4 rounded-xl space-y-3 border ${
            isAdminDark ? 'bg-slate-950/40 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-xs font-bold text-amber-400 uppercase block">Benefit #3 (2x Rewards)</span>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>Title (English)</label>
              <input type="text" value={pBen3En} onChange={e => setPBen3En(e.target.value)} className={`w-full rounded p-2 text-xs font-semibold border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>Description (English)</label>
              <input type="text" value={pBenDesc3En} onChange={e => setPBenDesc3En(e.target.value)} className={`w-full rounded p-2 text-xs border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>शीर्षक (Hindi)</label>
              <input type="text" value={pBen3Hi} onChange={e => setPBen3Hi(e.target.value)} className={`w-full rounded p-2 text-xs font-semibold border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase ${isAdminDark ? 'text-slate-400' : 'text-slate-500'}`}>विवरण (Hindi)</label>
              <input type="text" value={pBenDesc3Hi} onChange={e => setPBenDesc3Hi(e.target.value)} className={`w-full rounded p-2 text-xs border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
          >
            {isHindi ? "सदस्यता सेटिंग्स सहेजें" : "Save VIP Membership Rules"}
          </button>
        </div>
      </form>

      {/* Customer VIP Member Directory */}
      <div className={`rounded-2xl p-6 space-y-4 border ${
        isAdminDark ? 'bg-slate-900/60 border-white/10 shadow-xl backdrop-blur-md' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b ${
          isAdminDark ? 'border-white/10' : 'border-slate-100'
        }`}>
          <div>
            <h3 className={`text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${
              isAdminDark ? 'text-pink-400' : 'text-slate-800'
            }`}>
              <Users className="h-4 w-4 text-emerald-400" />
              <span>{isHindi ? "3. वीआईपी सदस्य डायरेक्टरी" : "3. VIP Members & Card Management"}</span>
            </h3>
            <p className={`text-xs ${isAdminDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {isHindi ? "ग्राहकों को सीधे वीआईपी सदस्यता दें या कार्ड नंबर बदलें" : "Manage customer Prime statuses and assign digital VIP membership cards"}
            </p>
          </div>

          <input
            type="text"
            placeholder={isHindi ? "नाम, फोन या कार्ड# खोजें..." : "Search name, phone or card no..."}
            value={searchMember}
            onChange={(e) => setSearchMember(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs outline-none border w-full sm:w-64 transition-colors ${
              isAdminDark ? 'bg-slate-950/60 border-white/15 text-white placeholder-slate-500 focus:border-cyan-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'
            }`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b font-bold uppercase text-[10px] tracking-wider ${
                isAdminDark ? 'bg-slate-950/50 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <th className="p-3">Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3">VIP Status</th>
                <th className="p-3">Card Number</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isAdminDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className={`p-6 text-center text-xs ${isAdminDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No customers found matching search term.
                  </td>
                </tr>
              ) : (
                filteredCustomers.slice(0, 25).map((cust) => (
                  <tr key={cust.id} className={`transition-colors ${isAdminDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/70'}`}>
                    <td className={`p-3 font-semibold ${isAdminDark ? 'text-white' : 'text-slate-900'}`}>{cust.name || 'Unnamed Customer'}</td>
                    <td className={`p-3 font-mono ${isAdminDark ? 'text-slate-300' : 'text-slate-600'}`}>{cust.phone || '-'}</td>
                    <td className="p-3">
                      {cust.isPrime ? (
                        <span className={`px-2.5 py-0.5 border rounded-full font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 ${
                          isAdminDark ? 'bg-amber-500/15 border-amber-400/40 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-800'
                        }`}>
                          ⭐ Prime VIP
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                          isAdminDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Regular
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingCardCustId === cust.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customCardInput}
                            onChange={(e) => setCustomCardInput(e.target.value)}
                            placeholder="e.g. SP-VIP-9999"
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border outline-none w-36 ${
                              isAdminDark ? 'bg-slate-900 border-amber-400 text-amber-300' : 'bg-white border-amber-500 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => saveCustomCard(cust)}
                            className="px-2.5 py-1 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-lg hover:bg-emerald-400 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCardCustId(null)}
                            className={`px-2 py-1 text-[10px] font-semibold rounded-lg cursor-pointer ${isAdminDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${cust.isPrime ? 'text-amber-400' : (isAdminDark ? 'text-slate-400' : 'text-slate-500')}`}>
                            {cust.primeMembershipNo || (cust.isPrime ? `SP-VIP-${cust.id}` : '-')}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditingCard(cust)}
                            title="Customize VIP Card #"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 cursor-pointer ${
                              isAdminDark
                                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-400/50'
                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-amber-800 hover:border-amber-300'
                            }`}
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{isHindi ? "संपादित करें" : "Custom Card #"}</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (!cust.isPrime) {
                            startEditingCard(cust);
                          } else {
                            handleToggleCustomerPrime(cust);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          cust.isPrime
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400'
                        }`}
                      >
                        {cust.isPrime ? 'Remove VIP' : 'Assign VIP Member'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
