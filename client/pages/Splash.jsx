import React, { useEffect } from 'react';
import { ShoppingBasket } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

export default function Splash({ onComplete }) {
  const { t } = useLanguage();
  const { contactSettings } = useData();

  useEffect(() => {
    // Automatically skip splash after 2.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main 
      onClick={onComplete}
      className="relative flex h-screen w-full cursor-pointer flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1a1c2c] via-[#4a192c] to-[#121212] select-none overflow-hidden"
      id="splash-screen"
    >
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[65%] h-[60%] bg-pink-500 rounded-full blur-[130px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[55%] h-[50%] bg-cyan-500 rounded-full blur-[110px]"></div>
      </div>

      {/* Central Branding Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
        {/* Shopping Basket logo icon with pink gradient/color */}
        <div className="mb-6 animate-pulse">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] flex items-center justify-center shadow-2xl mb-4 mx-auto overflow-hidden">
            {contactSettings?.logo ? (
              <img 
                src={contactSettings.logo} 
                alt="Swastik Logo" 
                className="w-16 h-16 object-cover rounded-xl bg-white p-1" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <ShoppingBasket className="h-10 w-10 text-cyan-400" />
            )}
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl text-glow uppercase leading-none">
          {contactSettings?.brandName || t('title')}
        </h1>

        {/* Shiny Divider Line */}
        <div className="mt-4 h-[2px] bg-gradient-to-r from-cyan-400 to-pink-500 w-24"></div>

        {/* Subtitle */}
        <p className="mt-4 text-sm uppercase tracking-[0.2em] font-medium text-slate-300">
          {t('dailyEssentials')}
        </p>

        {/* Loading dots */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce"></div>
          </div>
          <span className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {t('initializing')}
          </span>
        </div>
      </div>
    </main>
  );
}
