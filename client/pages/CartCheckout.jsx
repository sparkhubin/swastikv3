import React, { useState, useEffect } from 'react';
import Account from './Account';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { resolveProductImage, getNextCandidateImage, markImageFailed, DEFAULT_PRODUCT_FALLBACK } from '../utils/imageHelper';
import { getCurrentGpsPosition } from '../utils/capacitorHelper';
import { 
  Trash2, 
  MapPin, 
  Ticket, 
  CreditCard, 
  Smartphone, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Truck,
  Maximize,
  Compass,
  Map as MapIcon,
  RefreshCw
} from 'lucide-react';

const API_KEY =
  (typeof process !== 'undefined' && process.env ? process.env.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  import.meta.env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  globalThis.GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const formatTimeSlot = (timeStr) => {
  if (!timeStr) return "";
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parts[0];
  const m = parts[1];
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 || 12;
  const mm = m || '00';
  return `${hour12}:${mm} ${ampm}`;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  let cleanStr = timeStr.trim().toUpperCase();
  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");
  cleanStr = cleanStr.replace("AM", "").replace("PM", "").trim();
  const parts = cleanStr.split(":");
  let hours = parseInt(parts[0], 10) || 0;
  let minutes = parts[1] ? (parseInt(parts[1], 10) || 0) : 0;
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

const getISTTime = () => {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const formatted = formatter.format(now);
    const cleaned = formatted.replace(/[^0-9:]/g, "");
    const parts = cleaned.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return { hours, minutes };
    }
  } catch (e) {
    console.error("Error formatting IST time:", e);
  }
  return { hours: now.getHours(), minutes: now.getMinutes() };
};

const checkTimeInSlot = (startTime, endTime) => {
  if (!startTime || !endTime) return true;
  const { hours, minutes } = getISTTime();
  const currentTotal = hours * 60 + minutes;

  const startTotal = parseTimeToMinutes(startTime);
  const endTotal = parseTimeToMinutes(endTime);

  if (startTotal <= endTotal) {
    return currentTotal >= startTotal && currentTotal <= endTotal;
  } else {
    // Over midnight time slot (e.g. 22:00 to 06:00)
    return currentTotal >= startTotal || currentTotal <= endTotal;
  }
};

const CartItemImage = ({ product, r2PublicUrl, className }) => {
  const [imgSrc, setImgSrc] = React.useState(() => resolveProductImage(product, r2PublicUrl, 200));

  React.useEffect(() => {
    setImgSrc(resolveProductImage(product, r2PublicUrl, 200));
  }, [product, r2PublicUrl]);

  const handleImageError = () => {
    if (imgSrc && imgSrc !== DEFAULT_PRODUCT_FALLBACK) {
      const next = getNextCandidateImage(product, imgSrc, r2PublicUrl);
      setImgSrc(next || DEFAULT_PRODUCT_FALLBACK);
    }
  };

  return (
    <img 
      src={imgSrc} 
      onError={handleImageError} 
      alt={product?.nameEn} 
      loading="lazy"
      decoding="async"
      className={className}
      referrerPolicy="no-referrer"
    />
  );
};

