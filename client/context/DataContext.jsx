import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { isOrder1HourLocked } from '../utils/orderLock';

const DataContext = createContext();

// Dynamic category list with configurable images & icons
const initialCategories = [
  { id: 'all', nameEn: 'All Essentials', nameHi: 'सभी आवश्यक वस्तुएं', icon: '✨', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400' },
  { id: 'chocolate', nameEn: 'CHOCOLATE ITEM', nameHi: 'चॉकलेट आइटम', icon: '🍫', image: 'https://images.unsplash.com/photo-1548907040-4d42b52125ca?auto=format&fit=crop&q=80&w=400' },
  { id: 'beverage', nameEn: 'BEVERAGE ITEM', nameHi: 'पेय पदार्थ आइटम', icon: '🧃', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400' },
  { id: 'babycare', nameEn: 'BABY CARE ITEM LIST', nameHi: 'बेबी केयर आइटम सूची', icon: '🍼', image: 'https://images.unsplash.com/photo-1519689680058-324335c77ebe?auto=format&fit=crop&q=80&w=400' },
  { id: 'swastik', nameEn: 'SWSTIK PRODUCT LIST', nameHi: 'स्वास्तिक उत्पाद सूची', icon: '✨', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400' }
];

// Environment-driven dynamic store settings
const envStoreName = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_NAME) || 'Swastik Supermarket';
const envTagline = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_TAGLINE) || 'Aapka Apna Bazaar';
const envAddress = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_ADDRESS) || 'Survey no. 100 Sanjit road opposite of Saraswati school , Mandsaur, India, Madhya Pradesh';
const envPhone = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_PHONE) || '094845 40001';
const envEmail = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_EMAIL) || 'info.swastiksupermarket@gmail.com';
const envWebsite = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_WEBSITE) || 'https://www.swastiksupermarket.com';
const envGst = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_GST) || '23AAAAA1111A1Z1';
const envLicense = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_LICENSE) || 'FSSAI-12345678901234';
const envLogo = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_LOGO) || '/swastik-logo.svg';
const envLat = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_LAT) ? parseFloat(import.meta.env.VITE_STORE_LAT) : 24.0723;
const envLng = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_LNG) ? parseFloat(import.meta.env.VITE_STORE_LNG) : 75.0698;

// About info details configurations
const initialAboutSettings = {
  titleEn: 'Crafting Freshness Since 2018',
  titleHi: '2018 से ताजगी का निर्माण',
  storyEn: `${envStoreName} was established with a singular vision - to bridge the gap between premium sustainable local organic farmers and urban households directly in less than 15 minutes. We source daily, test for purity, and employ eco-friendly logistic delivery coordinates to guarantee high-integrity groceries for your kitchen.`,
  storyHi: `${envStoreName} की स्थापना एक अनूठे लक्ष्य के साथ की गई थी - प्रीमियम टिकाऊ स्थानीय जैविक किसानों और शहर के घरों के बीच की दूरी को 15 मिनट से भी कम समय में सीधे पाटना। हम दैनिक रूप से सामग्री मंगवाते हैं, शुद्धता का परीक्षण करते हैं, और आपकी रसोई के लिए उच्च सत्यता वाली किराने के सामान की गारंटी के लिए इको-फ्रेंडली लॉजिस्टिक डिलीवरी का उपयोग करते हैं।`
};

// Unified dynamic contact address block
const initialContactSettings = {
  brandName: envStoreName,
  tagline: envTagline,
  subtitle: 'Drop us a line if you have queries regarding bulk orders, delay offsets, or partnership propositions.',
  address: envAddress,
  phone: envPhone,
  email: envEmail,
  website: envWebsite,
  gst: envGst,
  license: envLicense,
  logo: envLogo,
  banner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7zupgGDM4rLNPqaVUDi49IYYmDPm8we0M1paGQ0P1xQM4TgUKOW1hAxsPwEJYVlslYIGGelWSHP2AbAsD6tdQUi8psCrpIgqLdnWEBRUvnn1y3phC3GMAX5nlBQrVq6HZdqDsrg-Fo2h5dwMQoYw6-xL1HRXQIkTg089XtLVzO2aMDTUftCLWp9Y9HDjOsAaK-LlpwxMS7n2AnfWSjTjC__z4UeTSYCXxEQDyAmshwnbevNh58O6yJ3J52NXWKXYTarHYA5spvG5C',
  latitude: envLat,
  longitude: envLng,
  deliveryChargeNear: 0,
  deliveryChargeMedium: 25,
  deliveryChargeFar: 45,
  deliveryChargeOutlier: 75,
  freeDeliveryMinAmount: 500,
  showOnlyWithPhoto: false
};

const initialPrivacySections = [
  {
    id: 1,
    titleEn: "1. Information We Collect",
    titleHi: "1. जानकारी जो हम एकत्र करते हैं",
    descEn: "We collect personal information such as mobile numbers, names, and regional GPS coordinates strictly to optimize hyper-local deliveries and authenticate your secure profile.",
    descHi: "हम आपके सुरक्षित प्रोफ़ाइल को सत्यापित करने और हाइपर-लोकल डिलीवरी को अनुकूलित करने के लिए मोबाइल नंबर, नाम और क्षेत्रीय जीपीएस जैसी व्यक्तिगत जानकारी एकत्र करते हैं।"
  },
  {
    id: 2,
    titleEn: "2. How We Use Information",
    titleHi: "2. हम जानकारी का उपयोग कैसे करते हैं",
    descEn: "Your data is strictly utilized to process order fulfillment, dispatch delivery partners with proximity distance routing, and send OTP authentication PINs.",
    descHi: "आपके डेटा का उपयोग कड़ाई से ऑर्डर पूरा करने, निकटता मार्ग का उपयोग करके डिलीवरी पार्टनर्स को भेजने और सुरक्षित ओटीपी सत्यापन पिन भेजने के लिए किया जाता है।"
  },
  {
    id: 3,
    titleEn: "3. Encryption & Security Standards",
    titleHi: "3. एन्क्रिप्शन और सुरक्षा उपकरण",
    descEn: "Every transaction, session token, and profile entry is protected via military-grade double SSL/TLS secure socket tunnels. We never sell your personal information.",
    descHi: "प्रत्येक लेनदेन, सत्र टोकन और प्रोफ़ाइल प्रविष्टि सैन्य-ग्रेड डबल एसएसएल/टीएलएस सुरक्षित सुरंगों के माध्यम से संरक्षित है। हम कभी भी आपकी व्यक्तिगत जानकारी साझा नहीं करते हैं।"
  },
  {
    id: 4,
    titleEn: "4. Your Consumer Rights",
    titleHi: "4. आपके उपभोक्ता अधिकार",
    descEn: "You hold absolute sovereignty over your profile details. You can request account termination, profile scrubbing, or localized data restriction at any time via support.",
    descHi: "आप अपने प्रोफ़ाइल विवरण पर पूर्ण प्रभुत्व रखते हैं। आप किसी भी समय सहायता टीम के माध्यम से खाता समाप्त करने, प्रोफ़ाइल संपादन या स्थानीयकृत डेटा विलोपन का अनुरोध कर सकते हैं।"
  }
];

