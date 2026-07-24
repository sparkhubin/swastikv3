import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import ProductCard from '../components/ProductCard';
import { getGoogleMapsEmbedUrl } from '../utils/mapUtils';
import { 
  Flame, 
  MapPin, 
  Clock, 
  Phone, 
  Navigation, 
  ChevronRight, 
  ChevronLeft,
  Star,
  Sparkles,
  Timer,
  ShoppingBag,
  Map,
  X
} from 'lucide-react';

const API_KEY =
  (typeof process !== 'undefined' && process.env ? process.env.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  import.meta.env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  globalThis.GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function Home({ onViewChange, onCategorySelect, onSlideClick }) {
  const { t, language } = useLanguage();
  const { products, reviews, slides: dynamicSlides, contactSettings, categories: dynamicCategories } = useData();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsStatus, setDirectionsStatus] = useState('');
  const [useIframeFallback, setUseIframeFallback] = useState(() => {
    return window.googleMapsAuthFailed === true;
  });

  useEffect(() => {
    const handleMapsFailure = () => {
      setUseIframeFallback(true);
    };
    window.addEventListener('google-maps-auth-failed', handleMapsFailure);
    return () => {
      window.removeEventListener('google-maps-auth-failed', handleMapsFailure);
    };
  }, []);

  // Simulated countdown timer for Flash Sales (ticking down)
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 45, seconds: 12 });

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        let h = prev.hours;
        let m = prev.minutes;
        let s = prev.seconds - 1;

        if (s < 0) {
          s = 59;
          m -= 1;
        }
        if (m < 0) {
          m = 59;
          h -= 1;
        }
        if (h < 0) {
          // Reset to some values
          h = 12;
          m = 0;
          s = 0;
        }
        return { hours: h, minutes: m, seconds: s };
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const slidesList = dynamicSlides && dynamicSlides.length > 0 ? dynamicSlides : [
    {
      id: 1,
      labelEn: "Weekly Special Offers",
      labelHi: "साप्ताहिक विशेष ऑफर",
      titleEn: "Pure Organic Farm Fresh Produce\nDirect To Your Kitchen",
      titleHi: "शुद्ध जैविक खेत की ताजा उपज\nसीधे आपकी रसोई में",
      btnTextEn: "Shop Veggies",
      btnTextHi: "सब्जियां खरीदें",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCfjK4I9eqQgMsGsSxuAoLMH0CwtFS5Zm5KcILKEtjVOF3npOIuguy2M9Y7waVqYh_zl1JH3jB9g3Y6GHlTPjK1-eJnCX_M6Mq107yvdzkMyzwM3n2llALGPkHBQBvAIDdSF-xm_-aX6cSyyTgBxbpf4CooDdRmQedPe7q4PAJ3IKkmCZaE1Ytj6qL_nMSBEfgWSgfpJwDA2_RV8UhqnCqRV8ve_66C0OL7QkO1yKAoa1ZG-DcxpXRW84l3i7w33F42oMqFlhueWyzI",
      linkType: "category",
      linkValue: "vegetables"
    }
  ];

  // Auto slide effect
  useEffect(() => {
    if (slidesList.length === 0) return;
    const slideTimer = setInterval(() => {
      setActiveSlide(p => (p + 1) % slidesList.length);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, [slidesList.length]);

  const categories = dynamicCategories && dynamicCategories.length > 0
    ? dynamicCategories.filter(cat => cat.id !== 'all').map(cat => ({
        id: cat.id,
        label: language === 'hi' ? cat.nameHi : cat.nameEn,
        icon: cat.icon || "✨"
      }))
    : [
        { id: 'vegetables', label: language === 'hi' ? 'फल और सब्जियां' : 'Fruits & Vegetables', icon: "🥦" },
        { id: 'dairy', label: language === 'hi' ? 'डेयरी और अंडे' : 'Dairy & Eggs', icon: "🥛" },
        { id: 'staples', label: language === 'hi' ? 'राशन / अनाज' : 'Staples / Grains', icon: "🌾" },
        { id: 'beverages', label: language === 'hi' ? 'पेय पदार्थ' : 'Beverages', icon: "🧃" },
        { id: 'household', label: language === 'hi' ? 'घरेलू सामान' : 'Household Supplies', icon: "🧼" },
        { id: 'personal', label: language === 'hi' ? 'व्यक्तिगत देखभाल' : 'Personal Care', icon: "🧴" }
      ];

  // Featured first 4 items list
  const featuredList = products.slice(0, 4);

  const storeLat = contactSettings?.latitude !== undefined ? Number(contactSettings.latitude) : 28.5708;
  const storeLng = contactSettings?.longitude !== undefined ? Number(contactSettings.longitude) : 77.3259;

  const handleDirections = () => {
    setShowDirections(true);
    setDirectionsStatus(language === 'hi' ? 'आपकी वर्तमान स्थिति से मार्ग की गणना की जा रही है...' : 'Calculating shortest route from current location...');
    setTimeout(() => {
      const addressName = contactSettings?.address || (language === 'hi' ? "प्लॉट नंबर 46, ब्लॉक-बी, सेक्टर 18, नोएडा" : "Plot No 46, Block-B, Sector 18, Noida");
      setDirectionsStatus(
        language === 'hi' 
          ? `मार्ग तैयार है! स्वास्तिक स्टोर का स्थान: ${addressName} है।`
          : `Route Ready! Swastik store is located at: ${addressName}.`
      );
    }, 1000);
  };

  const currentSlideIndex = activeSlide >= slidesList.length ? 0 : activeSlide;
  const currentSlide = slidesList[currentSlideIndex];
  
  const slideLabel = currentSlide ? (language === 'hi' ? (currentSlide.labelHi || currentSlide.labelEn) : currentSlide.labelEn) : '';
  const slideTitle = currentSlide ? (language === 'hi' ? (currentSlide.titleHi || currentSlide.titleEn) : currentSlide.titleEn) : '';
  const slideBtnText = currentSlide ? (language === 'hi' ? (currentSlide.btnTextHi || currentSlide.btnTextEn) : currentSlide.btnTextEn) : '';
  const hasLink = currentSlide && currentSlide.linkType && currentSlide.linkType !== 'none';

  const handleSlideAction = () => {
    if (hasLink && onSlideClick) {
      onSlideClick(currentSlide.linkType, currentSlide.linkValue);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12" id="home-view">
      {/* 0. Flagship Store Full-Width Hero Section */}
      <section className="relative w-full overflow-hidden px-4 md:px-8 mt-2">
        <div className="relative h-[250px] md:h-[350px] w-full rounded-2xl overflow-hidden group shadow-2xl border border-white/10">
          <img 
            src={contactSettings?.banner || "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1920"} 
            alt={contactSettings?.brandName || "Swastik Supermarket Flagship Store"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-102 filter brightness-[0.7] contrast-[1.05]"
            referrerPolicy="no-referrer"
          />
          {/* Ambient Overlay to blend with the app theme */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-6 md:p-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {contactSettings?.logo && (
                  <div className="bg-white p-1.5 rounded-2xl shadow-xl w-14 h-14 shrink-0 flex items-center justify-center border border-white/20 animate-fade-in">
                    <img 
                      src={contactSettings.logo} 
                      alt="Brand Logo" 
                      className="w-11 h-11 object-contain rounded-xl" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[8.5px] font-black uppercase tracking-widest rounded-lg">
                    <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
                    <span>{contactSettings?.brandName ? contactSettings.brandName.toUpperCase() : (language === 'hi' ? 'स्वास्तिक प्रामाणिकता - मुख्य शाखा' : 'SWASTIK FLAGSHIP - MAIN SUPERSTORE')}</span>
                  </div>
                  <h1 className="text-white font-black text-xl md:text-3xl tracking-tight text-glow uppercase leading-none">
                    {contactSettings?.brandName || (language === 'hi' ? 'स्वास्तिक सुपरमार्केट और जैविक किराना' : 'Swastik Supermarket & Organic Groceries')}
                  </h1>
                </div>
              </div>
              <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                {contactSettings?.address || (language === 'hi' 
                  ? 'हमारे आधुनिक सुपरस्टोर की एक झलक। यहाँ आपको मिलता है सर्वोत्तम उच्च-गुणवत्ता वाले ताजे फल, सब्जियां, और दैनिक किराना सीधे आपके घर।' 
                  : 'A glance at our physical flagship superstore. Discover unmatched fresh stocks, organic grains, and friendly store-side service.')}
              </p>
              
              {/* Customizable Badge Indicator / Instructional placeholder tag */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[9px] text-slate-400 font-bold bg-slate-950/80 px-2.5 py-0.5 rounded border border-white/5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span>{language === 'hi' ? 'सक्रिय विन्यास' : 'Live Configured'}</span>
                </span>
                {contactSettings?.gst && (
                  <span className="text-[9px] text-cyan-400/80 font-mono bg-slate-950/80 px-2.5 py-0.5 rounded border border-white/5">
                    GST: {contactSettings.gst}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Hero Promo Slide Section */}
      <section className="relative w-full overflow-hidden px-4 md:px-8 mt-1 pt-1">
        <div className="relative h-[220px] md:h-[320px] w-full rounded-2xl overflow-hidden group">
          {currentSlide && (
            <img 
              src={currentSlide.image} 
              alt="Promotion Banner"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-102"
              referrerPolicy="no-referrer"
            />
          )}
          {/* Gradient Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-col justify-center px-6 md:px-12">
            <span className="text-secondary-container font-extrabold text-xs tracking-wider uppercase mb-2">
              {slideLabel}
            </span>
            <h2 className="text-white font-black text-xl md:text-3xl leading-tight whitespace-pre-line mb-4 drop-shadow">
              {slideTitle}
            </h2>
            {hasLink && (
              <button 
                onClick={handleSlideAction}
                className="bg-secondary-container text-on-secondary-container hover:brightness-95 px-5 py-2.5 rounded-lg text-xs md:text-sm font-black uppercase tracking-wide self-start active:scale-95 transition-all shadow-md"
              >
                {slideBtnText}
              </button>
            )}
          </div>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {slidesList.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 bg-secondary-container' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Category Quick Jumps (Circle Icons) */}
      <section className="px-4 md:px-8">
        <div className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onCategorySelect(cat.id);
                onViewChange('shop');
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer shrink-0 min-w-[76px]"
              id={`cat-circle-${cat.id}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center text-2xl group-hover:bg-cyan-500/20 group-hover:border-cyan-400/40 active:scale-95 transition-all duration-200 shadow-lg border border-white/10">
                {cat.icon}
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 tracking-wide">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Offer Zone Banner (Ticking Flash Sale) */}
      <section className="px-4 md:px-8">
        <div className="bg-gradient-to-r from-pink-500/15 via-purple-500/5 to-cyan-500/5 backdrop-blur-xl text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/15 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 font-extrabold text-xs tracking-wider mr-2 uppercase rounded-lg mb-3">
              <Flame className="h-3.5 w-3.5 animate-bounce text-pink-400" />
              <span>{t('offerZone')}</span>
            </div>
            <h3 className="font-extrabold text-lg md:text-xl text-white tracking-tight text-glow">
              {t('flashSaleTitle')}
            </h3>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              {t('flashSaleDesc')}
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0 select-none bg-slate-950/50 p-4 rounded-xl border border-white/10 shadow-lg">
            <span className="font-black text-xl md:text-2xl text-cyan-400 tracking-wider uppercase block">
              {t('upTo60')}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
              <Timer className="h-3.5 w-3.5 text-cyan-400" />
              <p className="font-mono font-bold">
                {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured Products Grid */}
      <section className="px-4 md:px-8">
        <div className="flex justify-between items-end mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h3 className="font-black text-lg md:text-xl text-primary tracking-tight">
              {t('featuredProducts')}
            </h3>
          </div>
          <button 
            onClick={() => {
              onCategorySelect('all');
              onViewChange('shop');
            }}
            className="flex items-center text-xs font-bold text-secondary hover:underline transition-all tracking-wider uppercase"
          >
            <span>{t('viewAll')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="featured-products-grid">
          {featuredList.map(prod => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>

      {/* 5. Customer Testimonials Slider */}
      <section className="bg-white/5 backdrop-blur-md border-t border-b border-white/10 py-12 px-4 md:px-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6 items-center text-center">
          <h3 className="font-extrabold text-lg md:text-xl text-white text-glow">
            {t('customerSay')}
          </h3>
          
          <div className="relative w-full overflow-hidden bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/12 shadow-xl mt-2 select-none">
            {/* Nav Prev Button */}
            <button 
              onClick={() => {
                const prevIndex = (activeTestimonial - 1 + reviews.length) % reviews.length;
                setActiveTestimonial(prevIndex);
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-white/10 border border-white/10 hover:bg-white/20 hover:text-cyan-400 text-slate-300 transition-all active:scale-90 z-10"
              id="prev-testimonial-btn"
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Testimonial Active Display Slide */}
            {reviews.length > 0 && (() => {
              const activeReview = reviews[activeTestimonial % reviews.length];
              return (
                <div className="px-8 sm:px-12 flex flex-col items-center animate-fade-in" key={activeReview.id}>
                  <div className="flex text-cyan-400 mb-4 justify-center">
                    {Array.from({ length: activeReview.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current stroke-none text-glow text-amber-400" />
                    ))}
                  </div>

                  <blockquote className="text-sm sm:text-base leading-relaxed text-slate-200 font-medium italic min-h-[5rem] flex items-center justify-center text-center">
                    "{language === 'hi' ? activeReview.commentHi : activeReview.commentEn}"
                  </blockquote>

                  <div className="flex items-center gap-3 not-italic border-t border-white/10 mt-6 pt-4 justify-center w-full max-w-xs mx-auto">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center font-black text-xs shadow-lg uppercase">
                      {activeReview.name ? activeReview.name[0] : 'U'}
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-xs text-white block">
                        {activeReview.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                        {language === 'hi' ? 'सत्यापित ग्राहक' : 'Verified Shopper'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Nav Next Button */}
            <button 
              onClick={() => {
                const nextIndex = (activeTestimonial + 1) % reviews.length;
                setActiveTestimonial(nextIndex);
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-white/10 border border-white/10 hover:bg-white/20 hover:text-cyan-400 text-slate-300 transition-all active:scale-90 z-10"
              id="next-testimonial-btn"
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Sider Dots Indicator */}
          <div className="flex gap-2.5 mt-3 justify-center">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${activeTestimonial === idx ? 'w-6 bg-cyan-400 shadow-md shadow-cyan-400/30' : 'w-2 bg-white/30'}`}
                id={`testimonial-dot-${idx}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Flagship Store details with interactive direction coordinates */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto w-full mt-4">
        <div className="grid md:grid-cols-2 gap-8 items-stretch bg-white/5 backdrop-blur-xl border border-white/12 p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col justify-center text-white">
            <h3 className="font-black text-lg md:text-xl text-white mb-3 text-glow">
              {language === 'hi' ? 'विशेष आउटलेट पर पधारें' : 'Visit Our Experience Outlet'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {contactSettings?.brandName 
                ? (language === 'hi' ? `${contactSettings.brandName} में आपका स्वागत है। हमारे प्रमुख आउटलेट पर पधारें और उच्च-गुणवत्ता वाले उत्पादों का आनंद लें।` : `Welcome to ${contactSettings.brandName}. Drop by our flagship experience hub for direct purchases, tastings, and instant order pickup.`)
                : t('visitStoreDesc')}
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-white">{contactSettings?.brandName || t('storeAddressTitle')}</p>
                  <p className="text-xs text-slate-400">{contactSettings?.address || t('storeAddressSub')}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-white">{t('openDaily')}</p>
                  <p className="text-xs text-slate-400">{t('storeHours')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-white">{contactSettings?.phone || "+91 11 2345 6789"}</p>
                  <p className="text-xs text-slate-400">{contactSettings?.email || "support@swastik.com"}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDirections}
              className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/35 py-3 px-8 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all self-start active:scale-95 shadow-md shrink-0"
              id="get-directions-btn"
            >
              <Navigation className="h-4 w-4 fill-current text-cyan-400 stroke-none" />
              <span>{t('getDirections')}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-white/10 relative h-[300px] md:h-[400px] shadow-lg">
              <iframe 
                src={getGoogleMapsEmbedUrl(contactSettings)}
                className="w-full h-full border-0 filter invert contrast-[1.05] grayscale-[0.1]"
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Store Map Location"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Get Directions Interactive Modal popover */}
      {showDirections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity animate-fade-in overflow-y-auto">
          <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowDirections(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-white/10 text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-cyan-400">
              <Map className="h-6 w-6 stroke-[2]" />
              <h4 className="font-bold text-base text-glow">Route to {contactSettings?.brandName || t('title')}</h4>
            </div>
            <p className="text-sm font-medium text-slate-100 bg-white/5 p-4 rounded-xl border border-white/10">
              {directionsStatus}
            </p>
            <div className="mt-6 flex justify-end gap-3 font-semibold text-xs uppercase tracking-wider">
              <button 
                onClick={() => setShowDirections(false)}
                className="px-4 py-2 border border-white/10 rounded-lg text-slate-300 hover:bg-white/5 transition-all"
              >
                Close
              </button>
              <a 
                href={contactSettings?.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactSettings?.address || "Plot No 46, Block-B, Sector 18, Noida, Uttar Pradesh 201301")}`} 
                target="_blank" 
                rel="noreferrer"
                className="px-5 py-2.5 bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all text-center"
              >
                Open Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
