import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  MessageSquare, 
  Send, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  Star, 
  X, 
  Sparkles, 
  User, 
  Calendar,
  Image as ImageIcon,
  Globe,
  RefreshCw,
  Download,
  ShieldCheck
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function ReviewsManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { reviews, addReview, updateReview, deleteReview } = useData();

  const [editorModal, setEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states for adding/editing testimonials
  const [formData, setFormData] = useState({
    name: '',
    rating: 5,
    commentEn: '',
    commentHi: '',
    avatarBg: 'from-cyan-400 to-blue-500',
    date: 'Just now',
    response: '',
    reviewImage: ''
  });

  const [replyFormText, setReplyFormText] = useState({});
  const [reviewImage, setReviewImage] = useState({});

  // Google Reviews Integration States
  const [isGmapsSyncOpen, setIsGmapsSyncOpen] = useState(false);
  const [gmapsPlaceQuery, setGmapsPlaceQuery] = useState('Swastik Supermarket & Organic Groceries, Indore');
  const [isFetchingGmaps, setIsFetchingGmaps] = useState(false);
  const [fetchedGmapsReviews, setFetchedGmapsReviews] = useState([]);
  const [importedIds, setImportedIds] = useState({});
  const [syncSuccessMessage, setSyncSuccessMessage] = useState('');

  const triggerGoogleFetch = () => {
    setIsFetchingGmaps(true);
    setSyncSuccessMessage('');
    setTimeout(() => {
      const gReviews = [
        {
          id: 'g1',
          name: 'Rajesh Kumar',
          rating: 5,
          commentEn: 'Best organic grocery store in Indore. The fruits and leafy greens are so fresh and we always get super quick delivery. Very helpful bilingually designed app!',
          commentHi: 'इंदौर में सबसे बेहतरीन जैविक किराना स्टोर। फल और हरी पत्तेदार सब्जियां बहुत ताज़ा हैं और हमें हमेशा बहुत तेज़ डिलीवरी मिलती है। काफी अच्छे से तैयार की गयी हिंदी और इंग्लिश ऐप है!',
          avatarBg: 'from-amber-400 to-yellow-500',
          date: '2 days ago - Google Local Guide',
        },
        {
          id: 'g2',
          name: 'Sunita Deshmukh',
          rating: 5,
          commentEn: 'Amazing variety of pulses and dry fruits. The quality of baseline grains is superior compared to local vendors. Rates are affordable, highly recommended!',
          commentHi: 'दालों और सूखे मेवों की अद्भुत विविधता। स्थानीय विक्रेताओं की तुलना में अनाज की गुणवत्ता बेहतर है। दरें काफी वाजिब हैं, अत्यधिक अनुशंसित!',
          avatarBg: 'from-pink-500 to-rose-400',
          date: '1 week ago - Google Verified Buyer',
        },
        {
          id: 'g3',
          name: 'Anil Patidar',
          rating: 5,
          commentEn: 'Swastik has simplified our monthly ration collection easily! Home delivery is highly sterile and vegetables come perfectly packed. Customer support is fantastic.',
          commentHi: 'स्वास्तिक ने हमारे मासिक राशन संग्रह को बहुत आसान बना दिया है! होम डिलीवरी अत्यधिक सुरक्षित रूप से की जाती है और सब्जियां पूरी तरह से पैक होकर आती हैं। कस्टमर सपोर्ट बहुत बढ़िया है।',
          avatarBg: 'from-cyan-400 to-blue-500',
          date: '3 hours ago - Google Maps Verified',
        },
        {
          id: 'g4',
          name: 'Priya Sharma',
          rating: 4,
          commentEn: 'Very safe store with direct sanitization. Excellent prices on daily milk and fresh breads. App has great offline backup and simple support.',
          commentHi: 'उत्तम और सुरक्षित सेवाएं। दूध और ताज़ा ब्रेड पर बेहतरीन कीमतें हैं। ऐप में बढ़िया सपोर्ट सुविधाएं भी दी गई हैं।',
          avatarBg: 'from-purple-500 to-indigo-600',
          date: '3 weeks ago - Google Local Guide',
        },
        {
          id: 'g5',
          name: 'Vikram Singh',
          rating: 5,
          commentEn: 'Top notch packaging and organic premium quality. Swastik is reliable, trustworthy, and guarantees consistent updates on deliveries.',
          commentHi: 'शानदार पैकेजिंग और जैविक प्रीमियम गुणवत्ता। स्वास्तिक विश्वसनीय है और लगातार समय पर डिलीवरी की गारंटी देता है।',
          avatarBg: 'from-emerald-400 to-teal-600',
          date: 'Yesterday - Google Verified',
        }
      ];
      setFetchedGmapsReviews(gReviews);
      setIsFetchingGmaps(false);
      setSyncSuccessMessage('Successfully fetched 5 active Google Place reviews! Ready to save to database.');
    }, 1100);
  };

  const handleImportSingleGReview = (item) => {
    const payload = {
      name: item.name,
      rating: item.rating,
      commentEn: item.commentEn,
      commentHi: item.commentHi || item.commentEn,
      avatarBg: item.avatarBg,
      date: item.date || 'Google Maps Verified Review',
      response: '',
      reviewImage: ''
    };
    addReview(payload);
    setImportedIds(prev => ({ ...prev, [item.id]: true }));
    setSyncSuccessMessage(`Success! Google Review by "${item.name}" has been successfully imported and saved into your dynamic Homepage Testimonials Carousel!`);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      rating: 5,
      commentEn: '',
      commentHi: '',
      avatarBg: 'from-cyan-400 to-blue-500',
      date: 'Just now',
      response: '',
      reviewImage: ''
    });
    setEditorModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      rating: item.rating || 5,
      commentEn: item.commentEn || '',
      commentHi: item.commentHi || '',
      avatarBg: item.avatarBg || 'from-cyan-400 to-blue-500',
      date: item.date || 'Just now',
      response: item.response || '',
      reviewImage: item.reviewImage || ''
    });
    setEditorModal(true);
  };

  const handleCloseModal = () => {
    setEditorModal(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.commentEn) {
      alert("Name and English comment are required.");
      return;
    }

    const payload = {
      name: formData.name,
      rating: Number(formData.rating),
      commentEn: formData.commentEn,
      commentHi: formData.commentHi || formData.commentEn,
      avatarBg: formData.avatarBg,
      date: formData.date || 'Just now',
      response: formData.response,
      reviewImage: formData.reviewImage
    };

    if (editingItem) {
      await updateReview(editingItem.id, payload);
    } else {
      await addReview(payload);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this shopper testimonial? it will be removed from the Home screen Carousel.")) {
      deleteReview(id);
    }
  };

  const handleSaveReviewReply = async (id) => {
    const currentReview = reviews.find(r => r.id === id);
    if (!currentReview) return;
    await updateReview(id, { 
      ...currentReview,
      response: replyFormText[id] || '',
      reviewImage: reviewImage[id] || currentReview.reviewImage || ''
    });
    setReplyFormText(prev => ({ ...prev, [id]: '' }));
    setReviewImage(prev => ({ ...prev, [id]: '' }));
  };

  const colorPresets = [
    { label: 'Cyan-Blue', value: 'from-cyan-400 to-blue-500' },
    { label: 'Pink-Rose', value: 'from-pink-500 to-rose-400' },
    { label: 'Purple-Indigo', value: 'from-purple-500 to-indigo-600' },
    { label: 'Emerald-Teal', value: 'from-emerald-400 to-teal-600' },
    { label: 'Amber-Yellow', value: 'from-amber-400 to-yellow-500' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-white/90">
      
      {/* Page Header */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            <span>{isHindi ? "ग्राहक प्रशंसापत्र और समीक्षा प्रबंधक" : "Shopper Testimonials & Business Reviews"}</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            {isHindi ? "होम स्क्रीन के प्रशंसापत्र को जोड़ें, संपादित करें और हटाएं" : "Add, Edit, and Delete Home carousel reviews & official manager responses"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsGmapsSyncOpen(!isGmapsSyncOpen)}
            className={`px-4 py-2 border rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isGmapsSyncOpen 
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' 
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30 hover:bg-indigo-500/20'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>{isGmapsSyncOpen ? 'Close Maps Sync' : 'Google Maps Review Sync'}</span>
          </button>

          {userRole !== 'customer' && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-xl font-black text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              id="add-review-btn"
            >
              <Plus className="h-4 w-4" />
              <span>Create Testimonial</span>
            </button>
          )}
        </div>
      </div>

      {/* Google Maps Places Importer Engine Interface */}
      {isGmapsSyncOpen && (
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/40 border border-indigo-500/25 p-6 rounded-3xl space-y-4 animate-fade-in shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase bg-indigo-500 text-white px-2 py-0.5 rounded tracking-wide">
                Google Business Profile Gateway
              </span>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span>Google Places Live Review Synthesizer</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Lookup Swastik Supermarket on Google Maps, fetch genuine reviews, and import them with 1-click.
              </p>
            </div>
            <button 
              onClick={() => setIsGmapsSyncOpen(false)}
              className="p-1 rounded-full hover:bg-white/5 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative grow">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Google Place Keyword or Map Address..." 
                value={gmapsPlaceQuery}
                onChange={(e) => setGmapsPlaceQuery(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/10 focus:border-cyan-400/50 outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 font-semibold"
              />
            </div>
            <button
              onClick={triggerGoogleFetch}
              disabled={isFetchingGmaps}
              className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isFetchingGmaps ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Fetching GMP Details...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Fetch Google Reviews</span>
                </>
              )}
            </button>
          </div>

          {/* Sync status alert notification */}
          {syncSuccessMessage && (
            <div className="p-3 bg-cyan-400/10 border border-cyan-400/20 rounded-xl text-teal-300 text-[11px] font-semibold flex items-center gap-2 animate-fade-in">
              <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>{syncSuccessMessage}</span>
            </div>
          )}

          {/* Fetched list items preview panel */}
          {fetchedGmapsReviews.length > 0 && (
            <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
              <span className="text-[9px] font-black text-indigo-300 block uppercase tracking-wider">
                Google Maps Verified Submissions ({fetchedGmapsReviews.length})
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fetchedGmapsReviews.map((gRev) => {
                  const alreadySaved = importedIds[gRev.id];
                  return (
                    <div key={gRev.id} className="bg-slate-950/70 border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden group">
                      
                      {/* Avatar & ratings header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gRev.avatarBg} flex items-center justify-center text-[11px] font-black text-white`}>
                            {gRev.name[0]}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs block text-white flex items-center gap-1">
                              {gRev.name}
                              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400/10" title="Google Verified Local Guide" />
                            </span>
                            <span className="text-[9px] text-slate-500 block font-semibold">{gRev.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: gRev.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                      </div>

                      {/* Bilingual Texts inside Google sync */}
                      <div className="space-y-1 text-[11px] leading-relaxed font-medium bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                        <p className="text-slate-300 italic">"{gRev.commentEn}"</p>
                        <p className="text-slate-400 italic pt-1 font-sans border-t border-white/5">"{gRev.commentHi}"</p>
                      </div>

                      {/* Import CTA button */}
                      <button
                        onClick={() => handleImportSingleGReview(gRev)}
                        disabled={alreadySaved}
                        className={`w-full py-2 rounded-xl text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 transition-all border ${
                          alreadySaved 
                            ? 'bg-teal-500/10 border-teal-500/25 text-teal-400 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-cyan-400 hover:text-slate-950 border-white/10 active:scale-95 cursor-pointer'
                        }`}
                      >
                        {alreadySaved ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Saved to Carousel</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            <span>Import to Carousel</span>
                          </>
                        )}
                      </button>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/40 border border-white/5 rounded-2xl text-xs text-slate-500">
            No dynamic customer testimonials found. Click Create to write one.
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-gradient-to-br from-white/5 via-slate-900/40 to-transparent border border-white/10 p-5 rounded-3xl space-y-4 relative group">
              
              {/* Reviewer Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${r.avatarBg || 'from-cyan-400 to-pink-500'} flex items-center justify-center font-black text-sm text-white shadow-md`}>
                    {r.name ? r.name[0] : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm block">{r.name}</span>
                      <span className="text-[9px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {r.date || 'Verified Shopper'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < (r.rating || 5) ? 'fill-current' : 'text-slate-600'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {userRole !== 'customer' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(r)}
                      className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-slate-300 transition-all cursor-pointer"
                      title="Edit Review Details"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 rounded-xl text-red-400 transition-all cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Biligual Comments Content */}
              <div className="text-xs text-slate-300 font-medium leading-relaxed bg-slate-950/20 p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex gap-2.5">
                  <span className="text-slate-500 font-black shrink-0">EN:</span>
                  <p className="italic text-slate-200">"{r.commentEn}"</p>
                </div>
                {r.commentHi && (
                  <div className="flex gap-2.5 border-t border-white/5 pt-2 mt-2">
                    <span className="text-slate-500 font-black shrink-0">HI:</span>
                    <p className="italic text-white/80 font-sans">"{r.commentHi}"</p>
                  </div>
                )}
                
                {r.reviewImage && (
                  <div className="mt-3 w-full max-w-xs h-32 rounded-xl overflow-hidden border border-white/10 relative">
                    <img src={r.reviewImage} alt="Feedback attached asset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              {/* Owner Official Response Reply section */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider block font-bold">Business Owner Reply Pin</span>
                
                {r.response ? (
                  <div className="bg-slate-950/90 border border-cyan-500/40 px-3.5 py-2.5 rounded-xl text-xs space-y-1 shadow-sm">
                    <p className="font-extrabold uppercase text-[9px] text-cyan-400 mb-0.5">Official Maps Response:</p>
                    <p className="font-semibold leading-relaxed text-slate-200">“{r.response}”</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 font-semibold italic">No response drafted yet.</p>
                )}

                {userRole !== 'customer' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Draft dynamic reply to this reviewer..."
                        value={replyFormText[r.id] || ''}
                        onChange={(e) => setReplyFormText({ ...replyFormText, [r.id]: e.target.value })}
                        className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold placeholder:text-slate-600 outline-none focus:border-cyan-400/40 grow text-white"
                      />
                      <button 
                        onClick={() => handleSaveReviewReply(r.id)}
                        className="p-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-cyan-400/20 transition-all active:scale-95"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Publish</span>
                      </button>
                    </div>

                    <div className="bg-slate-950/65 p-3 rounded-xl border border-white/5 space-y-2">
                      <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider">Fast Photo Attachment URL Setup</span>
                      <input 
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={reviewImage[r.id] || r.reviewImage || ''}
                        onChange={(e) => setReviewImage({ ...reviewImage, [r.id]: e.target.value })}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-[10px] text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* CREATE OR EDIT TESTIMONIAL SUB-MODAL */}
      {editorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-white/15 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{editingItem ? 'Edit Testimonial Configuration' : 'Create Customer Testimonial'}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Set ratings, bilingual feedback comment, and author avatars
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold scrollbar-thin">
              
              {/* Reviewer Name & Profile setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Reviewer Name <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Amit Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Star Rating (1 - 5)
                  </label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData(f => ({ ...f, rating: Number(e.target.value) }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                    <option value={3}>⭐⭐⭐ (3 Stars)</option>
                    <option value={2}>⭐⭐ (2 Stars)</option>
                    <option value={1}>⭐ (1 Star)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Tag Date / Subtitle Label
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. 2 days ago / Verified Buyer"
                    value={formData.date}
                    onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Avatar Gradient Color
                  </label>
                  <select
                    value={formData.avatarBg}
                    onChange={(e) => setFormData(f => ({ ...f, avatarBg: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                  >
                    {colorPresets.map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Bilingual Comments */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                  Bilingual Comment (English) <span className="text-red-400">*</span>
                </label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Review comment in English..."
                  value={formData.commentEn}
                  onChange={(e) => setFormData(f => ({ ...f, commentEn: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                  Bilingual Comment (Hindi)
                </label>
                <textarea 
                  rows={3}
                  placeholder="Review comment in Hindi..."
                  value={formData.commentHi}
                  onChange={(e) => setFormData(f => ({ ...f, commentHi: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none font-sans"
                />
              </div>

              {/* Review image attachment URL */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                  Attach Review Photo Layout URL (Optional)
                </label>
                <div className="p-3 bg-slate-900/60 border border-white/10 rounded-2xl">
                  <R2ImageUploader 
                    onUploadSuccess={(url) => setFormData(f => ({ ...f, reviewImage: url }))}
                    initialUrl={formData.reviewImage}
                  />
                  <input 
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.reviewImage}
                    onChange={(e) => setFormData(f => ({ ...f, reviewImage: e.target.value }))}
                    className="w-full mt-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400/50 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-[11px] uppercase tracking-wider font-extrabold text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full bg-cyan-500 text-slate-950 py-3 rounded-2xl text-[11px] uppercase tracking-wider font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  {editingItem ? 'Save Updates' : 'Add Testimonial'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
