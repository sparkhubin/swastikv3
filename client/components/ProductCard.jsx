import React, { useState } from 'react';
import { ShoppingCart, Check, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { resolveProductImage, getNextCandidateImage, markImageFailed, DEFAULT_PRODUCT_FALLBACK } from '../utils/imageHelper';

export default function ProductCard({ product }) {
  const { language, t } = useLanguage();
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const { r2PublicUrl } = useData();
  const [isAdded, setIsAdded] = useState(false);

  // Fast direct image resolution with immediate fallback on failure
  const [imgSrc, setImgSrc] = useState(() => resolveProductImage(product, r2PublicUrl, 300));

  React.useEffect(() => {
    setImgSrc(resolveProductImage(product, r2PublicUrl, 300));
  }, [product, r2PublicUrl]);

  const handleImageError = () => {
    if (imgSrc && imgSrc !== DEFAULT_PRODUCT_FALLBACK) {
      const next = getNextCandidateImage(product, imgSrc, r2PublicUrl);
      setImgSrc(next || DEFAULT_PRODUCT_FALLBACK);
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
  
  // Resolve brand: only show if brand exists and is not 'general'
  const brandName = (() => {
    const rawBrand = (product.brand && product.brand.trim()) || '';
    if (rawBrand && rawBrand.toLowerCase() !== 'general') return rawBrand;
    const rawSub = (language === 'hi' ? (product.subHi || product.subEn) : product.subEn) || '';
    if (rawSub && rawSub.trim() && rawSub.trim().toLowerCase() !== 'general') {
      return rawSub.trim();
    }
    return '';
  })();

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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:border-emerald-400/60 hover:shadow-lg">
      {/* Product Image Stage */}
      <div className="relative aspect-square overflow-hidden bg-slate-50 border-b border-slate-100">
        <img
          src={imgSrc}
          onError={handleImageError}
          alt={name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isOutOfStock 
              ? 'brightness-90 grayscale' 
              : 'brightness-100'
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Out of Stock Centered overlay label */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]">
            <span className="rounded-xl bg-red-600 px-3.5 py-1.5 text-[10px] font-black tracking-widest text-white uppercase shadow-lg">
              {language === 'hi' ? 'स्टॉक समाप्त' : 'OUT OF STOCK'}
            </span>
          </div>
        )}

        {/* Promo Badge */}
        {product.discount && !isOutOfStock && (
          <div className="absolute top-2 right-2 rounded-lg bg-pink-600 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase shadow-md">
            {product.discount}
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className="flex flex-grow flex-col p-3.5 text-slate-800">
        <div className="flex justify-between items-start gap-1">
          {brandName ? (
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 truncate max-w-[130px]" title={brandName}>
              {brandName}
            </span>
          ) : <span />}
          {/* Subtle real-time stock tag */}
          <span className={`text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
            isOutOfStock 
              ? 'border-red-200 bg-red-50 text-red-600' 
              : isLowStock 
              ? 'border-amber-200 bg-amber-50 text-amber-700 animate-pulse' 
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {isOutOfStock 
              ? (language === 'hi' ? 'अनुपलब्ध' : 'SOLD OUT') 
              : isLowStock 
              ? (language === 'hi' ? `केवल ${stockCount} शेष` : `ONLY ${stockCount} LEFT`) 
              : (language === 'hi' ? 'स्टॉक' : 'IN STOCK')}
          </span>
        </div>
        
        <h4 className="mt-1 font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-slate-800" style={{ minHeight: '2.4rem' }}>
          {name}
        </h4>

        {/* Price & Action Area */}
        <div className="mt-auto pt-2 border-t border-slate-100">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-base sm:text-lg font-black text-slate-900">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            >
              <span>{language === 'hi' ? 'स्टॉक बाहर' : 'OUT OF STOCK'}</span>
            </button>
          ) : cartQty > 0 ? (
            <div className="flex w-full items-center justify-between rounded-xl bg-emerald-50 border border-emerald-300 p-1 text-emerald-800 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  if (cartQty <= 1) {
                    removeFromCart(product.id, selectedUnit);
                  } else {
                    updateQuantity(product.id, selectedUnit, -1);
                  }
                }}
                className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-200 active:scale-90 transition-all cursor-pointer"
                title={language === 'hi' ? 'मात्रा कम करें' : 'Decrease quantity'}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-extrabold text-xs px-2 text-emerald-900 font-mono">{cartQty}</span>
              <button
                type="button"
                disabled={cartQty >= stockCount}
                onClick={() => updateQuantity(product.id, selectedUnit, 1)}
                className={`rounded-lg p-1 transition-all ${
                  cartQty >= stockCount
                    ? 'text-slate-300 cursor-not-allowed opacity-40'
                    : 'text-emerald-700 hover:bg-emerald-200 active:scale-90 cursor-pointer'
                }`}
                title={cartQty >= stockCount ? (language === 'hi' ? 'अधिकतम स्टॉक सीमा तक पहुंच चुके हैं' : 'Maximum stock limit reached') : (language === 'hi' ? 'मात्रा बढ़ाएं' : 'Increase quantity')}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-sm ${
                isAdded
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{language === 'hi' ? 'जोड़ा गया' : 'ADDED'}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>{language === 'hi' ? 'जोड़ें' : 'ADD'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
