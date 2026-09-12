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

  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    phoneNumber: "",
    address: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("card"); // card, upi, cod (disabled)
  const [distance, setDistance] = useState(5.2); // Current selected delivery distance in KM

  const addToCart = (product, selectedUnit, qtyToAdd = 1) => {
    const unit = selectedUnit || product.unit || product.packEn || '1 Unit';
    // Match against dynamic products list to get latest real-time stock
    const dbProduct = products?.find(p => p.id === product.id) || product;
    const maxStock = dbProduct.stockCount !== undefined ? Number(dbProduct.stockCount) : (dbProduct.stock !== undefined ? Number(dbProduct.stock) : 0);

    if (maxStock <= 0) {
      alert(language === 'hi' 
        ? `"${dbProduct.nameHi || dbProduct.nameEn || dbProduct.name}" वर्तमान में स्टॉक में नहीं है!` 
        : `"${dbProduct.nameEn || dbProduct.name}" is currently out of stock!`);
      return false;
    }

    let errorMsg = "";

    setCartItems(prev => {
      // Find if item already exists by matching product.id and the unit size
      const index = prev.findIndex(item => item.product.id === product.id && (item.selectedUnit === unit));
      if (index > -1) {
        const nextQty = prev[index].quantity + qtyToAdd;
        if (nextQty > maxStock) {
          errorMsg = language === 'hi'
            ? `"${dbProduct.nameHi || dbProduct.nameEn || dbProduct.name}" के केवल ${maxStock} पैकेट स्टॉक में उपलब्ध हैं! (कार्ट में पहले से: ${prev[index].quantity})`
            : `Only ${maxStock} units of "${dbProduct.nameEn || dbProduct.name}" are currently available in stock! (You already have ${prev[index].quantity} in cart)`;
          return prev;
        }
        const nextItems = [...prev];
        nextItems[index].quantity = nextQty;
        return nextItems;
      } else {
        if (qtyToAdd > maxStock) {
          errorMsg = language === 'hi'
            ? `"${dbProduct.nameHi || dbProduct.nameEn || dbProduct.name}" के केवल ${maxStock} पैकेट स्टॉक में उपलब्ध हैं!`
            : `Only ${maxStock} units of "${dbProduct.nameEn || dbProduct.name}" are currently available in stock!`;
          return prev;
        }
        return [...prev, { product: dbProduct, quantity: qtyToAdd, selectedUnit: unit }];
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

  const updateQuantity = (id, arg2, arg3) => {
    let unit = undefined;
    let changeVal = 1;

    // Normalizing arguments:
    // Case 1: updateQuantity(id, unitStr, deltaNum)
    if (typeof arg2 === 'string' && typeof arg3 === 'number') {
      unit = arg2;
      changeVal = arg3;
    }
    // Case 2: updateQuantity(id, deltaNum, unitStr) or updateQuantity(id, targetQtyNum, unitStr)
    else if (typeof arg2 === 'number' && typeof arg3 === 'string') {
      changeVal = arg2;
      unit = arg3;
    }
    // Case 3: updateQuantity(id, deltaNum)
    else if (typeof arg2 === 'number' && arg3 === undefined) {
      changeVal = arg2;
    }
    // Case 4: updateQuantity(id, unitStr) -> default +1
    else if (typeof arg2 === 'string' && arg3 === undefined) {
      unit = arg2;
      changeVal = 1;
    }

    const targetItem = cartItems.find(item => item.product.id === id && (unit ? item.selectedUnit === unit : true));
    if (!targetItem) return;

    const dbProduct = products?.find(p => p.id === id) || targetItem.product;
    const maxStock = dbProduct.stockCount !== undefined ? Number(dbProduct.stockCount) : (dbProduct.stock !== undefined ? Number(dbProduct.stock) : 0);

    // If item is completely out of stock, remove it from cart immediately
    if (maxStock <= 0) {
      alert(language === 'hi'
        ? `"${dbProduct.nameHi || dbProduct.nameEn || dbProduct.name}" आउट ऑफ स्टॉक है और इसे कार्ट से हटाया जा रहा है।`
        : `"${dbProduct.nameEn || dbProduct.name}" is out of stock and has been removed from your cart.`);
      removeFromCart(id, unit || targetItem.selectedUnit);
      return;
    }

    // Determine target quantity
    let targetQty;
    if (changeVal === 1 || changeVal === -1) {
      targetQty = targetItem.quantity + changeVal;
    } else if (changeVal === targetItem.quantity + 1 || changeVal === targetItem.quantity - 1) {
      targetQty = changeVal;
    } else if (changeVal === 0) {
      targetQty = 0;
    } else if (changeVal > 0 && Math.abs(changeVal - targetItem.quantity) <= 2) {
      targetQty = changeVal;
    } else {
      targetQty = targetItem.quantity + changeVal;
    }

    if (targetQty <= 0) {
      removeFromCart(id, unit || targetItem.selectedUnit);
      return;
    }

    if (targetQty > maxStock) {
      alert(language === 'hi'
        ? `"${dbProduct.nameHi || dbProduct.nameEn || dbProduct.name}" के केवल ${maxStock} पैकेट स्टॉक में उपलब्ध हैं!`
        : `Only ${maxStock} units of "${dbProduct.nameEn || dbProduct.name}" are currently available in stock!`);
      return;
    }

    setCartItems(prev => {
      return prev.map(item => {
        const idMatches = item.product.id === id;
        const unitMatches = unit ? item.selectedUnit === unit : true;
        if (idMatches && unitMatches) {
          return { ...item, quantity: targetQty };
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

  // Dynamic GST calculation based on item-wise GST rates
  const itemGstTotal = cartItems.reduce((acc, item) => {
    const price = getUnitPrice(item.product, item.selectedUnit);
    const rate = item.product?.gstPercent !== undefined 
      ? Number(item.product.gstPercent) 
      : (item.product?.gst_percent !== undefined ? Number(item.product.gst_percent) : 5);
    const itemTax = (price * (item.quantity || 1) * rate) / 100;
    return acc + itemTax;
  }, 0);
  const gst = Math.round(itemGstTotal * 100) / 100;
  const couponDiscount = (() => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    // Enforce minOrder threshold from coupon settings
    if (appliedCoupon.minOrder && subtotal < Number(appliedCoupon.minOrder)) {
      return 0;
    }
    // Check coupon date validity
    const todayStr = new Date().toISOString().split('T')[0];
    if (appliedCoupon.startDate && todayStr < appliedCoupon.startDate) {
      return 0;
    }
    if (appliedCoupon.endDate && todayStr > appliedCoupon.endDate) {
      return 0;
    }
    if (appliedCoupon.discountType === 'percentage') {
      const pctValue = Math.round((subtotal * (Number(appliedCoupon.value) / 100)) * 100) / 100;
      return pctValue;
    }
    return Math.min(Number(appliedCoupon.value), subtotal);
  })();
  const grandTotal = Math.max(0, Math.round((subtotal + deliveryFee + gst - couponDiscount) * 100) / 100);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
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
