import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { RotateCcw, ShieldCheck, FileText, HelpCircle, Phone, CheckCircle, Clock } from 'lucide-react';

export default function RefundPolicy() {
  const { language } = useLanguage();
  const { refundSections, contactSettings } = useData();

  const isHindi = language === 'hi';

  return (
    <div className="px-4 md:px-8 max-w-4xl mx-auto py-8 text-slate-800 min-h-[65vh]" id="refund-policy-view">
      {/* Header Banner Card */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8 relative overflow-hidden">
        <div className="w-14 h-14 bg-white/15 backdrop-blur-md border border-white/20 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <RotateCcw className="h-7 w-7 stroke-[2.5]" />
        </div>
        <div className="z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-2 backdrop-blur-sm border border-white/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isHindi ? "100% खरीदार सुरक्षा" : "100% Customer Protection"}</span>
          </div>
          <h1 className="font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-tight">
            {isHindi ? "रिफ़ंड एवं रद्दीकरण नीति" : "Refund & Cancellation Policy"}
          </h1>
          <p className="text-xs md:text-sm text-emerald-100 mt-1 font-medium max-w-xl">
            {isHindi 
              ? "स्वास्तिक सुपरमार्केट में आपकी संतुष्टि हमारी सर्वोच्च प्राथमिकता है। हमारी पारदर्शी रिफंड प्रक्रिया और आसान वापसी की शर्तें नीचे देखें।"
              : "Your satisfaction is our highest priority at Swastik Supermarket. Review our transparent refund timeline and hassle-free doorstep guarantee."
            }
          </p>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              {isHindi ? "रद्दीकरण समय" : "Cancellation Window"}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {isHindi ? "10 मिनट के भीतर मुफ्त" : "Free within 10 Mins"}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              {isHindi ? "डोरस्टेप निरीक्षण" : "Doorstep Inspection"}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {isHindi ? "त्वरित वापसी / प्रतिस्थापन" : "Instant Return / Swap"}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              {isHindi ? "ऑनलाइन रिफंड समय" : "Online Settlement"}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {isHindi ? "24–48 कार्य घंटे" : "24–48 Working Hours"}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Refund Policy Sections */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
          {isHindi ? "नीति विवरण और नियम" : "Policy Guidelines & Clauses"}
        </h2>

        {(refundSections && refundSections.length > 0 ? refundSections : []).map((sect, idx) => (
          <div 
            key={sect.id || idx} 
            className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300"
          >
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
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

      {/* Support Helpline Box */}
      <div className="bg-slate-900 text-white border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-black text-sm md:text-base text-white">
              {isHindi ? "रिफंड संबंधी प्रश्न हैं?" : "Need Help With A Refund Claim?"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi 
                ? "हमारी सहायता टीम आपकी किसी भी शिकायत को हल करने के लिए तत्पर है।"
                : "Our dedicated support team is available to assist with order adjustments or refund statuses."
              }
            </p>
          </div>
        </div>

        <a
          href={`tel:${(contactSettings?.phone || "+91 94845 40001").replace(/[^0-9]/g, "")}`}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0 active:scale-95"
        >
          <Phone className="h-4 w-4" />
          <span>{contactSettings?.phone || "094845 40001"}</span>
        </a>
      </div>
    </div>
  );
}
