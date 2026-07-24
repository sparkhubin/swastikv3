import React from 'react';
import { Menu, Search, Languages, Home, Store, ShoppingCart, Users, ShieldAlert, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';

export default function Header({ onMenuClick, onSearchClick, currentView, onViewChange }) {
  const { language, setLanguage, t } = useLanguage();
  const { cartItems } = useCart();
  const { contactSettings } = useData();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'shop', label: t('shop'), icon: Store },
    { id: 'cart', label: t('cart'), icon: ShoppingCart },
    { id: 'partners', label: language === 'hi' ? 'निदेशक' : 'Directors', icon: Users },
    { id: 'account', label: language === 'hi' ? 'लॉगिन / खाता' : 'Login / Account', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/15 bg-white/10 backdrop-blur-md shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="md:hidden rounded-lg p-2 text-white hover:bg-white/10 active:scale-95 transition-all duration-150"
            id="menu-toggle-btn"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div 
            onClick={() => onViewChange && onViewChange('home')}
            className="flex items-center gap-2 md:gap-3 cursor-pointer group"
          >
            {contactSettings?.logo ? (
              <img 
                src={contactSettings.logo} 
                alt="Swastik Logo" 
                className="h-10 w-10 md:h-11 md:w-11 rounded-xl object-cover bg-white pointer-events-none p-1 border border-white/25 shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-pink-500 shadow-lg flex items-center justify-center font-black text-sm text-slate-950">
                ✨
              </div>
            )}
            <h1 
              className="text-base sm:text-xl font-bold tracking-tight text-white cursor-pointer group-hover:text-cyan-300 transition-colors" 
              id="brand-title"
            >
              {t('title')}
            </h1>
          </div>
        </div>

        {/* Desktop Navbar Links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-2xl" id="desktop-main-navbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange && onViewChange(item.id)}
                className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-lg scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                id={`header-nav-${item.id}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.id === 'cart' && totalItems > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[9px] font-black shadow-md ${
                    isActive 
                      ? 'bg-slate-950 text-cyan-400 border border-cyan-400/30' 
                      : 'bg-pink-500 text-white animate-pulse'
                  }`}>
                    {totalItems}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Custom Language Selector Toggle with real active indicator */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/25 active:scale-95 transition-all duration-150"
            id="lang-toggle-btn"
          >
            <Languages className="h-4 w-4 text-cyan-400" />
            <span>{language === 'en' ? 'EN / हिंदी' : 'हिंदी / EN'}</span>
          </button>

          <button 
            onClick={onSearchClick}
            className="rounded-lg p-2 text-white hover:bg-white/10 active:scale-95 transition-all duration-150"
            id="search-btn"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
