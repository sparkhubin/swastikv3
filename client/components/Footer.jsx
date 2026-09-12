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
    <footer className="w-full border-t border-slate-200 bg-white py-8 px-4 md:px-8 mt-12 mb-16 md:mb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-extrabold text-slate-900 tracking-wide">{t('title')}</span>
          <p className="text-xs text-slate-500 text-center md:text-left font-medium">
            © 2026 {t('title')}. All rights reserved.
          </p>
        </div>

        {/* Social Medias */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://www.facebook.com/profile.php?id=61563167791316#"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-100 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title="Facebook"
            id="footer-facebook-link"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href="https://www.instagram.com/swastik_supermarket.mds"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-100 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title="Instagram"
            id="footer-instagram-link"
          >
            <Instagram className="h-4 w-4" />
          </a>
          {contactSettings?.phone && <a
            href={`tel:${contactSettings.phone.replace(/[^0-9]/g, "")}`}
            className="p-2 rounded-full bg-slate-100 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 px-3 py-1.5"
            title="Helpline Support"
            id="footer-phone-link"
          >
            <Phone className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-mono font-extrabold tracking-tight text-slate-800">{contactSettings.phone}</span>
          </a>
          }
        </div>

        {/* Navigation & Back to Top */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-600">
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('privacy')}
              className="hover:text-emerald-700 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('privacyPolicy')}
            </button>
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('terms')}
              className="hover:text-emerald-700 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('termsOfService')}
            </button>
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('refund')}
              className="hover:text-emerald-700 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('refundPolicy')}
            </button>
            <button 
              type="button" 
              onClick={() => onViewChange && onViewChange('contact')}
              className="hover:text-emerald-700 hover:underline transition-all cursor-pointer font-bold bg-transparent border-none"
            >
              {t('contactUs')}
            </button>
          </nav>

          <button
            onClick={scrollToTop}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
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
