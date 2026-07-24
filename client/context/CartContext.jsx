import React, { createContext, useContext, useState } from 'react';
import { useData } from './DataContext';
import { useLanguage } from './LanguageContext';

const CartContext = createContext();

// Empty cart by default. Items are added only when user explicitly clicks "Add to Cart"
const defaultCartItems = [];

export const CartProvider = ({ children }) => {
  const { products, contactSettings } = useData();
  const { language } = useLanguage();
  const [cartItems, setCartItems] = useState(defaultCartItems);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const couponApplied = !!appliedCoupon;

  const setCouponApplied = (val) => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('swastik_is_logged_in') === 'true';
    if (!isLoggedIn) {
      alert(language === 'hi'
        ? "कूपन कोड लागू करने के लिए कृपया पहले लॉगिन करें!"
        : "Please login first before applying coupons!");
      setAppliedCoupon(null);
      return false;
    }
    if (!val) {
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon({ id: 'super20', code: 'SUPER20', discountType: 'fixed', value: 520, minOrder: 0 });
    }
  };

  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    phoneNumber: "",
    address: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("card"); // card, upi, cod (disabled)
  const [distance, setDistance] = useState(5.2); // Current selected delivery distance in KM

  const addToCart = (product, selectedUnit) => {
    const unit = selectedUnit || product.unit || product.packEn || '1 Unit';
    // Match against dynamic products list to get latest real-time stock
    const dbProduct = products?.find(p => p.id === product.id) || product;
    const maxStock = dbProduct.stockCount !== undefined ? dbProduct.stockCount : 100;

    let errorMsg = "";

    setCartItems(prev => {
      // Find if item already exists by matching product.id and the unit size
      const index = prev.findIndex(item => item.product.id === product.id && (item.selectedUnit === unit));
      if (index > -1) {
        const nextQty = prev[index].quantity + 1;
        if (nextQty > maxStock) {
          errorMsg = `Only ${maxStock} units of "${dbProduct.nameEn}" are currently available in stock!`;
          return prev;
        }
        const nextItems = [...prev];
        nextItems[index].quantity += 1;
        return nextItems;
      } else {
        if (1 > maxStock) {
          errorMsg = `"${dbProduct.nameEn}" is currently out of stock!`;
          return prev;
        }
        return [...prev, { product: dbProduct, quantity: 1, selectedUnit: unit }];
      }
    });

    if (errorMsg) {
      alert(errorMsg);
      return false;
    }
    return true;
  };

  const removeFromCart = (id, selectedUnit) => {
    setCartItems(prev => prev.filter(item => {
      if (selectedUnit) {
        return !(item.product.id === id && item.selectedUnit === selectedUnit);
      }
      return item.product.id !== id;
    }));
  };

  const updateQuantity = (id, selectedUnit, change) => {
    let unit = selectedUnit;
    let qtyChange = change;
    if (typeof selectedUnit === 'number') {
      qtyChange = selectedUnit;
      unit = undefined;
    }

    const targetItem = cartItems.find(item => item.product.id === id && (unit ? item.selectedUnit === unit : true));
    if (!targetItem) return;

    const dbProduct = products?.find(p => p.id === id) || targetItem.product;
    const maxStock = dbProduct.stockCount !== undefined ? dbProduct.stockCount : 100;

    if (qtyChange > 0 && targetItem.quantity + qtyChange > maxStock) {
      alert(`Only ${maxStock} units of "${dbProduct.nameEn}" are currently available in stock!`);
      return;
    }

    setCartItems(prev => {
      return prev.map(item => {
        const idMatches = item.product.id === id;
        const unitMatches = unit ? item.selectedUnit === unit : true;
        if (idMatches && unitMatches) {
          const newQty = item.quantity + qtyChange;
          return { ...item, quantity: newQty > 0 ? newQty : 1 };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getUnitPrice = (product, selectedUnit) => {
    if (!product) return 0;
    if (!selectedUnit || !product.unitPrices) return product.price;
    const parts = product.unitPrices.split(',').map(p => p.trim());
    const matched = parts.find(p => p.toLowerCase().startsWith(selectedUnit.toLowerCase() + ':'));
    if (matched) {
      const priceStr = matched.split(':')[1];
      if (priceStr && !isNaN(Number(priceStr))) {
        return Number(priceStr);
      }
    }
    return product.price;
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (getUnitPrice(item.product, item.selectedUnit) * item.quantity), 0);
  
  // Dynamic Delivery Fee tiers from store settings
  const calculateDeliveryFee = (dist, amt) => {
    if (amt === 0) return 0;
    
    // Dynamic settings from Admin Store configuration
    const freeMinAmount = contactSettings?.freeDeliveryMinAmount !== undefined ? Number(contactSettings.freeDeliveryMinAmount) : 500;
    const chargeNear = contactSettings?.deliveryChargeNear !== undefined ? Number(contactSettings.deliveryChargeNear) : 0;
    const chargeMedium = contactSettings?.deliveryChargeMedium !== undefined ? Number(contactSettings.deliveryChargeMedium) : 25;
    const chargeFar = contactSettings?.deliveryChargeFar !== undefined ? Number(contactSettings.deliveryChargeFar) : 45;
    const chargeOutlier = contactSettings?.deliveryChargeOutlier !== undefined ? Number(contactSettings.deliveryChargeOutlier) : 75;

    // Check if free delivery threshold is met
    if (freeMinAmount > 0 && amt >= freeMinAmount) {
      return 0;
    }

    if (dist < 2.0) return chargeNear;
    if (dist <= 5.0) return chargeMedium;
    if (dist <= 10.0) return chargeFar;
    return chargeOutlier;
  };
  const deliveryFee = calculateDeliveryFee(distance, subtotal);

  const gst = Math.round(subtotal * 0.18 * 100) / 100;
  const couponDiscount = (() => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      const pctValue = Math.round((subtotal * (appliedCoupon.value / 100)) * 100) / 100;
      return pctValue;
    }
    return Math.min(appliedCoupon.value, subtotal);
  })();
  const grandTotal = Math.max(0, Math.round((subtotal + deliveryFee + gst - couponDiscount) * 100) / 100);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      couponApplied,
      setCouponApplied,
      appliedCoupon,
      setAppliedCoupon,
      shippingInfo,
      setShippingInfo,
      paymentMethod,
      setPaymentMethod,
      distance,
      setDistance,
      subtotal,
      deliveryFee,
      gst,
      couponDiscount,
      grandTotal
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
