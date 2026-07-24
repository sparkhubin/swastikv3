import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { Award, Users, Star } from 'lucide-react';

export default function Partners() {
  const { language } = useLanguage();
  const { partners } = useData();
  const isHindi = language === 'hi';

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans py-8 sm:py-16 selection:bg-cyan-500 selection:text-slate-900" id="partners-view">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* --- Header Section --- */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/15 border border-cyan-500/30 px-3.5 py-1.5 rounded-full text-cyan-300 text-xs font-bold tracking-wider uppercase shadow-lg">
            <Award className="h-4 w-4 text-cyan-400" />
            <span>{isHindi ? "व्यावसायिक निवेशक और निदेशक" : "BUSINESS INVESTORS & DIRECTORS"}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent tracking-tight leading-tight">
            {isHindi ? "हमारे व्यावसायिक निवेशक और निदेशक" : "Our Business Investors & Directors"}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {isHindi 
              ? "मिलिए हमारे उन सम्मानित व्यावसायिक निवेशकों और निदेशकों से जो स्वास्तिक सुपरमार्केट की विकास गति को आगे बढ़ाने में निरंतर सहयोग कर रहे हैं।"
              : "Meet our distinguished business investors and corporate governance directors guiding Swastik Supermarket's expansion model."
            }
          </p>
        </div>

        {/* --- Board of Directors Bento --- */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-cyan-400 rounded-full" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isHindi ? "निदेशक मंडल" : "Board of Directors Directory"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {partners.map((partner) => {
              const name = partner.name || "Business Investor";
              const designation = partner.designation || partner.hubName || "Board Advisor";
              const about = partner.about || partner.location || "Key corporate contributor and financial backer of local grocery supply chains.";
              const coverImg = partner.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300";

              return (
                <div 
                  key={partner.id} 
                  className="bg-slate-900/30 border border-white/10 rounded-3xl overflow-hidden hover:border-cyan-400/40 transition-all duration-300 flex flex-col justify-between shadow-2xl space-y-4 group p-5 relative"
                >
                  <div className="space-y-4">
                    {/* Portrait Image Frame */}
                    <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950 aspect-square relative shrink-0">
                      <img 
                        src={coverImg} 
                        alt={name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                        {name}
                      </h3>
                      <span className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                        {designation}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {about}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
