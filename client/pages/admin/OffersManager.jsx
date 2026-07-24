import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Plus, 
  Trash2, 
  Tag, 
  Search, 
  Percent, 
  X, 
  Edit3,
  Sparkles,
  Crown
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function OffersManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { 
    offers, 
    addOffer, 
    updateOffer, 
    deleteOffer, 
    referralSettings, 
    setReferralSettings,
    celebrationSettings,
    setCelebrationSettings,
    primeSettings,
    setPrimeSettings
  } = useData();

  const [search, setSearch] = useState('');
  const [editorModal, setEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Referral Points administration states
  const [referPoints, setReferPoints] = useState(() => referralSettings?.referralPointsEarned ?? 50);
  const [pointsValue, setPointsValue] = useState(() => referralSettings?.pointsValueInINR ?? 1);
  const [minRedeem, setMinRedeem] = useState(() => referralSettings?.minPointsRedeem ?? 10);
  const [maxRedeem, setMaxRedeem] = useState(() => referralSettings?.maxPointsRedeem ?? 100);
  const [firstLoginPoints, setFirstLoginPoints] = useState(() => referralSettings?.firstLoginPoints ?? 100);
  const [referralFeedback, setReferralFeedback] = useState('');

  // Birthday & Anniversary administration states
  const [bdayDiscount, setBdayDiscount] = useState(() => celebrationSettings?.birthdayDiscountPercent ?? 15);
  const [bdayMinAmount, setBdayMinAmount] = useState(() => celebrationSettings?.birthdayMinAmount ?? 300);
  const [bdayOfferDetails, setBdayOfferDetails] = useState(() => celebrationSettings?.birthdayOfferDetails ?? '');
  const [bdayOfferDetailsHi, setBdayOfferDetailsHi] = useState(() => celebrationSettings?.birthdayOfferDetailsHi ?? '');

  const [annivDiscount, setAnnivDiscount] = useState(() => celebrationSettings?.anniversaryDiscountPercent ?? 20);
  const [annivMinAmount, setAnnivMinAmount] = useState(() => celebrationSettings?.anniversaryMinAmount ?? 500);
  const [annivOfferDetails, setAnnivOfferDetails] = useState(() => celebrationSettings?.anniversaryOfferDetails ?? '');
  const [annivOfferDetailsHi, setAnnivOfferDetailsHi] = useState(() => celebrationSettings?.anniversaryOfferDetailsHi ?? '');

  const [celebrationFeedback, setCelebrationFeedback] = useState('');

  // Prime VIP Membership Administration states
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

  const [primeFeedback, setPrimeFeedback] = useState('');

  const handleSavePrimeRules = (e) => {
    e.preventDefault();
    setPrimeSettings({
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
    setPrimeFeedback(isHindi ? "प्राइम वीआईपी सदस्यता नियम और लाभ सफलतापूर्वक सहेज लिए गए हैं!" : "Swastik Prime VIP program rules and benefits saved successfully!");
    setTimeout(() => setPrimeFeedback(''), 3500);
  };

  const handleSaveCelebrationRules = (e) => {
    e.preventDefault();
    setCelebrationSettings({
      birthdayDiscountPercent: Number(bdayDiscount),
      birthdayMinAmount: Number(bdayMinAmount),
      birthdayOfferDetails: bdayOfferDetails,
      birthdayOfferDetailsHi: bdayOfferDetailsHi,
      anniversaryDiscountPercent: Number(annivDiscount),
      anniversaryMinAmount: Number(annivMinAmount),
      anniversaryOfferDetails: annivOfferDetails,
      anniversaryOfferDetailsHi: annivOfferDetailsHi
    });
    setCelebrationFeedback(isHindi ? "जन्मदिन और वर्षगांठ ऑफ़र कोर नियम सफलतापूर्वक सहेज लिए गए हैं!" : "Birthday & Anniversary celebration offer core rules saved successfully!");
    setTimeout(() => setCelebrationFeedback(''), 3500);
  };

  const handleSaveReferralRules = (e) => {
    e.preventDefault();
    setReferralSettings({
      referralPointsEarned: Number(referPoints),
      pointsValueInINR: Number(pointsValue),
      minPointsRedeem: Number(minRedeem),
      maxPointsRedeem: Number(maxRedeem),
      firstLoginPoints: Number(firstLoginPoints)
    });
    setReferralFeedback("Referral and signup welcome points weights & thresholds saved successfully!");
    setTimeout(() => setReferralFeedback(''), 3500);
  };

  // Field states for the simplified form (Requirement 10)
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    value: 10,
    minOrder: 199,
    banner: '',
    description: '',
    image: ''
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      discountType: 'percentage',
      value: 10,
      minOrder: 199,
      banner: '',
      description: '',
      image: ''
    });
    setEditorModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      discountType: item.discountType,
      value: item.value,
      minOrder: item.minOrder,
      banner: item.bannerEn || item.bannerHi || '',
      description: item.descriptionEn || item.descriptionHi || '',
      image: item.image || ''
    });
    setEditorModal(true);
  };

  const handleCloseModal = () => {
    setEditorModal(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code) return;

    // Single language mapped to bilingual keys under-the-hood (Requirement 10)
    const payload = {
      code: formData.code.toUpperCase().replace(/\s+/g, ''),
      discountType: formData.discountType,
      value: Number(formData.value),
      minOrder: Number(formData.minOrder),
      bannerEn: formData.banner,
      bannerHi: formData.banner,
      descriptionEn: formData.description,
      descriptionHi: formData.description,
      image: formData.image
    };

    if (editingItem) {
      updateOffer(editingItem.id, payload);
    } else {
      addOffer(payload);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this promotional coupon?")) {
      deleteOffer(id);
    }
  };

  const filteredOffers = offers.filter(off => 
    (off.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (off.bannerEn || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-white/90">
      
      {/* View Title Headers */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Tag className="h-5 w-5 text-cyan-400" />
            <span>Promotional Coupons & Campaigns</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Configure kyc discount codes, campaign rates and parameters
          </p>
        </div>

        {userRole !== 'customer' && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-xl font-black text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Promo Code</span>
          </button>
        )}
      </div>

      {/* Search Input bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter coupon codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs placeholder-slate-500 outline-none focus:border-cyan-400/40"
        />
      </div>

      {/* Grid List of Coupons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOffers.length === 0 ? (
          <div className="col-span-full text-center p-8 bg-slate-900/40 border border-white/5 rounded-2xl text-xs text-slate-500">
            No active campaigns running. Select Add Promo Code to create.
          </div>
        ) : (
          filteredOffers.map((off) => (
            <div key={off.id} className="relative bg-gradient-to-br from-white/5 via-slate-900/60 to-transparent border border-white/10 rounded-2xl p-5 space-y-4 hover:border-white/15 transition-all">
              
              {off.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10">
                  <img src={off.image} alt={off.code} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-tr from-cyan-400/20 to-pink-500/20 border border-cyan-400/25 rounded-xl text-cyan-300">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-mono text-sm font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/5">{off.code}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-2">Min. purchase: ₹{off.minOrder}</span>
                  </div>
                </div>

                <span className="text-[9px] font-black uppercase text-pink-400 tracking-wider bg-pink-500/10 border border-pink-500/20 px-2 justify-center py-0.5 rounded-full inline-flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  <span>{off.discountType === 'percentage' ? `${off.value}%` : `₹${off.value}`} REDUCTION</span>
                </span>
              </div>

              <div className="space-y-1 bg-slate-950/40 border border-white/5 p-3 rounded-xl leading-relaxed text-xs">
                <p className="font-extrabold text-white text-glow inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
                  <span>{off.bannerEn}</span>
                </p>
                <div className="text-[10px] text-slate-400 font-semibold">{off.descriptionEn}</div>
              </div>

              {userRole !== 'customer' && (
                <div className="flex gap-2 pt-1.5">
                  <button
                    onClick={() => handleOpenEditModal(off)}
                    className="w-full bg-cyan-400/10 border border-cyan-400/25 py-2 rounded-xl text-cyan-300 hover:bg-cyan-400/25 transition-all font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Reconfigure</span>
                  </button>
                  <button
                    onClick={() => handleDelete(off.id)}
                    className="p-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-all rounded-xl cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Admin Refer & Earn Core Rules Configuration Panel */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-5 text-white shadow-xl mt-8">
        <div className="border-b border-white/5 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span>🎁</span>
            <span>Refer & Earn Program Core Rules</span>
          </h3>
          <p className="text-[10px] text-zinc-400 font-semibold mt-1">
            Define point awards given to referents, point values in INR, and threshold levels applied per checkout session.
          </p>
        </div>

        {referralFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
            <span>✅</span>
            <span>{referralFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSaveReferralRules} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">POINTS EARNED PER REFERRAL</label>
            <input 
              type="number"
              min="0"
              value={referPoints}
              onChange={(e) => setReferPoints(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">1 POINT VALUE IN IND-RUPEES (INR)</label>
            <input 
              type="number"
              step="0.1"
              min="0.1"
              value={pointsValue}
              onChange={(e) => setPointsValue(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">MINIMUM REDEEM POINTS/ORDER</label>
            <input 
              type="number"
              min="0"
              value={minRedeem}
              onChange={(e) => setMinRedeem(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">MAXIMUM REDEEM POINTS/ORDER</label>
            <input 
              type="number"
              min="1"
              value={maxRedeem}
              onChange={(e) => setMaxRedeem(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">WELCOME POINTS ON FIRST LOGIN</label>
            <input 
              type="number"
              min="0"
              value={firstLoginPoints}
              onChange={(e) => setFirstLoginPoints(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-5 pt-2.5 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Update Referral Scheme & Ratios
            </button>
          </div>
        </form>
      </div>

      {/* Admin Birthday & Anniversary celebration Core Rules Panel */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-5 text-white shadow-xl">
        <div className="border-b border-white/5 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span>🎉</span>
            <span>{isHindi ? "जन्मदिन और वर्षगांठ विशेष ऑफर नियम" : "Birthday & Anniversary Celebration Offers"}</span>
          </h3>
          <p className="text-[10px] text-zinc-400 font-semibold mt-1">
            {isHindi 
              ? "ग्राहकों के जन्मदिन या वर्षगांठ पर चेकआउट के दौरान स्वचालित रूप से दिए जाने वाले विशेष व्यक्तिगत छूट लाभ और न्यूनतम शॉपिंग राशि तय करें।" 
              : "Specify the automatic personal discount percentage, minimum shopping amount threshold, and campaign descriptions applied for customers celebrating birthdays or marriages during checkout."}
          </p>
        </div>

        {celebrationFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
            <span>✅</span>
            <span>{celebrationFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSaveCelebrationRules} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            {/* Birthday Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <span>🎂</span>
                <span>{isHindi ? "जन्मदिन विशेष लाभ" : "Birthday Celebration Settings"}</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "छूट प्रतिशत (%)" : "DISCOUNT PERCENT (%)"}</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={bdayDiscount}
                    onChange={(e) => setBdayDiscount(e.target.value)}
                    className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "न्यूनतम आर्डर (₹)" : "MIN ORDER THRESHOLD (₹)"}</label>
                  <input 
                    type="number"
                    min="0"
                    value={bdayMinAmount}
                    onChange={(e) => setBdayMinAmount(e.target.value)}
                    className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "ऑफ़र विवरण (EN)" : "OFFER DETAILS DESCRIPTION (EN)"}</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Birthday Special 15% Off!"
                  value={bdayOfferDetails}
                  onChange={(e) => setBdayOfferDetails(e.target.value)}
                  className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-sans"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "ऑफ़र विवरण (HI)" : "OFFER DETAILS DESCRIPTION (HI)"}</label>
                <input 
                  type="text"
                  required
                  placeholder="उदा. जन्मदिन की विशेष 15% छूट!"
                  value={bdayOfferDetailsHi}
                  onChange={(e) => setBdayOfferDetailsHi(e.target.value)}
                  className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>

            {/* Anniversary Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <span>💍</span>
                <span>{isHindi ? "वर्षगांठ विशेष लाभ" : "Wedding Anniversary Settings"}</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "छूट प्रतिशत (%)" : "DISCOUNT PERCENT (%)"}</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={annivDiscount}
                    onChange={(e) => setAnnivDiscount(e.target.value)}
                    className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "न्यूनतम आर्डर (₹)" : "MIN ORDER THRESHOLD (₹)"}</label>
                  <input 
                    type="number"
                    min="0"
                    value={annivMinAmount}
                    onChange={(e) => setAnnivMinAmount(e.target.value)}
                    className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "ऑफ़र विवरण (EN)" : "OFFER DETAILS DESCRIPTION (EN)"}</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Wedding Anniversary Flat 20% Off!"
                  value={annivOfferDetails}
                  onChange={(e) => setAnnivOfferDetails(e.target.value)}
                  className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-sans"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "ऑफ़र विवरण (HI)" : "OFFER DETAILS DESCRIPTION (HI)"}</label>
                <input 
                  type="text"
                  required
                  placeholder="उदा. शादी की सालगिरह पर फ्लैट 20% डिस्काउंट!"
                  value={annivOfferDetailsHi}
                  onChange={(e) => setAnnivOfferDetailsHi(e.target.value)}
                  className="px-3 py-2 bg-slate-1050 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 border border-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isHindi ? "विशेष दिवस ऑफर अपडेट करें" : "Update Celebration Offers Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* Swastik Prime VIP Membership Settings Form (100% Dynamic configuration) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-5 text-white shadow-xl">
        <div className="border-b border-white/5 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-pink-400 flex items-center gap-2">
            <Crown className="h-5 w-5 text-pink-400 animate-pulse" />
            <span>{isHindi ? "स्वास्तिक प्राइम वीआईपी सदस्यता सेटिंग्स" : "Swastik Prime VIP Settings"}</span>
          </h3>
          <p className="text-[10px] text-zinc-400 font-semibold mt-1">
            {isHindi 
              ? "वार्षिक योजना शुल्क, विशिष्ट सुविधाओं और तीनों प्रमुख लाभ विवरणों को बदलें जो ग्राहकों के लिए डिजिटल मेंबरशिप पास और भुगतान पेज पर प्रदर्शित होंगे।" 
              : "Dynamically customize the Prime Plan fee, benefits highlights, descriptions, and translations rendered on customer's Digital Gold passes and payment pages."}
          </p>
        </div>

        {primeFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
            <span>✅</span>
            <span>{primeFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSavePrimeRules} className="space-y-6">
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isHindi ? "प्राइम सदस्यता वार्षिक शुल्क (₹)" : "PRIME PLAN ANNUAL FEE (₹)"}</label>
                <input 
                  type="number"
                  min="0"
                  required
                  value={primePlanFee}
                  onChange={(e) => setPrimePlanFee(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-white/12 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center font-semibold italic">
                {isHindi ? "💡 इसे अपडेट करने से तुरंत ग्राहक पेमेंट पेज और होमपेज कार्ड्स पर मूल्य बदल जाएगा।" : "💡 Updating this price automatically alters the billing amount on customer accounts dynamic fields."}
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Benefit 1 */}
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-cyan-300 uppercase block">Benefit #1 (Delivery Policy)</span>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Title (EN)</label>
                  <input type="text" value={pBen1En} onChange={e => setPBen1En(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Description (EN)</label>
                  <input type="text" value={pBenDesc1En} onChange={e => setPBenDesc1En(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">शीर्षक (HI)</label>
                  <input type="text" value={pBen1Hi} onChange={e => setPBen1Hi(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">विवरण (HI)</label>
                  <input type="text" value={pBenDesc1Hi} onChange={e => setPBenDesc1Hi(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-purple-400 uppercase block">Benefit #2 (Priority Dispatch)</span>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Title (EN)</label>
                  <input type="text" value={pBen2En} onChange={e => setPBen2En(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Description (EN)</label>
                  <input type="text" value={pBenDesc2En} onChange={e => setPBenDesc2En(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">शीर्षक (HI)</label>
                  <input type="text" value={pBen2Hi} onChange={e => setPBen2Hi(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">विवरण (HI)</label>
                  <input type="text" value={pBenDesc2Hi} onChange={e => setPBenDesc2Hi(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-amber-400 uppercase block">Benefit #3 (Bonus Multipliers)</span>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Title (EN)</label>
                  <input type="text" value={pBen3En} onChange={e => setPBen3En(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Description (EN)</label>
                  <input type="text" value={pBenDesc3En} onChange={e => setPBenDesc3En(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">शीर्षक (HI)</label>
                  <input type="text" value={pBen3Hi} onChange={e => setPBen3Hi(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase">विवरण (HI)</label>
                  <input type="text" value={pBenDesc3Hi} onChange={e => setPBenDesc3Hi(e.target.value)} className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isHindi ? "प्राइम सदस्यता विवरण अपडेट करें" : "Update Swastik Prime Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* Editor Modal overlay Box */}
      {editorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-950 border border-white/12 rounded-3xl p-6 shadow-2xl space-y-5">
            
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 hover:bg-white/10 p-2 rounded-full text-slate-400 transition-all active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1">
              <Tag className="h-4.5 w-4.5 text-cyan-400" />
              <span>{editingItem ? "Configure Coupon Code Params" : "Register Campaign Coupon"}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coupon Promo Code</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. SWASTIK50"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed Flat Sum ₹</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Reduction Value</label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 15"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Minimum Cart Value qualification (₹)</label>
                <input 
                  type="number"
                  required
                  placeholder="e.g. 199"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Offer Headline (Campaign Ribbon Text)</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Extra 20% Discount with SUPER20!"
                  value={formData.banner}
                  onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operational Rule / Fineprints</label>
                <textarea 
                  rows="2"
                  required
                  placeholder="e.g. Valid on purchase indices above 199. Cannot be merged with other codes."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white resize-none"
                />
              </div>

              {/* Dynamic Image Option (R2 upload or url) */}
              <div className="space-y-1 bg-slate-900/50 p-3 rounded-2xl border border-white/5 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Campaign Banner Image (Optional)</label>
                <input 
                  type="text"
                  placeholder="Paste banner image URL..."
                  value={formData.image || ''}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-white"
                />
                <R2ImageUploader 
                  onUploadComplete={(url) => setFormData(prev => ({ ...prev, image: url }))}
                  initialImageUrl={formData.image}
                />
              </div>

              <div className="border-t border-white/5 pt-4">
                <button
                  type="submit"
                  className="w-full bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl border border-cyan-300 hover:bg-cyan-500 transition-all active:scale-95 cursor-pointer animate-pulse"
                >
                  Save Coupon Template
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
