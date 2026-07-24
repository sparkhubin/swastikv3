import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Plus, 
  Trash2, 
  Image, 
  Search, 
  X, 
  Edit3,
  Sparkles,
  ExternalLink,
  Eye,
  Link,
  ChevronRight
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function SliderManager({ userRole }) {
  const { language } = useLanguage();
  const { slides, addSlide, updateSlide, deleteSlide, products, categories } = useData();

  const [search, setSearch] = useState('');
  const [editorModal, setEditorModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Field states for slider CRUD
  const [formData, setFormData] = useState({
    labelEn: '',
    labelHi: '',
    titleEn: '',
    titleHi: '',
    btnTextEn: '',
    btnTextHi: '',
    image: '',
    linkType: 'none', // none, category, product
    linkValue: ''
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      labelEn: '',
      labelHi: '',
      titleEn: '',
      titleHi: '',
      btnTextEn: 'Shop Now',
      btnTextHi: 'अभी खरीदें',
      image: '',
      linkType: 'none',
      linkValue: ''
    });
    setEditorModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      labelEn: item.labelEn || '',
      labelHi: item.labelHi || '',
      titleEn: item.titleEn || '',
      titleHi: item.titleHi || '',
      btnTextEn: item.btnTextEn || 'Shop Now',
      btnTextHi: item.btnTextHi || 'अभी खरीदें',
      image: item.image || '',
      linkType: item.linkType || 'none',
      linkValue: item.linkValue || ''
    });
    setEditorModal(true);
  };

  const handleCloseModal = () => {
    setEditorModal(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image) {
      alert("Please specify or upload a slider image.");
      return;
    }

    const payload = {
      labelEn: formData.labelEn || 'Special Offer',
      labelHi: formData.labelHi || 'विशेष ऑफर',
      titleEn: formData.titleEn || 'New Campaign Live Now',
      titleHi: formData.titleHi || 'नया अभियान लाइव है',
      btnTextEn: formData.btnTextEn || 'Shop Now',
      btnTextHi: formData.btnTextHi || 'अभी खरीदें',
      image: formData.image,
      linkType: formData.linkType,
      linkValue: formData.linkType === 'none' ? '' : formData.linkValue
    };

    if (editingItem) {
      updateSlide(editingItem.id, payload);
    } else {
      addSlide(payload);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this slider banner? It will disappear from the homepage carousel.")) {
      deleteSlide(id);
    }
  };

  const handleShowPreview = (item) => {
    setPreviewItem(item);
    setPreviewModal(true);
  };

  const filteredSlides = (slides || []).filter(s => 
    (s.labelEn || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.titleEn || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.labelHi || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-white/90">
      
      {/* Page Title & Headers */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Image className="h-5 w-5 text-cyan-400" />
            <span>Interactive Slider & Carousel Manager</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Add, update or re-link landing page spotlight banners instantly
          </p>
        </div>

        {userRole !== 'customer' && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-xl font-black text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            id="add-slide-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Slide</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter banners by promotion text, title or labels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs placeholder-slate-500 outline-none focus:border-cyan-400/40"
        />
      </div>

      {/* Grid of Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSlides.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-slate-900/40 border border-white/5 rounded-2xl text-xs text-slate-500">
            No dynamic slides available. Click Create New Slide to add.
          </div>
        ) : (
          filteredSlides.map((slide) => {
            const isCampaignActive = slide.linkType && slide.linkType !== 'none';
            return (
              <div key={slide.id} className="relative bg-gradient-to-br from-white/5 via-slate-900/80 to-transparent border border-white/10 rounded-3xl p-5 space-y-4 hover:border-white/15 transition-all duration-300 shadow-xl group">
                
                {/* Visual Image container */}
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                  <img 
                    src={slide.image} 
                    alt={slide.titleEn} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  
                  {/* Absolute positioning header details */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider block mb-1">
                      {slide.labelEn}
                    </span>
                    <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-2">
                      {slide.titleEn}
                    </h3>
                  </div>

                  <span className="absolute top-3 right-3 text-[9px] font-bold bg-black/60 backdrop-blur-md text-white/85 px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                    {isCampaignActive ? (
                      <>
                        <Link className="h-3 w-3 text-cyan-400" />
                        <span>LINKED: {slide.linkType.toUpperCase()}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 text-slate-400" />
                        <span>FIXED DISPLAY (NO ACTION)</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Additional Translation review details */}
                <div className="p-3 bg-slate-950/40 rounded-xl space-y-2 text-[11px] leading-relaxed border border-white/5 text-slate-400">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 shrink-0">HINDI:</span>
                    <div className="font-medium text-white/80">
                      <span className="block text-[10px] font-bold text-cyan-500">{slide.labelHi}</span>
                      <span className="whitespace-pre-line">{slide.titleHi}</span>
                    </div>
                  </div>
                  {isCampaignActive && (
                    <div className="flex gap-2 border-t border-white/5 pt-2">
                      <span className="font-bold text-slate-500 shrink-0">ACTION:</span>
                      <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 inline text-cyan-400" />
                        <span>Redirect to {slide.linkType === 'product' ? 'Product search' : 'Category'} matching "{slide.linkValue}"</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons controls */}
                {userRole !== 'customer' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleShowPreview(slide)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-white/10 py-2.5 rounded-xl text-white hover:brightness-110 transition-all font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-300" />
                      <span>Live Mockup</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(slide)}
                      className="flex-1 bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 hover:bg-cyan-400/20 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Re-Configure</span>
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="px-3 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-all rounded-xl cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SUB-MODAL 1: CREATE / UPDATE EDITOR */}
      {editorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-white/15 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{editingItem ? 'Edit Slider Configuration' : 'Create Carousel Banner'}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Set translations, graphic anchors, and redirection targets
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold scrollbar-thin">
              
              {/* Image banner upload anchor */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                  1. Banner Graphic Anchor Image (Required) <span className="text-red-400">*</span>
                </label>
                <div className="p-4 bg-slate-900/50 border border-white/10 rounded-2xl">
                  <R2ImageUploader 
                    onUploadComplete={(url) => setFormData(f => ({ ...f, image: url }))} 
                    initialImageUrl={formData.image}
                  />
                </div>
              </div>

              {/* Bilingual English - Hindi Side-by-Side Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Labels */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Top Label (English)
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Weekly Special Offers"
                    value={formData.labelEn}
                    onChange={(e) => setFormData(f => ({ ...f, labelEn: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Top Label (Hindi)
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. साप्ताहिक विशेष ऑफर"
                    value={formData.labelHi}
                    onChange={(e) => setFormData(f => ({ ...f, labelHi: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none font-sans"
                  />
                </div>

                {/* Main Titles */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                      Main Title (English - Use '\n' for newline)
                    </label>
                  </div>
                  <textarea 
                    rows={2}
                    required
                    placeholder="e.g. Pure Organic Produce&#10;Direct to Your Kitchen"
                    value={formData.titleEn}
                    onChange={(e) => setFormData(f => ({ ...f, titleEn: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block">
                    Main Title (Hindi)
                  </label>
                  <textarea 
                    rows={2}
                    required
                    placeholder="e.g. शुद्ध जैविक उपज&#10;सीधे आपकी रसोई में"
                    value={formData.titleHi}
                    onChange={(e) => setFormData(f => ({ ...f, titleHi: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none font-sans"
                  />
                </div>

                {/* Redirection Link & CTA Choice */}
                <div className="space-y-1 sm:col-span-2 border-t border-white/5 pt-3">
                  <label className="text-slate-300 font-bold tracking-wide uppercase text-[10px] block mb-1">
                    2. Slide Navigation Link & CTA Button Setup
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/45 p-3 rounded-2xl border border-white/5">
                    
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">LINK REDIRECT TYPE:</span>
                      <select
                        value={formData.linkType}
                        onChange={(e) => setFormData(f => ({ ...f, linkType: e.target.value, linkValue: '' }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                      >
                        <option value="none">Fixed Banner (No Button or Actions)</option>
                        <option value="category">Category Redirect (e.g. 'vegetables')</option>
                        <option value="product">Shop Keyword/Product (e.g. 'Basmati')</option>
                      </select>
                    </div>

                    {formData.linkType !== 'none' && (
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">REDIRECTION PATH KEY:</span>
                        {formData.linkType === 'category' ? (
                          <select
                            value={formData.linkValue}
                            onChange={(e) => setFormData(f => ({ ...f, linkValue: e.target.value }))}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none"
                          >
                            <option value="">-- Choose Category --</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.nameEn || c.id}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Apples, Dairy, Dal"
                              value={formData.linkValue}
                              onChange={(e) => setFormData(f => ({ ...f, linkValue: e.target.value }))}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 focus:border-cyan-400/40 outline-none"
                              list="products-search-list"
                            />
                            <datalist id="products-search-list">
                              {products.map(p => (
                                <option key={p.id} value={p.nameEn} />
                              ))}
                            </datalist>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Button Labels */}
                {formData.linkType !== 'none' && (
                  <>
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-indigo-400 font-bold tracking-wide uppercase text-[10px] block">
                        Button Label (English)
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Shop Now"
                        value={formData.btnTextEn}
                        onChange={(e) => setFormData(f => ({ ...f, btnTextEn: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-indigo-400 font-bold tracking-wide uppercase text-[10px] block">
                        Button Label (Hindi)
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. अभी खरीदें"
                        value={formData.btnTextHi}
                        onChange={(e) => setFormData(f => ({ ...f, btnTextHi: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400/40 outline-none font-sans font-bold"
                      />
                    </div>
                  </>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-[11px] uppercase tracking-wider font-extrabold text-slate-300 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full bg-cyan-500 text-slate-950 py-3 rounded-2xl text-[11px] uppercase tracking-wider font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  {editingItem ? 'Save Banner' : 'Create Banner'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: LIVE SIMULATED SLIDER PREVIEW */}
      {previewModal && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/20 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setPreviewModal(false)}
              className="absolute top-5 right-5 z-20 p-2 rounded-full bg-black/60 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 bg-slate-950/80 border-b border-white/10">
              <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">PREVIEW MOCKUP MODE</span>
              <h4 className="text-sm font-black text-white">Swastik Live Interactive App Preview</h4>
            </div>

            <div className="p-6 bg-slate-900">
              {/* English Version */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">ENGLISH MOBILE UI REPLICA</span>
                  <span className="text-[9px] font-black bg-cyan-400 text-slate-950 px-1.5 py-0.5 rounded uppercase">en</span>
                </div>
                
                <div className="relative h-[220px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <img src={previewItem.image} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-col justify-center px-8" />
                  <div className="absolute inset-0 flex flex-col justify-center px-8 z-10">
                    <span className="text-secondary-container font-extrabold text-[10px] tracking-wider uppercase mb-1.5 text-amber-300">
                      {previewItem.labelEn}
                    </span>
                    <h2 className="text-white font-black text-lg md:text-2xl leading-tight whitespace-pre-line mb-3 shadow-sm">
                      {previewItem.titleEn}
                    </h2>
                    {previewItem.linkType && previewItem.linkType !== 'none' && (
                      <button className="bg-cyan-400 text-slate-950 hover:brightness-95 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide self-start transition-all shadow-md flex items-center gap-1">
                        <span>{previewItem.btnTextEn || 'Shop Now'}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hindi Version */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">HINDI MOBILE UI REPLICA</span>
                  <span className="text-[9px] font-black bg-pink-500 text-white px-1.5 py-0.5 rounded uppercase">hi</span>
                </div>
                
                <div className="relative h-[220px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <img src={previewItem.image} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-col justify-center px-8" />
                  <div className="absolute inset-0 flex flex-col justify-center px-8 z-10">
                    <span className="text-secondary-container font-extrabold text-[10px] tracking-wider uppercase mb-1.5 text-amber-300 font-sans">
                      {previewItem.labelHi || previewItem.labelEn}
                    </span>
                    <h2 className="text-white font-black text-lg md:text-2xl leading-tight whitespace-pre-line mb-3 shadow-sm font-sans">
                      {previewItem.titleHi || previewItem.titleEn}
                    </h2>
                    {previewItem.linkType && previewItem.linkType !== 'none' && (
                      <button className="bg-cyan-400 text-slate-950 hover:brightness-95 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide self-start transition-all shadow-md font-sans flex items-center gap-1">
                        <span>{previewItem.btnTextHi || 'अभी खरीदें'}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setPreviewModal(false)}
                className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl font-bold text-xs uppercase text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
