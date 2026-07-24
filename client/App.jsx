import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { DataProvider, useData } from './context/DataContext';
import Splash from './pages/Splash';
import Home from './pages/Home';
import Shop from './pages/Shop';
import CartCheckout from './pages/CartCheckout';
import Account from './pages/Account';

// Custom Informational Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ContactUs from './pages/ContactUs';
import StoreLocator from './pages/StoreLocator';
import Partners from './pages/Partners';
import Admin from './pages/Admin';

import Header from './components/Header';
import Footer from './components/Footer';
import BottomNavigation from './components/BottomNavigation';
import { 
  X, 
  Home as HomeIcon, 
  Store, 
  ShoppingCart, 
  User, 
  Info, 
  PhoneCall, 
  Heart,
  Share2,
  ExternalLink,
  ShieldAlert,
  Users,
  MessageCircle
} from 'lucide-react';

function AppContent() {
  const { t, language, setLanguage } = useLanguage();
  const { categories, contactSettings } = useData();
  const [currentView, setCurrentView] = useState(() => {
    const view = (window.location.pathname === '/admin' || window.location.hash === '#/admin') ? 'admin' : 'splash';
    console.log("🛠️ [AppContent]: Initialized currentView state to:", view);
    return view;
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  console.log("📱 [AppContent]: Rendering component. Current state details:", { currentView, activeCategory, isSidebarOpen });

  // Sync URL changes and popstate with the in-memory route
  React.useEffect(() => {
    const handleLocationCheck = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#/admin') {
        setCurrentView('admin');
      }
    };
    window.addEventListener('popstate', handleLocationCheck);
    return () => window.removeEventListener('popstate', handleLocationCheck);
  }, []);

  // Update real address bar path on view changes
  React.useEffect(() => {
    if (currentView === 'splash') return;
    if (currentView === 'admin') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [currentView]);

  // Quick navigation handlers from Flyout Menu
  const handleSidebarNav = (view, catId = 'all') => {
    setCurrentView(view);
    setActiveCategory(catId);
    setSearchQuery('');
    setIsSidebarOpen(false);
  };

  const handleSlideClick = (linkType, linkValue) => {
    if (linkType === 'category') {
      setActiveCategory(linkValue || 'all');
      setSearchQuery('');
      setCurrentView('shop');
    } else if (linkType === 'product') {
      setActiveCategory('all');
      setSearchQuery(linkValue || '');
      setCurrentView('shop');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  if (currentView === 'splash') {
    return <Splash onComplete={() => setCurrentView('home')} />;
  }

  // Separate Admin View of All Things: No headers, footers or customer menus
  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-slate-900 flex flex-col">
        <Admin onViewChange={setCurrentView} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent font-sans text-white">
      {/* 1. Header Top App Bar */}
      <Header 
        onMenuClick={() => setIsSidebarOpen(true)} 
        onSearchClick={() => handleSidebarNav('shop', 'all')}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* 2. Side Flyout Navigation Drawer Panel */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay mask */}
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          {/* Sizable Sliding block */}
          <div className="relative flex w-full max-w-xs flex-col bg-slate-950/80 backdrop-blur-2xl border-r border-white/20 h-full p-6 shadow-2xl z-10 animate-slide-in text-white">
            {/* Close Button top-right */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-5 right-5 rounded-full p-2 hover:bg-white/10 text-slate-300 transition-all active:scale-90"
              id="close-sidebar-btn"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Core branding logo header */}
            <div className="mb-8 pt-4 flex items-center gap-3">
              {contactSettings?.logo ? (
                <img 
                  src={contactSettings.logo} 
                  alt="Swastik Logo" 
                  className="h-9 w-9 rounded-xl object-cover bg-white pointer-events-none p-1 border border-white/25 shadow-md shadow-amber-500/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-pink-500 rounded-lg shadow-lg"></div>
              )}
              <div>
                <span className="text-[15px] font-black text-white tracking-tight block leading-tight">
                  {contactSettings?.brandName || t('title')}
                </span>
                <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest mt-0.5">
                  {t('dailyEssentials')}
                </p>
              </div>
            </div>

            {/* Drawer Links */}
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 grow">
              {/* Primary Views */}
              <div className="space-y-1 mb-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 block mb-2">
                  Navigation
                </span>
                
                <button
                  onClick={() => handleSidebarNav('home')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'home' ? 'bg-white/20 text-white shadow-inner border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <HomeIcon className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{t('home')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('shop')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'shop' ? 'bg-white/20 text-white shadow-inner border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Store className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{t('shop')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('cart')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'cart' ? 'bg-white/20 text-white shadow-inner border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <ShoppingCart className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{t('cart')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('account')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'account' ? 'bg-white/20 text-white shadow-inner border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <User className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{t('account')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('partners')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'partners' ? 'bg-white/20 text-white shadow-inner border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Users className="h-4.5 w-4.5 text-cyan-400" />
                  <span>{language === 'hi' ? 'किसान और पार्टनर्स' : 'Partners & Sourcing'}</span>
                </button>
              </div>

              {/* Shoppable specific Categories shortcuts */}
              <div className="space-y-1 mb-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 block mb-2">
                  Categories
                </span>

                {(categories && categories.length > 0 ? categories : [
                  { id: 'all', nameEn: 'All Essentials', nameHi: 'सभी आवश्यक वस्तुएं', icon: "✨" },
                  { id: 'vegetables', nameEn: 'Fruits & Vegetables', nameHi: 'फल और सब्जियां', icon: "🥦" },
                  { id: 'dairy', nameEn: 'Dairy & Eggs', nameHi: 'डेयरी और अंडे', icon: "🥛" },
                  { id: 'beverages', nameEn: 'Beverages', nameHi: 'पेय पदार्थ', icon: "🧃" },
                  { id: 'household', nameEn: 'Household Supplies', nameHi: 'घरेलू सामान', icon: "🧼" }
                ]).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSidebarNav('shop', cat.id)}
                    className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 transition-all hover:bg-white/5 ${
                      activeCategory === cat.id && currentView === 'shop' ? 'font-black bg-white/10 text-white border border-white/5' : ''
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{language === 'hi' ? (cat.nameHi || cat.label) : (cat.nameEn || cat.label)}</span>
                  </button>
                ))}
              </div>

              {/* Informational Pages in Drawer */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 block mb-2">
                  {language === 'hi' ? 'सूचना खंड' : 'Information'}
                </span>
                
                <button
                  onClick={() => handleSidebarNav('privacy')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'privacy' ? 'bg-white/20 text-white border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">🛡️</span>
                  <span>{t('privacyPolicy')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('terms')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'terms' ? 'bg-white/20 text-white border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">⚖️</span>
                  <span>{t('termsOfService')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('contact')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'contact' ? 'bg-white/20 text-white border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">📞</span>
                  <span>{t('contactUs')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('locator')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'locator' ? 'bg-white/20 text-white border border-white/10' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">📍</span>
                  <span>{t('storeLocator')}</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions footer inside Drawer */}
            <div className="mt-auto pt-6 border-t border-white/10 space-y-3 font-semibold text-[11px]">
              {/* Language Switch */}
              <button
                onClick={toggleLanguage}
                className="flex w-full items-center justify-between px-3 py-2 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                <span className="text-slate-300">🌐 {language === 'en' ? 'Switch to Hindi' : 'अंग्रेजी चुनें'}</span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/20 px-1.5 py-0.5 rounded uppercase font-black">
                  {language === 'en' ? 'हिंदी' : 'EN'}
                </span>
              </button>

              <div className="text-center text-slate-500 text-[10px] pt-1">
                Swastik Supermarket Mobile v1.4.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Central Router Box of Views with Elegant Motion Layer */}
      <main className="flex-grow">
        {currentView === 'home' && (
          <Home 
            onViewChange={setCurrentView} 
            onCategorySelect={setActiveCategory} 
            onSlideClick={handleSlideClick}
          />
        )}
        {currentView === 'shop' && (
          <Shop 
            categoryFilterState={activeCategory} 
            onCategoryFilterChange={setActiveCategory} 
            searchQueryProp={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}
        {currentView === 'cart' && (
          <CartCheckout onViewChange={setCurrentView} />
        )}
        {currentView === 'account' && (
          <Account onViewChange={setCurrentView} />
        )}
        {currentView === 'partners' && (
          <Partners />
        )}
        {currentView === 'admin' && (
          <Admin />
        )}
        {currentView === 'privacy' && (
          <PrivacyPolicy />
        )}
        {currentView === 'terms' && (
          <TermsOfService />
        )}
        {currentView === 'contact' && (
          <ContactUs />
        )}
        {currentView === 'locator' && (
          <StoreLocator />
        )}
      </main>

      {/* 4. Desktop-Footer / Mobile Nav Bars */}
      <Footer onViewChange={setCurrentView} />
      <BottomNavigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DataProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </DataProvider>
    </LanguageProvider>
  );
}
