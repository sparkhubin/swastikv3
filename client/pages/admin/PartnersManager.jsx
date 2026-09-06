import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  Camera, 
  Building
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function PartnersManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { partners, addPartner, deletePartner, fetchPartners } = useData();

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const [partnerForm, setPartnerForm] = useState({
    name: '',
    designation: '', // Post/Designation of the investor
    about: '', // About details
    photo: '' // optional image link, has smart fallback cover in frontend if empty
  });

  const handlePartnerSubmit = (e) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.designation || !partnerForm.about) {
      alert("Please supply all required fields: Name, Designation (Post) and About details.");
      return;
    }

    addPartner({
      name: partnerForm.name,
      designation: partnerForm.designation,
      about: partnerForm.about,
      photo: partnerForm.photo || ""
    });

    setPartnerForm({
      name: '',
      designation: '',
      about: '',
      photo: ''
    });

    alert("✓ Sourcing Investor successfully registered to GORM database!");
  };

  return (
    <div className="space-y-6 animate-fade-in text-white/90" id="partners-manager-view">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          <span>{isHindi ? "व्यावसायिक निवेशक और निदेशक निर्देशिका" : "Corporate Investors & Directors Directory"}</span>
        </h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
          {isHindi ? "संस्था के निवेशकों और निदेशकों को जोड़ें व प्रबंधित करें" : "Register and manage certified corporate directors, financial backers and business investors"}
        </p>
      </div>

      {userRole !== 'customer' && (
        <form onSubmit={handlePartnerSubmit} className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4 text-xs font-semibold shadow-xl">
          <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Plus className="h-4 w-4" />
            <span>Add New Business Investor / Director Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Full Name *</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rajesh Patidar"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full pl-9 bg-slate-950 border border-white/10 rounded-xl py-2.5 outline-none text-white text-xs font-bold"
                />
              </div>
            </div>

            {/* Designation / Post */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Designation (Post) *</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Founder & Sourcing Director"
                  value={partnerForm.designation}
                  onChange={(e) => setPartnerForm({ ...partnerForm, designation: e.target.value })}
                  className="w-full pl-9 bg-slate-950 border border-white/10 rounded-xl py-2.5 outline-none text-white text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* About */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">About details (Professional Bio) *</label>
            <textarea 
              required
              rows={3}
              placeholder="Provide a comprehensive description of milestones, contributions and professional governance background..."
              value={partnerForm.about}
              onChange={(e) => setPartnerForm({ ...partnerForm, about: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold font-sans resize-none"
            />
          </div>

          {/* Image Upload / Photo Link */}
          <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Profile/Portrait Image URL</label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="e.g. Paste direct image URL..."
                  value={partnerForm.photo}
                  onChange={(e) => setPartnerForm({ ...partnerForm, photo: e.target.value })}
                  className="w-full pl-9 bg-slate-950 border border-white/10 rounded-xl py-2.5 outline-none text-white text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black mb-1">Or direct image upload</label>
              <R2ImageUploader 
                onUploadComplete={(url) => setPartnerForm((prev) => ({ ...prev, photo: url }))} 
                initialImageUrl={partnerForm.photo}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl border border-cyan-300 transition-all active:scale-95 cursor-pointer"
          >
            Authorize Business Investor Identity
          </button>
        </form>
      )}

      {/* Directory Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((p) => {
          const name = p.name || "Business Investor";
          const designation = p.designation || p.hubName || "Governance Director";
          const about = p.about || p.location || "Authorized capital source partner.";
          const coverImg = p.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300";

          return (
            <div key={p.id} className="bg-slate-900 border border-white/10 rounded-3xl flex flex-col justify-between relative group hover:border-cyan-400/30 transition-all shadow-md overflow-hidden p-5 space-y-4">
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  {/* Portrait photo thumbnail */}
                  <div className="w-16 h-16 rounded-xl border border-white/10 overflow-hidden shrink-0 bg-slate-950">
                    <img 
                      src={coverImg} 
                      alt={name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {userRole !== 'customer' && (
                    <button 
                      onClick={() => deletePartner(p.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/20 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white leading-none">{name}</h4>
                  <span className="inline-block bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-cyan-500/15">
                    {designation}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold font-sans">
                  {about}
                </p>
              </div>

              <div className="border-t border-white/5 pt-3.5 mt-auto flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Investor Entity</span>
                <span className="text-cyan-400 font-extrabold">Active</span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
