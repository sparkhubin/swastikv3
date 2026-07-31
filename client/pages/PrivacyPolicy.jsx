import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { ShieldCheck, Info, FileText, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  const { privacySections, contactSettings } = useData();

  const isHindi = language === 'hi';

  return (
    <div className="px-4 md:px-8 max-w-4xl mx-auto py-8 text-slate-800 min-h-[65vh]" id="privacy-policy-view">
      {/* Header Banner Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8 relative overflow-hidden border border-slate-800">
        <div className="w-14 h-14 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <ShieldCheck className="h-7 w-7 stroke-[2.5]" />
        </div>
        <div className="z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-emerald-500/30">
            <Lock className="h-3.5 w-3.5" />
            <span>{isHindi ? "सुरक्षित डेटा सुरक्षा" : "Encrypted Data Protection"}</span>
          </div>
          <h1 className="font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-tight">
            {isHindi ? "गोपनीयता नीति" : "Privacy Policy"}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium max-w-xl">
            {isHindi 
              ? "जानिए कैसे हम आपकी व्यक्तिगत जानकारी और स्थान डेटा की पूर्ण सुरक्षा करते हैं।"
              : "Learn how Swastik Supermarket collects, encrypts, and protects your profile information."
            }
          </p>
        </div>
      </div>

      {/* Dynamic Privacy Sections */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
          {isHindi ? "गोपनीयता नियम एवं सुरक्षा तंत्र" : "Privacy Clauses & Safety Standards"}
        </h2>

        {(privacySections && privacySections.length > 0 ? privacySections : []).map((sect, idx) => (
          <div 
            key={sect.id || idx} 
            className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all duration-300"
          >
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0 border border-emerald-200">
                {idx + 1}
              </div>
              <span>{isHindi ? sect.titleHi : sect.titleEn}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pl-9 border-l-2 border-emerald-400/40">
              {isHindi ? sect.descHi : sect.descEn}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
        <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-emerald-900 text-xs leading-relaxed font-medium">
          {isHindi 
            ? `यदि गोपनीयता नीति के बारे में आपके कोई प्रश्न हैं, तो कृपया info.swastiksupermarket@gmail.com या ${contactSettings?.phone || '094845 40001'} पर संपर्क करें।`
            : `If you have any questions or concerns regarding these privacy practices, contact our support desk via ${contactSettings?.email || 'info.swastiksupermarket@gmail.com'} or ${contactSettings?.phone || '094845 40001'}.`
          }
        </p>
      </div>
    </div>
  );
}