const initialTermsSections = [
  {
    id: 1,
    titleEn: "1. Acceptance of Terms",
    titleHi: "1. शर्तों की स्वीकृति",
    descEn: "By accessing Swastik Supermarket apps, you register absolute compliance with our local legal guidelines, delivery limits, and billing procedures.",
    descHi: "स्वास्तिक सुपरमार्केट वेबसाइट या ऐप का उपयोग करके, आप हमारे स्थानीय कानूनी दिशानिर्देशों, वितरण सीमाओं और बिलिंग प्रक्रियाओं के पूर्ण अनुपालन के लिए सहमत होते हैं।"
  },
  {
    id: 2,
    titleEn: "2. User Authentication & Profile Responsibility",
    titleHi: "2. उपयोगकर्ता प्रमाणीकरण और पासवर्ड सुरक्षा",
    descEn: "You are solely responsible for maintaining credentials confidential. Any activity executed under your validated OTP mobile token is binding.",
    descHi: "आप अपने लॉगिन क्रेडेंशियल को गोपनीय रखने के लिए पूरी तरह से जिम्मेदार हैं। आपके सत्यापित मोबाइल नंबर या वन-टाइम पासवर्ड (ओटीपी) के तहत की गई कोई भी गतिविधि बाध्यकारी होगी।"
  },
  {
    id: 3,
    titleEn: "3. Order Placement & Price Adjustment",
    titleHi: "3. ऑर्डर बुकिंग और मूल्य निर्धारण",
    descEn: "We reserve the right to cancel bookings or adjust estimates on regional items due to live crop procurement, weight variance, or logistics complications.",
    descHi: "हम ताजी फसलों की उपलब्धता, वजन में अंतर या तार्किक कठिनाइयों के कारण ऑर्डर को संशोधित या रद्द करने का अधिकार सुरक्षित रखते हैं।"
  },
  {
    id: 4,
    titleEn: "4. Return Policies & Fresh Food Guarantee",
    titleHi: "4. वापसी नीतियां और ताजा भोजन गारंटी",
    descEn: "Perishables and fresh farm items can be processed for refunds matching instant inspection standards at high-speed regional centers.",
    descHi: "ताजा कृषि खाद्य वस्तुओं और जल्द खराब होने वाली वस्तुओं की वापसी पर तत्काल निरीक्षण के बाद क्षेत्रीय केंद्रों द्वारा रिफंड या प्रतिस्थापन संसाधित किया जा सकता है।"
  }
];

const initialRefundSections = [
  {
    id: 1,
    titleEn: "1. Order Cancellation Policy",
    titleHi: "1. ऑर्डर रद्दीकरण नीति",
    descEn: "Orders can be canceled free of charge within 10 minutes of placement or before dispatch from our local hub. Once the delivery rider is en route, cancellations may incur a nominal fee.",
    descHi: "ऑर्डर देने के 10 मिनट के भीतर या हमारे हब से डिस्पैच होने से पहले बिना किसी शुल्क के रद्द किए जा सकते हैं। राइडर के रवाना होने के बाद रद्दीकरण पर नाममात्र शुल्क लग सकता है।"
  },
  {
    id: 2,
    titleEn: "2. Fresh Produce & Doorstep Inspection Guarantee",
    titleHi: "2. ताज़ा उपज और डोरस्टेप निरीक्षण गारंटी",
    descEn: "Please inspect all fruits, vegetables, dairy, and perishables upon delivery. If any item is damaged, spoiled, or missing, inform our delivery partner at the doorstep or file a claim in the app within 2 hours for instant refund or replacement.",
    descHi: "कृपया डिलीवरी के समय सभी फलों, सब्जियों, डेयरी और जल्द खराब होने वाले सामान का निरीक्षण करें। यदि कोई आइटम क्षतिग्रस्त, खराब या गायब है, तो तुरंत डिलीवरी पार्टनर को बताएं या 2 घंटे के भीतर ऐप पर क्लेम करें।"
  },
  {
    id: 3,
    titleEn: "3. Refund Processing & Credit Timeline",
    titleHi: "3. रिफंड प्रोसेसिंग और क्रेडिट समयसीमा",
    descEn: "Prepaid online payments (UPI, Credit/Debit Cards, Net Banking) are refunded to the original payment method within 24–48 working hours. Cash on Delivery (COD) refunds are instantly credited to your Swastik Loyalty Wallet.",
    descHi: "प्रीपेड ऑनलाइन भुगतान (यूपीआई, कार्ड, नेट बैंकिंग) 24-48 कार्य घंटों के भीतर मूल भुगतान खाते में वापस जमा कर दिए जाते हैं। कैश ऑन डिलीवरी रिफंड तुरंत आपके स्वास्तिक वॉलेट में जमा किए जाते हैं।"
  },
  {
    id: 4,
    titleEn: "4. Non-Refundable Categories & Exceptions",
    titleHi: "4. गैर-वापसी योग्य श्रेणियां और अपवाद",
    descEn: "Personal hygiene items, unsealed cosmetics, opened packaged foods, and items stored improperly after delivery are non-refundable unless verified defective upon arrival.",
    descHi: "व्यक्तिगत स्वच्छता के उत्पाद, सील खुले सौंदर्य प्रसाधन, खुले पैकेज्ड खाद्य पदार्थ और डिलीवरी के बाद अनुचित तरीके से रखे गए सामान रिफंडेबल नहीं हैं।"
  }
];

