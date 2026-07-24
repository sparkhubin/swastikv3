import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Search, 
  X, 
  Edit3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LocationGroupsManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { locationGroups, setLocationGroups } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [editorModal, setEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [normalDelivery, setNormalDelivery] = useState(40);
  const [primeDelivery, setPrimeDelivery] = useState(0);
  const [minFreeDeliveryAmount, setMinFreeDeliveryAmount] = useState(499);
  const [locationsText, setLocationsText] = useState('');
  const [deliveryStartTime, setDeliveryStartTime] = useState('09:00');
  const [deliveryEndTime, setDeliveryEndTime] = useState('21:00');

  const handeOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setNormalDelivery(40);
    setPrimeDelivery(0);
    setMinFreeDeliveryAmount(499);
    setLocationsText('');
    setDeliveryStartTime('09:00');
    setDeliveryEndTime('21:00');
    setEditorModal(true);
  };

  const handleOpenEditModal = (group) => {
    setEditingItem(group);
    setName(group.name);
    setNormalDelivery(group.normalDelivery);
    setPrimeDelivery(group.primeDelivery);
    setMinFreeDeliveryAmount(group.minFreeDeliveryAmount !== undefined ? group.minFreeDeliveryAmount : 499);
    setLocationsText(group.locations);
    setDeliveryStartTime(group.deliveryStartTime || '09:00');
    setDeliveryEndTime(group.deliveryEndTime || '21:00');
    setEditorModal(true);
  };

  const handleDeleteGroup = (id) => {
    if (window.confirm(isHindi ? "क्या आप सचमुच इस लोकेशन ग्रुप को हटाना चाहते हैं?" : "Are you sure you want to delete this Location Group?")) {
      setLocationGroups(prev => prev.filter(g => g.id !== id));
      triggerFeedback(isHindi ? "लोकेशन ग्रुप सफलतापूर्वक हटाया गया!" : "Location Group deleted successfully!");
    }
  };

  const triggerFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      // Edit mode
      setLocationGroups(prev => prev.map(g => g.id === editingItem.id ? {
        ...g,
        name: name.trim(),
        normalDelivery: Number(normalDelivery),
        primeDelivery: Number(primeDelivery),
        minFreeDeliveryAmount: Number(minFreeDeliveryAmount),
        locations: locationsText.trim(),
        deliveryStartTime: deliveryStartTime,
        deliveryEndTime: deliveryEndTime
      } : g));
      triggerFeedback(isHindi ? "संशोधन सफलतापूर्वक सहेजा गया!" : "Location Group updated successfully!");
    } else {
      // Add mode
      const nextId = locationGroups.length > 0 ? Math.max(...locationGroups.map(x => x.id)) + 1 : 1;
      const newGroup = {
        id: nextId,
        name: name.trim(),
        normalDelivery: Number(normalDelivery),
        primeDelivery: Number(primeDelivery),
        minFreeDeliveryAmount: Number(minFreeDeliveryAmount),
        locations: locationsText.trim(),
        deliveryStartTime: deliveryStartTime,
        deliveryEndTime: deliveryEndTime
      };
      setLocationGroups(prev => [...prev, newGroup]);
      triggerFeedback(isHindi ? "नया लोकेशन ग्रुप सफलतापूर्वक जोड़ा गया!" : "New Location Group created successfully!");
    }

    setEditorModal(false);
  };

  const filtered = locationGroups.filter(g => {
    const query = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(query) || g.locations.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-glow text-cyan-400">
            <MapPin className="h-4.5 w-4.5" />
            <span>{isHindi ? "परिवहन स्थान समूह" : "Logistics & Location Groups"}</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            {isHindi 
              ? "विभिन्न सेक्टरों के अनुसार सामान्य और प्राइम मेंबर्स के लिए डिलीवरी शुल्क निर्धारित करें।" 
              : "Group postal locations and direct delivery sectors to manage separate shipment rates of Standard vs Prime users."}
          </p>
        </div>

        {userRole !== 'customer' && (
          <button
            type="button"
            onClick={handeOpenAddModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 active:scale-95 text-xs text-slate-950 font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isHindi ? "नया ग्रुप जोड़ें" : "Create Group"}</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs p-3 rounded-xl flex items-center gap-2 font-bold max-w-md">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Lookup Controls */}
      <div className="flex bg-slate-900 border border-white/10 rounded-xl px-3.5 py-1.5 items-center gap-2 max-w-md">
        <Search className="h-4 w-4 text-slate-500" />
        <input 
          type="text"
          placeholder={isHindi ? "ग्रुप नाम या सेक्टर खोजें..." : "Filter groups or location tags..."}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid displaying groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(group => {
          const locs = group.locations.split(',').map(l => l.trim()).filter(Boolean);
          return (
            <div key={group.id} className="bg-slate-900/60 border border-white/8 hover:border-cyan-500/30 p-5 rounded-2xl flex flex-col justify-between shadow-lg transition-all hover:shadow-cyan-950/20">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-100 text-xs uppercase tracking-wide truncate pr-2">{group.name}</h4>
                  <span className="text-[9px] font-mono font-black text-slate-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded shadow-sm">
                    ID: {group.id}
                  </span>
                </div>

                {/* Delivery Rates Comparison */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">{isHindi ? "नॉर्मल शुल्क" : "Standard"}</span>
                    <p className="font-mono text-xs font-black text-slate-200 mt-0.5">₹{group.normalDelivery}</p>
                  </div>
                  <div className="border-l border-white/10">
                    <span className="text-[8px] uppercase tracking-widest text-amber-400 font-extrabold flex items-center justify-center gap-1">
                      ⭐ VIP Prime
                    </span>
                    <p className="font-mono text-xs font-black text-amber-300 mt-0.5">
                      {group.primeDelivery === 0 ? "FREE" : `₹${group.primeDelivery}`}
                    </p>
                  </div>
                </div>

                {/* Free Delivery Threshold Badge */}
                <div className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-extrabold flex items-center gap-1">
                    🎁 {isHindi ? "फ्री डिलीवरी (न्यूनतम आर्डर):" : "Free Delivery Min Order:"}
                  </span>
                  <span className="font-mono text-emerald-400 font-black bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                    ₹{group.minFreeDeliveryAmount !== undefined ? group.minFreeDeliveryAmount : 499}
                  </span>
                </div>

                {/* Delivery Time Slot Badge */}
                <div className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-extrabold flex items-center gap-1">
                    ⏰ {isHindi ? "वितरण समय:" : "Delivery Slot:"}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px]">
                    {group.deliveryStartTime || "09:00"} - {group.deliveryEndTime || "21:00"}
                  </span>
                </div>

                {/* Location Pills list */}
                <div className="space-y-1.5">
                  <span className="text-[8.5px] uppercase tracking-widest text-slate-400 font-extrabold block">
                    📍 {isHindi ? "संबद्ध स्थान" : "Covered Locations"} ({locs.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {locs.map((loc, i) => (
                      <span key={i} className="inline-block bg-white/5 border border-white/5 text-[9px] text-cyan-300 rounded-lg px-2.5 py-0.5 whitespace-nowrap leading-relaxed animate-fade-in">
                        {loc}
                      </span>
                    ))}
                    {locs.length === 0 && (
                      <span className="text-[9px] italic text-slate-500">{isHindi ? "कोई स्थान दर्ज नहीं है" : "No locations mapped."}</span>
                    )}
                  </div>
                </div>
              </div>

              {userRole !== 'customer' && (
                <div className="mt-4 pt-3.5 border-t border-white/8 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(group)}
                    className="p-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isHindi ? "संशोधन" : "Edit"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isHindi ? "हटाएं" : "Delete"}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-white/10 rounded-2xl">
            <MapPin className="h-10 w-10 text-cyan-400/40 mx-auto mb-3 animate-bounce" />
            <p className="text-xs uppercase tracking-widest font-extrabold text-slate-300">
              {isHindi ? "कोई स्थान समूह नहीं मिला" : "No Location Groups Found"}
            </p>
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1">
              {isHindi 
                ? "कृपया नया लोकेशन ग्रुप बनाने और डिलीवरी दरों को प्रबंधित करने के लिए 'क्रिएट ग्रुप' बटन का उपयोग करें।" 
                : "Create targeted delivery hubs using the 'Create Group' button at the top right to enable precise shipping options."}
            </p>
          </div>
        )}
      </div>

      {/* Editor Modal Popup */}
      {editorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-white/12 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-up my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950">
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                {editingItem 
                  ? (isHindi ? "लोकेशन ग्रुप संपादित करें" : "Edit Location Group Settings")
                  : (isHindi ? "नया लोकेशन ग्रुप जोड़ें" : "Create New Logistics Hub")}
              </h4>
              <button 
                type="button"
                onClick={() => setEditorModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {isHindi ? "समूह नाम (जैसे Noida Sector 62)" : "Group Name Name (e.g. Noida VIP Sectors)"}
                </label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Indirapuram Hub"
                  className="w-full bg-slate-950 border border-white/12 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-cyan-400 font-sans font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {isHindi ? "सामान्य डिलीवरी शुल्क (₹)" : "Standard Rate (₹)"}
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={normalDelivery}
                    onChange={e => setNormalDelivery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/12 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                    ⭐ Prime VIP Rate (₹)
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={primeDelivery}
                    onChange={e => setPrimeDelivery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/12 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Free Delivery Minimum Shopping Threshold */}
              <div className="flex flex-col gap-1 p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <label className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  🎁 {isHindi ? "फ्री डिलीवरी न्यूनतम शॉपिंग राशि (₹)" : "Free Delivery Min Shopping Amount (₹)"}
                </label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={minFreeDeliveryAmount}
                  onChange={e => setMinFreeDeliveryAmount(e.target.value)}
                  placeholder="e.g. 499"
                  className="w-full bg-slate-900 border border-white/12 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono font-bold"
                />
                <span className="text-[9px] text-slate-500 font-semibold italic mt-0.5 leading-tight">
                  {isHindi ? "यदि आर्डर राशि इससे अधिक या बराबर है, तो डिलीवरी शुल्क मुफ्त (₹0) होगा।" : "If subtotal is equal or greater, shipping turns completely free."}
                </span>
              </div>

              {/* Delivery Time Slot Picker */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                    ⏰ {isHindi ? "प्रारंभ समय" : "Start Time"}
                  </label>
                  <input 
                    type="time" 
                    required
                    value={deliveryStartTime}
                    onChange={e => setDeliveryStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                    ⏰ {isHindi ? "समाप्ति समय" : "End Time"}
                  </label>
                  <input 
                    type="time" 
                    required
                    value={deliveryEndTime}
                    onChange={e => setDeliveryEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  {isHindi ? "संबद्ध सेक्टर्स / स्थान (अल्पविराम से अलग करें)" : "Locations / Postal Sectors (Comma-separated)"}
                </label>
                <textarea 
                  rows="3"
                  required
                  value={locationsText}
                  onChange={e => setLocationsText(e.target.value)}
                  placeholder="Sector 62, Shatabdi Vihar, Rajat Vihar, Shipra Sun City"
                  className="w-full bg-slate-950 border border-white/12 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-cyan-400 font-sans leading-relaxed"
                />
                <span className="text-[8px] text-slate-500 font-semibold leading-normal">
                  * {isHindi 
                     ? "कृपया सभी संबद्ध क्षेत्रों के नाम दर्ज करें तथा उन्हें अल्पविराम (,) द्वारा अलग करें।" 
                     : "Provide exact locations or address keywords. The checkout engine maps user text match with these keys."}
                </span>
              </div>

              <div className="pt-2 border-t border-white/8 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditorModal(false)}
                  className="px-4 py-2 hover:bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {isHindi ? "रद्द करें" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 active:scale-95 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {editingItem ? (isHindi ? "अपडेट करें" : "Save Changes") : (isHindi ? "सहेजें" : "Insert Group")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
