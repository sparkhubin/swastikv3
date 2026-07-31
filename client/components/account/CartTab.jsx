import React from 'react';
import { ShoppingCart, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function CartTab({ isHindi, onViewChange }) {
  const { cartItems, removeFromCart, updateQuantity, subtotal, deliveryFee, grandTotal } = useCart();

  const totalItemCount = (cartItems || []).reduce((acc, item) => acc + item.quantity, 0);

  const handleGoToShop = () => {
    if (onViewChange) {
      onViewChange('shop');
    }
  };

  const handleGoToCart = () => {
    if (onViewChange) {
      onViewChange('cart');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900 space-y-6">
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            <span>{isHindi ? "मेरी शॉपिंग कार्ट" : "My Active Shopping Cart"}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-extrabold">
              {totalItemCount} {isHindi ? "आइटम" : "Items"}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isHindi ? "आपकी कार्ट में रखे गए उत्पादों की सूची" : "Review items in your cart before heading to checkout"}
          </p>
        </div>

        {cartItems.length > 0 && (
          <button
            type="button"
            onClick={handleGoToCart}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isHindi ? "चेकआउट पर जाएँ" : "Checkout Now"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-slate-900">{isHindi ? "आपकी कार्ट खाली है!" : "Your Cart is Currently Empty"}</h4>
            <p className="text-xs text-slate-500 max-w-sm font-medium">
              {isHindi ? "ताज़ा फल, सब्जियां, किराना एवं डेयरी उत्पाद खरीदें।" : "Browse our fresh grocery categories and add items to your cart."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoToShop}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
          >
            🛒 {isHindi ? "उत्पाद ब्राउज़ करें" : "Explore Supermarket"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cart items list */}
          <div className="lg:col-span-8 space-y-3">
            {cartItems.map((item, idx) => {
              const p = item.product || {};
              const unit = item.selectedUnit || p.unit || '1 Unit';
              return (
                <div 
                  key={idx}
                  className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4 hover:border-slate-300 transition-all"
                >
                  <img 
                    src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150'} 
                    alt={p.nameEn || p.name}
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0 bg-white" 
                  />

                  <div className="flex-1 min-w-0">
                    <h5 className="font-extrabold text-xs text-slate-900 truncate">{isHindi ? (p.nameHi || p.nameEn || p.name) : (p.nameEn || p.name)}</h5>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">Unit: {unit}</p>
                    <p className="text-xs font-bold text-emerald-800 font-mono mt-1">₹{p.price || 100}</p>
                  </div>

                  {/* Quantity Modifier */}
                  <div className="flex items-center gap-2 bg-white border border-slate-300 px-2.5 py-1 rounded-lg font-mono">
                    <button
                      type="button"
                      onClick={() => updateQuantity(p.id, item.selectedUnit, item.quantity - 1)}
                      className="text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-900 px-1">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(p.id, item.selectedUnit, item.quantity + 1)}
                      className="text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right font-mono font-black text-sm text-slate-900 min-w-[60px]">
                    ₹{(p.price || 100) * item.quantity}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(p.id, item.selectedUnit)}
                    className="text-slate-400 hover:text-rose-600 transition-all p-1.5 cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Cart Summary Card */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between h-fit space-y-4 font-mono">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3 mb-4">
                {isHindi ? "ऑर्डर सारांश" : "Cart Price Breakdown"}
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{isHindi ? "उप-योग (Subtotal)" : "Subtotal"}</span>
                  <span className="font-bold text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{isHindi ? "डिलीवरी शुल्क" : "Delivery Charge"}</span>
                  <span className="font-extrabold text-emerald-700">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>{isHindi ? "कुल देय राशि" : "Grand Total"}</span>
                  <span className="text-emerald-700 text-base">₹{grandTotal}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoToCart}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isHindi ? "चेकआउट पेज पर जाएँ" : "Proceed to Checkout Page"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
