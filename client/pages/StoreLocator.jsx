import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { MapPin, Phone, Clock, Compass, Navigation, X, CheckSquare, Search } from 'lucide-react';

export default function StoreLocator() {
  const { t, language } = useLanguage();
  const { contactSettings } = useData();
  const isHindi = language === 'hi';

  const [searchCity, setSearchCity] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [routeText, setRouteText] = useState('');

  const branches = contactSettings?.address ? [{
      id: 1,
      nameEn: contactSettings.brandName || '',
      nameHi: contactSettings.brandName || '',
      addressEn: contactSettings.address,
      addressHi: contactSettings.address,
      phone: contactSettings.phone || '',
      hoursEn: contactSettings.storeHours || '',
      hoursHi: contactSettings.storeHours || '',
      metroEn: contactSettings.landmark || '',
      metroHi: contactSettings.landmark || '',
      googleMaps: contactSettings.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactSettings.address)}`
    }] : [];

  const filteredBranches = branches.filter(val => {
    const term = searchCity.toLowerCase();
    return (
      val.nameEn.toLowerCase().includes(term) ||
      val.nameHi.toLowerCase().includes(term) ||
      val.addressEn.toLowerCase().includes(term) ||
      val.addressHi.toLowerCase().includes(term)
    );
  });

  const triggerRoute = (branch) => {
    setSelectedBranch(branch);
    const text = isHindi ? `${branch.nameHi}: ${branch.addressHi}` : `${branch.nameEn}: ${branch.addressEn}`;
    setRouteText(text);
  };

  return (
    <div className="px-4 md:px-8 max-w-5xl mx-auto py-8 text-slate-900 min-h-[70vh]" id="store-locator-view">
      
      {/* Header section with glass banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-center shrink-0">
            <Compass className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl md:text-2xl text-slate-900">
              {isHindi ? "स्टोर लोकेटर" : "Store Locator"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isHindi ? "हमारे नजदीकी सुपरमार्केट का पता लगाएं" : "Find nearby Swastik regional outlets"}
            </p>
          </div>
        </div>

        {/* Local branch filtration input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isHindi ? "शहर या क्षेत्र खोजें..." : "Filter by city or landmark..."}
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 outline-none font-semibold transition-all"
          />
        </div>
      </div>

      {/* Grid of branches */}
      <div className="grid md:grid-cols-3 gap-6">
        {filteredBranches.map(branch => (
          <div 
            key={branch.id} 
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm flex flex-col justify-between transition-all duration-300 gap-6"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-extrabold text-sm text-slate-900 leading-normal">
                  {isHindi ? branch.nameHi : branch.nameEn}
                </h3>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                  {isHindi ? "खुला है" : "Open"}
                </span>
              </div>

              <div className="space-y-3 font-semibold text-[11.5px] text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{isHindi ? branch.addressHi : branch.addressEn}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-700">{isHindi ? branch.hoursHi : branch.hoursEn}</span>
                </div>

                <div className="flex items-start gap-2.5 text-[10.5px] text-emerald-800">
                  <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    🚇 {isHindi ? branch.metroHi : branch.metroEn}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 font-mono">{branch.phone}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => triggerRoute(branch)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
              id={`branch-route-btn-${branch.id}`}
            >
              <Navigation className="h-4 w-4 fill-white text-white" />
              <span>{isHindi ? "मार्ग प्राप्त करें" : "Get Directions"}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Static Route Popover */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity animate-fade-in">
          <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-white animate-scale-in">
            <button 
              onClick={() => setSelectedBranch(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-white/10 text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-cyan-400">
              <Compass className="h-6 w-6 stroke-[2]" />
              <h4 className="font-extrabold text-base text-glow">
                {isHindi ? "रूटीन नेविगेशन" : "Routing Navigation"}
              </h4>
            </div>

            <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">
              {isHindi ? "गंतव्य:" : "Destination:"} {isHindi ? selectedBranch.nameHi : selectedBranch.nameEn}
            </p>

            <p className="text-xs sm:text-sm font-medium text-slate-100 bg-white/5 p-4 rounded-xl border border-white/10 leading-relaxed">
              {routeText}
            </p>

            <div className="mt-6 flex justify-end gap-3 font-semibold text-xs tracking-wider uppercase">
              <button 
                onClick={() => setSelectedBranch(null)}
                className="px-4 py-2 border border-white/10 rounded-lg text-slate-300 hover:bg-white/5 transition-all"
              >
                {isHindi ? "बंद करें" : "Close"}
              </button>
              <a 
                href={selectedBranch?.googleMaps || "https://maps.google.com"} 
                target="_blank" 
                rel="noreferrer"
                className="px-5 py-2.5 bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all text-center"
              >
                {isHindi ? "गूगल मैप्स" : "Google Maps"}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
