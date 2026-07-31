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
import RefundPolicy from './pages/RefundPolicy';
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

  const handleSearchClick = () => {
    setCurrentView('shop');
    setIsSidebarOpen(false);
    setTimeout(() => {
      const searchInput = document.getElementById('search-input-field');
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.focus();
      }
    }, 150);
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
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      {/* 1. Header Top App Bar */}
      <Header 
        onMenuClick={() => setIsSidebarOpen(true)} 
        onSearchClick={handleSearchClick}
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
          <div className="relative flex w-full max-w-xs flex-col bg-white border-r border-slate-200 h-full p-6 shadow-2xl z-10 animate-slide-in text-slate-900">
            {/* Close Button top-right */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-5 right-5 rounded-full p-2 hover:bg-slate-100 text-slate-500 transition-all active:scale-90"
              id="close-sidebar-btn"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Core branding logo header */}
            <div className="mb-8 pt-4 flex items-center gap-3">
              {contactSettings?.logo ? (
                <div className="relative shrink-0">
                  <img 
                    src={contactSettings.logo} 
                    alt="Swastik Logo" 
                    className="h-12 w-12 rounded-2xl object-cover p-0.5 bg-white border border-emerald-500/30 shadow-md pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl shadow-md flex items-center justify-center font-black text-white text-sm">✨</div>
              )}
              <div>
                <span className="text-sm font-black text-slate-900 tracking-tight block leading-tight uppercase">
                  {contactSettings?.brandName || t('title')}
                </span>
                <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider mt-0.5">
                  Swastik Supermarket
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
                    currentView === 'home' ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <HomeIcon className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{t('home')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('shop')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'shop' ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Store className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{t('shop')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('cart')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'cart' ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShoppingCart className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{t('cart')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('account')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'account' ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{t('account')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('partners')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'partners' ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{language === 'hi' ? 'किसान और पार्टनर्स' : 'Partners & Sourcing'}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('admin')}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'admin' ? 'bg-slate-900 text-cyan-400 shadow-sm border border-slate-800' : 'text-slate-700 hover:bg-slate-100 font-extrabold'
                  }`}
                >
                  <ShieldAlert className="h-4.5 w-4.5 text-cyan-500" />
                  <span>{language === 'hi' ? 'कर्मचारी और एडमिन पैनल' : 'Staff & Admin Panel'}</span>
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
                    className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 ${
                      activeCategory === cat.id && currentView === 'shop' ? 'font-black bg-emerald-50 text-emerald-800 border border-emerald-200' : ''
                    }`}
                  >
                    <span>{cat.icon || "🛒"}</span>
                    <span>{language === 'hi' ? (cat.nameHi || cat.nameEn) : cat.nameEn}</span>
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
                    currentView === 'privacy' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">🛡️</span>
                  <span>{t('privacyPolicy')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('terms')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'terms' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">⚖️</span>
                  <span>{t('termsOfService')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('refund')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'refund' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">🔄</span>
                  <span>{t('refundPolicy')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('contact')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'contact' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">📞</span>
                  <span>{t('contactUs')}</span>
                </button>

                <button
                  onClick={() => handleSidebarNav('locator')}
                  className={`flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'locator' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">📍</span>
                  <span>{t('storeLocator')}</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions footer inside Drawer */}
            <div className="mt-auto pt-6 border-t border-slate-200 space-y-3 font-semibold text-[11px]">
              {/* Language Switch - Commented out as requested, default is English */}
              {/* 
              <button
                onClick={toggleLanguage}
                className="flex w-full items-center justify-between px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"
              >
                <span className="text-slate-700">🌐 {language === 'en' ? 'Switch to Hindi' : 'अंग्रेजी चुनें'}</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded uppercase font-black">
                  {language === 'en' ? 'हिंदी' : 'EN'}
                </span>
              </button>
              */}

              <div className="text-center text-slate-400 text-[10px] pt-1 font-medium">
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
        {currentView === 'refund' && (
          <RefundPolicy />
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
