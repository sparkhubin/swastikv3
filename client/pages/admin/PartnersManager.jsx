import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Camera, 
  Building,
  Search,
  X,
  Check,
  Eye,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Award,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function PartnersManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { partners, addPartner, updatePartner, deletePartner, fetchPartners } = useData();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, DIRECTOR, INVESTOR, ADVISOR
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states: Create
  const [showAddForm, setShowAddForm] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    designation: '',
    about: '',
    photo: ''
  });

  // Form states: Edit Modal
  const [editingPartner, setEditingPartner] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    designation: '',
    about: '',
    photo: ''
  });

  // Modal: Preview Card
  const [previewPartner, setPreviewPartner] = useState(null);

  // Modal: Delete Confirmation
  const [deletingPartner, setDeletingPartner] = useState(null);

  // Feedback Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    fetchPartners(true);
  }, [fetchPartners]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPartners(true);
      showToast(isHindi ? "निर्देशिका डेटा ताज़ा किया गया" : "Directory data refreshed successfully");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered partners list
  const filteredPartners = useMemo(() => {
    return (partners || []).filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.designation && p.designation.toLowerCase().includes(q)) ||
        (p.about && p.about.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (roleFilter === 'DIRECTOR') {
        return (p.designation || '').toLowerCase().includes('director');
      }
      if (roleFilter === 'INVESTOR') {
        return (p.designation || '').toLowerCase().includes('investor') || (p.about || '').toLowerCase().includes('invest');
      }
      if (roleFilter === 'ADVISOR') {
        return (p.designation || '').toLowerCase().includes('lead') || (p.designation || '').toLowerCase().includes('advisor') || (p.designation || '').toLowerCase().includes('partner');
      }
      return true;
    });
  }, [partners, searchQuery, roleFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = partners?.length || 0;
    const withPhotos = (partners || []).filter(p => p.photo && p.photo.trim().length > 0).length;
    const directors = (partners || []).filter(p => (p.designation || '').toLowerCase().includes('director')).length;
    return { total, withPhotos, directors };
  }, [partners]);

  // --- CREATE SUBMIT ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!partnerForm.name.trim() || !partnerForm.designation.trim() || !partnerForm.about.trim()) {
      showToast(
        isHindi ? "कृपया सभी अनिवार्य फ़ील्ड भरें: नाम, पद और परिचय।" : "Please provide all required fields: Name, Designation (Post), and Bio details.",
        "error"
      );
      return;
    }

    try {
      await addPartner({
        name: partnerForm.name.trim(),
        designation: partnerForm.designation.trim(),
        about: partnerForm.about.trim(),
        photo: partnerForm.photo.trim() || ""
      });

      setPartnerForm({
        name: '',
        designation: '',
        about: '',
        photo: ''
      });
      setShowAddForm(false);
      showToast(
        isHindi ? "✓ नया व्यावसायिक निवेशक/निदेशक सफलतापूर्वक जोड़ा गया!" : "✓ New Business Investor / Director successfully registered!"
      );
    } catch (err) {
      showToast(isHindi ? "त्रुटि: डेटा सहेजने में विफल" : "Error saving investor details", "error");
    }
  };

  // --- OPEN EDIT MODAL ---
  const handleOpenEditModal = (partner) => {
    setEditingPartner(partner);
    setEditFormData({
      name: partner.name || '',
      designation: partner.designation || '',
      about: partner.about || '',
      photo: partner.photo || ''
    });
  };

  // --- UPDATE SUBMIT ---
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingPartner) return;

    if (!editFormData.name.trim() || !editFormData.designation.trim() || !editFormData.about.trim()) {
      showToast(
        isHindi ? "कृपया सभी अनिवार्य फ़ील्ड भरें: नाम, पद और परिचय।" : "Please provide all required fields: Name, Designation, and Bio details.",
        "error"
      );
      return;
    }

    try {
      await updatePartner(editingPartner.id, {
        name: editFormData.name.trim(),
        designation: editFormData.designation.trim(),
        about: editFormData.about.trim(),
        photo: editFormData.photo.trim() || ""
      });

      showToast(
        isHindi 
          ? `✓ "${editFormData.name}" के विवरण सफलतापूर्वक अपडेट किए गए!` 
          : `✓ Successfully updated details for "${editFormData.name}"!`
      );
      setEditingPartner(null);
    } catch (err) {
      showToast(isHindi ? "त्रुटि: अपडेट विफल रहा" : "Failed to update investor profile", "error");
    }
  };

  // --- DELETE CONFIRMATION ---
  const handleConfirmDelete = async () => {
    if (!deletingPartner) return;
    try {
      await deletePartner(deletingPartner.id);
      showToast(
        isHindi 
          ? `"${deletingPartner.name}" को निर्देशिका से सफलतापूर्वक हटा दिया गया` 
          : `Removed "${deletingPartner.name}" from the directory`
      );
    } catch (err) {
      showToast(isHindi ? "त्रुटि: हटाने में विफल" : "Failed to delete investor", "error");
    } finally {
      setDeletingPartner(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white/90" id="partners-manager-view">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          id="partners-toast"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-slide-up ${
            toastMessage.type === 'error' 
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200' 
              : 'bg-slate-900/95 border-cyan-500/40 text-cyan-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          ) : (
            <Check className="h-5 w-5 text-cyan-400 shrink-0" />
          )}
          <span className="text-xs font-bold">{toastMessage.msg}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg ml-2 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-cyan-300 text-[10px] font-black uppercase tracking-wider mb-2">
              <Award className="h-3.5 w-3.5 text-cyan-400" />
              <span>{isHindi ? "व्यावसायिक शासन और निदेशक मंडल" : "Corporate Governance & Board Directory"}</span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-cyan-400" />
              <span>{isHindi ? "व्यावसायिक निवेशक और निदेशक निर्देशिका" : "Corporate Investors & Directors Directory"}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium max-w-2xl">
              {isHindi 
                ? "संस्था के सम्मानित व्यावसायिक निवेशकों, निदेशकों व बोर्ड सलाहकारों का विवरण जोड़ें, संपादित करें या प्रबंधित करें।" 
                : "Manage certified corporate directors, financial backers, and business investors. Full CRUD operations with live database synchronization."
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="refresh-partners-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50"
              title={isHindi ? "ताज़ा करें" : "Refresh directory"}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isHindi ? "ताज़ा करें" : "Refresh"}</span>
            </button>

            {userRole !== 'customer' && (
              <button
                type="button"
                id="toggle-add-partner-btn"
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                  showAddForm 
                    ? 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700' 
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border border-cyan-300'
                }`}
              >
                {showAddForm ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>{isHindi ? "फ़ॉर्म बंद करें" : "Close Form"}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>{isHindi ? "नया निवेशक जोड़ें" : "Add New Investor"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {isHindi ? "कुल सदस्य" : "Total Entities"}
            </div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {isHindi ? "निदेशक सदस्य" : "Board Directors"}
            </div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{stats.directors}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {isHindi ? "सत्यापित फोटो युक्त" : "With Photo Profile"}
            </div>
            <div className="text-xl font-black text-purple-400 mt-0.5">{stats.withPhotos}</div>
          </div>
        </div>
      </div>

      {/* --- ADD NEW INVESTOR / DIRECTOR FORM (Collapsible / Toggleable) --- */}
      {showAddForm && userRole !== 'customer' && (
        <form 
          onSubmit={handleCreateSubmit} 
          id="create-partner-form"
          className="bg-slate-900 border border-cyan-500/30 p-6 rounded-3xl space-y-5 shadow-2xl animate-scale-in relative overflow-hidden"
        >
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-cyan-300 font-black text-sm uppercase tracking-wider">
              <Plus className="h-4 w-4" />
              <span>{isHindi ? "नया व्यावसायिक निवेशक या निदेशक पंजीकृत करें" : "Register New Business Investor / Board Director"}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Pre-fill Suggestions */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span className="font-bold uppercase tracking-wider">{isHindi ? "त्वरित पद सुझाव:" : "Quick Designation Presets:"}</span>
            {[
              "Founder & Sourcing Director",
              "Organic Dairy Lead",
              "Technology & Warehousing Director",
              "Executive Managing Director",
              "Chief Financial Investor"
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPartnerForm(prev => ({ ...prev, designation: preset }))}
                className="bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer font-semibold"
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">
                {isHindi ? "पूरा नाम *" : "Full Name *"}
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  required
                  id="partner-name-input"
                  placeholder="e.g. Rajesh Patidar"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full pl-10 bg-slate-950 border border-white/15 rounded-xl py-3 outline-none text-white text-xs font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            {/* Designation / Post */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">
                {isHindi ? "पदनाम (Designation) *" : "Designation / Corporate Post *"}
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  required
                  id="partner-designation-input"
                  placeholder="e.g. Founder & Sourcing Director"
                  value={partnerForm.designation}
                  onChange={(e) => setPartnerForm({ ...partnerForm, designation: e.target.value })}
                  className="w-full pl-10 bg-slate-950 border border-white/15 rounded-xl py-3 outline-none text-white text-xs font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* About / Professional Bio */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">
              {isHindi ? "परिचय एवं व्यावसायिक विवरण (Bio) *" : "About Details & Governance Contributions *"}
            </label>
            <textarea 
              required
              id="partner-about-input"
              rows={3}
              placeholder="e.g. Rajesh manages our fresh local grower networks. He is responsible for testing purity and ensuring organic quality on all botanical essentials..."
              value={partnerForm.about}
              onChange={(e) => setPartnerForm({ ...partnerForm, about: e.target.value })}
              className="w-full bg-slate-950 border border-white/15 rounded-xl p-3.5 outline-none text-white text-xs font-medium font-sans resize-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all leading-relaxed"
            />
          </div>

          {/* Photo URL & R2 Image Uploader */}
          <div className="bg-slate-950/70 border border-white/10 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-black flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                <span>{isHindi ? "पोर्ट्रेट फ़ोटो कॉन्फ़िगरेशन" : "Portrait Image Configuration"}</span>
              </span>
              {partnerForm.photo && (
                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  ✓ Photo Attached
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Image Preview */}
              <div className="flex sm:flex-col items-center gap-3 shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center shadow-md">
                  {partnerForm.photo ? (
                    <img 
                      src={partnerForm.photo} 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                  ) : (
                    <Users className="h-8 w-8 text-slate-600" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 sm:text-center">
                  <div className="font-bold text-white truncate max-w-[130px]">{partnerForm.name || "Preview Identity"}</div>
                  <div className="text-[9px] text-slate-500 truncate max-w-[130px]">{partnerForm.designation || "Director"}</div>
                </div>
              </div>

              {/* Direct URL Input & R2 Cloud Uploader Controls */}
              <div className="flex-1 w-full space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-bold">
                    {isHindi ? "प्रत्यक्ष छवि URL चिपकाएं" : "Direct Image URL"}
                  </label>
                  <input 
                    type="text" 
                    id="partner-photo-url-input"
                    placeholder="https://..."
                    value={partnerForm.photo}
                    onChange={(e) => setPartnerForm({ ...partnerForm, photo: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 outline-none text-white text-xs font-mono focus:border-cyan-400 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-bold">
                    {isHindi ? "या R2 क्लाउड स्टोरेज पर अपलोड करें" : "Or Upload to Cloud R2"}
                  </label>
                  <R2ImageUploader 
                    onUploadComplete={(url) => setPartnerForm(prev => ({ ...prev, photo: url }))} 
                    initialImageUrl={partnerForm.photo}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setShowAddForm(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs cursor-pointer transition-all text-center"
            >
              {isHindi ? "रद्द करें" : "Cancel"}
            </button>
            <button 
              type="submit"
              id="submit-new-partner-btn"
              className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl border border-cyan-300 transition-all active:scale-95 cursor-pointer shadow-lg text-center"
            >
              {isHindi ? "निवेशक प्रोफाइल बनाएं" : "Authorize Investor Identity"}
            </button>
          </div>
        </form>
      )}

      {/* --- CONTROLS BAR: SEARCH, FILTERS & VIEW MODE --- */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-900/60 border border-white/10 p-3 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            id="partner-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isHindi ? "नाम, पदनाम या परिचय द्वारा खोजें..." : "Search by name, designation, or bio..."}
            className="w-full pl-10 pr-9 bg-slate-950 border border-white/10 rounded-xl py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: isHindi ? 'सभी' : 'All' },
            { id: 'DIRECTOR', label: isHindi ? 'निदेशक' : 'Directors' },
            { id: 'INVESTOR', label: isHindi ? 'निवेशक' : 'Investors' },
            { id: 'ADVISOR', label: isHindi ? 'सलाहकार' : 'Advisors' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRoleFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === f.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- DIRECTORY CARDS GRID --- */}
      {filteredPartners.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-white/15 rounded-3xl p-12 text-center space-y-3">
          <Users className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-black text-white">
            {isHindi ? "कोई निवेशक या निदेशक नहीं मिला" : "No Investors or Directors Found"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery 
              ? (isHindi ? "खोज मानदंडों से मेल खाने वाला कोई रिकॉर्ड नहीं मिला। खोज रीसेट करें।" : "No profiles match your search criteria. Try a different search term.")
              : (isHindi ? "अभी तक कोई निवेशक पंजीकृत नहीं है। 'नया निवेशक जोड़ें' बटन पर क्लिक करके पहला सदस्य जोड़ें।" : "No investors registered yet. Click 'Add New Investor' to create the first profile.")
            }
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>{isHindi ? "फ़िल्टर रीसेट करें" : "Reset Filter"}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="partners-grid-container">
          {filteredPartners.map((p) => {
            const name = p.name || "Business Investor";
            const designation = p.designation || "Corporate Director";
            const about = p.about || "Authorized capital source partner.";
            const coverImg = p.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300";

            return (
              <div 
                key={p.id} 
                id={`partner-card-${p.id}`}
                className="bg-slate-900 border border-white/10 rounded-3xl flex flex-col justify-between relative group hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-950/40 transition-all duration-300 overflow-hidden p-5 space-y-4"
              >
                <div className="space-y-4">
                  
                  {/* Top Bar: Portrait Avatar + Action Buttons */}
                  <div className="flex justify-between items-start gap-3">
                    {/* Portrait Photo */}
                    <div className="w-16 h-16 rounded-2xl border-2 border-white/10 overflow-hidden shrink-0 bg-slate-950 shadow-md group-hover:border-cyan-400/40 transition-all">
                      <img 
                        src={coverImg} 
                        alt={name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
                    </div>

                    {/* Action Controls: Preview, Edit, Delete */}
                    <div className="flex items-center gap-1.5">
                      {/* Preview Button */}
                      <button 
                        type="button"
                        id={`preview-partner-btn-${p.id}`}
                        onClick={() => setPreviewPartner(p)}
                        title={isHindi ? "पूर्वावलोकन देखें" : "Preview profile"}
                        className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {userRole !== 'customer' && (
                        <>
                          {/* EDIT BUTTON (Full CRUD Requirement) */}
                          <button 
                            type="button"
                            id={`edit-partner-btn-${p.id}`}
                            onClick={() => handleOpenEditModal(p)}
                            title={isHindi ? "निवेशक विवरण संपादित करें" : "Edit investor details"}
                            className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{isHindi ? "संपादित करें" : "Edit"}</span>
                          </button>

                          {/* DELETE BUTTON */}
                          <button 
                            type="button"
                            id={`delete-partner-btn-${p.id}`}
                            onClick={() => setDeletingPartner(p)}
                            title={isHindi ? "हटाएं" : "Delete profile"}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all cursor-pointer active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Name and Designation */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black text-white leading-tight group-hover:text-cyan-300 transition-colors">
                        {name}
                      </h4>
                      <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" title="Verified Board Member" />
                    </div>
                    <div>
                      <span className="inline-block bg-cyan-500/15 text-cyan-300 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-cyan-500/25">
                        {designation}
                      </span>
                    </div>
                  </div>

                  {/* About Bio */}
                  <p className="text-xs text-slate-400 leading-relaxed font-normal font-sans line-clamp-4">
                    {about}
                  </p>
                </div>

                {/* Footer Metadata */}
                <div className="border-t border-white/5 pt-3.5 mt-auto flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-slate-400">
                    <UserCheck className="h-3 w-3 text-emerald-400" />
                    <span>ID #{p.id}</span>
                  </span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isHindi ? "सक्रिय" : "Active"}</span>
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- EDIT INVESTOR / DIRECTOR MODAL (Full CRUD Implementation) --- */}
      {/* ========================================================================= */}
      {editingPartner && (
        <div 
          id="edit-partner-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setEditingPartner(null)}
        >
          <div 
            className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed / Non-scrollable) */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 shrink-0">
                  <Edit3 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate">
                    {isHindi ? "निवेशक विवरण संपादित करें" : "Edit Investor / Director Details"}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isHindi 
                      ? `आईडी #${editingPartner.id} के प्रोफ़ाइल डेटा को अपडेट करें` 
                      : `Modify and synchronize record for entity ID #${editingPartner.id}`
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="close-edit-modal-btn"
                onClick={() => setEditingPartner(null)}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all shrink-0 ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form (Scrollable body with fixed footer) */}
            <form onSubmit={handleUpdateSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable inputs container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">
                      {isHindi ? "पूरा नाम *" : "Full Name *"}
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input 
                        type="text" 
                        required
                        id="edit-partner-name-input"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full pl-10 bg-slate-950 border border-white/15 rounded-xl py-2.5 sm:py-3 outline-none text-white text-xs font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Designation / Post */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">
                      {isHindi ? "पदनाम (Designation) *" : "Designation / Corporate Post *"}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input 
                        type="text" 
                        required
                        id="edit-partner-designation-input"
                        value={editFormData.designation}
                        onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                        className="w-full pl-10 bg-slate-950 border border-white/15 rounded-xl py-2.5 sm:py-3 outline-none text-white text-xs font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* About Bio */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">
                    {isHindi ? "परिचय एवं व्यावसायिक विवरण (Bio) *" : "About Details & Governance Contributions *"}
                  </label>
                  <textarea 
                    required
                    id="edit-partner-about-input"
                    rows={3}
                    value={editFormData.about}
                    onChange={(e) => setEditFormData({ ...editFormData, about: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 sm:p-3.5 outline-none text-white text-xs font-medium font-sans resize-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all leading-relaxed"
                  />
                </div>

                {/* Photo Upload & Preview */}
                <div className="bg-slate-950/70 border border-white/10 p-3.5 sm:p-4 rounded-2xl space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-black flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    <span>{isHindi ? "प्रोफ़ाइल फोटो अपडेट करें" : "Update Profile Photo"}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {/* Thumbnail Preview */}
                    <div className="flex sm:flex-col items-center gap-3 shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center shadow-md">
                        {editFormData.photo ? (
                          <img 
                            src={editFormData.photo} 
                            alt="Edit Preview" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200";
                            }}
                          />
                        ) : (
                          <Users className="h-8 w-8 text-slate-600" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 sm:text-center">
                        <div className="font-bold text-white truncate max-w-[130px]">{editFormData.name || "Preview"}</div>
                        <div className="text-slate-500 text-[9px]">{editFormData.photo ? "Photo Attached" : "No photo"}</div>
                      </div>
                    </div>

                    {/* Image URL & Cloud Uploader Controls */}
                    <div className="flex-1 w-full space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-bold">
                          {isHindi ? "छवि URL (Paste Direct URL)" : "Direct Image URL"}
                        </label>
                        <input 
                          type="text" 
                          id="edit-partner-photo-url-input"
                          placeholder="https://..."
                          value={editFormData.photo}
                          onChange={(e) => setEditFormData({ ...editFormData, photo: e.target.value })}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 outline-none text-white text-xs font-mono focus:border-cyan-400 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-bold">
                          {isHindi ? "या R2 क्लाउड स्टोरेज पर अपलोड करें" : "Or Upload to Cloud R2"}
                        </label>
                        <R2ImageUploader 
                          onUploadComplete={(url) => setEditFormData(prev => ({ ...prev, photo: url }))} 
                          initialImageUrl={editFormData.photo}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls (Fixed / Always Visible) */}
              <div className="p-3.5 sm:p-5 border-t border-white/10 bg-slate-950/80 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  id="cancel-edit-partner-btn"
                  onClick={() => setEditingPartner(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs cursor-pointer transition-all text-center"
                >
                  {isHindi ? "रद्द करें" : "Cancel"}
                </button>
                <button
                  type="submit"
                  id="save-partner-changes-btn"
                  className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl border border-cyan-300 transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>{isHindi ? "बदलाव सहेजें" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- PREVIEW MODAL (Fully Responsive & Scrollable Customer View) --- */}
      {/* ========================================================================= */}
      {previewPartner && (
        <div 
          id="preview-partner-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setPreviewPartner(null)}
        >
          <div 
            className="bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (Fixed / Non-scrollable) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
                <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{isHindi ? "सार्वजनिक पूर्वावलोकन (ग्राहक दृश्य)" : "Public Card Preview"}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPartner(null)}
                className="p-1.5 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin">
              {/* Responsive Portrait & Identity Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md shrink-0 relative">
                  <img 
                    src={previewPartner.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"} 
                    alt={previewPartner.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                </div>

                <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {previewPartner.name}
                  </h3>
                  <div>
                    <span className="inline-block bg-emerald-100 text-emerald-900 border border-emerald-300/70 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg">
                      {previewPartner.designation}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Entity ID: #{previewPartner.id}</span>
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{isHindi ? "सक्रिय" : "Active"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{isHindi ? "व्यावसायिक परिचय एवं विवरण" : "Corporate Bio & Governance Details"}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  {previewPartner.about}
                </div>
              </div>
            </div>

            {/* Footer (Fixed / Non-scrollable) */}
            <div className="p-3.5 sm:p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 bg-slate-50/90 shrink-0 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setPreviewPartner(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-all text-center"
              >
                {isHindi ? "बंद करें" : "Close"}
              </button>
              {userRole !== 'customer' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = previewPartner;
                    setPreviewPartner(null);
                    handleOpenEditModal(target);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{isHindi ? "प्रोफ़ाइल संपादित करें" : "Edit Profile"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- DELETE CONFIRMATION MODAL (Responsive & Scroll-Safe) --- */}
      {/* ========================================================================= */}
      {deletingPartner && (
        <div 
          id="delete-partner-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setDeletingPartner(null)}
        >
          <div 
            className="bg-slate-900 border border-rose-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 my-auto animate-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto shrink-0">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-white">
                {isHindi ? "क्या आप वाकई इस निवेशक को हटाना चाहते हैं?" : "Confirm Removal of Investor Entity"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isHindi 
                  ? `आप "${deletingPartner.name}" (${deletingPartner.designation}) को निर्देशिका से हटाने जा रहे हैं। यह क्रिया पूर्ववत नहीं की जा सकती।`
                  : `You are about to permanently remove "${deletingPartner.name}" (${deletingPartner.designation}) from the Corporate Governance & Board Directory.`
                }
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-center gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-partner-btn"
                onClick={() => setDeletingPartner(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs cursor-pointer transition-all text-center"
              >
                {isHindi ? "रद्द करें" : "Cancel"}
              </button>
              <button
                type="button"
                id="confirm-delete-partner-btn"
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isHindi ? "हाँ, हटाएं" : "Yes, Remove"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
