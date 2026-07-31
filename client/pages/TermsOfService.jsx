import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { FileText, Gavel, AlertTriangle, ShieldCheck, Phone } from 'lucide-react';

export default function TermsOfService() {
  const { language } = useLanguage();
  const { termsSections, contactSettings } = useData();

  const isHindi = language === 'hi';

  return (
    <div className="px-4 md:px-8 max-w-4xl mx-auto py-8 text-slate-800 min-h-[65vh]" id="terms-of-service-view">
      {/* Header Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8 relative overflow-hidden border border-slate-800">
        <div className="w-14 h-14 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <Gavel className="h-7 w-7 stroke-[2.5]" />
        </div>
        <div className="z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-cyan-500/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isHindi ? "कानूनी दिशानिर्देश" : "Legal Framework"}</span>
          </div>
          <h1 className="font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-tight">
            {isHindi ? "सेवा की शर्तें" : "Terms of Service"}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium max-w-xl">
            {isHindi 
              ? "स्वास्तिक सुपरमार्केट प्लेटफॉर्म का उपयोग करने के लिए कानूनी शर्तें और उपयोगकर्ता नियम।"
              : "Legal policies, order terms, and user guidelines governing Swastik Supermarket operations."
            }
          </p>
        </div>
      </div>

      {/* Dynamic Terms Card List */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
          {isHindi ? "शर्तें व नियम खंड" : "Terms & Conditions Clauses"}
        </h2>

        {(termsSections && termsSections.length > 0 ? termsSections : []).map((sect, idx) => (
          <div 
            key={sect.id || idx} 
            className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md hover:border-cyan-400 transition-all duration-300"
          >
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center text-xs font-black shrink-0 border border-cyan-200">
                {idx + 1}
              </div>
              <span>{isHindi ? sect.titleHi : sect.titleEn}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pl-9 border-l-2 border-cyan-400/40">
              {isHindi ? sect.descHi : sect.descEn}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-amber-900 text-xs leading-relaxed font-medium">
          {isHindi 
            ? "सेवा की शर्तों का उल्लंघन करने पर खाता तत्काल निलंबित किया जा सकता है। किसी भी कानूनी प्रश्न के लिए हमारी सहायता टीम से संपर्क करें।"
            : "Violation of any terms listed here may result in suspension or termination of your active service account immediately. Contact our helpline for legal queries."
          }
        </p>
      </div>
    </div>
  );
}
