import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { Instagram, Facebook, MessageCircle, ArrowUp, Phone } from 'lucide-react';

export default function Footer({ onViewChange }) {
  const { t, language } = useLanguage();
  const { contactSettings } = useData();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur-md py-8 px-4 md:px-8 mt-12 mb-16 md:mb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-bold text-white tracking-wide text-glow">{t('title')}</span>
          <p className="text-xs text-slate-400 text-center md:text-left">
            © 2026 {t('title')}. All rights reserved.
          </p>
        </div>

        {/* Social Medias */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://www.facebook.com/profile.php?id=61563167791316#"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/30 text-slate-300 transition-all cursor-pointer flex items-center justify-center"
            title="Facebook"
            id="footer-facebook-link"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href="https://www.instagram.com/swastik_supermarket.mds"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/30 text-slate-300 transition-all cursor-pointer flex items-center justify-center"
            title="Instagram"
            id="footer-instagram-link"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href={`tel:${(contactSettings?.phone || "+91 94845 40001").replace(/[^0-9]/g, "")}`}
            className="p-2 rounded-full bg-white/5 border border-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/30 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 px-3 py-1.5"
            title="Helpline Support"
            id="footer-phone-link"
          >
            <Phone className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] font-mono font-black tracking-tight text-white">{contactSettings?.phone || "+91 11 2345 6789"}</span>
          </a>
        </div>

        {/* Navigation & Back to Top */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-medium text-slate-300">
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('privacy')}
              className="hover:text-cyan-400 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('privacyPolicy')}
            </button>
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('terms')}
              className="hover:text-cyan-400 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('termsOfService')}
            </button>
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('contact')}
              className="hover:text-cyan-400 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('contactUs')}
            </button>
          </nav>

          <button
            onClick={scrollToTop}
            className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/40 text-cyan-300 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            id="scroll-to-top-footer-btn"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>{language === 'hi' ? 'ऊपर जाएं' : 'Back to Top'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
