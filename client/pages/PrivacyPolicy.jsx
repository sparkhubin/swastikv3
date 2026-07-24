import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { ShieldCheck, Info, FileText } from 'lucide-react';

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  const { privacySections } = useData();

  const isHindi = language === 'hi';

  return (
    <div className="px-4 md:px-8 max-w-4xl mx-auto py-8 text-white min-h-[60vh]" id="privacy-policy-view">
      {/* Header card styled with Frosted glass */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/12 p-6 rounded-2xl shadow-xl flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 stroke-[2]" />
        </div>
        <div>
          <h2 className="font-extrabold text-xl md:text-2xl text-white text-glow">
            {isHindi ? "गोपनीयता नीति" : "Privacy Policy"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isHindi ? "अंतिम संशोधन: जून 2026" : "Last updated: June 2026"}
          </p>
        </div>
      </div>

      {/* Accordion list */}
      <div className="space-y-4">
        {(privacySections || []).map((sect, idx) => (
          <div key={sect.id || idx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 font-sans">
            <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
              <FileText className="h-4 w-4 stroke-[2.5]" />
              {isHindi ? sect.titleHi : sect.titleEn}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 pl-6 border-l-2 border-cyan-400/30">
              {isHindi ? sect.descHi : sect.descEn}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-cyan-500/10 border border-cyan-500/25 p-4 rounded-xl flex items-start gap-3 animate-pulse">
        <Info className="h-5 w-5 text-cyan-300 shrink-0 mt-0.5" />
        <p className="text-slate-400 text-[11px] leading-relaxed">
          {isHindi 
            ? "यदि गोपनीयता नीति के बारे में आपके कोई प्रश्न हैं, तो कृपया हमारे 'हमसे संपर्क करें' प्रपत्र का उपयोग करके या support@swastik.com पर सुरक्षा डेस्क को लिखें।"
            : "If you have any questions or concerns regarding these terms, please contact our administrative privacy desk immediately via support@swastik.com."
          }
        </p>
      </div>
    </div>
  );
}
