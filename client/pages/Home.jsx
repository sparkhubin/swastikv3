import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { getGoogleMapsEmbedUrl } from '../utils/mapUtils';
import Shop from './Shop';
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
  X,
  Tag,
  Copy,
  Check
} from 'lucide-react';

const API_KEY =
  (typeof process !== 'undefined' && process.env ? process.env.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  import.meta.env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  globalThis.GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function Home({ onViewChange, onCategorySelect, onSlideClick }) {
  const { t, language } = useLanguage();
  const {
    reviews,
    slides: dynamicSlides,
    contactSettings,
    categories: dynamicCategories,
    offers,
    fetchReviews,
    fetchSettings
  } = useData();
  const mapEmbedUrl = getGoogleMapsEmbedUrl(contactSettings);
  useEffect(() => {
    fetchReviews();
    fetchSettings();
  }, [fetchReviews, fetchSettings]);

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

  // Dynamic Coupons from Existing Coupon CRUD (offers)
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [couponCopied, setCouponCopied] = useState(false);

  const activeOffers = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const filtered = (offers || []).filter(o => {
      if (o.status && o.status !== 'Active') return false;
      if (o.endDate && o.endDate < today) return false;
      return true;
    });
    return filtered.length > 0 ? filtered : (offers || []);
  }, [offers]);

  const currentCoupon = activeOffers.length > 0
    ? activeOffers[currentOfferIndex % activeOffers.length]
    : null;

  // Auto rotate coupons if multiple coupons exist in CRUD
  useEffect(() => {
    if (activeOffers.length <= 1) return;
    const offerTimer = setInterval(() => {
      setCurrentOfferIndex(prev => (prev + 1) % activeOffers.length);
    }, 6000);
    return () => clearInterval(offerTimer);
  }, [activeOffers.length]);

  // Dynamic countdown timer for active coupon
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 45, seconds: 30 });

  useEffect(() => {
    const updateCountdown = () => {
      if (currentCoupon?.endDate) {
        const target = new Date(`${currentCoupon.endDate}T23:59:59`).getTime();
        const diff = Math.max(0, target - Date.now());
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft(prev => {
          let s = prev.seconds - 1;
          let m = prev.minutes;
          let h = prev.hours;
          if (s < 0) { s = 59; m -= 1; }
          if (m < 0) { m = 59; h -= 1; }
          if (h < 0) { h = 12; m = 0; s = 0; }
          return { hours: h, minutes: m, seconds: s };
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [currentCoupon?.id, currentCoupon?.endDate]);

  const handleCopyCoupon = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCouponCopied(true);
    setTimeout(() => setCouponCopied(false), 2000);
  };

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



  const handleDirections = () => {
    if (!contactSettings?.address && !contactSettings?.googleMaps) {
      setDirectionsStatus(language === 'hi' ? 'स्टोर का स्थान कॉन्फ़िगर नहीं है।' : 'Store location is not configured.');
      setShowDirections(true);
      return;
    }
    setShowDirections(true);
    setDirectionsStatus(language === 'hi' ? 'आपकी वर्तमान स्थिति से मार्ग की गणना की जा रही है...' : 'Calculating shortest route from current location...');
    setTimeout(() => {
      const addressName = contactSettings?.address || contactSettings?.googleMaps;
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
      {/* 1. Dynamic Home Banner Slider (Powered by Sliders CRUD) */}
      <section className="relative w-full overflow-hidden px-4 md:px-8 mt-2">
        <div 
          onClick={handleSlideAction}
          className={`relative h-[230px] sm:h-[300px] md:h-[370px] w-full rounded-3xl overflow-hidden group shadow-xl border border-slate-200 bg-slate-900 select-none ${hasLink ? 'cursor-pointer' : ''}`}
        >
          {currentSlide && (
            <img 
              src={currentSlide.image} 
              alt={slideTitle || "Promotion Banner"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Premium Gradient Overlay for Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/50 to-transparent flex flex-col justify-end md:justify-center p-6 md:p-10 z-10">
            <div className="max-w-xl text-white space-y-3">
              {slideLabel && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/85 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{slideLabel}</span>
                </div>
              )}
              
              {slideTitle && (
                <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md whitespace-pre-line">
                  {slideTitle}
                </h2>
              )}

              {slideBtnText && (
                <div className="pt-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSlideAction();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-extrabold rounded-xl shadow-lg transition-all transform active:scale-95 group-hover:shadow-emerald-500/25 cursor-pointer"
                  >
                    <span>{slideBtnText}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Slide Navigation Chevrons */}
          {slidesList.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((activeSlide - 1 + slidesList.length) % slidesList.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/20 transition-all z-20 active:scale-90"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((activeSlide + 1) % slidesList.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/20 transition-all z-20 active:scale-90"
                aria-label="Next Slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Slide Indicator Dots */}
          {slidesList.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1.5 z-20" onClick={(e) => e.stopPropagation()}>
              {slidesList.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 bg-emerald-400' : 'w-2 bg-white/60 hover:bg-white'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
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
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl group-hover:bg-emerald-50 group-hover:border-emerald-400 active:scale-95 transition-all duration-200 shadow-sm border border-slate-200">
                {cat.icon}
              </div>
              <span className="text-xs font-extrabold text-slate-700 group-hover:text-emerald-700 tracking-wide">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Dynamic Offer Zone Banner (Powered by Coupon CRUD) */}
      <section className="px-4 md:px-8">
        <div 
          onClick={() => {
            onCategorySelect('all');
            onViewChange('shop');
          }}
          className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-emerald-500/30 cursor-pointer relative overflow-hidden group"
        >
          <div className="z-10 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white border border-white/30 font-black text-xs tracking-wider uppercase rounded-lg">
                <Flame className="h-3.5 w-3.5 animate-bounce text-amber-300" />
                <span>{t('offerZone')}</span>
              </div>
              {activeOffers.length > 1 && (
                <span className="text-[11px] font-bold text-emerald-200/90 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-white/10">
                  {currentOfferIndex + 1} / {activeOffers.length}
                </span>
              )}
            </div>

            <h3 className="font-black text-lg md:text-2xl text-white tracking-tight">
              {currentCoupon 
                ? (language === 'hi' ? (currentCoupon.bannerHi || currentCoupon.bannerEn) : currentCoupon.bannerEn)
                : t('flashSaleTitle')}
            </h3>
            
            <p className="text-xs md:text-sm text-emerald-100 mt-1 font-medium max-w-xl">
              {currentCoupon 
                ? (language === 'hi' ? (currentCoupon.descriptionHi || currentCoupon.descriptionEn) : currentCoupon.descriptionEn)
                : t('flashSaleDesc')}
            </p>

            {/* Dynamic Coupon Code Pill & Copy Button */}
            {currentCoupon?.code && (
              <div className="mt-4 flex items-center gap-2.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-amber-300/40 text-amber-300 text-xs font-mono font-bold tracking-wider shadow-inner">
                  <Tag className="h-3.5 w-3.5 text-amber-300" />
                  <span>CODE: {currentCoupon.code}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleCopyCoupon(e, currentCoupon.code)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-amber-100 text-emerald-900 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Copy coupon code"
                >
                  {couponCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="text-emerald-800">COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-emerald-800" />
                      <span>TAP TO COPY</span>
                    </>
                  )}
                </button>
                {currentCoupon.minOrder > 0 && (
                  <span className="text-xs text-emerald-100 font-semibold">
                    (Min Order: ₹{currentCoupon.minOrder})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side Discount Highlight & Countdown Timer */}
          <div className="flex flex-col items-end shrink-0 select-none bg-emerald-950/50 p-4 sm:p-5 rounded-2xl border border-white/20 shadow-lg z-10 w-full md:w-auto text-right">
            <span className="font-black text-2xl md:text-3xl text-amber-300 tracking-wider uppercase block">
              {currentCoupon 
                ? (currentCoupon.discountType === 'percentage' 
                    ? `${currentCoupon.value}% OFF` 
                    : `₹${currentCoupon.value} OFF`)
                : t('upTo60')}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-white mt-1.5 justify-end">
              <Timer className="h-3.5 w-3.5 text-amber-300" />
              <p className="font-mono font-black text-sm">
                {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
              </p>
            </div>
            {activeOffers.length > 1 && (
              <div className="flex items-center gap-1.5 mt-3 justify-end" onClick={(e) => e.stopPropagation()}>
                {activeOffers.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentOfferIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${currentOfferIndex === i ? 'w-5 bg-amber-300' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                    aria-label={`Coupon ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

        <Shop
        categoryFilterState="all"
        onCategoryFilterChange={onCategorySelect}
        searchQueryProp=""
        onSearchQueryChange={() => {}}
      />

      {/* 5. Customer Testimonials Slider */}
      <section className="bg-slate-100/90 border-t border-b border-slate-200 py-10 px-4 md:px-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6 items-center text-center">
          <h3 className="font-black text-lg md:text-xl text-slate-900">
            {t('customerSay')}
          </h3>
          
          <div className="relative w-full overflow-hidden bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md mt-1 select-none">
            {/* Nav Prev Button */}
            <button 
              onClick={() => {
                const prevIndex = (activeTestimonial - 1 + reviews.length) % reviews.length;
                setActiveTestimonial(prevIndex);
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition-all active:scale-90 z-10"
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
                  <div className="flex text-amber-400 mb-4 justify-center">
                    {Array.from({ length: activeReview.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current stroke-none text-amber-400" />
                    ))}
                  </div>

                  <blockquote className="text-sm sm:text-base leading-relaxed text-slate-700 font-semibold italic min-h-[4.5rem] flex items-center justify-center text-center">
                    "{language === 'hi' ? activeReview.commentHi : activeReview.commentEn}"
                  </blockquote>

                  <div className="flex items-center gap-3 not-italic border-t border-slate-100 mt-5 pt-4 justify-center w-full max-w-xs mx-auto">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center font-black text-xs shadow-sm uppercase">
                      {activeReview.name ? activeReview.name[0] : 'U'}
                    </div>
                    <div className="text-left">
                      <span className="font-extrabold text-xs text-slate-900 block">
                        {activeReview.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
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
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition-all active:scale-90 z-10"
              id="next-testimonial-btn"
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Sider Dots Indicator */}
          <div className="flex gap-2 mt-2 justify-center">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${activeTestimonial === idx ? 'w-6 bg-emerald-600 shadow-sm' : 'w-2 bg-slate-300'}`}
                id={`testimonial-dot-${idx}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Flagship Store details with interactive direction coordinates */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto w-full mt-2">
        <div className="grid md:grid-cols-2 gap-8 items-stretch bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-md">
          <div className="flex flex-col justify-center text-slate-900">
            <h3 className="font-black text-lg md:text-xl text-slate-900 mb-2">
              {language === 'hi' ? 'विशेष आउटलेट पर पधारें' : 'Visit Our Experience Outlet'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium">
              {contactSettings?.brandName 
                ? (language === 'hi' ? `${contactSettings.brandName} में आपका स्वागत है। हमारे प्रमुख आउटलेट पर पधारें और उच्च-गुणवत्ता वाले उत्पादों का आनंद लें।` : `Welcome to ${contactSettings.brandName}. Drop by our flagship experience hub for direct purchases, tastings, and instant order pickup.`)
                : t('visitStoreDesc')}
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-sm text-slate-900">{contactSettings?.brandName || t('storeAddressTitle')}</p>
                  <p className="text-xs text-slate-500 font-medium">{contactSettings?.address || t('storeAddressSub')}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-sm text-slate-900">{t('openDaily')}</p>
                  <p className="text-xs text-slate-500 font-medium">{t('storeHours')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-sm text-slate-900">{contactSettings?.phone || '—'}</p>
                  <p className="text-xs text-slate-500 font-medium">{contactSettings?.email || '—'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDirections}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-8 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all self-start active:scale-95 shadow-sm shrink-0"
              id="get-directions-btn"
            >
              <Navigation className="h-4 w-4 fill-current text-white stroke-none" />
              <span>{t('getDirections')}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 relative h-[300px] md:h-[380px] shadow-sm">
              {mapEmbedUrl ? <iframe
                src={mapEmbedUrl}
                className="w-full h-full border-0"
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Store Map Location"
              ></iframe> : <div className="h-full flex items-center justify-center text-sm text-slate-500">{language === 'hi' ? 'स्टोर का नक्शा कॉन्फ़िगर नहीं है।' : 'Store map is not configured.'}</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Get Directions Interactive Modal popover */}
      {showDirections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-opacity animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-slate-900 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowDirections(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-slate-100 text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-emerald-700">
              <Map className="h-6 w-6 stroke-[2]" />
              <h4 className="font-extrabold text-base">Route to {contactSettings?.brandName || t('title')}</h4>
            </div>
            <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {directionsStatus}
            </p>
            <div className="mt-6 flex justify-end gap-3 font-extrabold text-xs uppercase tracking-wider">
              <button 
                onClick={() => setShowDirections(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
              >
                Close
              </button>
              {(contactSettings?.googleMaps || contactSettings?.address) && <a
                href={contactSettings?.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactSettings.address)}`}
                target="_blank" 
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-center shadow-sm"
              >
                Open Google Maps
              </a>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