const initialLocationGroups = [
  { id: 1, name: "Noida Sector 62 & 63", normalDelivery: 30, primeDelivery: 0, locations: "Sector 62, Sector 63, Shatabdi Vihar, Rajat Vihar", deliveryStartTime: "09:00", deliveryEndTime: "21:00", minFreeDeliveryAmount: 499 },
  { id: 2, name: "Indirapuram & Vasundhara", normalDelivery: 45, primeDelivery: 15, locations: "Ahimsa Khand, Vaibhav Khand, Vasundhara Sec 10, Gyan Khand", deliveryStartTime: "07:00", deliveryEndTime: "22:00", minFreeDeliveryAmount: 599 },
  { id: 3, name: "Noida Greater Extension", normalDelivery: 60, primeDelivery: 20, locations: "Gaur City 1, Gaur City 2, Eldeco Magnolias, Sector 1", deliveryStartTime: "08:00", deliveryEndTime: "20:00", minFreeDeliveryAmount: 699 }
];

const initialSlides = [
  {
    id: 1,
    labelEn: "Weekly Special Offers",
    labelHi: "साप्ताहिक विशेष ऑफर",
    titleEn: "Pure Organic Farm Fresh Produce\nDirect To Your Kitchen",
    titleHi: "शुद्ध जैविक खेत की ताजा उपज\nसीधे आपकी रसोई में",
    btnTextEn: "Shop Veggies",
    btnTextHi: "सब्जियां खरीदें",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCfjK4I9eqQgMsGsSxuAoLMH0CwtFS5Zm5KcILKEtjVOF3npOIuguy2M9Y7waVqYh_zl1JH3jB9g3Y6GHlTPjK1-eJnCX_M6Mq107yvdzkMyzwM3n2llALGPkHBQBvAIDdSF-xm_-aX6cSyyTgBxbpf4CooDdRmQedPe7q4PAJ3IKkmCZaE1Ytj6qL_nMSBEfgWSgfpJwDA2_RV8UhqnCqRV8ve_66C0OL7QkO1yKAoa1ZG-DcxpXRW84l3i7w33F42oMqFlhueWyzI",
    linkType: "category",
    linkValue: "vegetables"
  },
  {
    id: 2,
    labelEn: "Super Savings Pantry Check",
    labelHi: "सुपर बचत राशन चेक",
    titleEn: "Daily Grocery Staples & Grains\nUpto 15% Standard Refund",
    titleHi: "दैनिक राशन सामग्री और दालें\n15% तक की मानक छूट",
    btnTextEn: "Claim Offer",
    btnTextHi: "कूपन का दावा करें",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcfmwAZSMIA7U9LOdro856UcIVzIxTEM6PdXeMQqL2rVylvagcwhUnGgbHf6JzIiz70pAh_5KUjP5GxJHL-WfyHQzlBHbFCMaw-vog13zlum53YIwtQl8O7LzHNdyE56cCkKzJea1XEJIKXi0jkNzixschMPmBm-DiPa6X5ymJiRjVt9Rj-L-XymNuS3XOvEVnkaWsJ9DogrC5qtDeNFeCV_6u8cud_Sn0NuV_Mw6fZ_LjvUKwgXujVl8kf-UK9mBfUCy3O9LBif2I",
    linkType: "category",
    linkValue: "staples"
  }
];

// Helper for safely retrieving and parsing JSON from localStorage to prevent crashes
function safeJsonParse(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved);
  } catch (e) {
    console.warn(`[localStorage Error] Error parsing key "${key}":`, e);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    return defaultValue;
  }
}