export default function CartCheckout({ onViewChange }) {
  const { t, language, isHindi } = useLanguage();
  const { customer: authenticatedCustomer, loginCustomer, acceptCustomerSession, logoutCustomer } = useAuth();
  const { orders, addOrder, offers, contactSettings, products, setProducts, referralSettings, locationGroups, celebrationSettings, customers, addCustomer, upsertCustomer, updateCustomer, r2PublicUrl, paymentEnabled, paymentEnvironment, fetchProducts, fetchOrders, fetchCustomers } = useData();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const {
    cartItems,
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
    deliveryFee: originalDeliveryFee,
    gst,
    couponDiscount,
    grandTotal
  } = useCart();

  const [customerEmail, setCustomerEmail] = useState('');

  // --- DYNAMIC PAYMENT GATEWAY CONFIGURATION & RAZORPAY STATES ---
  const [gatewaySettings, setGatewaySettings] = useState({
    activeGateway: 'RAZORPAY',
    razorpayEnabled: true,
    razorpayKeyId: '',
    cashfreeEnabled: true,
    environment: 'TEST'
  });

  const ensureRazorpayLoaded = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      if (typeof window !== 'undefined') {
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(true));
          existingScript.addEventListener('error', () => resolve(false));
          setTimeout(() => resolve(Boolean(window.Razorpay)), 1500);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      } else {
        resolve(false);
      }
    });
  };

  const ensureCashfreeLoaded = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Cashfree) {
        resolve(true);
        return;
      }
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      const source = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      const existingScript = document.querySelector(`script[src="${source}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
        setTimeout(() => resolve(Boolean(window.Cashfree)), 1500);
        return;
      }
      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fetch backend gateway configurations dynamically & inject Razorpay JS SDK
  useEffect(() => {
    fetch('/api/config')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setGatewaySettings({
          activeGateway: data.activeGateway || 'RAZORPAY',
          razorpayEnabled: data.razorpayEnabled !== false,
          razorpayKeyId: data.razorpayKeyId || '',
          cashfreeEnabled: data.enabled !== false,
          environment: data.environment || 'TEST'
        });
        if (data.activeGateway === 'RAZORPAY' && data.razorpayEnabled !== false) {
          setPaymentMethod('razorpay');
        } else if (data.activeGateway === 'CASHFREE' && data.enabled !== false) {
          setPaymentMethod('cashfree');
        }
      })
      .catch(e => console.warn("Could not load dynamic gateway settings:", e));

    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // --- LOYALTY SAVINGS HOOKS & CALCULATIONS ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState(null);

  // Customer identity is restored centrally from the validated server session.
  useEffect(() => {
    if (!authenticatedCustomer) {
      setProfile(null);
      setIsLoggedIn(false);
      return;
    }
    const customer = authenticatedCustomer;
    setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus });
    setIsLoggedIn(true);
  }, [authenticatedCustomer]);

  // --- FREE LIVE GPS GEOLOCATION & FREE OPENSTREETMAP REVERSE GEOCODING ---
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [liveGpsCoords, setLiveGpsCoords] = useState(null);

  const handleDetectLiveGpsLocation = async () => {
    setIsDetectingGps(true);
    try {
      const position = await getCurrentGpsPosition();
      const lat = position.lat;
      const lng = position.lng;
      setLiveGpsCoords({ lat, lng });

      try {
        // Free reverse geocoding via OpenStreetMap (Nominatim API - 100% Free, No Key Needed)
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          setShippingInfo(prev => ({
            ...prev,
            address: data.display_name,
            latitude: lat,
            longitude: lng
          }));
        } else {
          setShippingInfo(prev => ({
            ...prev,
            address: `GPS Pin: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E (Detected via GPS)`,
            latitude: lat,
            longitude: lng
          }));
        }
      } catch (err) {
        setShippingInfo(prev => ({
          ...prev,
          address: `GPS Pin: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`,
          latitude: lat,
          longitude: lng
        }));
      }
    } catch (err) {
      console.warn("GPS Detection error:", err.message);
      alert(language === 'hi'
        ? "GPS लोकेशन प्राप्त नहीं हो सकी। कृपया लोकेशन की अनुमति (Allow Location) दें या अपना पता नीचे टाइप करें।"
        : "Could not retrieve GPS location. Please allow location access or enter address manually below.");
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Pre-fill shipping information automatically when user logs in
  useEffect(() => {
    if (isLoggedIn && profile) {
      setShippingInfo(prev => ({
        ...prev,
        fullName: prev.fullName || profile.fullName || '',
        phoneNumber: prev.phoneNumber || profile.phone || profile.mobile || ''
      }));
      if (profile.email) {
        setCustomerEmail(profile.email);
      }
    }
  }, [isLoggedIn, profile, setShippingInfo]);

  // --- CHECKOUT AUTH GATE LOCAL STATES ---
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [authMobile, setAuthMobile] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authReferralCode, setAuthReferralCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authGateError, setAuthGateError] = useState('');
  const [authGateSuccess, setAuthGateSuccess] = useState('');

  const handleSendCheckoutOtp = async () => {
    if (!authMobile || authMobile.length < 10) {
      setAuthGateError(language === 'hi' ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    setAuthGateError('');
    setAuthOtp('');
    setIsOtpSent(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: authMobile })
      });
      if (res.ok) {
        setAuthGateSuccess(language === 'hi' 
          ? "सुरक्षा ओटीपी कोड आपके व्हाट्सएप नंबर पर भेज दिया गया है।" 
          : "Security OTP code has been dispatched to your WhatsApp number."
        );
      } else {
        setAuthGateError(language === 'hi' ? "ओटीपी भेजने में असमर्थ। कृपया पुनः प्रयास करें।" : "Unable to dispatch OTP. Please check number and retry.");
      }
    } catch (e) {
      setAuthGateError(language === 'hi' ? "ओटीपी सेवा उपलब्ध नहीं है।" : "OTP delivery service is unavailable.");
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthGateError('');
    setAuthGateSuccess('');

    if (!authMobile || authMobile.length < 10) {
      setAuthGateError(language === 'hi' ? "कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें।" : "Please enter your 10-digit mobile number.");
      return;
    }
    if (!authOtp) {
      setAuthGateError(language === 'hi' ? "कृपया 6 अंकों का ओटीपी कोड दर्ज करें।" : "Please enter the 6-digit OTP code.");
      return;
    }
    const cleanAuthOtp = (authOtp || '').trim();
    if (!cleanAuthOtp) {
      setAuthGateError(language === 'hi' ? "कृपया 6 अंकों का ओटीपी कोड दर्ज करें।" : "Please enter the 6-digit OTP code.");
      return;
    }
    
    let isOtpValid = false;
    try {
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: authMobile, code: cleanAuthOtp })
      });
      const verifyData = await verifyRes.json();
      isOtpValid = verifyRes.ok && verifyData.status === 'verified';
    } catch (err) {
      setAuthGateError(language === 'hi' ? "ओटीपी सत्यापन सेवा उपलब्ध नहीं है।" : "OTP verification service is unavailable.");
      return;
    }

    if (!isOtpValid) {
      setAuthGateError(language === 'hi' ? "अमान्य ओटीपी कोड! कृपया सही ओटीपी दर्ज करें।" : "Invalid OTP code! Please enter the correct OTP sent to your WhatsApp.");
      return;
    }
    if (resetNewPassword.length < 10 || resetNewPassword !== resetConfirmPassword) {
      setAuthGateError(language === 'hi' ? 'पासवर्ड कम से कम 10 अक्षर का हो और पुष्टि से मेल खाए।' : 'Password must be at least 10 characters and match confirmation.');
      return;
    }
    const passwordResponse = await fetch('/api/auth/customer/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: resetNewPassword }) });
    const passwordResult = await passwordResponse.json().catch(() => ({}));
    if (!passwordResponse.ok) { setAuthGateError(passwordResult.error || 'Password reset failed.'); return; }
    setAuthGateSuccess(language === 'hi' ? 'पासवर्ड सफलतापूर्वक रीसेट हुआ।' : 'Password reset successfully.');
    setAuthMode('login');
  };

  const handleCheckoutLogin = async (e) => {
    e.preventDefault();
    setAuthGateError('');
    setAuthGateSuccess('');

    if (!authMobile || authMobile.length < 10) {
      setAuthGateError(language === 'hi' ? "कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें।" : "Please enter your 10-digit mobile number.");
      return;
    }

    if (!authPassword || !authPassword.trim()) {
      setAuthGateError(language === 'hi' ? "कृपया अपना खाता पासवर्ड दर्ज करें।" : "Please enter your account password.");
      return;
    }

    try {
      const customer = await loginCustomer(authMobile, authPassword);
      const loggedInProfile = { id: customer.id, fullName: customer.name, email: customer.email || '', phone: customer.phone, address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus };
      setIsLoggedIn(true); setProfile(loggedInProfile);
      setShippingInfo({ fullName: loggedInProfile.fullName, phoneNumber: loggedInProfile.phone, address: loggedInProfile.address });
      setCustomerEmail(loggedInProfile.email);
      setAuthGateSuccess(language === 'hi' ? 'लॉगिन सफल।' : 'Login successful.');
    } catch (error) { setAuthGateError(error.message); }
  };

  const handleCheckoutSignup = async (e) => {
    e.preventDefault();
    setAuthGateError('');
    setAuthGateSuccess('');

    if (!authFullName.trim()) {
      setAuthGateError(language === 'hi' ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }
    if (!authMobile || authMobile.length < 10) {
      setAuthGateError(language === 'hi' ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!authPassword) {
      setAuthGateError(language === 'hi' ? "कृपया एक पासवर्ड बनाएं।" : "Please create a password.");
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthGateError(language === 'hi' ? "पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!" : "Password and Confirm Password do not match!");
      return;
    }

    if (!authOtp) { setAuthGateError(language === 'hi' ? 'ओटीपी आवश्यक है।' : 'Verify the OTP before sign-up.'); return; }
    try {
      const verify = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: authMobile, code: authOtp }) });
      const verified = await verify.json().catch(() => ({}));
      if (!verify.ok || !verified.registrationRequired) throw new Error(verified.error || 'Phone verification failed.');
      const response = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: authFullName.trim(), phone: authMobile, email: authEmail.trim(), password: authPassword, referralCode: authReferralCode.trim() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.customer) throw new Error(data.error || 'Account creation failed.');
      const customer = data.customer;
      acceptCustomerSession(customer);
      const newProfile = { id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus };
      setIsLoggedIn(true); setProfile(newProfile); setShippingInfo({ fullName: newProfile.fullName, phoneNumber: newProfile.phone, address: newProfile.address }); setCustomerEmail(newProfile.email);
      setAuthGateSuccess(language === 'hi' ? 'खाता सफलतापूर्वक तैयार हुआ।' : 'Account created successfully.');
    } catch (error) { setAuthGateError(error.message); }
  };

  // Force default to COD only if all payment gateways are dynamically disabled
  useEffect(() => {
    const hasOnline = gatewaySettings?.razorpayEnabled || gatewaySettings?.cashfreeEnabled || paymentEnabled;
    if (!hasOnline && paymentMethod !== 'cod') {
      setPaymentMethod('cod');
    }
  }, [paymentEnabled, gatewaySettings?.razorpayEnabled, gatewaySettings?.cashfreeEnabled, paymentMethod, setPaymentMethod]);

  const [redeemPointsChecked, setRedeemPointsChecked] = useState(false);
  const [appliedPoints, setAppliedPoints] = useState(0);

  const pointsRateInINR = Number(referralSettings?.pointsValueInINR || 0);
  const userPointsAvailable = isLoggedIn && profile ? (profile.points || 0) : 0;
  const minPointsRedeem = Number(referralSettings?.minPointsRedeem || 0);
  const maxPointsRedeem = Number(referralSettings?.maxPointsRedeem || 0);

  // Custom Location Groups Overrides
  const [selectedLocationGroupId, setSelectedLocationGroupId] = useState("");
  const [selectedSubLocation, setSelectedSubLocation] = useState("");
  const selectedLocationGroup = locationGroups ? locationGroups.find(g => String(g.id) === String(selectedLocationGroupId)) : null;
  const profilePhoneDigits = (profile?.phone || profile?.mobile || '').replace(/\D/g, '').slice(-10);
  const databaseCust = (customers || []).find(c => {
    if (profile?.id && Number(c.id) === Number(profile.id)) return true;
    const cPhoneDigits = (c.phone || c.mobile || '').replace(/\D/g, '').slice(-10);
    if (profilePhoneDigits && cPhoneDigits && cPhoneDigits === profilePhoneDigits) return true;
    if (profile?.email && c.email && c.email.toLowerCase().trim() === profile.email.toLowerCase().trim()) return true;
    return false;
  });
  const isPrime = (databaseCust?.membershipStatus || profile?.membershipStatus) === 'Active';

  const minFreeDeliveryAmount = selectedLocationGroup 
    ? (selectedLocationGroup.minFreeDeliveryAmount !== undefined ? Number(selectedLocationGroup.minFreeDeliveryAmount) : 499)
    : 499;
  const isFreeDeliveryApplied = selectedLocationGroup && (subtotal >= minFreeDeliveryAmount);

  const computedDeliveryFee = selectedLocationGroup 
    ? (isFreeDeliveryApplied ? 0 : (isPrime ? selectedLocationGroup.primeDelivery : selectedLocationGroup.normalDelivery))
    : 0;

  const deliveryFee = selectedLocationGroup ? computedDeliveryFee : 0;
  const pointsDiscountValue = appliedPoints * pointsRateInINR;

  // --- Automatic Birthday and Anniversary discount calculation ---
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  let isBirthdayToday = false;
  let isAnniversaryToday = false;

  if (isLoggedIn && profile) {
    if (profile.dob) {
      const dobDate = new Date(profile.dob);
      if (!isNaN(dobDate.getTime())) {
        isBirthdayToday = (dobDate.getMonth() + 1) === todayMonth && dobDate.getDate() === todayDay;
      }
    }
    if (profile.anniversary) {
      const annivDate = new Date(profile.anniversary);
      if (!isNaN(annivDate.getTime())) {
        isAnniversaryToday = (annivDate.getMonth() + 1) === todayMonth && annivDate.getDate() === todayDay;
      }
    }
  }

  let celebrationDiscountValue = 0;
  let appliedCelebrationOfferName = "";
  let birthdayEligible = false;
  let anniversaryEligible = false;

  const cSettings = celebrationSettings || {
    birthdayDiscountPercent: 15,
    birthdayMinAmount: 300,
    birthdayOfferDetails: "Birthday special! Enjoy flat 15% discount on your special day.",
    birthdayOfferDetailsHi: "जन्मदिन विशेष! अपने खास दिन पर फ्लैट 15% की छूट का आनंद लें।",
    anniversaryDiscountPercent: 20,
    anniversaryMinAmount: 500,
    anniversaryOfferDetails: "Anniversary Celebration! Get a flat 20% discount on your special day.",
    anniversaryOfferDetailsHi: "सालगिरह मुबारक! अपने खास दिन पर फ्लैट 20% की छूट पाएं।"
  };

  const bPercent = Number(cSettings.birthdayDiscountPercent || 0);
  const bMin = Number(cSettings.birthdayMinAmount || 0);
  const aPercent = Number(cSettings.anniversaryDiscountPercent || 0);
  const aMin = Number(cSettings.anniversaryMinAmount || 0);

  if (isBirthdayToday && subtotal >= bMin) {
    birthdayEligible = true;
  }
  if (isAnniversaryToday && subtotal >= aMin) {
    anniversaryEligible = true;
  }

  if (birthdayEligible && anniversaryEligible) {
    if (bPercent >= aPercent) {
      celebrationDiscountValue = Math.round((subtotal * (bPercent / 100)) * 100) / 100;
      appliedCelebrationOfferName = language === 'hi' ? cSettings.birthdayOfferDetailsHi : cSettings.birthdayOfferDetails;
    } else {
      celebrationDiscountValue = Math.round((subtotal * (aPercent / 100)) * 100) / 100;
      appliedCelebrationOfferName = language === 'hi' ? cSettings.anniversaryOfferDetailsHi : cSettings.anniversaryOfferDetails;
    }
  } else if (birthdayEligible) {
    celebrationDiscountValue = Math.round((subtotal * (bPercent / 100)) * 100) / 100;
    appliedCelebrationOfferName = language === 'hi' ? cSettings.birthdayOfferDetailsHi : cSettings.birthdayOfferDetails;
  } else if (anniversaryEligible) {
    celebrationDiscountValue = Math.round((subtotal * (aPercent / 100)) * 100) / 100;
    appliedCelebrationOfferName = language === 'hi' ? cSettings.anniversaryOfferDetailsHi : cSettings.anniversaryOfferDetails;
  }

  const finalGrandTotal = Math.max(0, Math.round((subtotal + deliveryFee + gst - couponDiscount - pointsDiscountValue - celebrationDiscountValue) * 100) / 100);

  const handleToggleRedeemPoints = (checked) => {
    if (!isLoggedIn || !profile) {
      alert(language === 'hi' ? "रेफ़रल पॉइंट्स रिडीम करने के लिए कृपया पहले अपने अकाउंट में लॉगिन करें!" : "Please login first to redeem your award referral points!");
      setRedeemPointsChecked(false);
      return;
    }
    
    if (checked) {
      if (userPointsAvailable < minPointsRedeem) {
        alert(language === 'hi' 
          ? `न्यूनतम रिडम्पशन सीमा ${minPointsRedeem} पॉइंट्स है। आपके पास केवल ${userPointsAvailable} पॉइंट्स हैं!` 
          : `Minimum redemption limit of ${minPointsRedeem} points is required. You only have ${userPointsAvailable} points!`);
        setRedeemPointsChecked(false);
        return;
      }
      
      let pointsToRedeem = Math.min(userPointsAvailable, maxPointsRedeem);
      const pointsDiscount = pointsToRedeem * pointsRateInINR;
      if (pointsDiscount > grandTotal) {
        pointsToRedeem = Math.floor(grandTotal / pointsRateInINR);
      }
      
      setAppliedPoints(pointsToRedeem);
      setRedeemPointsChecked(true);
    } else {
      setAppliedPoints(0);
      setRedeemPointsChecked(false);
    }
  };

  const storeLat = contactSettings?.latitude !== undefined ? contactSettings.latitude : 28.5708;
  const storeLng = contactSettings?.longitude !== undefined ? contactSettings.longitude : 77.3259;

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

  const [couponCodeField, setCouponCodeField] = useState('');
  const [couponError, setCouponError] = useState('');
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const [acceptReturns, setAcceptReturns] = useState(false);


  // Helper to check date validity of a coupon
  const getCouponDateStatus = (coupon) => {
    if (!coupon) return { isValid: true };
    const todayStr = new Date().toISOString().split('T')[0];

    if (coupon.startDate && todayStr < coupon.startDate) {
      return {
        isValid: false,
        isUpcoming: true,
        reasonEn: `This coupon code is valid starting from ${coupon.startDate}!`,
        reasonHi: `यह कूपन कोड ${coupon.startDate} से ही मान्य होगा!`
      };
    }

    if (coupon.endDate && todayStr > coupon.endDate) {
      return {
        isValid: false,
        isExpired: true,
        reasonEn: `This coupon code expired on ${coupon.endDate}!`,
        reasonHi: `यह कूपन कोड ${coupon.endDate} को समाप्त हो चुका है!`
      };
    }

    return { isValid: true };
  };

  // Helper to count how many times current customer used a coupon code
  const getCustomerCouponUsageCount = (couponCode) => {
    if (!couponCode || !orders || orders.length === 0) return 0;
    const targetCode = couponCode.toUpperCase().trim();

    const userPhoneDigits = (profile?.phone || shippingInfo?.phone || "").replace(/[^0-9]/g, "");
    const userEmail = (profile?.email || customerEmail || "").toLowerCase().trim();

    let count = 0;
    orders.forEach(o => {
      const oCode = (o.couponCode || "").toUpperCase().trim();
      if (oCode === targetCode) {
        const orderPhoneDigits = (o.customerPhone || o.phone || "").replace(/[^0-9]/g, "");
        const orderEmail = (o.customerEmail || o.email || "").toLowerCase().trim();

        const phoneMatch = userPhoneDigits && orderPhoneDigits && (userPhoneDigits === orderPhoneDigits || userPhoneDigits.endsWith(orderPhoneDigits.slice(-10)) || orderPhoneDigits.endsWith(userPhoneDigits.slice(-10)));
        const emailMatch = userEmail && orderEmail && (userEmail === orderEmail);

        if (phoneMatch || emailMatch) {
          count++;
        }
      }
    });

    return count;
  };

  // Helper to check per-customer usage limit
  const checkCouponCustomerLimit = (coupon) => {
    if (!coupon || coupon.maxUsesPerCustomer === undefined || coupon.maxUsesPerCustomer === null || Number(coupon.maxUsesPerCustomer) <= 0) {
      return { isLimitReached: false, usedCount: 0, maxLimit: 0 };
    }
    const maxLimit = Number(coupon.maxUsesPerCustomer);
    const usedCount = getCustomerCouponUsageCount(coupon.code);
    if (usedCount >= maxLimit) {
      return {
        isLimitReached: true,
        usedCount,
        maxLimit,
        reasonEn: `You have reached the maximum limit of ${maxLimit} use(s) for this coupon! (Used ${usedCount}/${maxLimit})`,
        reasonHi: `आप इस कूपन की अधिकतम ${maxLimit} उपयोग सीमा तक पहुँच चुके हैं! (${usedCount}/${maxLimit} प्रयुक्त)`
      };
    }
    return { isLimitReached: false, usedCount, maxLimit };
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCodeField.trim().toUpperCase();
    if (code === '') {
      setAppliedCoupon(null);
      return;
    }

    const matchedCoupon = offers?.find(o => o.code.toUpperCase() === code);
    if (matchedCoupon) {
      if (matchedCoupon.minOrder && subtotal < matchedCoupon.minOrder) {
        const needsMore = matchedCoupon.minOrder - subtotal;
        const msg = language === 'hi' 
          ? `कूपन '${matchedCoupon.code}' लागू करने के लिए कार्ट में ₹${needsMore} का सामान और जोड़ें! (न्यूनतम ₹${matchedCoupon.minOrder})` 
          : `Add items worth ₹${needsMore} more to unlock '${matchedCoupon.code}'! (Min Order: ₹${matchedCoupon.minOrder})`;
        setCouponError(msg);
        return;
      }

      // Check date validity
      const dateStatus = getCouponDateStatus(matchedCoupon);
      if (!dateStatus.isValid) {
        const msg = language === 'hi' ? dateStatus.reasonHi : dateStatus.reasonEn;
        setCouponError(msg);
        return;
      }

      // Check customer usage limit
      const limitStatus = checkCouponCustomerLimit(matchedCoupon);
      if (limitStatus.isLimitReached) {
        const msg = language === 'hi' ? limitStatus.reasonHi : limitStatus.reasonEn;
        setCouponError(msg);
        return;
      }

      setAppliedCoupon(matchedCoupon);
      setCouponError('');
    } else {
      const msg = language === 'hi' 
        ? 'अमान्य कूपन कोड! कृपया वैध कूपन कोड दर्ज करें।' 
        : 'Invalid Coupon Code! Please check and try again.';
      setCouponError(msg);
    }
  };

  const handleSuccessfulCheckout = async () => {
    const [profileResponse, productsResponse] = await Promise.all([
      fetch('/api/auth/customer/me'),
      fetch('/api/products')
    ]);
    if (profileResponse.ok) {
      const { customer } = await profileResponse.json();
      setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus });
    }
    if (productsResponse.ok && typeof setProducts === 'function') {
      setProducts(await productsResponse.json());
    }
  };

  const handlePlaceOrder = async () => {
    // MANDATORY AUTHENTICATION CHECK BEFORE PLACING ORDER
    if (!isLoggedIn) {
      const msg = language === 'hi' 
        ? "ऑर्डर देने के लिए कृपया पहले अपने खाते में लॉगिन या नया खाता साइन-अप करें!" 
        : "Mandatory: Please log in or sign up for an account before placing your order!";
      alert(msg);
      setCheckoutError(msg);
      const authBox = document.getElementById('checkout-auth-gate');
      if (authBox) authBox.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!selectedLocationGroupId) {
      const msg = language === 'hi' 
        ? "कृपया आगे बढ़ने से पहले अपनी डेलिवरी लोकेशन (स्थान समूह) का चयन करें! यह अनिवार्य है।" 
        : "Please select your Delivery Location (Sector/Sub-location) before proceeding! This is mandatory.";
      alert(msg);
      setCheckoutError(msg);
      return;
    }

    if (selectedLocationGroup) {
      const startTime = selectedLocationGroup.deliveryStartTime || "09:00";
      const endTime = selectedLocationGroup.deliveryEndTime || "21:00";
      const isTimeActive = checkTimeInSlot(startTime, endTime);
      if (!isTimeActive) {
        const msg = language === 'hi'
          ? `चयनित स्थान समूह ("${selectedLocationGroup.name}") इस समय डिलीवरी स्वीकार नहीं कर रहा है। केवल ${formatTimeSlot(startTime)} से ${formatTimeSlot(endTime)} के बीच डिलीवरी संभव है।`
          : `Selected location group ("${selectedLocationGroup.name}") is currently offline for deliveries. Courier dispatch is only available between ${formatTimeSlot(startTime)} and ${formatTimeSlot(endTime)}.`;
        alert(msg);
        setCheckoutError(msg);
        return;
      }
    }

    const subLocationsList = selectedLocationGroup && selectedLocationGroup.locations
      ? selectedLocationGroup.locations.split(',').map(l => l.trim()).filter(Boolean)
      : [];

    if (subLocationsList.length > 0 && !selectedSubLocation) {
      const msg = language === 'hi'
        ? "कृपया आगे बढ़ने से पहले अपने विशेष स्थान / सेक्टर का चयन करें!"
        : "Please select your precise Sector / Sub-location from the list before proceeding!";
      alert(msg);
      setCheckoutError(msg);
      return;
    }

    if (!shippingInfo.fullName || !shippingInfo.fullName.trim()) {
      const msg = language === 'hi'
        ? "कृपया अपना नाम दर्ज करें!"
        : "Please enter your full name!";
      alert(msg);
      setCheckoutError(msg);
      return;
    }

    if (!shippingInfo.phoneNumber || !shippingInfo.phoneNumber.trim()) {
      const msg = language === 'hi'
        ? "कृपया अपना मोबाइल नंबर दर्ज करें!"
        : "Please enter your mobile phone number!";
      alert(msg);
      setCheckoutError(msg);
      return;
    }

    if (!shippingInfo.address || !shippingInfo.address.trim()) {
      const msg = language === 'hi'
        ? "कृपया अपना पूरा डिलीवरी पता (मकान नंबर, गली/मोहल्ला, लैंडमार्क) दर्ज करें! डिलीवरी पता अनिवार्य है।"
        : "Please enter your complete delivery address (House No, Street/Locality, Landmark)! Delivery address is mandatory.";
      alert(msg);
      setCheckoutError(msg);
      return;
    }

    if (cartItems.length === 0) {
      alert(language === 'hi' ? 'आपकी कार्ट खाली है!' : 'Your cart is empty!');
      return;
    }

    // Verify each cart item against dynamic products inventory stock counts
    for (const item of cartItems) {
      const dbProduct = products?.find(p => p.id === item.product.id) || item.product;
      const maxStock = dbProduct.stockCount !== undefined ? Number(dbProduct.stockCount) : (dbProduct.stock !== undefined ? Number(dbProduct.stock) : 0);
      const prodName = language === 'hi' ? (dbProduct.nameHi || dbProduct.nameEn || dbProduct.name) : (dbProduct.nameEn || dbProduct.name);

      if (maxStock <= 0) {
        const msg = language === 'hi'
          ? `"${prodName}" वर्तमान में आउट ऑफ स्टॉक है! कृपया ऑर्डर देने से पहले इसे अपनी कार्ट से हटाएं।`
          : `"${prodName}" is currently out of stock! Please remove it from your cart before placing your order.`;
        alert(msg);
        setCheckoutError(msg);
        return;
      }

      if (item.quantity > maxStock) {
        const msg = language === 'hi'
          ? `पर्याप्त स्टॉक नहीं है! "${prodName}" के केवल ${maxStock} पैकेट स्टॉक में उपलब्ध हैं, लेकिन आपने ${item.quantity} का अनुरोध किया है।`
          : `Insufficient stock! Only ${maxStock} units of "${prodName}" are available, but you requested ${item.quantity}.`;
        alert(msg);
        setCheckoutError(msg);
        return;
      }
    }

    // Re-verify applied coupon before placing order
    if (appliedCoupon) {
      if (appliedCoupon.minOrder && subtotal < Number(appliedCoupon.minOrder)) {
        const msg = language === 'hi'
          ? `कूपन '${appliedCoupon.code}' के लिए न्यूनतम ₹${appliedCoupon.minOrder} का ऑर्डर आवश्यक है!`
          : `Coupon '${appliedCoupon.code}' requires a minimum order of ₹${appliedCoupon.minOrder}!`;
        alert(msg);
        setCheckoutError(msg);
        return;
      }
      const dateStatus = getCouponDateStatus(appliedCoupon);
      if (!dateStatus.isValid) {
        const msg = language === 'hi' ? dateStatus.reasonHi : dateStatus.reasonEn;
        alert(msg);
        setCheckoutError(msg);
        return;
      }
      const limitStatus = checkCouponCustomerLimit(appliedCoupon);
      if (limitStatus.isLimitReached) {
        const msg = language === 'hi' ? limitStatus.reasonHi : limitStatus.reasonEn;
        alert(msg);
        setCheckoutError(msg);
        return;
      }
    }

    // Payment method checks
    const isOnlineRzp = paymentMethod === 'razorpay';
    const isOnlineCF = paymentMethod === 'cashfree';
    const isOnline = isOnlineRzp || isOnlineCF;

    setIsPlacing(true);
    setCheckoutError('');

    const orderId = "SW-" + Math.floor(1000 + Math.random() * 9000);
    const effectiveUserId = (databaseCust && databaseCust.id) || (profile && profile.id) || null;
    const finalCustName = shippingInfo.fullName || (databaseCust && databaseCust.name) || profile?.fullName || profile?.name || "Customer";
    const finalCustPhone = shippingInfo.phoneNumber || (databaseCust && databaseCust.phone) || profile?.phone || profile?.mobile || "";
    const newOrder = {
      id: orderId,
      userId: effectiveUserId,
      customerId: effectiveUserId,
      orderDate: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: isOnline ? "Pending Payment" : "Confirmed",
      paymentStatus: isOnline ? "PENDING" : "UNPAID",
      paymentMethod: isOnlineRzp ? "RAZORPAY_ONLINE" : (isOnlineCF ? "CASHFREE_ONLINE" : "COD"),
      isActive: true,
      step: 0,
      subtotal: Number(subtotal),
      deliveryFee: Number(deliveryFee),
      gst: Number(gst),
      referralDiscount: Number(pointsDiscountValue),
      appliedPoints: Number(appliedPoints),
      couponDiscount: Number(couponDiscount),
      couponCode: appliedCoupon ? appliedCoupon.code : "",
      celebrationDiscount: Number(celebrationDiscountValue),
      celebrationOfferName: appliedCelebrationOfferName,
      total: Number(finalGrandTotal),
      locationGroupId: selectedLocationGroup?.id || null,
      shippingAddress: `[${selectedLocationGroup?.name || ''}${selectedSubLocation ? ` - ${selectedSubLocation}` : ''}] ${shippingInfo.address}`.trim(),
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      customerEmail: customerEmail || profile?.email || "",
      items: cartItems.map(item => ({
        productId: Number(item.product.id),
        nameEn: item.product.nameEn,
        nameHi: item.product.nameHi,
        price: Number(getUnitPrice(item.product, item.selectedUnit)),
        qty: Number(item.quantity),
        weight: item.selectedUnit || (language === 'hi' ? (item.product.packHi || "100gm") : (item.product.packEn || "100gm")),
        gstPercent: item.product?.gstPercent !== undefined ? Number(item.product.gstPercent) : (item.product?.gst_percent !== undefined ? Number(item.product.gst_percent) : 0)
      }))
    };

    if (paymentMethod === 'cod') {
      // 🥇 Process Cash on Delivery order directly
      const res = await addOrder(newOrder);
      setIsPlacing(false);

      if (res && res.success === false) {
        const errText = language === 'hi' ? (res.errorHi || res.error) : res.error;
        setCheckoutError(errText);
        return;
      }
      
      // Deduct used loyalty points & add automatic referral bonus instantly
      handleSuccessfulCheckout();
      
      setShowOrderSuccess(true);
      setSuccessInfo(
        language === 'hi' 
          ? `शानदार! आपका नगद भुगतान ऑर्डर तैयार है। ₹${finalGrandTotal} का भुगतान डिलीवरी के समय नगद/UPI द्वारा करें। स्वास्तिक डिलीवरी प्रतिनिधि शीघ्र ही पहुंचेगा!`
          : `Success! Your Cash on Delivery order of ₹${finalGrandTotal} is confirmed. Please pay at your doorstep. Safe delivery team dispatched!`
      );
    } else if (isOnlineRzp) {
      // 🥈 Process Razorpay Online Order Sequence
      try {
        const pending = await addOrder(newOrder);
        if (!pending?.success || !pending.order?.id) {
          setIsPlacing(false);
          setCheckoutError(pending?.error || "Unable to reserve the order for payment.");
          return;
        }
        const response = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: pending.order.id
          })
        });

        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
          setIsPlacing(false);
          setCheckoutError(data.error || (language === 'hi' ? "रेज़रपे गेटवे प्रारंभ करने में विफलता।" : "Failed to initialize Razorpay Session."));
          return;
        }

        // Check if real live/test key was retrieved from Razorpay API
        const hasRealKey = data.api_called && data.key_id;

        // Load Razorpay JS SDK if needed
        const isLoaded = await ensureRazorpayLoaded();
        setIsPlacing(false);

        if (hasRealKey && isLoaded && typeof window !== 'undefined' && window.Razorpay) {
          const options = {
            key: data.key_id,
            amount: data.amount,
            currency: data.currency || "INR",
            name: contactSettings?.brandName || undefined,
            description: `Grocery Order #${pending.order.id}`,
            image: "/pwa-192x192.png",
            ...(data.razorpay_order_id ? { order_id: data.razorpay_order_id } : {}),
            handler: async function (rzpResponse) {
              setIsPlacing(true);
              try {
                const verification = await fetch('/api/razorpay/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: pending.order.id,
                    razorpay_order_id: rzpResponse.razorpay_order_id || data.razorpay_order_id,
                    razorpay_payment_id: rzpResponse.razorpay_payment_id,
                    razorpay_signature: rzpResponse.razorpay_signature
                  })
                });
                const verificationResult = await verification.json().catch(() => ({}));
                if (!verification.ok || verificationResult.status !== 'PAID') throw new Error(verificationResult.error || 'Server payment verification failed.');

                await fetchOrders(true);
                await fetchProducts(true);
                setIsPlacing(false);
                setShowOrderSuccess(true);
                setSuccessInfo(
                  language === 'hi' 
                    ? `शानदार! आपका रेज़रपे द्वारा ऑनलाइन भुगतान सफल रहा (Payment ID: ${rzpResponse.razorpay_payment_id || 'SUCCESS'})। स्वास्तिक डिलीवरी टीम शीघ्र ही पहुंचेगी!`
                    : `Success! Online payment of ₹${finalGrandTotal} verified via Razorpay! Payment ID: ${rzpResponse.razorpay_payment_id || 'SUCCESS'}`
                );
              } catch (err) {
                setIsPlacing(false);
                console.error("Razorpay verification error:", err);
                setCheckoutError("Payment verification error. Please contact store support.");
              }
            },
            prefill: {
              name: shippingInfo.fullName || (contactSettings?.brandName ? `${contactSettings.brandName} Customer` : "Customer"),
              contact: (shippingInfo.phoneNumber || "").replace(/\D/g, "").slice(-10),
              email: customerEmail || undefined
            },
            theme: {
              color: "#06b6d4"
            },
            modal: {
              ondismiss: function () {
                fetch(`/api/payment/orders/${pending.order.id}/cancel`, { method: 'POST' }).catch(() => {});
                setIsPlacing(false);
                setCheckoutError(
                  language === 'hi'
                    ? "भुगतान प्रक्रिया रद्द कर दी गई। आपका ऑर्डर सबमिट नहीं हुआ है।"
                    : "Payment cancelled. Your order was not submitted."
                );
              }
            }
          };

          try {
            const rzpObj = new window.Razorpay(options);
            rzpObj.on('payment.failed', function (resp) {
              setIsPlacing(false);
              setCheckoutError(
                language === 'hi'
                  ? `भुगतान विफल: ${resp.error?.description || 'लेनदेन रद्द कर दिया गया।'}`
                  : `Payment Failed: ${resp.error?.description || 'Transaction cancelled.'}`
              );
            });
            rzpObj.open();
          } catch (err) {
            console.error("Error opening Razorpay checkout window:", err);
            setCheckoutError("Razorpay checkout could not be opened. Please retry or choose Cash on Delivery.");
          }
        } else {
          setCheckoutError("Razorpay checkout is unavailable. Please retry or choose Cash on Delivery.");
        }
      } catch (err) {
        setIsPlacing(false);
        console.error("Razorpay order handler error:", err);
        setCheckoutError("Razorpay checkout is unavailable. Please retry or choose Cash on Delivery.");
      }
    } else if (isOnlineCF) {
      let pending;
      try {
        pending = await addOrder(newOrder);
        if (!pending?.success || !pending.order?.id) throw new Error(pending?.error || 'Unable to reserve the order for payment.');
        const response = await fetch('/api/cashfree/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: pending.order.id })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.status !== 'success' || !data.payment_session_id) throw new Error(data.error || 'Cashfree payment session could not be created.');
        if (!await ensureCashfreeLoaded() || !window.Cashfree) throw new Error('Cashfree checkout SDK is unavailable.');

        setIsPlacing(false);
        const cashfree = window.Cashfree({ mode: String(gatewaySettings.environment).toUpperCase() === 'PRODUCTION' ? 'production' : 'sandbox' });
        const result = await cashfree.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: '_modal' });
        if (result?.error) {
          await fetch(`/api/payment/orders/${pending.order.id}/cancel`, { method: 'POST' });
          throw new Error(result.error.message || 'Cashfree checkout was cancelled.');
        }

        setIsPlacing(true);
        const verification = await fetch('/api/cashfree/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.order_id })
        });
        const verified = await verification.json().catch(() => ({}));
        if (!verification.ok || verified.status !== 'PAID') throw new Error(verified.error || 'Cashfree payment is not confirmed.');
        await fetchOrders(true);
        await fetchProducts(true);
        setIsPlacing(false);
        setShowOrderSuccess(true);
        setSuccessInfo(language === 'hi'
          ? 'कैशफ्री द्वारा भुगतान सत्यापित हो गया है और आपका ऑर्डर स्वीकार कर लिया गया है।'
          : `Cashfree payment verified. Your order of ₹${finalGrandTotal} is confirmed.`);
      } catch (err) {
        setIsPlacing(false);
        console.error('Cashfree checkout error:', err);
        setCheckoutError(err.message || 'Cashfree checkout is unavailable. Please retry or choose Cash on Delivery.');
      }
    }
  };

  const handleCloseSuccess = () => {
    setShowOrderSuccess(false);
    clearCart();
    onViewChange('home');
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto w-full px-4 py-12 text-center animate-fadeIn" id="cart-view">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl space-y-6 text-slate-900 w-full">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-5xl shadow-inner">
            🛒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {language === 'hi' ? 'आपकी कार्ट खाली है' : 'Your Cart is Empty'}
            </h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
              {language === 'hi'
                ? 'आपकी कार्ट में अभी कोई उत्पाद नहीं है। खरीदारी शुरू करने के लिए नीचे बटन पर क्लिक करें!'
                : 'Your shopping cart is currently empty. Explore our store and add items to get started!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onViewChange('shop')}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            {language === 'hi' ? 'शॉपिंग जारी रखें' : 'Continue Shopping'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 mt-4 md:px-0" id="cart-view">
      
      {/* STEP PROGRESS HEADER */}
      <div className="max-w-4xl mx-auto w-full px-4">
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3 md:p-4 text-xs font-bold text-slate-800 shadow-sm">
          <div className={`flex items-center gap-2.5 ${!isLoggedIn ? 'text-emerald-700 font-black' : 'text-emerald-700 font-bold'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${!isLoggedIn ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
              {isLoggedIn ? '✓' : '1'}
            </div>
            <span className="truncate">{language === 'hi' ? 'स्टेप 1: लॉगिन / अकाउंट' : 'Step 1: Account Login'}</span>
          </div>
          
          <div className="h-0.5 flex-1 bg-slate-200 mx-2 md:mx-4"></div>

          <div className={`flex items-center gap-2.5 ${isLoggedIn ? 'text-emerald-700 font-black' : 'text-slate-500'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isLoggedIn ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
              2
            </div>
            <span className="truncate">{language === 'hi' ? 'स्टेप 2: कार्ट और डिलीवरी' : 'Step 2: Cart & Delivery'}</span>
          </div>

          <div className="h-0.5 flex-1 bg-slate-200 mx-2 md:mx-4 hidden sm:block"></div>

          <div className={`hidden sm:flex items-center gap-2.5 ${isLoggedIn ? 'text-emerald-700 font-black' : 'text-slate-500'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isLoggedIn ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
              3
            </div>
            <span className="truncate">{language === 'hi' ? 'स्टेप 3: भुगतान और ऑर्डर' : 'Step 3: Payment & Order'}</span>
          </div>
        </div>
      </div>

      {/* CONDITIONAL STEP FLOW */}
      {!isLoggedIn ? (
        /* STEP 1: Unified Default Theme Login Screen */
        <div className="max-w-xl mx-auto w-full px-4 space-y-5 animate-fadeIn">
          {/* Cart Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                <h4 className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  {language === 'hi' ? 'आपकी कार्ट समीक्षा' : 'Cart Summary'}
                </h4>
                <p className="text-sm font-black text-emerald-700">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)} {language === 'hi' ? 'वस्तुएं' : (cartItems.reduce((acc, item) => acc + item.quantity, 0) === 1 ? 'Item' : 'Items')} • ₹{subtotal}
                </p>
              </div>
            </div>
            <button 
              onClick={() => onViewChange('shop')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase underline transition-all cursor-pointer"
            >
              {language === 'hi' ? 'सामान बदलें' : 'View Items'}
            </button>
          </div>

          {/* Render Default Theme Login Screen */}
          <Account onViewChange={onViewChange} />
        </div>
      ) : (
        /* STEP 2 & 3: Clean Cart, Delivery & Payment Layout when Logged In */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full px-4 md:px-8 animate-fadeIn">
          
          {/* Left Side: Step 2 - Shopping Cart & Shipping Info */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* Step 1 Account Verified Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-slate-900 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{language === 'hi' ? 'सत्यापित खाता:' : 'Logged in Account:'}</span>
                    <span className="text-emerald-700 font-black">{profile?.fullName || 'Valued Member'}</span>
                    {isPrime && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full uppercase font-black">
                        ⭐ Prime
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                    {profile?.phone || profile?.email || ''}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  logoutCustomer().finally(() => {
                    setProfile(null);
                    setIsLoggedIn(false);
                  });
                }}
                className="text-[10px] text-slate-700 hover:text-red-700 font-bold uppercase tracking-wider border border-slate-300 hover:border-red-300 px-3 py-1.5 rounded-lg bg-white transition-all shrink-0 ml-2 shadow-xs"
              >
                {language === 'hi' ? 'खाता बदलें' : 'Switch Account'}
              </button>
            </div>

            {/* Cart Header */}
            <div className="flex items-center justify-between text-slate-900">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight md:text-2xl flex items-center gap-2">
                <span className="text-emerald-700">Step 2:</span>
                <span>{t('yourCart')}</span>
              </h2>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {cartItems.length} {t('itemsCount')}
              </span>
            </div>

            {/* Cart Items List */}
            {cartItems.length > 0 ? (
              <div className="space-y-3">
                {cartItems.map((item, idx) => {
                  const dbProduct = products?.find(p => p.id === item.product.id) || item.product;
                  const maxStock = dbProduct.stockCount !== undefined ? Number(dbProduct.stockCount) : (dbProduct.stock !== undefined ? Number(dbProduct.stock) : 0);
                  const isOutOfStock = maxStock <= 0;
                  const hasStockIssue = isOutOfStock || item.quantity > maxStock;
                  const name = language === 'hi' ? (item.product.nameHi || item.product.nameEn || item.product.name) : (item.product.nameEn || item.product.name);
                  const pack = item.selectedUnit || (language === 'hi' ? (item.product.packHi || t('packOf5')) : (item.product.packEn || t('packOf5')));
                  
                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedUnit || idx}`}
                      className={`border p-4 flex gap-4 rounded-xl shadow-xs transition-all ${
                        hasStockIssue
                          ? 'border-red-300 bg-red-50/90'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <CartItemImage 
                        product={item.product} 
                        r2PublicUrl={r2PublicUrl}
                        className={`w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border bg-slate-50 shrink-0 ${
                          hasStockIssue ? 'border-red-300' : 'border-slate-200'
                        }`}
                      />

                      {/* Content Area */}
                      <div className="flex-grow flex flex-col justify-between overflow-hidden text-slate-900">
                        <div>
                          <h3 className="font-extrabold text-sm leading-snug text-slate-900 truncate">
                            {name}
                          </h3>
                          <div className="flex flex-col gap-1 mt-0.5">
                            <p className="text-xs text-slate-500 font-medium">
                              {pack}
                            </p>
                            {hasStockIssue && (
                              <div className="mt-1 flex flex-col gap-1 items-start">
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-red-100 text-red-700 font-extrabold uppercase tracking-wide border border-red-200">
                                  {isOutOfStock ? (language === 'hi' ? 'आउट ऑफ स्टॉक!' : 'OUT OF STOCK!') : (language === 'hi' ? 'अपर्याप्त स्टॉक!' : 'INSUFFICIENT STOCK!')}
                                </span>
                                <p className="text-[10px] text-red-700 font-bold leading-normal bg-red-50 p-1.5 rounded border border-red-200">
                                  {isOutOfStock 
                                    ? (language === 'hi' ? 'यह आइटम स्टॉक में नहीं है। कृपया इसे हटाएं।' : 'This item is out of stock. Please remove it to proceed.')
                                    : (language === 'hi' 
                                      ? `केवल ${maxStock} इकाइयाँ उपलब्ध हैं। कृपया कार्ट की मात्रा समायोजित करें।` 
                                      : `Only ${maxStock} units available. Please adjust your cart quantity.`)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantity Toggles */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                            <button 
                              onClick={() => updateQuantity(item.product.id, item.selectedUnit, -1)}
                              className="px-3 py-1 font-bold text-slate-700 hover:bg-slate-200 active:scale-90 transition-all font-mono text-sm cursor-pointer"
                              title={language === 'hi' ? 'मात्रा घटाएं' : 'Decrease quantity'}
                            >
                              -
                            </button>
                            <span className="px-3 font-black text-xs text-slate-900 font-mono">
                              {item.quantity}
                            </span>
                            <button 
                              disabled={item.quantity >= maxStock}
                              onClick={() => updateQuantity(item.product.id, item.selectedUnit, 1)}
                              className={`px-3 py-1 font-bold font-mono text-sm transition-all ${
                                item.quantity >= maxStock
                                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed opacity-40'
                                  : 'text-slate-700 hover:bg-slate-200 active:scale-90 cursor-pointer'
                              }`}
                              title={item.quantity >= maxStock ? (language === 'hi' ? 'अधिकतम स्टॉक सीमा तक पहुंच चुके हैं' : 'Maximum stock limit reached') : (language === 'hi' ? 'मात्रा बढ़ाएं' : 'Increase quantity')}
                            >
                              +
                            </button>
                          </div>

                          {/* Price Display */}
                          <span className="text-base font-black text-slate-900 font-mono">
                            ₹{getUnitPrice(item.product, item.selectedUnit) * item.quantity}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.product.id, item.selectedUnit)}
                        className="text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 p-2 rounded-lg transition-all h-fit shrink-0 self-start active:scale-90 cursor-pointer"
                        title={language === 'hi' ? 'कार्ट से निकालें' : 'Remove from cart'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-700">
                <p className="font-bold text-sm text-slate-700">Your cart is empty</p>
                <button 
                  onClick={() => onViewChange('shop')}
                  className="mt-4 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm"
                >
                  Go to Shop
                </button>
              </div>
            )}

          {/* Shipping / Distances panel matching Image 6 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900">
            <div className="flex items-center gap-2 mb-4 text-emerald-700">
              <MapPin className="h-5 w-5" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {t('shippingInfo')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  {t('fullName')}
                </label>
                <input 
                  type="text" 
                  value={shippingInfo.fullName}
                  onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  {t('phoneNumber')}
                </label>
                <input 
                  type="text" 
                  value={shippingInfo.phoneNumber}
                  onChange={(e) => setShippingInfo({...shippingInfo, phoneNumber: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all font-sans"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block flex justify-between">
                  <span>{language === 'hi' ? 'ईमेल पता (कैशफ्री के लिए आवश्यक)' : 'Email Address (Required for Cashfree PG)'}</span>
                  <span className="text-[9px] text-slate-500">test environment</span>
                </label>
                <input 
                  type="email" 
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all font-mono"
                  required
                />
              </div>

              {/* Delivery Location Group Select (Requirement 2 & 3) */}
              <div className="md:col-span-2 bg-emerald-50/70 p-4 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                    📍 {language === 'hi' ? 'वितरण क्षेत्र का चयन (अनिवार्य)' : 'Select Delivery Area (Mandatory) *'}
                  </label>
                  {isPrime && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
                      ⭐ Prime Member
                    </span>
                  )}
                </div>
                
                <select
                  required
                  value={selectedLocationGroupId}
                  onChange={(e) => {
                    setSelectedLocationGroupId(e.target.value);
                    setSelectedSubLocation("");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                >
                  <option value="" className="text-slate-500 bg-white">
                    -- {language === 'hi' ? 'यहाँ अपना वितरण क्षेत्र चुनें' : 'CHOOSE YOUR SHIPPING SECTOR'} --
                  </option>
                  {locationGroups && locationGroups.map(g => {
                    const threshold = g.minFreeDeliveryAmount !== undefined ? Number(g.minFreeDeliveryAmount) : 499;
                    const willBeFree = subtotal >= threshold;
                    const charge = isPrime ? g.primeDelivery : g.normalDelivery;
                    return (
                      <option key={g.id} value={g.id} className="text-slate-900 bg-white font-sans font-semibold">
                        {g.name} &rarr; ({willBeFree ? (language === 'hi' ? 'फ्री डिलीवरी 🎉' : 'FREE Shipping 🎉') : `₹${charge} Charge`})
                      </option>
                    );
                  })}
                </select>

                {selectedLocationGroup && selectedLocationGroup.locations && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                      🏢 {language === 'hi' ? 'विशेष स्थान / सेक्टर का चयन (अनिवार्य)' : 'Select Specific Location / Sector *'}
                    </label>
                    <select
                      required
                      value={selectedSubLocation}
                      onChange={(e) => setSelectedSubLocation(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                    >
                      <option value="" className="text-slate-500 bg-white">
                        -- {language === 'hi' ? 'अपना विशेष स्थान/सेक्टर चुनें' : 'CHOOSE YOUR SPECIFIC SECTOR'} --
                      </option>
                      {selectedLocationGroup.locations.split(',').map(l => l.trim()).filter(Boolean).map((loc, idx) => (
                        <option key={idx} value={loc} className="text-slate-900 bg-white font-sans font-semibold">
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedLocationGroup ? (
                  <div className="space-y-2">
                    <div className="text-[9.5px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <p className="font-extrabold text-emerald-800">
                        🚚 {language === 'hi' ? 'संबद्ध क्षेत्र' : 'Covered Sectors / Landmarks'}:
                      </p>
                      <p className="text-slate-600 leading-normal font-sans text-[9px] font-medium">
                        {selectedLocationGroup.locations}
                      </p>
                      <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-600 font-extrabold pt-1">
                        <span>{language === 'hi' ? 'सामान्य शुल्क' : 'Standard Delivery'}: ₹{selectedLocationGroup.normalDelivery}</span>
                        <span className="text-amber-800">{language === 'hi' ? 'प्राइम शुल्क' : 'Prime Delivery'}: ₹{selectedLocationGroup.primeDelivery}</span>
                      </div>

                      {/* Dynamic Free Shipping Threshold Tracker Widget */}
                      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200 mt-1.5">
                        <div className="flex justify-between text-[9px] uppercase tracking-widest font-black">
                          <span className="text-slate-600">{language === 'hi' ? 'फ्री डिलीवरी न्यूनतम आर्डर' : 'Free Delivery threshold'}: ₹{minFreeDeliveryAmount}</span>
                          {isFreeDeliveryApplied ? (
                            <span className="text-emerald-700 font-extrabold">🎉 {language === 'hi' ? 'मुफ़्त डिलीवरी लागू!' : 'FREE SHIPPING APPLIED!'}</span>
                          ) : (
                            <span className="text-rose-700 font-bold">{language === 'hi' ? `₹${minFreeDeliveryAmount - subtotal} और जोड़ें` : `Add ₹${minFreeDeliveryAmount - subtotal} more for FREE`}</span>
                          )}
                        </div>
                        {/* Threshold Visual Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${isFreeDeliveryApplied ? 'bg-emerald-600' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, (subtotal / minFreeDeliveryAmount) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Operational Hour Status Alert */}
                    {(() => {
                      const startTime = selectedLocationGroup.deliveryStartTime || "09:00";
                      const endTime = selectedLocationGroup.deliveryEndTime || "21:00";
                      const isActive = checkTimeInSlot(startTime, endTime);
                      return (
                        <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 transition-all ${
                          isActive 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}>
                          <div className="flex items-center justify-between font-extrabold uppercase tracking-wide">
                            <span className="flex items-center gap-1.5">
                              {isActive ? (
                                <>
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                                  </span>
                                  <span>{language === 'hi' ? 'वितरण चालू है' : 'DELIVERIES OPERATIONAL'}</span>
                                </>
                              ) : (
                                <>
                                  <span className="flex h-2 w-2 relative">
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                  </span>
                                  <span>{language === 'hi' ? 'वितरण अभी उपलब्ध नहीं' : 'DELIVERIES OFFLINE'}</span>
                                </>
                              )}
                            </span>
                            <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                              ⏰ {formatTimeSlot(startTime)} - {formatTimeSlot(endTime)}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-600 leading-normal font-medium">
                            {isActive 
                              ? (language === 'hi' 
                                  ? `✓ इस क्षेत्र में डिलीवरी चालू है। आप अभी ऑर्डर दे सकते हैं।`
                                  : `✓ Active deliveries are currently processing for this group. Immediate dispatch is active.`)
                              : (language === 'hi'
                                  ? `⚠️ इस ग्रुप में डिलीवरी केवल ${formatTimeSlot(startTime)} से ${formatTimeSlot(endTime)} के बीच की जाती है। अभी आर्डर सबमिट नहीं किया जा सकता।`
                                  : `⚠️ Deliveries to this sector are restricted outside ${formatTimeSlot(startTime)} to ${formatTimeSlot(endTime)}. Order placement is offline.`)
                            }
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-[9px] text-emerald-800 italic font-bold">
                    * {language === 'hi' 
                       ? 'ऑर्डर पूरा करने और शिपिंग शुल्क की गणना करने के लिए क्षेत्र चुनना अनिवार्य है।' 
                       : 'Please choose your designated shipping sector. Selection is required to check out.'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">
                    {t('deliveryAddress')} * ({language === 'hi' ? 'अनिवार्य' : 'Required'})
                  </label>
                  
                  {/* FREE Live GPS Location Button */}
                  <button
                    type="button"
                    onClick={handleDetectLiveGpsLocation}
                    disabled={isDetectingGps}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-emerald-600 flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Compass className={`h-3.5 w-3.5 ${isDetectingGps ? 'animate-spin text-amber-200' : 'text-emerald-100'}`} />
                    <span>
                      {isDetectingGps 
                        ? (language === 'hi' ? 'GPS लाइव लोकेशन खोजी जा रही है...' : 'Detecting Live GPS...') 
                        : (language === 'hi' ? '📍 मेरी लाइव GPS लोकेशन चुनें (100% फ्री)' : '📍 Use Live GPS Location (100% Free)')
                      }
                    </span>
                  </button>
                </div>

                <textarea 
                  rows="2"
                  required
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                  placeholder={language === 'hi' ? "मकान नंबर, स्ट्रीट/गली, लैंडमार्क या लाइव जीपीएस पता दर्ज करें *" : "Enter House No, Street/Locality, Landmark, or Live GPS Address *"}
                  className={`w-full bg-slate-50 border rounded-lg p-3 text-xs text-slate-900 font-bold outline-none transition-all font-sans ${
                    !shippingInfo.address?.trim() 
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50' 
                      : 'border-slate-200 focus:border-emerald-500 focus:bg-white'
                  }`}
                />

                {/* GPS Pin Badge & Free Google Maps Navigation Link */}
                {liveGpsCoords && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[10px] text-emerald-900 font-sans">
                    <div className="flex items-center gap-1.5 font-extrabold">
                      <MapPin className="h-4 w-4 text-emerald-700 shrink-0 animate-bounce" />
                      <span>
                        {language === 'hi'
                          ? `GPS निर्देशांक दर्ज: ${liveGpsCoords.lat.toFixed(5)}° N, ${liveGpsCoords.lng.toFixed(5)}° E`
                          : `Captured GPS Pin: ${liveGpsCoords.lat.toFixed(5)}° N, ${liveGpsCoords.lng.toFixed(5)}° E`
                        }
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${liveGpsCoords.lat},${liveGpsCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-emerald-50 font-extrabold flex items-center gap-1 transition shadow-xs"
                    >
                      <MapIcon className="h-3 w-3" />
                      <span>{language === 'hi' ? 'मैप नेविगेशन खोलें' : 'Open Navigation Map'}</span>
                    </a>
                  </div>
                )}

                <p className="text-[9.5px] text-slate-500 italic font-medium leading-tight">
                  💡 {language === 'hi' 
                    ? "नोट: आप किसी भी समय ऊपर दिए गए पते के टेक्स्ट को बदल सकते हैं यदि आप किसी अन्य स्थान (जैसे ऑफिस, रिश्तेदार के घर) पर डिलीवरी चाहते हैं।" 
                    : "Note: You can edit or change the address text above at any time if you want delivery at another location (e.g. office, friend's home)."
                  }
                </p>
              </div>
            </div>


          </div>
        </section>

        {/* Right Side: Order Summary Card details */}
        <section className="lg:col-span-5 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Delecatable Birthday / Anniversary Alert */}
            {(isBirthdayToday || isAnniversaryToday) && (
              <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden text-slate-900">
                {/* Visual sparkles */}
                <div className="absolute right-2 top-2 text-2xl animate-bounce">
                  {isBirthdayToday ? "🎂" : "💍"}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-pink-800 flex items-center gap-1.5">
                    <span>🎉</span>
                    <span>
                      {isBirthdayToday 
                        ? (language === 'hi' ? "आज आपका शुभ जन्मदिन है! 🎂" : "IT IS YOUR SPECIAL BIRTHDAY TODAY! 🎂") 
                        : (language === 'hi' ? "आज आपकी शादी की सालगिरह है! 💍" : "HAPPY MARRIAGE ANNIVERSARY TODAY! 💍")
                      }
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-700 font-semibold leading-relaxed mt-1">
                    {language === 'hi' 
                      ? "स्वास्तिक सुपरमार्केट की ओर से ढेर सारी शुभकामनाएं! आपके लिए विशेष रूप से निम्नलिखित लाभ सक्रिय कर दिया गया है:" 
                      : `${contactSettings?.brandName || 'The store'} sends warm greetings on your celebration. The configured benefit is shown below:`}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-pink-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {language === 'hi' ? 'विशेष लाभ' : 'Personalized Offer'}
                    </span>
                    <span className="text-[10px] font-black uppercase text-pink-700 bg-pink-100 border border-pink-300 px-2 py-0.5 rounded-full">
                      {isBirthdayToday ? `${bPercent}% DISCOUNT` : `${aPercent}% DISCOUNT`}
                    </span>
                  </div>
                  
                  <p className="text-xs font-black text-pink-900">
                    {language === 'hi' 
                      ? (isBirthdayToday ? cSettings.birthdayOfferDetailsHi : cSettings.anniversaryOfferDetailsHi) 
                      : (isBirthdayToday ? cSettings.birthdayOfferDetails : cSettings.anniversaryOfferDetails)
                    }
                  </p>

                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
                    <span>
                      {language === 'hi' ? `न्यूनतम शॉपिंग राशि: ₹${isBirthdayToday ? bMin : aMin}` : `Min shopping value: ₹${isBirthdayToday ? bMin : aMin}`}
                    </span>
                    {language === 'hi' ? (
                      subtotal >= (isBirthdayToday ? bMin : aMin) ? (
                        <span className="text-emerald-700 font-bold">लागू (₹{celebrationDiscountValue} की सीधी बचत!) 🎉</span>
                      ) : (
                        <span className="text-rose-700 font-extrabold">₹{Math.max(0, (isBirthdayToday ? bMin : aMin) - subtotal)} का और सामान जोड़ें</span>
                      )
                    ) : (
                      subtotal >= (isBirthdayToday ? bMin : aMin) ? (
                        <span className="text-emerald-700 font-bold">APPLIED (Saved ₹{celebrationDiscountValue}!) 🎉</span>
                      ) : (
                        <span className="text-rose-700 font-extrabold">Add ₹{Math.max(0, (isBirthdayToday ? bMin : aMin) - subtotal)} more to unlock</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loyalty points redeemer box */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm text-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🪙</span>
                  <div>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-amber-900">
                      {language === 'hi' ? 'लॉयल्टी और रिवॉर्ड पॉइंट्स' : 'Loyalty & Reward Points'}
                    </h3>
                    <p className="text-[9px] text-amber-700/80 font-medium">
                      {language === 'hi' ? 'स्वागत बोनस (Welcome Gift) और रेफ़रल अंक' : 'Includes Welcome Bonus & Referral rewards'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] bg-amber-200 text-amber-900 border border-amber-300 font-black px-2 py-0.5 rounded uppercase">
                  {userPointsAvailable} PTS Available
                </span>
              </div>
              
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200">
                <div className="flex-1 shrink-0">
                  <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                    <span>{language === 'hi' ? 'शॉपिंग के लिए अंक उपयोग करें' : 'Redeem Points for Shopping'}</span>
                  </p>
                  <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed mt-0.5 select-none">
                    {language === 'hi' 
                      ? `1 पॉइंट = ₹${pointsRateInINR} | कम से कम आवश्यक: ${minPointsRedeem} PTS` 
                      : `1 PTS = ₹${pointsRateInINR} INR | Min limit: ${minPointsRedeem} PTS`
                    }
                  </p>
                </div>
                
                {/* Custom toggle slider switch of amber color */}
                <div 
                  onClick={() => handleToggleRedeemPoints(!redeemPointsChecked)}
                  className={`w-11 h-6 rounded-full relative transition-all duration-300 cursor-pointer shrink-0 ml-4 ${redeemPointsChecked ? 'bg-amber-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow ${redeemPointsChecked ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
              
              {redeemPointsChecked && appliedPoints > 0 && (
                <p className="text-[10px] text-emerald-800 font-extrabold text-center bg-emerald-100 border border-emerald-300 py-1.5 rounded-lg animate-pulse">
                  🎉 {language === 'hi' 
                    ? `बधाई हो! ${appliedPoints} पॉइंट्स के साथ ₹${pointsDiscountValue} की सीधी छूट लागू की गई!` 
                    : `Slashed flat ₹${pointsDiscountValue} off from subtotal via ${appliedPoints} points!`}
                </p>
              )}
            </div>

            {/* Light Styled Summary Box */}
            <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 overflow-hidden relative">
              <h3 className="font-extrabold text-base uppercase tracking-widest text-center border-b border-slate-200 pb-4 mb-4 text-slate-900">
                {t('orderSummary')}
              </h3>

              <div className="space-y-3 text-xs font-medium">
                <div className="flex justify-between text-slate-700">
                  <span>{t('subtotal')}</span>
                  <span className="font-mono font-bold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t('deliveryFee')}</span>
                  <span className="text-emerald-800 font-extrabold uppercase">
                    {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t('gst')}</span>
                  <span className="font-mono font-bold">₹{gst}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-extrabold transition-all">
                    <span>
                      {language === 'hi' ? 'कूपन छूट' : 'Coupon Discount'} 
                      {appliedCoupon && ` (${appliedCoupon.code})`}
                    </span>
                    <span className="font-mono">-₹{couponDiscount}</span>
                  </div>
                )}

                {appliedPoints > 0 && (
                  <div className="flex justify-between text-amber-800 font-extrabold transition-all">
                    <span>
                      {language === 'hi' ? 'रेफ़रल पॉइंट्स डिस्काउंट (-)' : 'Referral Reward Points (-)'}
                    </span>
                    <span className="font-mono">-₹{pointsDiscountValue}</span>
                  </div>
                )}

                {celebrationDiscountValue > 0 && (
                  <div className="flex justify-between text-pink-800 font-extrabold transition-all">
                    <span>
                      {isBirthdayToday 
                        ? (language === 'hi' ? '🎁 जन्मदिन विशेष छूट (-)' : '🎁 Special Birthday Discount (-)')
                        : (language === 'hi' ? '🎁 वर्षगांठ विशेष छूट (-)' : '🎁 Special Anniversary Discount (-)')
                      }
                    </span>
                    <span className="font-mono">-₹{celebrationDiscountValue}</span>
                  </div>
                )}

                <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center transition-all">
                  <span className="text-sm font-extrabold text-slate-900">{t('grandTotal')}</span>
                  <div className="text-right">
                    {(pointsDiscountValue > 0 || celebrationDiscountValue > 0) && (
                      <span className="text-[10px] line-through text-slate-400 block font-mono">
                        ₹{Math.max(0, Math.round((subtotal + deliveryFee + gst - couponDiscount) * 100) / 100)}
                      </span>
                    )}
                    <span className="block text-2xl font-black text-slate-900 leading-none font-mono">
                      ₹{finalGrandTotal}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Promo & Campaign Coupon Section */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 text-slate-900">
              <div className="flex items-center gap-2 text-emerald-700">
                <Ticket className="h-4 w-4" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                  {language === 'hi' ? 'विशेष ऑफर और कूपन' : 'Offers & Coupons'}
                </h3>
              </div>

              {/* Apply Input and Button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCodeField}
                    onChange={(e) => {
                      setCouponCodeField(e.target.value);
                      if (couponError) setCouponError('');
                    }}
                    placeholder={language === 'hi' ? 'कूपन कोड दर्ज करें' : 'Enter Coupon Code'}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 text-slate-900 uppercase font-bold"
                  />
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCodeField('');
                        setCouponError('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-600 hover:text-rose-700 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 hover:bg-rose-50 rounded"
                    >
                      {language === 'hi' ? 'हटाएं' : 'Remove'}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 whitespace-nowrap shadow-xs cursor-pointer"
                >
                  {language === 'hi' ? 'लागू करें' : 'APPLY'}
                </button>
              </div>

              {/* Coupon Error Alert */}
              {couponError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs font-bold flex items-start justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{couponError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCouponError('')}
                    className="text-rose-400 hover:text-rose-600 font-black text-xs px-1 cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Applied Coupon Info Alert */}
              {appliedCoupon && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-emerald-700 mt-0.5 shrink-0 font-bold">✓</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-black text-emerald-900">{appliedCoupon.code}</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {appliedCoupon.discountType === 'percentage' 
                          ? `${appliedCoupon.value}% OFF` 
                          : `₹${appliedCoupon.value} OFF`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-700 font-medium mt-1">
                      {language === 'hi' 
                        ? (appliedCoupon.descriptionHi || 'कूपन सफलतापूर्वक लागू किया गया!') 
                        : (appliedCoupon.descriptionEn || 'Coupon code applied successfully!')}
                    </p>
                    <p className="text-[9px] text-emerald-800 font-extrabold mt-1">
                      {language === 'hi' ? 'आपकी कुल ₹' : 'You save ₹'}{couponDiscount} {language === 'hi' ? 'बची!' : 'with this coupon!'}
                    </p>
                  </div>
                </div>
              )}

              {/* Available Coupons list */}
              {offers && offers.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {language === 'hi' ? 'उपलब्ध कूपन' : 'Available Offers'}
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {offers.map((coupon) => {
                      const isCurrentlyApplied = appliedCoupon?.code === coupon.code;
                      const needsMore = coupon.minOrder && subtotal < coupon.minOrder ? (coupon.minOrder - subtotal) : 0;
                      const dateStatus = getCouponDateStatus(coupon);
                      const limitStatus = checkCouponCustomerLimit(coupon);
                      const isInvalid = !dateStatus.isValid || limitStatus.isLimitReached;

                      return (
                        <div
                          key={coupon.id}
                          onClick={() => {
                            setCouponCodeField(coupon.code);
                            setCouponError('');
                            if (!dateStatus.isValid) {
                              const msg = language === 'hi' ? dateStatus.reasonHi : dateStatus.reasonEn;
                              setCouponError(msg);
                              return;
                            }
                            if (limitStatus.isLimitReached) {
                              const msg = language === 'hi' ? limitStatus.reasonHi : limitStatus.reasonEn;
                              setCouponError(msg);
                              return;
                            }
                            if (needsMore > 0) {
                              const msg = language === 'hi' 
                                ? `कूपन '${coupon.code}' के लिए कार्ट में ₹${needsMore} का सामान और जोड़ें! (न्यूनतम ₹${coupon.minOrder})` 
                                : `Add items worth ₹${needsMore} more to unlock '${coupon.code}'! (Min Order: ₹${coupon.minOrder})`;
                              setCouponError(msg);
                              return;
                            }
                            setAppliedCoupon(coupon);
                            setCouponError('');
                          }}
                          className={`group p-2.5 flex justify-between items-center text-left transition-all duration-200 border rounded-xl cursor-pointer ${
                            isCurrentlyApplied
                              ? 'bg-emerald-50 border-emerald-400 text-slate-900 shadow-xs'
                              : isInvalid
                              ? 'bg-slate-50 border-rose-200 opacity-75 hover:bg-slate-100'
                              : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 hover:border-emerald-300 text-slate-800'
                          }`}
                        >
                          <div className="space-y-1 flex-1 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-mono text-xs font-black tracking-wide ${
                                isCurrentlyApplied 
                                  ? 'text-emerald-700' 
                                  : isInvalid
                                  ? 'text-rose-500 line-through'
                                  : 'text-emerald-700 group-hover:text-emerald-800'
                              }`}>
                                {coupon.code}
                              </span>
                              {coupon.minOrder > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-slate-600 bg-slate-200">
                                  Min: ₹{coupon.minOrder}
                                </span>
                              )}
                              {(coupon.startDate || coupon.endDate) && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  !dateStatus.isValid ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  📅 {dateStatus.isExpired ? (language === 'hi' ? 'समाप्त' : 'Expired') : dateStatus.isUpcoming ? (language === 'hi' ? `मान्य: ${coupon.startDate}` : `Starts: ${coupon.startDate}`) : (coupon.endDate ? `Till: ${coupon.endDate}` : `From: ${coupon.startDate}`)}
                                </span>
                              )}
                              {coupon.maxUsesPerCustomer > 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  limitStatus.isLimitReached ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  👤 {limitStatus.isLimitReached ? (language === 'hi' ? 'सीमा समाप्त' : 'Limit Reached') : (language === 'hi' ? `सीमा: ${coupon.maxUsesPerCustomer} बार` : `Max: ${coupon.maxUsesPerCustomer} use(s)`)}
                                </span>
                              )}
                              {needsMore > 0 && (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full text-amber-900 bg-amber-100 border border-amber-300">
                                  {language === 'hi' ? `+₹${needsMore} और जोड़ें` : `Add +₹${needsMore} more`}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium leading-tight text-slate-600">
                              {language === 'hi' ? coupon.descriptionHi : coupon.descriptionEn}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shadow-2xs ${
                              isCurrentlyApplied
                                ? 'bg-emerald-600 text-white'
                                : isInvalid
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-200'
                            }`}>
                              {coupon.discountType === 'percentage' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 text-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                  {t('paymentMethod')}
                </h3>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-widest">
                  Secure Checkout
                </span>
              </div>

              <div className="space-y-2">
                {/* Mode 1: Cash On Delivery */}
                <label 
                  className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all duration-200 ${
                    paymentMethod === 'cod' 
                      ? 'border-emerald-500 bg-emerald-50 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="hidden"
                  />
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {language === 'hi' ? 'नकद भुगतान (COD)' : 'Cash On Delivery (COD)'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {language === 'hi' ? 'सामान मिलने पर नकद या UPI द्वारा भुगतान करें' : 'Pay via cash/UPI during physical delivery'}
                    </p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'cod' ? 'border-emerald-600' : 'border-slate-300'
                  }`}>
                    {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
                  </div>
                </label>

                {/* Mode 2: Online Payment via Razorpay Gateway */}
                {gatewaySettings.razorpayEnabled && (
                  <label 
                    className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all duration-200 ${
                      paymentMethod === 'razorpay' 
                        ? 'border-emerald-500 bg-emerald-50 shadow-xs' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="payment"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{language === 'hi' ? 'ऑनलाइन भुगतान (रेज़रपे - Razorpay)' : 'Online Payment (Razorpay)'}</span>
                        <span className="text-[8px] px-1 bg-emerald-100 text-emerald-800 font-extrabold uppercase rounded border border-emerald-300">
                          ⚡ Fast & Safe
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {language === 'hi' ? 'UPI (PhonePe, GPay, Paytm), डेबिट/क्रेडिट कार्ड, नेटबैंकिंग' : 'UPI (PhonePe, GPay), Cards, Netbanking & Wallets'}
                      </p>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentMethod === 'razorpay' ? 'border-emerald-600' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'razorpay' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
                    </div>
                  </label>
                )}

                {/* Mode 3: Online Payment via Cashfree Gateway */}
                {gatewaySettings.cashfreeEnabled && (
                  <label 
                    className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all duration-200 ${
                      paymentMethod === 'cashfree' 
                        ? 'border-emerald-500 bg-emerald-50 shadow-xs' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="payment"
                      checked={paymentMethod === 'cashfree'}
                      onChange={() => setPaymentMethod('cashfree')}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{language === 'hi' ? 'ऑनलाइन भुगतान (कैशफ्री गेटवे)' : 'Online Payment (Cashfree)'}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {language === 'hi' ? 'UPI, रुपे, कार्ड एवं नेटबैंकिंग द्वारा सुरक्षित भुगतान।' : 'UPI, RuPay, All Cards & Netbanking'}
                      </p>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentMethod === 'cashfree' ? 'border-emerald-600' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'cashfree' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
                    </div>
                  </label>
                )}
              </div>

              {/* MANDATORY COMPLIANCES: Return, Refund & Cancellation Policy Banner */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px] leading-relaxed text-slate-700 space-y-2">
                  <p className="font-extrabold text-[10px] uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{language === 'hi' ? 'वापसी एवं रिफंड नीति' : 'Refund & Returns Policy Accordance'}</span>
                  </p>
                  <p>
                    {language === 'hi' 
                      ? "लागू समयसीमा और पात्रता के लिए डेटाबेस में कॉन्फ़िगर की गई रिफंड एवं रद्दीकरण नीति देखें।"
                      : "Review the configured Refund & Cancellation Policy for applicable eligibility and settlement timelines."}
                  </p>
                </div>
              </div>

              {/* Stock Issue Banner */}
              {cartItems.some(item => {
                const dbProduct = products?.find(p => p.id === item.product.id) || item.product;
                const maxStock = dbProduct.stockCount !== undefined ? Number(dbProduct.stockCount) : (dbProduct.stock !== undefined ? Number(dbProduct.stock) : 0);
                return maxStock <= 0 || item.quantity > maxStock;
              }) && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    {language === 'hi' 
                      ? 'आपकी कार्ट में कुछ उत्पादों में स्टॉक समस्या है। कृपया ऑर्डर देने से पहले मात्रा ठीक करें या हटाएं।'
                      : 'Some items in your cart exceed available stock. Please adjust quantities or remove out-of-stock items before placing your order.'}
                  </span>
                </div>
              )}

              {/* Checkout Error Banner */}
              {checkoutError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold leading-relaxed flex items-start gap-2.5 shadow-xs">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <button 
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className={`w-full font-extrabold rounded-xl py-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  !isLoggedIn
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                }`}
                id="place-order-nav-btn"
              >
                <span>
                  {!isLoggedIn
                    ? (language === 'hi' ? '🔒 ऑर्डर के लिए पहले लॉगिन/साइन-अप करें' : '🔒 Login / Sign Up Required to Order')
                    : (isPlacing 
                        ? (language === 'hi' ? 'प्रक्रिया चल रही है...' : 'Processing...') 
                        : (paymentMethod === 'cashfree' 
                            ? (language === 'hi' ? 'सुरक्षित भुगतान के लिए आगे बढ़ें' : 'Proceed to Pay with Cashfree') 
                            : t('placeOrder')
                          )
                      )
                  }
                </span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>

              <p className="text-[10px] text-center text-slate-500 leading-relaxed px-2 font-medium">
                {t('termsAgree')}
              </p>
            </div>


            {/* Secure Badging elements */}
            <div className="bg-emerald-50 p-4 rounded-xl flex items-center gap-3 border border-emerald-200 text-emerald-900">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-extrabold text-xs text-slate-900">{t('secureCheckoutTitle')}</p>
                <p className="text-[10px] text-slate-600 leading-tight font-medium">{t('secureCheckoutDesc')}</p>
              </div>
            </div>

          </div>
        </section>
      </div>
    )}

      {/* Checkout Placement Confirmation Modal POPUP */}
      {showOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity animate-fade-in overflow-y-auto">
          <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center relative animate-scale-up text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/15">
              <CheckCircle className="h-10 w-10 stroke-[1.5]" />
            </div>
            
            <h4 className="font-black text-lg text-white mb-2 text-glow">Order Confirmed!</h4>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-semibold px-2">
              {successInfo}
            </p>

            <button 
              onClick={handleCloseSuccess}
              className="w-full py-3 bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
