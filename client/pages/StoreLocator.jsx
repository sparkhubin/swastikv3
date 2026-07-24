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

  const branches = [
    {
      id: 1,
      nameEn: contactSettings?.brandName || "Main Market Branch (Noida)",
      nameHi: contactSettings?.brandName || "मुख्य बाजार शाखा (नोएडा)",
      addressEn: contactSettings?.address || "Plot No 46, Block-B, Sector 18, Noida, UP 201301",
      addressHi: contactSettings?.address || "प्लॉट नंबर 46, ब्लॉक-बी, सेक्टर 18, नोएडा, यूपी 201301",
      phone: contactSettings?.phone || "+91 11 2345 6789",
      hoursEn: "08:00 AM - 10:00 PM (Daily)",
      hoursHi: "सुबह 08:00 - रात 10:00 (दैनिक)",
      metroEn: "Near Sector 18 Metro Station",
      metroHi: "सेक्टर 18 मेट्रो स्टेशन के पास",
      googleMaps: contactSettings?.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactSettings?.address || "Plot No 46, Block-B, Sector 18, Noida, Uttar Pradesh 201301")}`
    },
    {
      id: 2,
      nameEn: "Preet Vihar Hub (East Delhi)",
      nameHi: "प्रीत विहार हब (पूर्वी दिल्ली)",
      addressEn: "D-11, Main Vikas Marg, Preet Vihar, Delhi 110092",
      addressHi: "डी-11, मुख्य विकास मार्ग, प्रीत विहार, दिल्ली 110092",
      phone: "+91 11 4356 7812",
      hoursEn: "07:30 AM - 09:30 PM (Daily)",
      hoursHi: "सुबह 07:30 - रात 09:30 (दैनिक)",
      metroEn: "Opposite Pillar No. 102",
      metroHi: "पिलर नंबर 102 के सामने",
      googleMaps: "https://www.google.com/maps/search/?api=1&query=D-11,+Main+Vikas+Marg,+Preet+Vihar,+Delhi+110092"
    },
    {
      id: 3,
      nameEn: "Connaught Place Outlet (Central Delhi)",
      nameHi: "कनॉट प्लेस आउटलेट (केंद्रीय दिल्ली)",
      addressEn: "G-42, Outer Circle, Connaught Place, New Delhi 110001",
      addressHi: "जी-42, आउटर सर्कल, कनॉट प्लेस, नई दिल्ली 110001",
      phone: "+91 11 2942 3951",
      hoursEn: "09:00 AM - 11:00 PM (Daily)",
      hoursHi: "सुबह 09:00 - रात 11:00 (दैनिक)",
      metroEn: "Near Rajiv Chowk Metro Gate 3",
      metroHi: "राजीव चौक मेट्रो गेट 3 के पास",
      googleMaps: "https://www.google.com/maps/search/?api=1&query=G-42,+Outer+Circle,+Connaught+Place,+New+Delhi+110001"
    }
  ];

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
    const text = isHindi
      ? `जीपीएस शुरू हो गया है। आपकी वर्तमान स्थिति से ${isHindi ? branch.nameHi : branch.nameEn} के लिए सबसे तेज मार्ग 15 मिनट (4.2 किमी) दूर है। सेक्टर 18 रिंग रोड का उपयोग करें।`
      : `GPS initialisation complete. The fastest trajectory to ${branch.nameEn} is 15 mins (4.2 KM) using Noida-Greater Noida expressway.`;
    setRouteText(text);
  };

  return (
    <div className="px-4 md:px-8 max-w-5xl mx-auto py-8 text-white min-h-[70vh]" id="store-locator-view">
      
      {/* Header section with glass banner */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/12 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-xl flex items-center justify-center shrink-0">
            <Compass className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl md:text-2xl text-white text-glow">
              {isHindi ? "स्टोर लोकेटर" : "Store Locator"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 animate-pulse">
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
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400/50 outline-none font-semibold transition-all"
          />
        </div>
      </div>

      {/* Grid of branches */}
      <div className="grid md:grid-cols-3 gap-6">
        {filteredBranches.map(branch => (
          <div 
            key={branch.id} 
            className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:shadow-cyan-500/5 flex flex-col justify-between transition-all duration-300 gap-6"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-extrabold text-sm text-white leading-normal">
                  {isHindi ? branch.nameHi : branch.nameEn}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md shrink-0">
                  {isHindi ? "खुला है" : "Open"}
                </span>
              </div>

              <div className="space-y-3 font-semibold text-[11.5px] text-slate-300">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{isHindi ? branch.addressHi : branch.addressEn}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                  <span>{isHindi ? branch.hoursHi : branch.hoursEn}</span>
                </div>

                <div className="flex items-start gap-2.5 text-[10.5px] text-cyan-300">
                  <span className="bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                    🚇 {isHindi ? branch.metroHi : branch.metroEn}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                  <span>{branch.phone}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => triggerRoute(branch)}
              className="w-full py-2.5 bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/35 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
              id={`branch-route-btn-${branch.id}`}
            >
              <Navigation className="h-4 w-4 fill-cyan-400 text-cyan-400 stroke-none" />
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
