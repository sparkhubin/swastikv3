import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { Award, Users, Star } from 'lucide-react';

export default function Partners() {
  const { language } = useLanguage();
  const { partners, fetchPartners } = useData();
  const isHindi = language === 'hi';

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-8 sm:py-16" id="partners-view">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* --- Header Section --- */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-full text-emerald-800 text-xs font-bold tracking-wider uppercase shadow-xs">
            <Award className="h-4 w-4 text-emerald-700" />
            <span>{isHindi ? "व्यावसायिक निवेशक और निदेशक" : "BUSINESS INVESTORS & DIRECTORS"}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {isHindi ? "हमारे व्यावसायिक निवेशक और निदेशक" : "Our Business Investors & Directors"}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {isHindi 
              ? "मिलिए हमारे उन सम्मानित व्यावसायिक निवेशकों और निदेशकों से जो स्वास्तिक सुपरमार्केट की विकास गति को आगे बढ़ाने में निरंतर सहयोग कर रहे हैं।"
              : "Meet our distinguished business investors and corporate governance directors guiding Swastik Supermarket's expansion model."
            }
          </p>
        </div>

        {/* --- Board of Directors Bento --- */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
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
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between shadow-sm space-y-4 group p-5 relative"
                >
                  <div className="space-y-4">
                    {/* Portrait Image Frame */}
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 aspect-square relative shrink-0">
                      <img 
                        src={coverImg} 
                        alt={name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {name}
                      </h3>
                      <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                        {designation}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
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
