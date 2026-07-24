import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { getGoogleMapsEmbedUrl } from '../utils/mapUtils';
import { Mail, Phone, MapPin, Send, CheckCircle, Star, MessageSquare, Compass } from 'lucide-react';

export default function ContactUs() {
  const { t, language } = useLanguage();
  const { contactSettings, addContactMessage, reviews, addReview } = useData();
  const isHindi = language === 'hi';

  const [newReviewForm, setNewReviewForm] = useState({
    name: '',
    rating: 5,
    commentEn: '',
    commentHi: ''
  });
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newReviewForm.name || !newReviewForm.commentEn) return;

    addReview({
      name: newReviewForm.name,
      rating: Number(newReviewForm.rating),
      commentEn: newReviewForm.commentEn,
      commentHi: newReviewForm.commentHi || newReviewForm.commentEn,
      avatarBg: "from-cyan-400 to-emerald-500",
      response: ""
    });

    setNewReviewForm({ name: '', rating: 5, commentEn: '', commentHi: '' });
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 2000);
  };

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    subject: '',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.message) {
      alert(isHindi ? "कृपया सभी आवश्यक फ़ील्ड भरें।" : "Please complete all required fields.");
      return;
    }
    
    // Save submission into the shared global state inbox
    addContactMessage({
      name: formData.name,
      mobile: formData.mobile,
      subject: formData.subject || "No Subject",
      message: formData.message
    });
    
    setIsSubmitted(true);
    setFormData({ name: '', mobile: '', subject: '', message: '' });
  };

  return (
    <div className="px-4 md:px-8 max-w-5xl mx-auto py-8 text-white min-h-[70vh]" id="contact-us-view">
      <div className="grid md:grid-cols-5 gap-8 items-stretch">
        
        {/* Left Side Info card (2 Columns) */}
        <div className="md:col-span-2 bg-gradient-to-br from-cyan-500/10 via-white/5 to-transparent backdrop-blur-xl border border-white/12 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div className="space-y-6">
            <div>
              <h2 className="font-extrabold text-xl md:text-2xl text-white text-glow">
                {isHindi ? "हमसे संपर्क करें" : "Contact Us"}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isHindi 
                  ? "यदि आपके पास किसी ऑर्डर, डिलीवरी में देरी या थोक पूछताछ के बारे में कोई प्रश्न हैं, तो हमें संदेश भेजें।" 
                  : "Drop us a line if you have queries regarding bulk orders, delay offsets, or partnership propositions."
                }
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-slate-200 uppercase tracking-widest">{isHindi ? "मुख्यालय" : "HQ Address"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{contactSettings?.address || 'Plot No 46, Block-B, Sector 18, Noida, Uttar Pradesh 201301'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-slate-200 uppercase tracking-widest">{isHindi ? "हेल्पलाइन नंबर" : "Phone Help"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{contactSettings?.phone || '+91 11 2345 6789'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-slate-200 uppercase tracking-widest">{isHindi ? "ईमेल समर्थन" : "Email Care"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{contactSettings?.email || 'support@swastik.com'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-white/10 mt-3">
                <MapPin className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-bold text-xs text-emerald-300 uppercase tracking-widest">{isHindi ? "गूगल मैप्स नक्शा" : "Google Maps HQ"}</p>
                  <a 
                    href={contactSettings?.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactSettings?.address || "Plot No 46, Block-B, Sector 18, Noida, Uttar Pradesh 201301")}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-cyan-300 hover:text-cyan-200 hover:underline font-extrabold mt-0.5 inline-flex items-center gap-1"
                  >
                    🗺️ {isHindi ? "दिशा-निर्देश खोलें" : "Open Map Directions"}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            SWASTIK REGIONAL DESK
          </div>
        </div>

        {/* Right Side form card (3 Columns) */}
        <div className="md:col-span-3 bg-white/5 backdrop-blur-xl border border-white/12 p-6 rounded-2xl shadow-xl flex flex-col justify-center">
          {isSubmitted ? (
            <div className="text-center py-12 flex flex-col items-center animate-scale-in">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 stroke-[1.5]" />
              </div>
              <h3 className="font-black text-lg text-white">
                {isHindi ? "संदेश सफलतापूर्वक भेजा गया!" : "Message Sent Successfully!"}
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                {isHindi 
                  ? "आपकी पूछताछ दर्ज कर ली गई है। हमारा ग्राहक सहायता प्रतिनिधि 24 घंटे के भीतर आपसे संपर्क करेगा।" 
                  : "Your inquiry is registered in our dashboard. Swastik regional help desk will coordinate with you in 24 hours."
                }
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl font-bold text-xs uppercase text-white transition-all duration-200"
              >
                {isHindi ? "दूसरा संदेश भेजें" : "Send Another Message"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-extrabold text-base text-white tracking-tight mb-2">
                {isHindi ? "हमें संदेश लिखें" : "Write Us a Message"}
              </h3>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                  {isHindi ? "आपका नाम *" : "Your Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isHindi ? "राहुल शर्मा" : "Rahul Sharma"}
                  className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                    {isHindi ? "मोबाइल नंबर *" : "Mobile Number *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9876543210"
                    className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                    {isHindi ? "विषय" : "Subject"}
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder={isHindi ? "ऑर्डर सहायता" : "Order Support"}
                    className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                  {isHindi ? "आपका संदेश *" : "Your Message *"}
                </label>
                <textarea
                  required
                  rows="4"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={isHindi ? "यहाँ अपना संदेश टाइप करें..." : "Comment down your inquiries..."}
                  className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/30 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span>{isHindi ? "संदेश भेजें" : "Submit Message"}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* --- Interactive Google Maps Embed (Requirement) --- */}
      <div className="mt-12 bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-xl flex items-center justify-center shrink-0">
            <Compass className="h-5 w-5 stroke-[2] animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              {isHindi ? "लाइव सैटेलाइट और स्थान मैप" : "Interactive HQ Venue Map"}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400">
              {contactSettings?.address || (isHindi ? "प्लॉट नंबर 46, ब्लॉक-बी, सेक्टर 18, नोएडा, उत्तर प्रदेश" : "Plot No 46, Block-B, Sector 18, Noida, Uttar Pradesh")}
            </p>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-2xl border border-white/10 shadow-inner bg-slate-950">
          <iframe 
            src={getGoogleMapsEmbedUrl(contactSettings)}
            width="100%" 
            height="320" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade" 
            className="w-full opacity-90 hover:opacity-100 transition-opacity duration-300"
          ></iframe>
        </div>
      </div>

      {/* --- Google Reviews Segment from Partners Page --- */}
      <div className="mt-12 space-y-8 bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 font-bold text-lg font-mono">G</span>
              <span className="text-red-400 font-bold text-lg font-mono">o</span>
              <span className="text-yellow-400 font-bold text-lg font-mono font-sans font-black">o</span>
              <span className="text-blue-400 font-bold text-lg font-mono font-sans font-black">g</span>
              <span className="text-green-400 font-bold text-lg font-mono font-sans font-black">l</span>
              <span className="text-red-400 font-bold text-lg font-mono font-sans font-black">e</span>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1.5">Business Reviews</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isHindi ? "गूगल रिव्यु और ग्राहक कहानियां" : "Real Reviews From Local Residents"}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl w-fit">
            <div className="flex text-amber-400">
              {[1,2,3,4,5].map(x => <Star key={x} className="h-4 w-4 fill-current" />)}
            </div>
            <span className="text-xs font-bold text-white font-mono">4.9 / 5 (1,240 reviews)</span>
          </div>
        </div>

        {/* Testimonials List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {reviews && reviews.map((rev) => (
            <div 
              key={rev.id} 
              className="bg-slate-950/40 border border-white/10 p-5 rounded-3xl relative flex flex-col justify-between hover:border-white/15 transition-all shadow-md"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${rev.avatarBg || 'from-cyan-400 to-blue-500'} flex items-center justify-center text-xs font-black uppercase text-slate-950 shadow-md`}>
                      {rev.name ? rev.name[0] : 'U'}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white leading-none">{rev.name}</h4>
                      <span className="text-[10px] text-slate-500 font-medium font-mono">{rev.date || "Yesterday"}</span>
                    </div>
                  </div>
                  
                  <div className="flex text-amber-400 gap-0.5">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                  {isHindi ? rev.commentHi : rev.commentEn}
                </p>
              </div>

              {rev.response && (
                <div className="mt-4 pt-3.5 border-t border-white/5 bg-cyan-500/[0.03] p-3 rounded-xl border border-cyan-500/10 space-y-1">
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block">Response from Owner:</span>
                  <p className="text-[11px] text-slate-400 font-semibold italic">"{rev.response}"</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Leave a review Form */}
        <div className="pt-6 border-t border-white/10 max-w-2xl">
          <h3 className="font-extrabold text-sm uppercase text-slate-300 tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span>{isHindi ? "गूगल पर एक रिव्यू लिखें" : "Write a Google Review"}</span>
          </h3>

          {reviewSuccess && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-xs font-bold shadow-inner">
              ✓ {isHindi ? "आपका रिव्यू सबमिट हो गया है! यह लाइव हो चुका है।" : "Review published successfully!"}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input 
                  type="text" 
                  placeholder={isHindi ? "आपका पूरा नाम" : "Your Name"}
                  required
                  value={newReviewForm.name}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:border-cyan-400/40 text-xs font-bold transition-all text-white"
                />
              </div>
              <div>
                <select
                  value={newReviewForm.rating}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-400/40 text-xs font-bold text-white"
                >
                  <option value="5">★★★★★ (5 Stars)</option>
                  <option value="4">★★★★☆ (4 Stars)</option>
                  <option value="3">★★★☆☆ (3 Stars)</option>
                </select>
              </div>
            </div>

            <div>
              <textarea 
                placeholder={isHindi ? "अंग्रेजी रिव्यू टिप्पणियां लिखें..." : "Review Comment (English)..."}
                required
                rows={3}
                value={newReviewForm.commentEn}
                onChange={(e) => setNewReviewForm({ ...newReviewForm, commentEn: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:border-cyan-400/40 text-xs font-bold transition-all text-white"
              />
            </div>

            <div>
              <textarea 
                placeholder={isHindi ? "हिंदी रिव्यू टिप्पणियां (वैकल्पिक)..." : "Review Comment (Hindi - Optional)..."}
                rows={2}
                value={newReviewForm.commentHi}
                onChange={(e) => setNewReviewForm({ ...newReviewForm, commentHi: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:border-cyan-400/40 text-xs font-bold transition-all text-white"
              />
            </div>

            <button 
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              {isHindi ? "रिव्यू प्रकाशित करें" : "Publish Google Review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
