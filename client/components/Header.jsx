import React from 'react';
import { Menu, Search, Languages, Home, Store, ShoppingCart, Users, ShieldAlert, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../context/AuthContext';

export default function Header({ onMenuClick, onSearchClick, currentView, onViewChange }) {
  const { language, setLanguage, t } = useLanguage();
  const { cartItems } = useCart();
  const { contactSettings } = useData();
  const { staff: staffSession } = useAuth();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'shop', label: t('shop'), icon: Store },
    { id: 'cart', label: t('cart'), icon: ShoppingCart },
    { id: 'partners', label: 'Directors', icon: Users },
    { id: 'account', label: 'Login / Account', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 md:px-8 gap-2">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <button 
            onClick={onMenuClick}
            className="md:hidden rounded-xl p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-90 transition-all"
            id="menu-toggle-btn"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div 
            onClick={() => onViewChange && onViewChange('home')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group py-0.5"
          >
            {contactSettings?.logo ? (
              <div className="relative group-hover:scale-105 active:scale-95 transition-transform duration-300 shrink-0">
                <img 
                  src={contactSettings.logo} 
                  alt="Swastik Logo" 
                  className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl object-contain p-0.5 bg-transparent border border-emerald-500/20 shadow-xs pointer-events-none transition-all duration-300 group-hover:border-emerald-500 hover:shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-600 shadow-sm flex items-center justify-center font-black text-xl text-white group-hover:rotate-6 transition-transform shrink-0">
                ✨
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <h1 
                className="text-[11px] sm:text-xs md:text-sm font-extrabold tracking-tight text-slate-900 uppercase leading-snug truncate group-hover:text-emerald-700 transition-colors" 
                id="brand-title"
              >
                {contactSettings?.brandName || t('title')}
              </h1>
              <span className="text-[8px] sm:text-[9px] text-emerald-700 font-extrabold uppercase tracking-wider flex items-center gap-1 leading-none mt-0.5">
                <span>Supermarket</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-semibold text-[8px]">Express Store</span>
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navbar Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 border border-slate-200 p-1 rounded-2xl" id="desktop-main-navbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange && onViewChange(item.id)}
                className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-600 text-white font-black shadow-md scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
                id={`header-nav-${item.id}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.id === 'cart' && totalItems > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[9px] font-black shadow-md ${
                    isActive 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-emerald-600 text-white animate-pulse'
                  }`}>
                    {totalItems}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Staff Workspace shortcut button if logged in as Staff / Delivery */}
          {staffSession && (
            <button
              type="button"
              onClick={() => onViewChange && onViewChange('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title={`Logged in as ${staffSession.name || 'Staff'}`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>Staff Panel</span>
            </button>
          )}

          {/* Real-time Customer / Staff Notification Bell */}
          <NotificationCenter 
            role={(() => {
              if (staffSession) {
                const s = staffSession;
                const isRider = String(s.role_code || '').toUpperCase() === 'DELIVERY' || (s.permissions?.length === 1 && s.permissions[0] === 'delivery');
                if (isRider) return 'delivery';
                return 'admin';
              }
              return 'customer';
            })()} 
          />

          {/* Language Selector Toggle - Commented out as requested, default is English */}
          {/* 
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-200 active:scale-95 transition-all duration-150"
            id="lang-toggle-btn"
          >
            <Languages className="h-4 w-4 text-emerald-600" />
            <span>{language === 'en' ? 'EN / हिंदी' : 'हिंदी / EN'}</span>
          </button>
          */}

          <button 
            onClick={onSearchClick}
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all duration-150"
            id="search-btn"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
