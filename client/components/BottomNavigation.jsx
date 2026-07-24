import React from 'react';
import { Home, Store, ShoppingCart, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

export default function BottomNavigation({ currentView, onViewChange }) {
  const { t } = useLanguage();
  const { cartItems } = useCart();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'shop', label: t('shop'), icon: Store },
    { id: 'cart', label: t('cart'), icon: ShoppingCart, badge: totalItems },
    { id: 'account', label: t('account'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-40 flex w-full justify-around border-t border-white/10 bg-slate-950/85 backdrop-blur-xl py-3 px-2 shadow-2xl md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`relative flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${
              isActive
                ? 'bg-white/15 text-white border border-white/10 rounded-2xl px-5 py-1.5 font-bold'
                : 'text-slate-400 hover:text-white px-3 py-1.5'
            }`}
            id={`nav-item-${item.id}`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white shadow-md animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            
            {/* Show label slightly smaller as a native tab label */}
            <span className="text-[10px] tracking-wide mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
