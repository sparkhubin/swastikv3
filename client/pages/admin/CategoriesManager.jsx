import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import R2ImageUploader from './R2ImageUploader';
import { 
  FolderOpen, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Image as ImageIcon,
  X 
} from 'lucide-react';

export default function CategoriesManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { categories, addCategory, updateCategory, deleteCategory } = useData();

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Field states for simplified form (Requirement 10)
  const [formData, setFormData] = useState({
    id: '',
    name: '', // Single input write both English and Hindi
    icon: '🥦',
    image: ''
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      id: '',
      name: '',
      icon: '🥦',
      image: ''
    });
    setEditorOpen(true);
    setTimeout(() => {
      document.getElementById('category-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.nameEn || item.nameHi || '',
      icon: item.icon || '📦',
      image: item.image || ''
    });
    setEditorOpen(true);
    setTimeout(() => {
      document.getElementById('category-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleCloseForm = () => {
    setEditorOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    // Build bilingual payload from single input
    const payload = {
      id: formData.id.toLowerCase().replace(/\s+/g, '-'),
      nameEn: formData.name,
      nameHi: formData.name,
      icon: formData.icon || '📦',
      image: formData.image || ''
    };

    if (editingItem) {
      updateCategory(editingItem.id, payload);
    } else {
      addCategory(payload);
    }
    handleCloseForm();
  };

  const handleDelete = (id) => {
    if (id === 'all') {
      alert('Cannot delete the core "All" filter category.');
      return;
    }
    if (window.confirm("Are you sure you want to delete this category classification? Products matching this may fallback to default.")) {
      deleteCategory(id);
    }
  };

  const handleImageUploaded = (imageUrl) => {
    setFormData(prev => ({ ...prev, image: imageUrl }));
  };

  const filteredCategories = categories.filter(cat => 
    (cat.nameEn || '').toLowerCase().includes(search.toLowerCase()) ||
    (cat.nameHi || '').toLowerCase().includes(search.toLowerCase()) ||
    (cat.id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-white/90">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-cyan-400" />
            <span>Product Department Categories</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Edit store department codes, icons and dynamic imagery overlays
          </p>
        </div>

        {userRole !== 'customer' && !editorOpen && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500/25 to-pink-500/25 hover:from-cyan-500/35 hover:to-pink-500/35 border border-cyan-400/30 rounded-xl font-black text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Category</span>
          </button>
        )}
      </div>

      {/* Inline Form Container if open */}
      {editorOpen && userRole !== 'customer' && (
        <div id="category-form-container" className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider">
              {editingItem ? `Amend Category Parameters: ${editingItem.id}` : "Register Category Token"}
            </h3>
            <button 
              onClick={handleCloseForm}
              className="text-slate-400 hover:text-white p-1 rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Unique URL Identifier ID</label>
              <input 
                type="text"
                required
                disabled={!!editingItem}
                placeholder="e.g. dairy-and-milk"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Category Name Label</label>
              <input 
                type="text"
                required
                placeholder="e.g. Organic Dairy Essentials"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Emoji Icon</label>
              <input 
                type="text"
                required
                placeholder="🥦"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-center"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Static Cover Banner URL</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Paste URL..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs outline-none"
                />
                <R2ImageUploader 
                  onUploadComplete={handleImageUploaded} 
                  initialImageUrl={formData.image}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="w-full bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2 rounded-xl border border-cyan-300 hover:bg-cyan-500 transition-all active:scale-95 cursor-pointer"
              >
                Save Classification
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Query Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter dynamic categories database..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs placeholder-slate-500 outline-none focus:border-cyan-400/40"
        />
      </div>

      {/* Grid displays */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="group relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between hover:border-cyan-400/35 transition-all">
            
            <div className="relative h-24 w-full bg-slate-800">
              {cat.image ? (
                <img src={cat.image} className="w-full h-full object-cover" alt="category billboard" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl select-none">
                  {cat.icon || '📦'}
                </div>
              )}
              <span className="absolute bottom-2 left-2 bg-slate-950/80 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-tighter text-cyan-400 uppercase">
                CODE: {cat.id}
              </span>
            </div>

            <div className="p-3 space-y-2">
              <h4 className="font-extrabold text-xs text-white uppercase flex items-center gap-1.5">
                <span className="text-base">{cat.icon || '📦'}</span>
                <span>{cat.nameEn}</span>
              </h4>

              {userRole !== 'customer' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="w-full bg-cyan-400/15 border border-cyan-400/25 py-1.5 rounded-lg text-cyan-300 hover:bg-cyan-400/25 transition-all font-black text-[9px] uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  {cat.id !== 'all' && (
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
