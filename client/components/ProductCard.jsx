import React, { useState } from 'react';
import { ShoppingCart, Check, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';

export default function ProductCard({ product }) {
  const { language, t } = useLanguage();
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const { r2PublicUrl } = useData();
  const [isAdded, setIsAdded] = useState(false);

  // Dynamic image resolution with smart sequential multi-extension fallbacks (.png -> .jpg -> .jpeg -> .webp -> product.image -> fallback)
  const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const [attemptIndex, setAttemptIndex] = useState(0);

  const code = product.code || product.Code;
  let imgSrc;
  if (code && r2PublicUrl && attemptIndex < extensions.length) {
    imgSrc = `${r2PublicUrl.replace(/\/$/, '')}/${code}${extensions[attemptIndex]}`;
  } else if (attemptIndex === extensions.length) {
    imgSrc = product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
  } else {
    imgSrc = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
  }

  const handleImageError = () => {
    if (attemptIndex <= extensions.length) {
      setAttemptIndex(prev => prev + 1);
    }
  };

  const packSize = language === 'hi' ? (product.packHi || '') : (product.packEn || '');
  const displayUnit = (() => {
    const raw = (packSize || (product.unit ? product.unit.split(',')[0].trim() : '')).trim();
    if (!raw || ['100gm', '200gm', '500gm', '1kg', '500g', '250g', '100g', '100gm, 200gm, 500gm, 1kg'].includes(raw.toLowerCase())) {
      return '1 Unit';
    }
    return raw;
  })();

  const selectedUnit = displayUnit;

  const cartItem = cartItems?.find(item => item.product.id === product.id && (item.selectedUnit === selectedUnit));
  const cartQty = cartItem ? cartItem.quantity : 0;

  const name = language === 'hi' ? product.nameHi : product.nameEn;
  const categoryTag = language === 'hi' ? product.subHi : product.subEn;

  const stockCount = product.stockCount !== undefined ? product.stockCount : 100;
  const isOutOfStock = stockCount <= 0;
  const isLowStock = stockCount > 0 && stockCount <= 10;

  const getUnitPrice = () => {
    return product.price;
  };

  const handleAdd = () => {
    const ok = addToCart(product, selectedUnit);
    if (ok !== false) {
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
      }, 1500);
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:shadow-cyan-500/5">
      {/* Product Image Stage */}
      <div className="relative aspect-square overflow-hidden bg-white/5 border-b border-white/10">
        <img
          src={imgSrc}
          onError={handleImageError}
          alt={name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 filter ${
            isOutOfStock 
              ? 'brightness-[0.4] grayscale' 
              : 'brightness-95 group-hover:brightness-100'
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Out of Stock Centered overlay label */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-xl bg-red-600/90 border border-red-500/30 px-3.5 py-1.5 text-[10px] font-black tracking-widest text-white uppercase shadow-2xl">
              {language === 'hi' ? 'स्टॉक समाप्त' : 'OUT OF STOCK'}
            </span>
          </div>
        )}

        {/* Promo Badge */}
        {product.discount && !isOutOfStock && (
          <div className="absolute top-2 right-2 rounded-lg bg-pink-500 border border-pink-400/30 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase shadow-lg">
            {product.discount}
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className="flex flex-grow flex-col p-4 text-white">
        <div className="flex justify-between items-start gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">
            {categoryTag}
          </span>
          {/* Subtle real-time stock tag */}
          <span className={`text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
            isOutOfStock 
              ? 'border-red-500/25 bg-red-500/10 text-red-400' 
              : isLowStock 
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse' 
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
          }`}>
            {isOutOfStock 
              ? (language === 'hi' ? 'अनुपलब्ध' : 'SOLD OUT') 
              : isLowStock 
              ? (language === 'hi' ? `केवल ${stockCount} शेष` : `ONLY ${stockCount} LEFT`) 
              : (language === 'hi' ? 'स्टॉक' : 'IN STOCK')}
          </span>
        </div>
        
        <h4 className="mt-1 font-semibold text-sm leading-snug line-clamp-2 text-slate-100" style={{ minHeight: '2.5rem' }}>
          {name}
        </h4>
        
        {/* Single Unit Size Display */}
        <div className="mt-2 mb-2 flex items-center min-h-[26px]">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase mr-2 tracking-wide">
            {language === 'hi' ? 'मात्रा:' : 'Size:'}
          </label>
          <span className="text-xs font-bold text-cyan-300 filter brightness-90 font-mono">
            {displayUnit}
          </span>
        </div>

        {/* Price & Action Area */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-white text-glow">
              ₹{getUnitPrice(selectedUnit)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-slate-400 line-through font-normal">
                ₹{product.originalPrice}
              </span>
            )}
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold bg-red-500/10 text-red-300/60 border border-red-500/20 cursor-not-allowed"
            >
              <span>{language === 'hi' ? 'स्टॉक बाहर' : 'OUT OF STOCK'}</span>
            </button>
          ) : cartQty > 0 ? (
            <div className="mt-3 flex w-full items-center justify-between rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-1 text-emerald-300 shadow-inner">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (cartQty === 1) {
                    removeFromCart(product.id, selectedUnit);
                  } else {
                    updateQuantity(product.id, selectedUnit, -1);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/60 transition-all active:scale-90 font-bold"
                title={language === 'hi' ? 'घटाएं' : 'Decrease'}
              >
                <Minus className="h-3.5 w-3.5 stroke-[3]" />
              </button>
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-black">{t('added')}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-white font-mono text-xs border border-emerald-500/40 font-bold">
                  {cartQty}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, selectedUnit);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/60 transition-all active:scale-90 font-bold"
                title={language === 'hi' ? 'बढ़ाएं' : 'Increase'}
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all duration-300 active:scale-95 border bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/20"
              id={`add-btn-${product.id}`}
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span>{t('addToCart').toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