export function DataProvider({ children }) {
  const settingsLoaded = useRef(false);

  const saveSettingToDb = async (key, value) => {
    if (!settingsLoaded.current) return;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (err) {
      console.warn(`Failed to save setting ${key} to DB:`, err);
    }
  };

  const [products, setProducts] = useState([]);
  const [r2PublicUrl, setR2PublicUrl] = useState(() => {
    return localStorage.getItem('swastik_r2_public_url') || '';
  });
  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [paymentEnvironment, setPaymentEnvironment] = useState("TEST");

  useEffect(() => {
    if (r2PublicUrl) {
      localStorage.setItem('swastik_r2_public_url', r2PublicUrl);
    }
  }, [r2PublicUrl]);

  const [reviews, setReviews] = useState([]);
  const [partners, setPartners] = useState([]);
  const [orders, setOrders] = useState([]);

  // Current active admin role configuration: 'customer' | 'admin' | 'manager'
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('swastik_user_role');
    return saved ? saved : 'customer';
  });

  // Dynamic state blocks for extensive admin dashboard settings
  const [categories, setCategories] = useState([]);

  const [offers, setOffers] = useState(() => {
    return safeJsonParse('swastik_offers', []);
  });

  const [contactMessages, setContactMessages] = useState(() => {
    return safeJsonParse('swastik_contact_messages', []);
  });

  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);

  // Data Deletion Requests State (User Requests for Account / Data Erasure)
  const [dataDeletionRequests, setDataDeletionRequests] = useState([]);

  const [aboutSettings, setAboutSettings] = useState({});

  const [contactSettings, setContactSettings] = useState({});

  const [referralSettings, setReferralSettings] = useState({});

  const [celebrationSettings, setCelebrationSettings] = useState({});

  const [primeSettings, setPrimeSettings] = useState({});

  const [slides, setSlides] = useState([]);

  const [locationGroups, setLocationGroups] = useState([]);

  // Synchronizers to localStorage and SQL Database
  useEffect(() => {
    localStorage.setItem('swastik_location_groups', JSON.stringify(locationGroups));
    saveSettingToDb('swastik_location_groups', locationGroups);
  }, [locationGroups]);

  useEffect(() => {
    localStorage.setItem('swastik_referral_settings', JSON.stringify(referralSettings));
    saveSettingToDb('swastik_referral_settings', referralSettings);
  }, [referralSettings]);

  useEffect(() => {
    localStorage.setItem('swastik_celebration_settings', JSON.stringify(celebrationSettings));
    saveSettingToDb('swastik_celebration_settings', celebrationSettings);
  }, [celebrationSettings]);

  useEffect(() => {
    localStorage.setItem('swastik_prime_settings', JSON.stringify(primeSettings));
    saveSettingToDb('swastik_prime_settings', primeSettings);
  }, [primeSettings]);

  useEffect(() => {
    localStorage.setItem('swastik_slides', JSON.stringify(slides));
    saveSettingToDb('swastik_slides', slides);
  }, [slides]);

  useEffect(() => {
    localStorage.setItem('swastik_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('swastik_categories', JSON.stringify(categories));
    saveSettingToDb('swastik_categories', categories);
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('swastik_offers', JSON.stringify(offers));
    saveSettingToDb('swastik_offers', offers);
  }, [offers]);

  useEffect(() => {
    localStorage.setItem('swastik_contact_messages', JSON.stringify(contactMessages));
    saveSettingToDb('swastik_contact_messages', contactMessages);
  }, [contactMessages]);


  useEffect(() => {
    localStorage.setItem('swastik_about_settings', JSON.stringify(aboutSettings));
    saveSettingToDb('swastik_about_settings', aboutSettings);
  }, [aboutSettings]);

  useEffect(() => {
    localStorage.setItem('swastik_contact_settings', JSON.stringify(contactSettings));
    saveSettingToDb('swastik_contact_settings', contactSettings);
  }, [contactSettings]);

  useEffect(() => {
    localStorage.setItem('swastik_orders', JSON.stringify(orders));
  }, [orders]);

  // Request tracking and cache flags to prevent redundant duplicate API calls
  const loadedMap = useRef({
    config: false,
    settings: false,
    products: false,
    orders: false,
    customers: false,
    staff: false,
    partners: false,
    reviews: false,
    deletionRequests: false
  });

  const inFlightMap = useRef({});

  // Synchronous refs to prevent useCallback dependency invalidation and infinite re-render loops
  const productsRef = useRef(products);
  productsRef.current = products;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const staffRef = useRef(staff);
  staffRef.current = staff;
  const partnersRef = useRef(partners);
  partnersRef.current = partners;
  const reviewsRef = useRef(reviews);
  reviewsRef.current = reviews;
  const deletionRequestsRef = useRef(dataDeletionRequests);
  deletionRequestsRef.current = dataDeletionRequests;

  // 1. App Configuration (Lightweight - R2 base URL & Payment switches)
  const fetchConfig = useCallback(async (force = false) => {
    if (loadedMap.current.config && !force) return;
    if (inFlightMap.current.config) return inFlightMap.current.config;

    inFlightMap.current.config = (async () => {
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const data = await configRes.json();
          if (data && data.r2PublicUrl) {
            setR2PublicUrl(data.r2PublicUrl);
          }
          if (data && data.paymentEnabled !== undefined) {
            setPaymentEnabled(data.paymentEnabled);
          }
          if (data && data.paymentEnvironment) {
            setPaymentEnvironment(data.paymentEnvironment);
          }
          loadedMap.current.config = true;
        }
      } catch (e) {
        console.warn("Failed to fetch R2 config:", e);
      } finally {
        delete inFlightMap.current.config;
      }
    })();
    return inFlightMap.current.config;
  }, []);

  // 2. Visual & Content Settings (Categories, Slides, Banners, Store Info)
  const fetchSettings = useCallback(async (force = false) => {
    if (loadedMap.current.settings && !force) return;
    if (inFlightMap.current.settings) return inFlightMap.current.settings;

    inFlightMap.current.settings = (async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          settingsLoaded.current = false;

          if (settingsData) {
            if (settingsData.swastik_location_groups && Array.isArray(settingsData.swastik_location_groups) && settingsData.swastik_location_groups.length > 0) {
              setLocationGroups(settingsData.swastik_location_groups);
              try { localStorage.setItem('swastik_location_groups', JSON.stringify(settingsData.swastik_location_groups)); } catch (_) {}
            }
            if (settingsData.swastik_referral_settings) setReferralSettings(settingsData.swastik_referral_settings);
            if (settingsData.swastik_celebration_settings) setCelebrationSettings(settingsData.swastik_celebration_settings);
            if (settingsData.swastik_prime_settings) setPrimeSettings(settingsData.swastik_prime_settings);
            if (settingsData.swastik_slides) setSlides(settingsData.swastik_slides);
            if (settingsData.swastik_categories) setCategories(settingsData.swastik_categories);
            if (settingsData.swastik_offers) setOffers(settingsData.swastik_offers);
            if (settingsData.swastik_contact_messages) setContactMessages(settingsData.swastik_contact_messages);
            if (settingsData.swastik_about_settings) setAboutSettings(settingsData.swastik_about_settings);
            if (settingsData.swastik_contact_settings) setContactSettings(settingsData.swastik_contact_settings);
            if (settingsData.swastik_refund_sections && Array.isArray(settingsData.swastik_refund_sections)) setRefundSections(settingsData.swastik_refund_sections);
            if (settingsData.swastik_privacy_sections && Array.isArray(settingsData.swastik_privacy_sections)) setPrivacySections(settingsData.swastik_privacy_sections);
            if (settingsData.swastik_terms_sections && Array.isArray(settingsData.swastik_terms_sections)) setTermsSections(settingsData.swastik_terms_sections);
          }
          loadedMap.current.settings = true;
        }
      } catch (e) {
        console.warn("Failed to fetch settings:", e);
      } finally {
        setTimeout(() => {
          settingsLoaded.current = true;
        }, 500);
        delete inFlightMap.current.settings;
      }
    })();
    return inFlightMap.current.settings;
  }, []);

  // 3. Products Loader (Only fetched on Home, Shop, Cart, or Products Manager)
  const fetchProducts = useCallback(async (force = false, isImage = null) => {
    if (loadedMap.current.products && !force) return productsRef.current;
    if (inFlightMap.current.products) return inFlightMap.current.products;
  
    inFlightMap.current.products = (async () => {
      try {
        const url = isImage !== null
          ? `/api/products?is_image=${isImage ? 1 : 0}`
          : '/api/products';
  
        const prodRes = await fetch(url);
  
        if (prodRes.ok) {
          const data = await prodRes.json();
  
          if (Array.isArray(data)) {
            setProducts(data);
            loadedMap.current.products = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch products:", e);
      } finally {
        delete inFlightMap.current.products;
      }
  
      return productsRef.current || [];
    })();
  
    return inFlightMap.current.products;
  }, []);

  // 4. Orders Loader (Only fetched on Admin Dashboard, Orders Manager, or User Account History)
  const fetchOrders = useCallback(async (force = false) => {
    if (loadedMap.current.orders && !force) return ordersRef.current;
    if (inFlightMap.current.orders) return inFlightMap.current.orders;

    inFlightMap.current.orders = (async () => {
      try {
        const orderRes = await fetch('/api/orders');
        if (orderRes.ok) {
          const data = await orderRes.json();
          if (Array.isArray(data)) {
            setOrders(data);
            loadedMap.current.orders = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch orders:", e);
      } finally {
        delete inFlightMap.current.orders;
      }
      return ordersRef.current || [];
    })();
    return inFlightMap.current.orders;
  }, []);

  // 5. Customers Loader (Only fetched on Customers Manager or Checkout Customer lookup)
  const fetchCustomers = useCallback(async () => {
    if (inFlightMap.current.customers) {
      return inFlightMap.current.customers;
    }
  
    inFlightMap.current.customers = (async () => {
      try {
        const custRes = await fetch('/api/customers');
  
        if (custRes.ok) {
          const custData = await custRes.json();
  
          if (Array.isArray(custData)) {
            setCustomers(custData);
            return custData;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch customers:", e);
      } finally {
        delete inFlightMap.current.customers;
      }
  
      return customersRef.current || [];
    })();
  
    return inFlightMap.current.customers;
  }, []);

  // 6. Staff Loader (Only fetched on Staff Manager, Delivery Dashboard, or Role checks)
  const fetchStaff = useCallback(async (force = false) => {
    if (loadedMap.current.staff && !force) return staffRef.current;
    if (inFlightMap.current.staff) return inFlightMap.current.staff;

    inFlightMap.current.staff = (async () => {
      try {
        const res = await fetch('/api/staff');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setStaff(list);
            loadedMap.current.staff = true;
            return list;
          }
        }
      } catch (e) {
        console.warn("Could not fetch staff from server:", e);
      } finally {
        delete inFlightMap.current.staff;
      }
      return staffRef.current || [];
    })();
    return inFlightMap.current.staff;
  }, []);

  // 7. Partners Loader (Only fetched on Partners page or Partners Admin)
  const fetchPartners = useCallback(async (force = false) => {
    if (loadedMap.current.partners && !force) return partnersRef.current;
    if (inFlightMap.current.partners) return inFlightMap.current.partners;

    inFlightMap.current.partners = (async () => {
      try {
        const partnerRes = await fetch('/api/partners');
        if (partnerRes.ok) {
          const data = await partnerRes.json();
          if (Array.isArray(data)) {
            setPartners(data);
            loadedMap.current.partners = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch partners:", e);
      } finally {
        delete inFlightMap.current.partners;
      }
      return partnersRef.current || [];
    })();
    return inFlightMap.current.partners;
  }, []);

  // 8. Reviews Loader (Only fetched on Reviews page or Reviews Admin)
  const fetchReviews = useCallback(async (force = false) => {
    if (loadedMap.current.reviews && !force) return reviewsRef.current;
    if (inFlightMap.current.reviews) return inFlightMap.current.reviews;

    inFlightMap.current.reviews = (async () => {
      try {
        const reviewRes = await fetch('/api/reviews');
        if (reviewRes.ok) {
          const data = await reviewRes.json();
          if (Array.isArray(data)) {
            setReviews(data);
            loadedMap.current.reviews = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch reviews:", e);
      } finally {
        delete inFlightMap.current.reviews;
      }
      return reviewsRef.current || [];
    })();
    return inFlightMap.current.reviews;
  }, []);

  // 9. Data Deletion Requests Loader (Only fetched on Data Deletion Admin tab)
  const fetchDataDeletionRequests = useCallback(async (force = false) => {
    if (loadedMap.current.deletionRequests && !force) return deletionRequestsRef.current;
    if (inFlightMap.current.deletionRequests) return inFlightMap.current.deletionRequests;

    inFlightMap.current.deletionRequests = (async () => {
      try {
        const delReqRes = await fetch('/api/data-deletion-requests');
        if (delReqRes.ok) {
          const delReqData = await delReqRes.json();
          if (Array.isArray(delReqData)) {
            setDataDeletionRequests(delReqData);
            loadedMap.current.deletionRequests = true;
            return delReqData;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch data deletion requests:", e);
      } finally {
        delete inFlightMap.current.deletionRequests;
      }
      return deletionRequestsRef.current || [];
    })();
    return inFlightMap.current.deletionRequests;
  }, []);

  // Backward-compatible fetchAll (only fetches core visual settings and products)
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchConfig(true),
      fetchSettings(true),
      fetchProducts(true),
      fetchCustomers(true),
      fetchStaff(true),
      fetchDataDeletionRequests(true)
    ]);
  }, [fetchConfig, fetchSettings, fetchProducts, fetchCustomers, fetchStaff, fetchDataDeletionRequests]);

  // Initial App Mount: load core storefront config and public store settings
  useEffect(() => {
    fetchConfig();
    fetchSettings();
  }, [fetchConfig, fetchSettings]);

  useEffect(() => {
    localStorage.setItem('swastik_user_role', userRole);
  }, [userRole]);

  // CRUD actions for products via GORM REST API
  const addProduct = async (p) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        const created = await res.json();
        setProducts(prev => [...prev, created]);
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Product creation failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateProduct = async (id, updated) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const saved = await res.json();
        setProducts(prev => prev.map(p => p.id === Number(id) ? { ...p, ...saved } : p));
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Product update failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== Number(id)));
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Product deactivation failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const clearAllProducts = async () => {
    try {
      const res = await fetch('/api/products', { method: 'DELETE' });
      if (res.ok) {
        setProducts([]);
        return true;
      }
    } catch (e) {
      console.error("Failed to clear products:", e);
    }
    return false;
  };

  const bulkUploadProducts = async (items, options = {}) => {
    try {
      const res = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          mode: options.mode || 'update_existing',
          defaultCategory: options.defaultCategory || 'swastik'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          await fetchProducts();
        }
        return data;
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to bulk upload products");
      }
    } catch (e) {
      console.error("bulkUploadProducts error:", e);
      throw e;
    }
  };

  const bulkUpdateStock = async (payload) => {
    try {
      const res = await fetch('/api/products/bulk-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          await fetchProducts();
        }
        return data;
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to update bulk stock");
      }
    } catch (e) {
      console.error("bulkUpdateStock error:", e);
      throw e;
    }
  };

  // CRUD actions for partners via GORM REST API
  const addPartner = async (par) => {
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(par),
      });
      if (res.ok) {
        const created = await res.json();
        setPartners(prev => [...prev, created]);
      } else {
        const newId = partners.length > 0 ? Math.max(...partners.map(x => x.id)) + 1 : 1;
        setPartners(prev => [...prev, { ...par, id: newId }]);
      }
    } catch (e) {
      console.error(e);
      const newId = partners.length > 0 ? Math.max(...partners.map(x => x.id)) + 1 : 1;
      setPartners(prev => [...prev, { ...par, id: newId }]);
    }
  };

  const updatePartner = async (id, updated) => {
    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const returned = await res.json();
        setPartners(prev => prev.map(p => p.id === Number(id) ? { ...p, ...returned } : p));
        return returned;
      } else {
        setPartners(prev => prev.map(p => p.id === Number(id) ? { ...p, ...updated } : p));
        return { id: Number(id), ...updated };
      }
    } catch (e) {
      console.error("Failed to update partner:", e);
      setPartners(prev => prev.map(p => p.id === Number(id) ? { ...p, ...updated } : p));
      return { id: Number(id), ...updated };
    }
  };

  const deletePartner = async (id) => {
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPartners(prev => prev.filter(p => p.id !== Number(id)));
      } else {
        setPartners(prev => prev.filter(p => p.id !== Number(id)));
      }
    } catch (e) {
      console.error(e);
      setPartners(prev => prev.filter(p => p.id !== Number(id)));
    }
  };

  // CRUD actions for Google Reviews via GORM REST API
  const addReview = async (rev) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rev),
      });
      if (res.ok) {
        const created = await res.json();
        setReviews(prev => [created, ...prev]);
      } else {
        const newId = reviews.length > 0 ? Math.max(...reviews.map(x => x.id)) + 1 : 1;
        setReviews(prev => [{ ...rev, id: newId, date: "Just now" }, ...prev]);
      }
    } catch (e) {
      console.error(e);
      const newId = reviews.length > 0 ? Math.max(...reviews.map(x => x.id)) + 1 : 1;
      setReviews(prev => [{ ...rev, id: newId, date: "Just now" }, ...prev]);
    }
  };

  const updateReview = async (id, updated) => {
    try {
      const res = await fetch(`/api/reviews/${id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: updated.response || '' }),
      });
      if (res.ok) {
        setReviews(prev => prev.map(r => r.id === Number(id) ? { ...r, ...updated } : r));
      } else {
        setReviews(prev => prev.map(r => r.id === Number(id) ? { ...r, ...updated } : r));
      }
    } catch (e) {
      console.error(e);
      setReviews(prev => prev.map(r => r.id === Number(id) ? { ...r, ...updated } : r));
    }
  };

  const deleteReview = async (id) => {
    setReviews(prev => prev.filter(r => r.id !== Number(id) && String(r.id) !== String(id)));
    try {
      await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete review on server:", e);
    }
  };

  // CRUD actions for Orders via GORM REST API
  const addOrder = async (order) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      let createdOrder = order;
      if (res.ok) {
        const serverData = await res.json();
        createdOrder = { ...order, ...serverData };
        setOrders(prev => [createdOrder, ...prev]);

        await fetchProducts(true);

   

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('swastik:refresh-notifications'));
        }

        return { success: true, order: createdOrder };
      } else {
        const errorData = await res.json();
        return { success: false, error: errorData.error, errorHi: errorData.error_hi };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message || 'Order creation failed.' };
    }
  };

  const updateOrder = async (id, updated) => {
    try {
      const existingOrder = orders.find(o => String(o.id) === String(id));
      if (existingOrder && isOrder1HourLocked(existingOrder)) {
        const keys = Object.keys(updated);
        // Once an order is delivered and locked, paymentStatus and paymentMethod are also locked.
        // The ONLY allowed updates are Admin cash clearance / settlement records.
        const allowedSettlementKeys = [
          'codStatus', 'codNotes', 'codClearedAt', 'codClearedBy', 'codClearanceNote',
          'adminReceivedCash', 'adminCashReceivedAt', 'adminReceivedBy',
          'adminCollectedConfirm', 'adminCollectedAt', 'isSettled', 'settledAt',
          'settlementStatus', 'settledAmount', 'id'
        ];
        const hasRestrictedChanges = keys.some(k => !allowedSettlementKeys.includes(k) && JSON.stringify(existingOrder[k]) !== JSON.stringify(updated[k]));
        if (hasRestrictedChanges) {
          console.warn(`Order #${id} is delivered and permanently locked. Status and payment marking are immutable. Only Admin cash receipt from delivery staff can be recorded.`);
          const sanitizedPayload = {};
          allowedSettlementKeys.forEach(k => {
            if (updated[k] !== undefined) sanitizedPayload[k] = updated[k];
          });
          if (Object.keys(sanitizedPayload).length === 0) return;
          updated = sanitizedPayload;
        }
      }

      // Automatically update local product stock if order status transitions to or from Cancelled
      if (existingOrder && Array.isArray(existingOrder.items) && existingOrder.items.length > 0) {
        const wasCancelled = (existingOrder.status || "").toLowerCase().includes("cancel") || existingOrder.step === -1;
        const isNowCancelled = (updated.status || "").toLowerCase().includes("cancel") || updated.step === -1;

        if (isNowCancelled && !wasCancelled) {
          // Restore stock locally
          setProducts(prevProducts => {
            return prevProducts.map(p => {
              const matchedItem = existingOrder.items.find(it => Number(it.productId || it.id) === Number(p.id));
              if (matchedItem) {
                const qtyToAdd = Number(matchedItem.quantity || matchedItem.qty || 1);
                const currentStock = Number(p.stockCount || 0);
                return { ...p, stockCount: currentStock + qtyToAdd };
              }
              return p;
            });
          });
        } else if (!isNowCancelled && wasCancelled) {
          // Re-deduct stock locally if uncancelled
          setProducts(prevProducts => {
            return prevProducts.map(p => {
              const matchedItem = existingOrder.items.find(it => Number(it.productId || it.id) === Number(p.id));
              if (matchedItem) {
                const qtyToSub = Number(matchedItem.quantity || matchedItem.qty || 1);
                const currentStock = Number(p.stockCount || 0);
                const newStock = Math.max(0, currentStock - qtyToSub);
                return { ...p, stockCount: newStock };
              }
              return p;
            });
          });
        }
      }

      const res = await fetch(`/api/orders/${id}/transit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saved.error || 'Order update failed.');
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? saved : o));
      await fetchProducts(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('swastik:refresh-notifications'));
      }
    } catch (e) {
      console.error(e);
      await Promise.all([fetchOrders(true), fetchProducts(true)]);
      throw e;
    }
  };

  const deleteOrder = async (id) => {
    try {
      const response = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Order deletion failed (HTTP ${response.status})`);
      }

      setOrders(prev => prev.filter(o => o.id !== id && String(o.id) !== String(id)));
      await Promise.all([fetchProducts(true), fetchCustomers()]);
      return { success: true };
    } catch (e) {
      console.error("Order deletion error:", e);
      return { success: false, error: e.message };
    }
  };

  // Dynamic categories CRUD
  const addCategory = (cat) => {
    setCategories(prev => [...prev, cat]);
  };
  const updateCategory = (id, updated) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };
  const deleteCategory = (id) => {
    setCategories(prev => {
      const updated = prev.filter(c => c.id !== id && String(c.id) !== String(id));
      localStorage.setItem('swastik_categories', JSON.stringify(updated));
      saveSettingToDb('swastik_categories', updated);
      return updated;
    });
  };

  // Dynamic offers CRUD
  const addOffer = (off) => {
    const newId = offers.length > 0 ? Math.max(...offers.map(o => o.id)) + 1 : 1;
    setOffers(prev => [...prev, { ...off, id: newId }]);
  };
  const updateOffer = (id, updated) => {
    setOffers(prev => prev.map(o => (o.id === id || String(o.id) === String(id) || o.id === Number(id)) ? { ...o, ...updated } : o));
  };
  const deleteOffer = (id) => {
    setOffers(prev => {
      const updated = prev.filter(o => o.id !== id && String(o.id) !== String(id) && o.id !== Number(id));
      localStorage.setItem('swastik_offers', JSON.stringify(updated));
      saveSettingToDb('swastik_offers', updated);
      return updated;
    });
  };

  // Dynamic contact messages submission
  const addContactMessage = (msg) => {
    const newId = contactMessages.length > 0 ? Math.max(...contactMessages.map(m => m.id)) + 1 : 1;
    setContactMessages(prev => [{ ...msg, id: newId, date: "Just now", answer: "" }, ...prev]);
  };
  const updateContactMessage = (id, updated) => {
    setContactMessages(prev => prev.map(m => (m.id === id || String(m.id) === String(id) || m.id === Number(id)) ? { ...m, ...updated } : m));
  };
  const deleteContactMessage = (id) => {
    setContactMessages(prev => {
      const updated = prev.filter(m => m.id !== id && String(m.id) !== String(id) && m.id !== Number(id));
      localStorage.setItem('swastik_contact_messages', JSON.stringify(updated));
      saveSettingToDb('swastik_contact_messages', updated);
      return updated;
    });
  };

  // Dynamic customers register & synchronization with backend
  const upsertCustomer = async (custData) => {
    if (!custData) return null;
    const response = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custData) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.customer) throw new Error(result.error || 'Customer creation failed.');
    await fetchCustomers(true);
    return result.customer;
  };

  const addCustomer = (cust) => {
    return upsertCustomer(cust);
  };

  const updateCustomer = async (id, updated) => {
    const custId = Number(id);
    const response = await fetch(`/api/customers/${custId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.customer) throw new Error(result.error || 'Customer update failed.');
    setCustomers(prev => prev.map(customer => customer.id === custId ? result.customer : customer));
    await fetchOrders(true);
    return result.customer;
  };

  const deleteCustomer = async (id) => {
    const custId = Number(id);
    const response = await fetch(`/api/customers/${custId}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Customer deletion failed.');
    await fetchCustomers(true);
    return true;
  };

  const dataDeletionRequest = async (url, options = {}) => {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Data deletion requests are unavailable.');
    return result;
  };

  const addDataDeletionRequest = async reqData => {
    const result = await dataDeletionRequest('/api/data-deletion-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqData) });
    await fetchDataDeletionRequests(true);
    return result.request;
  };
  const approveDataDeletionRequest = async (requestId, adminNotes = '') => dataDeletionRequest(`/api/data-deletion-requests/${requestId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes }) });
  const rejectDataDeletionRequest = async (requestId, adminNotes = '') => dataDeletionRequest(`/api/data-deletion-requests/${requestId}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes }) });
  const deleteDataDeletionRequest = async requestId => dataDeletionRequest(`/api/data-deletion-requests/${requestId}`, { method: 'DELETE' });

  // ------------------------------------
  // STAFF & PERMISSIONS SYSTEM
  // ------------------------------------
  const addStaff = async (s) => {
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create staff member');
      setStaff(prev => [...prev.filter(item => item.id !== data.staff.id), data.staff]);
      return { success: true, staff: data.staff };
    } catch (e) {
      console.error('Staff creation failed:', e);
      return { success: false, error: e.message };
    }
  };

  const updateStaff = async (id, updated) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update staff member');
      setStaff(prev => prev.map(item => item.id === Number(id) ? data.staff : item));
      return { success: true, staff: data.staff };
    } catch (e) {
      console.error('Staff update failed:', e);
      return { success: false, error: e.message };
    }
  };

  const deleteStaff = async (id) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete staff member');
      setStaff(prev => prev.filter(item => item.id !== Number(id)));
      return { success: true };
    } catch (e) {
      console.error('Staff deletion failed:', e);
      return { success: false, error: e.message };
    }
  };

  const changeStaffPassword = async (mobile, oldPassword, newPassword) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, oldPassword, newPassword })
      });
      if (res.ok) {
        return { success: true };
      } else {
        const text = await res.text();
        let errMsg = 'Rejection from security server';
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.error) errMsg = parsed.error;
        } catch (je) {}
        return { success: false, error: errMsg };
      }
    } catch (e) {
      console.warn("Password update request failed:", e);
      return { success: false, error: 'Could not reach the security server' };
    }
  };

  // Dynamic Privacy, Terms and Refund state
  const [privacySections, setPrivacySections] = useState([]);

  const [termsSections, setTermsSections] = useState([]);

  const [refundSections, setRefundSections] = useState([]);

  useEffect(() => {
    localStorage.setItem('swastik_privacy_sections', JSON.stringify(privacySections));
    saveSettingToDb('swastik_privacy_sections', privacySections);
  }, [privacySections]);

  useEffect(() => {
    localStorage.setItem('swastik_terms_sections', JSON.stringify(termsSections));
    saveSettingToDb('swastik_terms_sections', termsSections);
  }, [termsSections]);

  useEffect(() => {
    localStorage.setItem('swastik_refund_sections', JSON.stringify(refundSections));
    saveSettingToDb('swastik_refund_sections', refundSections);
  }, [refundSections]);

  const addPrivacySection = (sect) => {
    const newId = privacySections.length > 0 ? Math.max(...privacySections.map(s => s.id)) + 1 : 1;
    setPrivacySections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updatePrivacySection = (id, updated) => {
    setPrivacySections(prev => prev.map(s => s.id === Number(id) ? { ...s, ...updated } : s));
  };
  const deletePrivacySection = (id) => {
    setPrivacySections(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  const addTermsSection = (sect) => {
    const newId = termsSections.length > 0 ? Math.max(...termsSections.map(s => s.id)) + 1 : 1;
    setTermsSections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updateTermsSection = (id, updated) => {
    setTermsSections(prev => prev.map(s => (s.id === id || String(s.id) === String(id) || s.id === Number(id)) ? { ...s, ...updated } : s));
  };
  const deleteTermsSection = (id) => {
    setTermsSections(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  const addRefundSection = (sect) => {
    const newId = refundSections.length > 0 ? Math.max(...refundSections.map(s => s.id)) + 1 : 1;
    setRefundSections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updateRefundSection = (id, updated) => {
    setRefundSections(prev => prev.map(s => (s.id === id || String(s.id) === String(id) || s.id === Number(id)) ? { ...s, ...updated } : s));
  };
  const deleteRefundSection = (id) => {
    setRefundSections(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  // Dynamic Slider/Banner CRUD Actions
  const addSlide = (slide) => {
    const newId = slides.length > 0 ? Math.max(...slides.map(s => s.id)) + 1 : 1;
    setSlides(prev => [...prev, { ...slide, id: newId }]);
  };
  const updateSlide = (id, updated) => {
    setSlides(prev => prev.map(s => (s.id === id || String(s.id) === String(id) || s.id === Number(id)) ? { ...s, ...updated } : s));
  };
  const deleteSlide = (id) => {
    setSlides(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  return (
    <DataContext.Provider value={{
      slides,
      addSlide,
      updateSlide,
      deleteSlide,
      privacySections,
      setPrivacySections,
      addPrivacySection,
      updatePrivacySection,
      deletePrivacySection,
      termsSections,
      setTermsSections,
      addTermsSection,
      updateTermsSection,
      deleteTermsSection,
      refundSections,
      setRefundSections,
      addRefundSection,
      updateRefundSection,
      deleteRefundSection,
      products,
      setProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      clearAllProducts,
      bulkUploadProducts,
      bulkUpdateStock,
      r2PublicUrl,
      setR2PublicUrl,
      paymentEnabled,
      setPaymentEnabled,
      paymentEnvironment,
      setPaymentEnvironment,
      reviews,
      addReview,
      updateReview,
      deleteReview,
      partners,
      addPartner,
      updatePartner,
      deletePartner,
      orders,
      addOrder,
      updateOrder,
      deleteOrder,
      userRole,
      setUserRole,
      categories,
      setCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      offers,
      setOffers,
      addOffer,
      updateOffer,
      deleteOffer,
      contactMessages,
      addContactMessage,
      updateContactMessage,
      deleteContactMessage,
      customers,
      setCustomers,
      addCustomer,
      upsertCustomer,
      updateCustomer,
      deleteCustomer,
      dataDeletionRequests,
      setDataDeletionRequests,
      addDataDeletionRequest,
      approveDataDeletionRequest,
      rejectDataDeletionRequest,
      deleteDataDeletionRequest,
      aboutSettings,
      setAboutSettings,
      contactSettings,
      setContactSettings,
      referralSettings,
      setReferralSettings,
      celebrationSettings,
      setCelebrationSettings,
      primeSettings,
      setPrimeSettings,
      locationGroups,
      setLocationGroups,
      staff,
      setStaff,
      addStaff,
      updateStaff,
      deleteStaff,
      changeStaffPassword,
      // Granular on-demand data loaders
      fetchConfig,
      fetchSettings,
      fetchProducts,
      fetchOrders,
      fetchCustomers,
      fetchStaff,
      fetchPartners,
      fetchReviews,
      fetchDataDeletionRequests,
      fetchAll
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
