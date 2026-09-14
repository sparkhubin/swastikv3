import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  FileText, 
  Mail, 
  MapPin, 
  Phone, 
  Check, 
  Inbox, 
  Settings, 
  Languages, 
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Gavel,
  ShieldCheck,
  RotateCcw,
  Truck,
  Users
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';
import PartnersManager from './PartnersManager';

export default function PagesManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { 
    contactMessages, 
    updateContactMessage, 
    deleteContactMessage,
    aboutSettings, 
    setAboutSettings, 
    contactSettings, 
    setContactSettings,
    privacySections,
    addPrivacySection,
    updatePrivacySection,
    deletePrivacySection,
    termsSections,
    addTermsSection,
    updateTermsSection,
    deleteTermsSection,
    refundSections,
    addRefundSection,
    updateRefundSection,
    deleteRefundSection
  } = useData();

  // Internal active section: inbox | about | contact_coord
  const [panelSection, setPanelSection] = useState('inbox');

  // Biography update state
  const [aboutForm, setAboutForm] = useState({
    titleEn: aboutSettings?.titleEn || '',
    titleHi: aboutSettings?.titleHi || '',
    storyEn: aboutSettings?.storyEn || '',
    storyHi: aboutSettings?.storyHi || '',
    banner: aboutSettings?.banner || ''
  });

  // Coordinates update state
  const [coordsForm, setCoordsForm] = useState({
    brandName: contactSettings?.brandName || '',
    address: contactSettings?.address || '',
    phone: contactSettings?.phone || '',
    email: contactSettings?.email || '',
    website: contactSettings?.website || '',
    gst: contactSettings?.gst || '',
    license: contactSettings?.license || '',
    logo: contactSettings?.logo || '',
    banner: contactSettings?.banner || '',
    latitude: contactSettings?.latitude !== undefined ? contactSettings.latitude : 28.5708,
    longitude: contactSettings?.longitude !== undefined ? contactSettings.longitude : 77.3259,
    googleMaps: contactSettings?.googleMaps || '',
    deliveryChargeNear: contactSettings?.deliveryChargeNear !== undefined ? contactSettings.deliveryChargeNear : 0,
    deliveryChargeMedium: contactSettings?.deliveryChargeMedium !== undefined ? contactSettings.deliveryChargeMedium : 25,
    deliveryChargeFar: contactSettings?.deliveryChargeFar !== undefined ? contactSettings.deliveryChargeFar : 45,
    deliveryChargeOutlier: contactSettings?.deliveryChargeOutlier !== undefined ? contactSettings.deliveryChargeOutlier : 75,
    freeDeliveryMinAmount: contactSettings?.freeDeliveryMinAmount !== undefined ? contactSettings.freeDeliveryMinAmount : 500,
    showOnlyWithPhoto: Boolean(contactSettings?.showOnlyWithPhoto)
  });

  // Synchronize Biography and Coordinates settings from Context to state forms on load or context updates
  useEffect(() => {
    if (aboutSettings) {
      setAboutForm({
        titleEn: aboutSettings.titleEn || '',
        titleHi: aboutSettings.titleHi || '',
        storyEn: aboutSettings.storyEn || '',
        storyHi: aboutSettings.storyHi || '',
        banner: aboutSettings.banner || ''
      });
    }
  }, [aboutSettings]);

  useEffect(() => {
    if (contactSettings) {
      setCoordsForm({
        brandName: contactSettings.brandName || '',
        address: contactSettings.address || '',
        phone: contactSettings.phone || '',
        email: contactSettings.email || '',
        website: contactSettings.website || '',
        gst: contactSettings.gst || '',
        license: contactSettings.license || '',
        logo: contactSettings.logo || '',
        banner: contactSettings.banner || '',
        latitude: contactSettings.latitude !== undefined ? contactSettings.latitude : 28.5708,
        longitude: contactSettings.longitude !== undefined ? contactSettings.longitude : 77.3259,
        googleMaps: contactSettings.googleMaps || '',
        deliveryChargeNear: contactSettings.deliveryChargeNear !== undefined ? contactSettings.deliveryChargeNear : 0,
        deliveryChargeMedium: contactSettings.deliveryChargeMedium !== undefined ? contactSettings.deliveryChargeMedium : 25,
        deliveryChargeFar: contactSettings.deliveryChargeFar !== undefined ? contactSettings.deliveryChargeFar : 45,
        deliveryChargeOutlier: contactSettings.deliveryChargeOutlier !== undefined ? contactSettings.deliveryChargeOutlier : 75,
        freeDeliveryMinAmount: contactSettings.freeDeliveryMinAmount !== undefined ? contactSettings.freeDeliveryMinAmount : 500,
        showOnlyWithPhoto: Boolean(contactSettings.showOnlyWithPhoto)
      });
    }
  }, [contactSettings]);

  // Inbox replies mapping
  const [replyText, setReplyText] = useState({});
  const [activeMessageDetail, setActiveMessageDetail] = useState(null);

  // For Privacy Manager CRUD
  const [editingPrivacyId, setEditingPrivacyId] = useState(null);
  const [privacyForm, setPrivacyForm] = useState({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
  const [isAddingPrivacy, setIsAddingPrivacy] = useState(false);

  // For Terms Manager CRUD
  const [editingTermsId, setEditingTermsId] = useState(null);
  const [termsForm, setTermsForm] = useState({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
  const [isAddingTerms, setIsAddingTerms] = useState(false);

  // For Refund Policy Manager CRUD
  const [editingRefundId, setEditingRefundId] = useState(null);
  const [refundForm, setRefundForm] = useState({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
  const [isAddingRefund, setIsAddingRefund] = useState(false);

  const handlePrivacySubmit = (e) => {
    e.preventDefault();
    if (editingPrivacyId !== null) {
      updatePrivacySection(editingPrivacyId, privacyForm);
      setEditingPrivacyId(null);
      alert(isHindi ? "गोपनीयता नीति खंड संशोधित हुआ!" : "Privacy Policy section updated successfully!");
    } else {
      addPrivacySection(privacyForm);
      setIsAddingPrivacy(false);
      alert(isHindi ? "नया गोपनीयता खंड जोड़ा गया!" : "New Privacy Policy section added successfully!");
    }
    setPrivacyForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
  };

  const startEditPrivacy = (sect) => {
    setEditingPrivacyId(sect.id);
    setPrivacyForm({ titleEn: sect.titleEn, titleHi: sect.titleHi, descEn: sect.descEn, descHi: sect.descHi });
    setIsAddingPrivacy(true);
  };

  const handleTermsSubmit = (e) => {
    e.preventDefault();
    if (editingTermsId !== null) {
      updateTermsSection(editingTermsId, termsForm);
      setEditingTermsId(null);
      alert(isHindi ? "सेवा की शर्तें संशोधित की गईं!" : "Terms of Service section updated successfully!");
    } else {
      addTermsSection(termsForm);
      setIsAddingTerms(false);
      alert(isHindi ? "नई सेवा की शर्त जोड़ी गई!" : "New Terms of Service section added successfully!");
    }
    setTermsForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
  };

  const startEditTerms = (sect) => {
    setEditingTermsId(sect.id);
    setTermsForm({ titleEn: sect.titleEn, titleHi: sect.titleHi, descEn: sect.descEn, descHi: sect.descHi });
    setIsAddingTerms(true);
  };

  const handleRefundSubmit = (e) => {
    e.preventDefault();
    if (editingRefundId !== null) {
      updateRefundSection(editingRefundId, refundForm);
      setEditingRefundId(null);
      alert(isHindi ? "रिफ़ंड नीति नियम संशोधित हुआ!" : "Refund Policy clause updated successfully!");
    } else {
      addRefundSection(refundForm);
      setIsAddingRefund(false);
      alert(isHindi ? "नया रिफ़ंड नियम जोड़ा गया!" : "New Refund Policy section added successfully!");
    }
    setRefundForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
  };

  const startEditRefund = (sect) => {
    setEditingRefundId(sect.id);
    setRefundForm({ titleEn: sect.titleEn, titleHi: sect.titleHi, descEn: sect.descEn, descHi: sect.descHi });
    setIsAddingRefund(true);
  };

  // About update submit handler
  const handleAboutSave = (e) => {
    e.preventDefault();
    setAboutSettings(aboutForm);
    alert(isHindi ? "बायोग्राफी विवरण सहेज लिया गया!" : "About details bio text updated successfully!");
  };

  // Contacts coords submit handler
  const handleCoordsSave = (e) => {
    e.preventDefault();
    setContactSettings(coordsForm);
    alert(isHindi ? "संपर्क सहायता नियम सहेज लिए गए!" : "Contact coordinates updated successfully!");
  };

  // Reply submit handler
  const handleReplySubmit = async (msgId) => {
    const text = replyText[msgId];
    if (!text) return;
    try {
      const updated = await updateContactMessage(msgId, { answer: text });
      setReplyText({ ...replyText, [msgId]: '' });
      if (activeMessageDetail && activeMessageDetail.id === msgId) setActiveMessageDetail(updated);
      alert(isHindi ? "प्रतिक्रिया भेजी गई!" : "Owner reply logged!");
    } catch (error) { alert(error.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white/90">
      
      {/* Tab select sub-headers */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <span>{isHindi ? "प्लेटफार्म डायनामिक सामग्री संपादक" : "Interactive Pages & Inquiries Editor"}</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            {isHindi ? "स्वास्तिक के सूचनात्मक पृष्ठ (हमारे बारे में, संपर्क सूत्र) और ग्राहक पूछताछ फॉर्म संदेश प्रबंधित करें" : "Edit biography blocks for client profiles and moderate incoming regional submission emails"}
          </p>
        </div>

        {/* Small sectional tab pills */}
        <div className="flex flex-wrap bg-slate-900 border border-white/10 rounded-xl p-1 gap-1">
          {[
            { id: 'inbox', label: isHindi ? 'इनबॉक्स संदेश' : 'Client Inbox', icon: Inbox },
            { id: 'about', label: isHindi ? 'हमारे बारे में' : 'About Biographies', icon: Languages },
            { id: 'contact_coord', label: isHindi ? 'स्टोर व हेल्पलाइन' : 'Store & Helpline', icon: Settings },
            { id: 'privacy_manager', label: isHindi ? 'गोपनीयता' : 'Privacy policy', icon: ShieldCheck },
            { id: 'terms_manager', label: isHindi ? 'नियम व शर्तें' : 'Terms of service', icon: Gavel },
            { id: 'refund_manager', label: isHindi ? 'रिफ़ंड नीति' : 'Refund policy', icon: RotateCcw },
            { id: 'partners', label: isHindi ? 'निदेशक व निवेशक' : 'Investors & Directors', icon: Users }
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setPanelSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                  panelSection === sec.id 
                    ? 'bg-cyan-500 text-slate-950 font-black shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER TAB SECTION A: SUBMITTED INCOMING EMAILS / INQUIRIES */}
      {panelSection === 'inbox' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Incoming items lists (Column left, 5 width) */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
              Active Regional Queries Inbox ({contactMessages.length})
            </span>

            {contactMessages.length === 0 ? (
              <div className="text-center p-8 bg-slate-900/40 border border-white/5 rounded-2xl text-xs text-slate-500">
                No customer emails in inbox queue. Submit a message via the Contact page to populate.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                {contactMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setActiveMessageDetail(msg)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 focus:outline-none cursor-pointer ${
                      activeMessageDetail?.id === msg.id 
                        ? 'bg-cyan-500/10 border-cyan-400 text-white' 
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-white uppercase text-[10px] tracking-tight">{msg.name}</span>
                      <span className="text-[8.5px] font-mono text-slate-500">{msg.date || "Yesterday"}</span>
                    </div>
                    <p className="font-extrabold text-[11px] text-cyan-300">{msg.subject}</p>
                    <p className="text-slate-400 text-[10px] line-clamp-1 italic">"{msg.message}"</p>
                    {msg.answer ? (
                      <span className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-1.5 pt-0.5 border-t border-white/5 mt-1.5">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="text-[9px] text-pink-400 font-extrabold flex items-center gap-1.5 pt-0.5 border-t border-white/5 mt-1.5">
                        <Clock className="h-3 w-3 animate-pulse" /> Pending
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inquiry inspector box (Column right, 7 width) */}
          <div className="md:col-span-7 bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
            {activeMessageDetail ? (
              <div className="space-y-4">
                {/* Details header block */}
                <div className="border-b border-white/5 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-sm text-white">{activeMessageDetail.name}</h3>
                      <p className="text-[10px] font-mono text-slate-400 font-black">PH: {activeMessageDetail.mobile}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-mono">ID: #{activeMessageDetail.id}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to permanently delete this inquiry message?")) {
                            try { await deleteContactMessage(activeMessageDetail.id); setActiveMessageDetail(null); }
                            catch (error) { alert(error.message); }
                          }
                        }}
                        className="px-2 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Delete inquiry"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inquiry query texts */}
                <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase font-mono">Message Subject:</p>
                  <p className="text-xs text-cyan-200 font-extrabold">{activeMessageDetail.subject}</p>
                  
                  <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase font-mono mt-3">Message Body:</p>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">"{activeMessageDetail.message}"</p>
                </div>

                {/* Response thread */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Replied Status thread:</h4>
                  
                  {activeMessageDetail.answer ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1 animate-scale-in">
                      <p className="text-emerald-400 font-extrabold uppercase text-[8px] tracking-wide flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Swastik support response log:
                      </p>
                      <p className="text-slate-300 font-medium italic">"{activeMessageDetail.answer}"</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-pink-400 font-semibold italic">No response issued to customer yet.</p>
                  )}

                  {/* Reply Input Form */}
                  {userRole !== 'customer' && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">
                        Type Owner Answer / Coordinates:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText[activeMessageDetail.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [activeMessageDetail.id]: e.target.value })}
                          placeholder={isHindi ? "यहाँ अपनी प्रतिक्रिया टाइप करें..." : "Reply to client..."}
                          className="flex-grow bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(activeMessageDetail.id)}
                          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-300 rounded-xl font-bold text-xs uppercase cursor-pointer flex items-center gap-1"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-2">
                <Inbox className="h-8 w-8 text-slate-600 animate-pulse" />
                <span>Select an inquiry from the left side pane to review and reply</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* RENDER TAB SECTION B: EDIT ABOUT TEXT BIOGRAPHIES */}
      {panelSection === 'about' && (
        <form onSubmit={handleAboutSave} className="space-y-4 max-w-2xl bg-slate-900/60 p-5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Languages className="h-4 w-4 text-cyan-400" />
            <span>Edit biographical narrative (En/Hi translation)</span>
          </h3>

          <div className="space-y-3">
            {/* English Title */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Company Biography Heading (English) *</label>
              <input
                type="text"
                required
                value={aboutForm.titleEn}
                onChange={(e) => setAboutForm({ ...aboutForm, titleEn: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* Hindi Title */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Company Biography Heading (Hindi Script)</label>
              <input
                type="text"
                value={aboutForm.titleHi}
                onChange={(e) => setAboutForm({ ...aboutForm, titleHi: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* English Bio story */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Detailed Story biography (English) *</label>
              <textarea
                rows="4"
                required
                value={aboutForm.storyEn}
                onChange={(e) => setAboutForm({ ...aboutForm, storyEn: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            {/* Hindi Bio story */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Detailed Story biography (Hindi Script)</label>
              <textarea
                rows="4"
                value={aboutForm.storyHi}
                onChange={(e) => setAboutForm({ ...aboutForm, storyHi: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            {/* dynamic bio image config */}
            <div className="bg-slate-950 border border-white/10 p-4 rounded-2xl space-y-2">
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Biography Page Cover Banner Photo (Optional)</label>
              <input
                type="text"
                placeholder="Paste corporate background URL..."
                value={aboutForm.banner || ''}
                onChange={(e) => setAboutForm({ ...aboutForm, banner: e.target.value })}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-cyan-400 font-mono"
              />
              <R2ImageUploader 
                onUploadComplete={(url) => setAboutForm(prev => ({ ...prev, banner: url }))}
                initialImageUrl={aboutForm.banner}
              />
              {aboutForm.banner && (
                <div className="w-40 h-20 rounded-lg overflow-hidden border border-white/5 relative">
                  <img src={aboutForm.banner} alt="About preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </div>

          {userRole !== 'customer' ? (
            <button
              type="submit"
              className="px-5 py-2.5 bg-cyan-500/25 border border-cyan-500/35 hover:bg-cyan-500/35 rounded-xl font-bold text-xs uppercase tracking-wider text-cyan-200 cursor-pointer transition-all"
            >
              Save Biography Layout
            </button>
          ) : (
            <p className="text-[10px] text-pink-400 italic">Log in as admin/manager to save biography adjustments.</p>
          )}

        </form>
      )}

      {/* RENDER TAB SECTION C: STORE SETTINGS & GEOGRAPHIC COORDINATES */}
      {panelSection === 'contact_coord' && (
        <form onSubmit={handleCoordsSave} className="space-y-6 max-w-3xl bg-slate-900/60 p-6 rounded-2xl border border-white/10">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Settings className="h-5 w-5 text-cyan-400" />
              <span>{isHindi ? "स्टोर ब्रांडिंग एवं वितरण स्थान सेटिंग्स" : "Store Branding & Geolocation Coordinates"}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {isHindi ? "अपने ब्रांड लोगो, बैनर, संपर्क विवरण, कानूनी जीएसटी और लाइसेंस नंबर तथा स्टोर के अक्षांश/देशांतर (Latitude/Longitude) को कॉन्फ़िगर करें।" : "Configure your brand identity assets, legal certifications, helpline channels, and central warehouse latitude & longitude for dynamic distance calculations."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 1: Brand Profile */}
            <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <h4 className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
                {isHindi ? "१. ब्रांड प्रोफाइल" : "1. Brand Identity Profile"}
              </h4>

              {/* Brand Name */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  {isHindi ? "ब्रांड का नाम *" : "Brand / Logo Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={coordsForm.brandName || ''}
                  onChange={(e) => setCoordsForm({ ...coordsForm, brandName: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  placeholder="e.g. Swastik Supermarket"
                />
              </div>

              {/* Brand Website */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  {isHindi ? "वेबसाइट यूआरएल" : "Brand Official Website URL"}
                </label>
                <input
                  type="url"
                  value={coordsForm.website || ''}
                  onChange={(e) => setCoordsForm({ ...coordsForm, website: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono text-cyan-300"
                  placeholder="e.g. https://www.swastik.com"
                />
              </div>

              {/* Brand Logo Upload */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  {isHindi ? "स्टोर लोगो अपलोड करें" : "Store Logo Asset (upload / edit)"}
                </label>
                <R2ImageUploader 
                  initialImageUrl={coordsForm.logo || ''}
                  onUploadComplete={(url) => {
                    setCoordsForm(prev => ({ ...prev, logo: url }));
                  }}
                />
                {coordsForm.logo && (
                  <div className="mt-2 flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-white/5">
                    <img src={coordsForm.logo} alt="Logo" className="w-10 h-10 rounded object-cover" referrerPolicy="no-referrer" />
                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-xs">{coordsForm.logo}</span>
                  </div>
                )}
              </div>

              {/* Brand Banner Upload */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  {isHindi ? "प्रचार बैनर अपलोड करें" : "Promotional Store Banner Asset (upload / edit)"}
                </label>
                <R2ImageUploader 
                  initialImageUrl={coordsForm.banner || ''}
                  onUploadComplete={(url) => {
                    setCoordsForm(prev => ({ ...prev, banner: url }));
                  }}
                />
                {coordsForm.banner && (
                  <div className="mt-2 flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-white/5">
                    <img src={coordsForm.banner} alt="Banner" className="w-16 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-xs">{coordsForm.banner}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Contact channels and Legal Credentials */}
            <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
                  {isHindi ? "२. संपर्क और विधिक जानकारी" : "2. Hotline & Legal Credentials"}
                </h4>

                {/* Helpline number */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    {isHindi ? "हेल्पलाइन नंबर *" : "Helpline Support Contact phone *"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={coordsForm.phone || ''}
                      onChange={(e) => setCoordsForm({ ...coordsForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                      placeholder="e.g. +91 11 2345 6789"
                    />
                  </div>
                </div>

                {/* Support Email */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    {isHindi ? "ग्राहक सेवा ईमेल *" : "Support Care Email Account *"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={coordsForm.email || ''}
                      onChange={(e) => setCoordsForm({ ...coordsForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                      placeholder="e.g. support@swastik.com"
                    />
                  </div>
                </div>

                {/* GST Registration */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    {isHindi ? "जीएसटी नंबर (GSTIN) *" : "GSTIN Code (Commercial ID) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={coordsForm.gst || ''}
                    onChange={(e) => setCoordsForm({ ...coordsForm, gst: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono uppercase tracking-widest text-emerald-300"
                    placeholder="e.g. 09AAAAA1111A1Z1"
                  />
                </div>

                {/* License Number */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    {isHindi ? "व्यापार लाइसेंस / FSSAI नंबर *" : "Store Trade License / FSSAI Certification *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={coordsForm.license || ''}
                    onChange={(e) => setCoordsForm({ ...coordsForm, license: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono uppercase tracking-wider text-pink-300"
                    placeholder="e.g. FSSAI-12345678901234"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Geolocation Coordinates & Physical address */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
              {isHindi ? "३. वितरण भू-स्थान निर्धारण अक्षांश व देशांतर (Delivery Depot Geolocation Coordinates)" : "3. Distribution Warehouse Geolocation Coordinates"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Latitude setting */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  {isHindi ? "स्टोर अक्षांश (Store Latitude) *" : "Registry Store Latitude *"}
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={coordsForm.latitude}
                  onChange={(e) => setCoordsForm({ ...coordsForm, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  placeholder="e.g. 28.5708"
                />
              </div>

              {/* Longitude setting */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  {isHindi ? "स्टोर देशांतर (Store Longitude) *" : "Registry Store Longitude *"}
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={coordsForm.longitude}
                  onChange={(e) => setCoordsForm({ ...coordsForm, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  placeholder="e.g. 77.3259"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                {isHindi ? "स्टोर का भौतिक पता *" : "Office / Depot physical Address *"}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <textarea
                  required
                  rows={2}
                  value={coordsForm.address || ''}
                  onChange={(e) => setCoordsForm({ ...coordsForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  placeholder="Enter full physical address details..."
                />
              </div>
            </div>

            {/* Google Maps directions */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                {isHindi ? "गूगल मैप्स लिंक (वैकल्पिक)" : "Google Maps Directions Navigation Web URL (Optional)"}
              </label>
              <input
                type="url"
                value={coordsForm.googleMaps || ''}
                onChange={(e) => setCoordsForm({ ...coordsForm, googleMaps: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                placeholder="e.g. https://maps.app.goo.gl/swastik-location"
              />
            </div>



                {/* Min Order for Free Delivery */}
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 font-semibold">
                    {isHindi ? "फ्री होम डिलीवरी न्यूनतम राशि (₹) *" : "Min Order for FREE Delivery (₹) *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={coordsForm.freeDeliveryMinAmount}
                    onChange={(e) => setCoordsForm({ ...coordsForm, freeDeliveryMinAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-emerald-300 outline-none focus:border-emerald-400 font-mono"
                    placeholder="e.g. 500"
                  />
                  <span className="text-[8.5px] text-slate-500 mt-1 block">
                    {isHindi ? "फ्री डिलीवरी सेटिंग बंद करने के लिए 0 सेट करें।" : "Set to 0 to disable automatic free shipping triggers."}
                  </span>
                </div>

                {/* Flag to show on website with photo or all products */}
                <div className="sm:col-span-2 bg-slate-950/80 p-4 rounded-2xl border border-cyan-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                      <span>📸 {isHindi ? "वेबसाइट कैटलॉग उत्पाद प्रदर्शन (फ़िल्टर फ़्लैग)" : "Customer Website Catalog Display Flag"}</span>
                    </label>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      coordsForm.showOnlyWithPhoto
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-300 border-white/10'
                    }`}>
                      {coordsForm.showOnlyWithPhoto ? (isHindi ? "केवल फोटो वाले उत्पाद" : "With Photo Only") : (isHindi ? "सभी उत्पाद" : "All Products")}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {isHindi
                      ? "चुनें कि क्या ग्राहक वेबसाइट और स्टोरफ्रंट पर केवल वही उत्पाद दिखाई दें जिनकी वास्तविक फोटो उपलब्ध है, या बिना फोटो वाले सभी उत्पाद भी दिखाई दें।"
                      : "Choose whether customers only see products with actual photos/images uploaded on the public storefront, or display all inventory items."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCoordsForm({ ...coordsForm, showOnlyWithPhoto: false })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        !coordsForm.showOnlyWithPhoto
                          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>📦</span>
                          <span>{isHindi ? "सभी उत्पाद (All Items)" : "All Products"}</span>
                        </span>
                        {!coordsForm.showOnlyWithPhoto && (
                          <span className="text-[9px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.5 rounded">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-slate-400 leading-normal">
                        {isHindi ? "कैटलॉग के सभी उत्पाद दिखाएं (बिना फोटो वाले भी)।" : "Show all products on website including ones with placeholder graphics."}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoordsForm({ ...coordsForm, showOnlyWithPhoto: true })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        coordsForm.showOnlyWithPhoto
                          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>📸</span>
                          <span>{isHindi ? "केवल फोटो वाले (Photo Only)" : "With Photo Only"}</span>
                        </span>
                        {coordsForm.showOnlyWithPhoto && (
                          <span className="text-[9px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.5 rounded">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-slate-400 leading-normal">
                        {isHindi ? "केवल वास्तविक फोटो वाले उत्पाद ही ग्राहकों को दिखेंगे।" : "Only show products that have a custom photo/image assigned."}
                      </p>
                    </button>
                  </div>
                </div>
              </div>

          <div className="flex items-center justify-between pt-2">
            {userRole !== 'customer' ? (
              <button
                type="submit"
                className="px-6 py-2.5 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider text-cyan-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
              >
                {isHindi ? "स्टोर सेटिंग्स सहेजें" : "Save Store configurations"}
              </button>
            ) : (
              <p className="text-[10px] text-pink-400 italic">
                {isHindi ? "स्टोर सेटिंग्स को बदलने के लिए व्यवस्थापक/प्रबंधक क्रेडेंशियल से लॉगिन करें।" : "Log in as admin or manager to save branding and geolocation coordinate values."}
              </p>
            )}
          </div>
        </form>
      )}

      {/* RENDER TAB SECTION D: PRIVACY POLICY CRUD */}
      {panelSection === 'privacy_manager' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-white/5">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span>Privacy Policy Sections Dynamic CRUD Manager</span>
              </h3>
              <p className="text-[10px] text-slate-400">Add, edit, or remove privacy policy segments in real-time in both English and Hindi</p>
            </div>
            {!isAddingPrivacy && editingPrivacyId === null && userRole !== 'customer' && (
              <button
                type="button"
                onClick={() => {
                  setEditingPrivacyId(null);
                  setPrivacyForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
                  setIsAddingPrivacy(true);
                }}
                className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-cyan-400 cursor-pointer transition-all animate-fade-in"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Section</span>
              </button>
            )}
          </div>

          {(isAddingPrivacy || editingPrivacyId !== null) && (
            <form onSubmit={handlePrivacySubmit} className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10 max-w-2xl animate-scale-in">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                {editingPrivacyId !== null ? "Edit Privacy Section" : "Create New Privacy Section"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Heading (English)</label>
                  <input
                    type="text"
                    required
                    value={privacyForm.titleEn}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, titleEn: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Heading (Hindi)</label>
                  <input
                    type="text"
                    required
                    value={privacyForm.titleHi}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, titleHi: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Content description (English)</label>
                  <textarea
                    rows="3"
                    required
                    value={privacyForm.descEn}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, descEn: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Content description (Hindi)</label>
                  <textarea
                    rows="3"
                    required
                    value={privacyForm.descHi}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, descHi: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPrivacy(false);
                    setEditingPrivacyId(null);
                    setPrivacyForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold leading-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold leading-none cursor-pointer"
                >
                  Save Section
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {(privacySections || []).map((sect) => (
              <div key={sect.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start justify-between gap-4 hover:bg-white/10 transition-all font-sans">
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 font-bold mr-2">EN</span>
                    <span className="font-bold text-xs text-slate-200">{sect.titleEn}</span>
                    <p className="text-xs text-slate-400 mt-1 pl-4 border-l border-white/10">{sect.descEn}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-pink-300 font-bold mr-2">HI</span>
                    <span className="font-bold text-xs text-slate-200">{sect.titleHi}</span>
                    <p className="text-xs text-slate-400 mt-1 pl-4 border-l border-white/10">{sect.descHi}</p>
                  </div>
                </div>
                {userRole !== 'customer' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditPrivacy(sect)}
                      className="p-1.5 hover:bg-cyan-500/10 rounded-lg text-cyan-300 hover:text-cyan-200 transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this privacy policy section?")) {
                          deletePrivacySection(sect.id);
                          alert("Deleted!");
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-350 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER TAB SECTION E: TERMS OF SERVICE CRUD */}
      {panelSection === 'terms_manager' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-white/5">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Gavel className="h-4 w-4 text-cyan-400" />
                <span>Terms of Service Sections Dynamic CRUD Manager</span>
              </h3>
              <p className="text-[10px] text-slate-400">Add, edit, or remove terms of service rules in real-time in both English and Hindi</p>
            </div>
            {!isAddingTerms && editingTermsId === null && userRole !== 'customer' && (
              <button
                type="button"
                onClick={() => {
                  setEditingTermsId(null);
                  setTermsForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
                  setIsAddingTerms(true);
                }}
                className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-cyan-400 cursor-pointer transition-all animate-fade-in"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Rule</span>
              </button>
            )}
          </div>

          {(isAddingTerms || editingTermsId !== null) && (
            <form onSubmit={handleTermsSubmit} className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10 max-w-2xl animate-scale-in">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                {editingTermsId !== null ? "Edit Terms Rule" : "Create New Terms Rule"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Heading (English)</label>
                  <input
                    type="text"
                    required
                    value={termsForm.titleEn}
                    onChange={(e) => setTermsForm({ ...termsForm, titleEn: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Heading (Hindi)</label>
                  <input
                    type="text"
                    required
                    value={termsForm.titleHi}
                    onChange={(e) => setTermsForm({ ...termsForm, titleHi: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Content description (English)</label>
                  <textarea
                    rows="3"
                    required
                    value={termsForm.descEn}
                    onChange={(e) => setTermsForm({ ...termsForm, descEn: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Content description (Hindi)</label>
                  <textarea
                    rows="3"
                    required
                    value={termsForm.descHi}
                    onChange={(e) => setTermsForm({ ...termsForm, descHi: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTerms(false);
                    setEditingTermsId(null);
                    setTermsForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold leading-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold leading-none cursor-pointer"
                >
                  Save Section
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {(termsSections || []).map((sect) => (
              <div key={sect.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start justify-between gap-4 hover:bg-white/10 transition-all font-sans">
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 font-bold mr-2">EN</span>
                    <span className="font-bold text-xs text-slate-200">{sect.titleEn}</span>
                    <p className="text-xs text-slate-400 mt-1 pl-4 border-l border-white/10">{sect.descEn}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-pink-300 font-bold mr-2">HI</span>
                    <span className="font-bold text-xs text-slate-200">{sect.titleHi}</span>
                    <p className="text-xs text-slate-400 mt-1 pl-4 border-l border-white/10">{sect.descHi}</p>
                  </div>
                </div>
                {userRole !== 'customer' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditTerms(sect)}
                      className="p-1.5 hover:bg-cyan-500/10 rounded-lg text-cyan-300 hover:text-cyan-200 transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this terms of service rule?")) {
                          deleteTermsSection(sect.id);
                          alert("Deleted!");
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-350 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER TAB SECTION F: REFUND POLICY MANAGER */}
      {panelSection === 'refund_manager' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-emerald-400" />
                <span>Dynamic Refund & Cancellation Policy Manager</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Manage order cancellation rules, doorstep returns, and refund processing timelines. Changes automatically sync to the backend database.
              </p>
            </div>
            {!isAddingRefund && editingRefundId === null && userRole !== 'customer' && (
              <button
                type="button"
                onClick={() => {
                  setEditingRefundId(null);
                  setRefundForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
                  setIsAddingRefund(true);
                }}
                className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-emerald-400 cursor-pointer transition-all animate-fade-in"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Refund Rule</span>
              </button>
            )}
          </div>

          {(isAddingRefund || editingRefundId !== null) && (
            <form onSubmit={handleRefundSubmit} className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10 max-w-2xl animate-scale-in">
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
                {editingRefundId !== null ? "Edit Refund Policy Clause" : "Create New Refund Policy Clause"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Heading (English)</label>
                  <input
                    type="text"
                    required
                    value={refundForm.titleEn}
                    onChange={(e) => setRefundForm({ ...refundForm, titleEn: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Heading (Hindi)</label>
                  <input
                    type="text"
                    required
                    value={refundForm.titleHi}
                    onChange={(e) => setRefundForm({ ...refundForm, titleHi: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400 font-sans"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Content description (English)</label>
                  <textarea
                    rows="3"
                    required
                    value={refundForm.descEn}
                    onChange={(e) => setRefundForm({ ...refundForm, descEn: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400 font-sans resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Content description (Hindi)</label>
                  <textarea
                    rows="3"
                    required
                    value={refundForm.descHi}
                    onChange={(e) => setRefundForm({ ...refundForm, descHi: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400 font-sans resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRefund(false);
                    setEditingRefundId(null);
                    setRefundForm({ titleEn: '', titleHi: '', descEn: '', descHi: '' });
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold leading-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold leading-none cursor-pointer"
                >
                  Save Refund Clause
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {(refundSections || []).map((sect) => (
              <div key={sect.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start justify-between gap-4 hover:bg-white/10 transition-all font-sans">
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold mr-2">EN</span>
                    <span className="font-bold text-xs text-slate-200">{sect.titleEn}</span>
                    <p className="text-xs text-slate-400 mt-1 pl-4 border-l border-white/10">{sect.descEn}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-pink-300 font-bold mr-2">HI</span>
                    <span className="font-bold text-xs text-slate-200">{sect.titleHi}</span>
                    <p className="text-xs text-slate-400 mt-1 pl-4 border-l border-white/10">{sect.descHi}</p>
                  </div>
                </div>
                {userRole !== 'customer' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditRefund(sect)}
                      className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this refund rule?")) {
                          deleteRefundSection(sect.id);
                          alert("Deleted!");
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-350 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {panelSection === 'partners' && (
        <PartnersManager userRole={userRole} />
      )}

    </div>
  );
}
