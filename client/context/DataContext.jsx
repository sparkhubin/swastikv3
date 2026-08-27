import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { products as initialProducts } from '../data/products';
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

// Coupon structures
const initialOffers = [
  { id: 1, code: 'SWASTIK50', discountType: 'fixed', value: 50, minOrder: 299, startDate: '2026-01-01', endDate: '2026-12-31', maxUsesPerCustomer: 1, bannerEn: 'Get ₹50 flat discount on your next order!', bannerHi: 'अपने अगले ऑर्डर पर ₹50 की फ्लैट छूट पाएं!', descriptionEn: 'Applicable for cart value above ₹299. Max 1 use per user.', descriptionHi: '₹299 से अधिक के कार्ट मूल्य पर लागू। प्रति ग्राहक 1 बार।' },
  { id: 2, code: 'FREESHIP', discountType: 'percentage', value: 10, minOrder: 499, startDate: '2026-05-01', endDate: '2026-12-31', maxUsesPerCustomer: 2, bannerEn: 'Unlock 10% off & Free Delivery above ₹499!', bannerHi: '₹499 से ऊपर 10% की छूट और मुफ्त डिलीवरी!', descriptionEn: 'Maximum discount ₹100. Max 2 uses per user.', descriptionHi: 'अधिकतम छूट ₹100। प्रति ग्राहक 2 बार।' },
  { id: 3, code: 'ORGANICNEW', discountType: 'percentage', value: 15, minOrder: 199, startDate: '2026-06-01', endDate: '2026-12-31', maxUsesPerCustomer: 1, bannerEn: 'Flat 15% discount for organic growers trial!', bannerHi: 'जैविक किसानों के परीक्षण के लिए फ्लैट 15% छूट!', descriptionEn: 'Valid for new buyers block. Max 1 use per user.', descriptionHi: 'नए खरीदारों के लिए माननीय। प्रति ग्राहक 1 बार।' }
];

// Submission messages from customers
const initialContactMessages = [
  { id: 1, name: 'Sanjay Dutt', mobile: '9810123456', subject: 'Bulk Delivery Enquiry', message: 'I want to order 50kg Royal Gala Apples for a family function on coming Saturday. Can you schedule the shipment?', answer: 'Yes! We can coordinate with Rajesh Farms. Our manager will call you for confirmation.', date: 'Today, 10:15 AM' },
  { id: 2, name: 'Neelam Sen', mobile: '9211054321', subject: 'Refund delay status', message: 'Order SW-9824 got partial refund but standard credit was not credited in my account.', answer: '', date: 'Yesterday' }
];

// In-app directory for customers database
const initialCustomers = [
  { id: 101, name: 'Amit Sharma', phone: '+91 98765 12345', email: 'amit@gmail.com', registeredAt: '2026-01-10', orderCount: 14, totalSpent: 6720, status: 'Active', dob: '1990-07-14', anniversary: '2018-12-25' },
  { id: 102, name: 'Pooja Patel', phone: '+91 91234 56789', email: 'pooja.patel@yahoo.com', registeredAt: '2026-02-14', orderCount: 22, totalSpent: 11450, status: 'Active', dob: '1993-05-10', anniversary: '2015-07-14' },
  { id: 103, name: 'Vikram Malhotra', phone: '+91 99887 76655', email: 'vikram10@outlook.com', registeredAt: '2026-03-20', orderCount: 8, totalSpent: 4210, status: 'Active', dob: '1994-11-20', anniversary: '2020-05-18' },
  { id: 104, name: 'Sanjay Dutt', phone: '+91 98101 23456', email: 'sanjay.dutt@gmail.com', registeredAt: '2026-04-18', orderCount: 1, totalSpent: 850, status: 'Active', dob: '1985-07-14', anniversary: '' },
  { id: 105, name: 'Rajesh G', phone: '+91 94451 00010', email: 'rajesh.farm@yahoo.com', registeredAt: '2026-05-02', orderCount: 0, totalSpent: 0, status: 'Inactive', dob: '', anniversary: '' }
];

// About info details configurations
const initialAboutSettings = {
  titleEn: 'Crafting Freshness Since 2018',
  titleHi: '2018 से ताजगी का निर्माण',
  storyEn: 'Swastik Supermarket was established with a singular vision - to bridge the gap between premium sustainable local organic farmers and urban households directly in less than 15 minutes. We source daily, test for purity, and employ eco-friendly logistic delivery coordinates to guarantee high-integrity groceries for your kitchen.',
  storyHi: 'स्वास्तिक सुपरमार्केट की स्थापना एक अनूठे लक्ष्य के साथ की गई थी - प्रीमियम टिकाऊ स्थानीय जैविक किसानों और शहर के घरों के बीच की दूरी को 15 मिनट से भी कम समय में सीधे पाटना। हम दैनिक रूप से सामग्री मंगवाते हैं, शुद्धता का परीक्षण करते हैं, और आपकी रसोई के लिए उच्च सत्यता वाली किराने के सामान की गारंटी के लिए इको-फ्रेंडली लॉजिस्टिक डिलीवरी का उपयोग करते हैं।'
};

// Unified dynamic contact address block
const initialContactSettings = {
  brandName: 'Swastik Supermarket',
  tagline: 'Aapka Apna Bazaar',
  subtitle: 'Drop us a line if you have queries regarding bulk orders, delay offsets, or partnership propositions.',
  address: 'Survey no. 100 Sanjit road opposite of Saraswati school , Mandsaur, India, Madhya Pradesh',
  phone: '094845 40001',
  email: 'info.swastiksupermarket@gmail.com',
  website: 'https://www.swastiksupermarket.com',
  gst: '23AAAAA1111A1Z1',
  license: 'FSSAI-12345678901234',
  logo: '/swastik-logo.svg',
  banner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7zupgGDM4rLNPqaVUDi49IYYmDPm8we0M1paGQ0P1xQM4TgUKOW1hAxsPwEJYVlslYIGGelWSHP2AbAsD6tdQUi8psCrpIgqLdnWEBRUvnn1y3phC3GMAX5nlBQrVq6HZdqDsrg-Fo2h5dwMQoYw6-xL1HRXQIkTg089XtLVzO2aMDTUftCLWp9Y9HDjOsAaK-LlpwxMS7n2AnfWSjTjC__z4UeTSYCXxEQDyAmshwnbevNh58O6yJ3J52NXWKXYTarHYA5spvG5C',
  latitude: 24.0723,
  longitude: 75.0698,
  deliveryChargeNear: 0,
  deliveryChargeMedium: 25,
  deliveryChargeFar: 45,
  deliveryChargeOutlier: 75,
  freeDeliveryMinAmount: 500
};

const initialReviews = [
  {
    id: 1,
    name: "Amit Sharma",
    rating: 5,
    commentEn: "Absolutely stellar experience with Swastik Supermarket! The organic fruits are premium quality and the local deliveries always take less than 15 minutes. Highly recommended!",
    commentHi: "स्वास्तिक सुपरमार्केट के साथ बिल्कुल शानदार अनुभव! जैविक फल प्रीमियम गुणवत्ता के हैं और स्थानीय डिलीवरी हमेशा 15 मिनट से भी कम समय लेती है। अत्यधिक अनुशंसित!",
    avatarBg: "from-cyan-400 to-blue-500",
    date: "2 days ago",
    response: "Thank you Amit! We work directly with local farmers to ensure top-tier freshness."
  },
  {
    id: 2,
    name: "Pooja Patel",
    rating: 5,
    commentEn: "Love the offer zone and multi-lingual layout! I save over ₹1,500 every month. The bilingual English-Hindi interface is so smooth and flawless for my parents to order their dairy essentials.",
    commentHi: "ऑफ़र ज़ोन और बहुभाषी लेआउट बहुत पसंद आया! मैं हर महीने ₹1,500 से अधिक बचाती हूँ। अंग्रेजी-हिन्दी इंटरफ़ेस बहुत सहज है, जिससे मेरे माता-पिता के लिए डेयरी उत्पाद ऑर्डर करना आसान हो गया है।",
    avatarBg: "from-pink-500 to-rose-400",
    date: "1 week ago",
    response: "Glad to be of service, Pooja! We are continuing to expand our staples and dairy discount sections."
  },
  {
    id: 3,
    name: "Vikram Malhotra",
    rating: 4,
    commentEn: "Exceptional range of daily staples. The organic Toor Dal and Basmati Rice are pure. Minor delay once in transit, but their live chat and delivery support immediately solved and refunded.",
    commentHi: "दैनिक आवश्यक वस्तुओं की असाधारण श्रृंखला। जैविक तूर दाल और बासमती चावल शुद्ध हैं। एक बार रास्ते में थोड़ी देरी हुई थी, लेकिन उनके लाइव चैट और डिलीवरी सपोर्ट ने तुरंत हल कर दिया।",
    avatarBg: "from-purple-500 to-indigo-600",
    date: "3 days ago",
    response: "Appreciate your feedback, Vikram! We are tightening logistics to assure precise delivery times."
  }
];

const initialPartners = [
  {
    id: 1,
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    name: "Rajesh Patidar",
    designation: "Sourcing Director (Fruits & Vegetables)",
    about: "Rajesh manages our fresh local grower networks. He is responsible for testing purity, supervising rapid logistics collection timelines, and ensuring organic quality on all botanical essentials."
  },
  {
    id: 2,
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    name: "Sunita Deshmukh",
    designation: "Organic Dairy Lead",
    about: "Sunita supervises our direct milk co-operatives and poultry segments in Greater Noida. She has over 15 years of quality control experience and works to assure pristine hormone-free daily dairy products."
  },
  {
    id: 3,
    photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=200",
    name: "Vikram Sen",
    designation: "Hyper-Local Logistics Coordinator",
    about: "Vikram keeps our dispatch hubs and courier networks perfectly synchronized, assuring zero delays in Swastik's rapid checkout SLA. He coordinates active transit pathways across Noida Sectors."
  }
];

const initialOrders = [
  {
    id: "SW-9831",
    date: "June 02, 2026",
    status: "In Transit",
    isActive: true,
    step: 1, // 0 = Confirmed, 1 = In Transit, 2 = Delivered
    subtotal: 449,
    deliveryFee: 0,
    gst: 81,
    total: 530,
    deliveryPartnerName: "Pradeep Kumar (Swastik Rider)",
    deliveryPartnerPhone: "+91 95400 12099",
    hubName: "Alpha Hub, Sector 12",
    eta: "15 Mins",
    customerName: "Amit Sharma",
    customerPhone: "+91 98765 12345",
    items: [
      { id: 3, nameEn: "Long Grain Basmati Rice (5kg)", nameHi: "लॉन्ग ग्रेन बासमती चावल (5 किलो)", price: 449, qty: 1, weight: "5kg" }
    ]
  },
  {
    id: "SW-9824",
    date: "May 30, 2026",
    status: "Delivered",
    isActive: false,
    step: 2,
    subtotal: 350,
    deliveryFee: 40,
    gst: 63,
    total: 453,
    deliveryPartnerName: "Arun Dev",
    deliveryPartnerPhone: "+91 91288 34321",
    hubName: "Alpha Hub, Sector 12",
    eta: "Delivered",
    customerName: "Pooja Patel",
    customerPhone: "+91 91234 56789",
    items: [
      { id: 1, nameEn: "Premium Royal Gala Apples (1kg)", nameHi: "प्रीमियम रॉयल गाला सेब (1 किलो)", price: 180, qty: 1, weight: "1kg" },
      { id: 14, nameEn: "Greek Yogurt 400g", nameHi: "ग्रीक योगर्ट 400 ग्राम", price: 170, qty: 1, weight: "400g" }
    ]
  }
];

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

  const [products, setProducts] = useState(initialProducts);
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

  const [reviews, setReviews] = useState(() => {
    return safeJsonParse('swastik_reviews', initialReviews);
  });
  const [partners, setPartners] = useState(initialPartners);
  const [orders, setOrders] = useState(() => {
    return safeJsonParse('swastik_orders', initialOrders);
  });

  // Current active admin role configuration: 'customer' | 'admin' | 'manager'
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('swastik_user_role');
    return saved ? saved : 'customer';
  });

  // Dynamic state blocks for extensive admin dashboard settings
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('swastik_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.some(c => c.id === 'vegetables' || c.id === 'dairy' || c.id === 'staples' || c.id === 'snacks')) {
          localStorage.removeItem('swastik_categories');
          return initialCategories;
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Error parsing swastik_categories:", e);
      try { localStorage.removeItem('swastik_categories'); } catch (_) {}
    }
    return initialCategories;
  });

  const [offers, setOffers] = useState(() => {
    return safeJsonParse('swastik_offers', initialOffers);
  });

  const [contactMessages, setContactMessages] = useState(() => {
    return safeJsonParse('swastik_contact_messages', initialContactMessages);
  });

  const [customers, setCustomers] = useState(() => {
    return safeJsonParse('swastik_customers', initialCustomers);
  });

  const [aboutSettings, setAboutSettings] = useState(() => {
    return safeJsonParse('swastik_about_settings', initialAboutSettings);
  });

  const [contactSettings, setContactSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('swastik_contact_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.address || parsed.address.includes('Noida') || parsed.email?.includes('support@swastik.com') || parsed.logo?.includes('lh3.googleusercontent')) {
          localStorage.removeItem('swastik_contact_settings');
          return initialContactSettings;
        }
        return { ...initialContactSettings, ...parsed };
      }
    } catch (e) {
      console.warn("Error parsing swastik_contact_settings:", e);
      try { localStorage.removeItem('swastik_contact_settings'); } catch (_) {}
    }
    return initialContactSettings;
  });

  const [referralSettings, setReferralSettings] = useState(() => {
    const defaultVal = {
      referralPointsEarned: 50,
      pointsValueInINR: 1,
      minPointsRedeem: 10,
      maxPointsRedeem: 100,
      firstLoginPoints: 100
    };
    try {
      const saved = localStorage.getItem('swastik_referral_settings');
      if (saved) {
        return { ...defaultVal, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Error parsing swastik_referral_settings:", e);
      try { localStorage.removeItem('swastik_referral_settings'); } catch (_) {}
    }
    return defaultVal;
  });

  const [celebrationSettings, setCelebrationSettings] = useState(() => {
    const defaultVal = {
      birthdayDiscountPercent: 15,
      birthdayMinAmount: 300,
      birthdayOfferDetails: "Birthday special! Enjoy flat 15% discount on your special day.",
      birthdayOfferDetailsHi: "जन्मदिन विशेष! अपने खास दिन पर फ्लैट 15% की छूट का आनंद लें।",
      anniversaryDiscountPercent: 20,
      anniversaryMinAmount: 500,
      anniversaryOfferDetails: "Anniversary Celebration! Get a flat 20% discount on your special day.",
      anniversaryOfferDetailsHi: "सालगिरह मुबारक! अपने खास दिन पर फ्लैट 20% की छूट पाएं।"
    };
    return safeJsonParse('swastik_celebration_settings', defaultVal);
  });

  const [primeSettings, setPrimeSettings] = useState(() => {
    const defaultVal = {
      isMembershipEnabled: true,
      primePlanFee: 299,
      primeBenefit1En: "Free / Reduced Delivery",
      primeBenefitDesc1En: "Maximum relief on all location groups",
      primeBenefit1Hi: "जीरो डिलीवरी शुल्क",
      primeBenefitDesc1Hi: "सभी चुनिंदा क्षेत्रों पर भारी बचत",
      primeBenefit2En: "VIP Priority Dispatch",
      primeBenefitDesc2En: "Express processing by our direct team",
      primeBenefit2Hi: "अल्ट्रा-फास्ट स्लॉट",
      primeBenefitDesc2Hi: "आपका आर्डर सबसे पहले पैक और डिलीवर होगा",
      primeBenefit3En: "2x Loyalty Points",
      primeBenefitDesc3En: "Earn bonus cashbacks on every single cart",
      primeBenefit3Hi: "दोगुना रिवॉर्ड",
      primeBenefitDesc3Hi: "हर खरीद पर डबल अंक कमाएं"
    };
    return safeJsonParse('swastik_prime_settings', defaultVal);
  });

  const [slides, setSlides] = useState(() => {
    return safeJsonParse('swastik_slides', initialSlides);
  });

  const [locationGroups, setLocationGroups] = useState(() => {
    const saved = localStorage.getItem('swastik_location_groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(g => ({
            ...g,
            deliveryStartTime: g.deliveryStartTime || "09:00",
            deliveryEndTime: g.deliveryEndTime || "21:00",
            minFreeDeliveryAmount: g.minFreeDeliveryAmount !== undefined ? Number(g.minFreeDeliveryAmount) : 499
          }));
        }
      } catch (e) {
        console.error("Error restoring location groups", e);
      }
    }
    return initialLocationGroups;
  });

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
    localStorage.setItem('swastik_customers', JSON.stringify(customers));
    saveSettingToDb('swastik_customers', customers);
  }, [customers]);

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

  const fetchAll = async () => {
    // Load dynamic DB-level settings
    try {
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        
        // Prevent DB override triggered by React state changes during loading
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
          if (settingsData.swastik_customers) setCustomers(settingsData.swastik_customers);
          if (settingsData.swastik_about_settings) setAboutSettings(settingsData.swastik_about_settings);
          if (settingsData.swastik_contact_settings) setContactSettings(settingsData.swastik_contact_settings);
          if (settingsData.swastik_refund_sections && Array.isArray(settingsData.swastik_refund_sections)) setRefundSections(settingsData.swastik_refund_sections);
          if (settingsData.swastik_privacy_sections && Array.isArray(settingsData.swastik_privacy_sections)) setPrivacySections(settingsData.swastik_privacy_sections);
          if (settingsData.swastik_terms_sections && Array.isArray(settingsData.swastik_terms_sections)) setTermsSections(settingsData.swastik_terms_sections);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch dynamic settings from DB:", e);
    } finally {
      // Delay marking as loaded so React state updates settle completely without triggering accidental DB overwrites
      setTimeout(() => {
        settingsLoaded.current = true;
      }, 800);
    }

    try {
      const custRes = await fetch('/api/customers');
      if (custRes.ok) {
        const custData = await custRes.json();
        if (Array.isArray(custData) && custData.length > 0) {
          setCustomers(custData);
          localStorage.setItem('swastik_customers', JSON.stringify(custData));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch customers from /api/customers:", e);
    }

    try {
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const data = await prodRes.json();
        if (data && data.length > 0) setProducts(data);
      }
    } catch (e) {
      console.warn("Failed to fetch products from backend, using fallback:", e);
    }

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
      }
    } catch (e) {
      console.warn("Failed to fetch R2 config:", e);
    }

    try {
      const partnerRes = await fetch('/api/partners');
      if (partnerRes.ok) {
        const data = await partnerRes.json();
        if (data && data.length > 0) setPartners(data);
      }
    } catch (e) {
      console.warn("Failed to fetch partners from backend, using fallback:", e);
    }

    try {
      const reviewRes = await fetch('/api/reviews');
      if (reviewRes.ok) {
        const data = await reviewRes.json();
        if (data && data.length > 0) {
          // GORM returns chronologically, we reverse to match "Just now" descending if needed
          setReviews(data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch reviews from backend, using fallback:", e);
    }

    try {
      const orderRes = await fetch('/api/orders');
      if (orderRes.ok) {
        const data = await orderRes.json();
        if (data && data.length > 0) {
          setOrders(data);
          
          // Synchronize MARG bill purchases and award loyalty points
          const margOrders = data.filter(o => o.isMargBill && o.customerMobile);
          if (margOrders.length > 0) {
            let customersChanged = false;
            let updatedCustomers = [...customers];
            const processedMarg = safeJsonParse('swastik_processed_marg_orders', []);

            margOrders.forEach(o => {
              if (!processedMarg.includes(o.id)) {
                const cleanNum = (ph) => ph ? ph.replace(/[^0-9]/g, '') : '';
                const oPhoneClean = cleanNum(o.customerMobile).slice(-10);
                
                const custIndex = updatedCustomers.findIndex(c => cleanNum(c.phone).endsWith(oPhoneClean));
                if (custIndex !== -1) {
                  const cust = updatedCustomers[custIndex];
                  const ptsEarned = o.pointsEarned || Math.floor(o.total / 10);
                  updatedCustomers[custIndex] = {
                    ...cust,
                    points: (cust.points || 0) + ptsEarned
                  };
                  customersChanged = true;
                  processedMarg.push(o.id);
                  
                  // Sync active logged-in profile
                  const parsed = safeJsonParse('swastik_profile', null);
                  if (parsed) {
                    if (cleanNum(parsed.phone).endsWith(oPhoneClean)) {
                      parsed.points = (parsed.points || 0) + ptsEarned;
                      localStorage.setItem('swastik_profile', JSON.stringify(parsed));
                      window.dispatchEvent(new Event('storage'));
                    }
                  }
                }
              }
            });

            if (customersChanged) {
              setCustomers(updatedCustomers);
              localStorage.setItem('swastik_customers', JSON.stringify(updatedCustomers));
              localStorage.setItem('swastik_processed_marg_orders', JSON.stringify(processedMarg));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch orders from backend, using fallback:", e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
        const newId = products.length > 0 ? Math.max(...products.map(x => x.id)) + 1 : 1;
        setProducts(prev => [...prev, { ...p, id: newId }]);
      }
    } catch (e) {
      console.error(e);
      const newId = products.length > 0 ? Math.max(...products.map(x => x.id)) + 1 : 1;
      setProducts(prev => [...prev, { ...p, id: newId }]);
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
        setProducts(prev => prev.map(p => p.id === Number(id) ? { ...p, ...updated } : p));
      }
    } catch (e) {
      console.error(e);
      setProducts(prev => prev.map(p => p.id === Number(id) ? { ...p, ...updated } : p));
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== Number(id)));
      } else {
        setProducts(prev => prev.filter(p => p.id !== Number(id)));
      }
    } catch (e) {
      console.error(e);
      setProducts(prev => prev.filter(p => p.id !== Number(id)));
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
    setProducts([]);
    return true;
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

  const updatePartner = (id, updated) => {
    setPartners(prev => prev.map(p => p.id === Number(id) ? { ...p, ...updated } : p));
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

  const deleteReview = (id) => {
    setReviews(prev => prev.filter(r => r.id !== Number(id)));
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

        // After successful order, also refresh the local product stock in the frontend view
        if (order.items) {
          setProducts(prevProducts => {
            return prevProducts.map(p => {
              const orderedItem = order.items.find(item => item.productId === p.id);
              if (orderedItem) {
                return { ...p, stockCount: Math.max(0, (p.stockCount || 100) - orderedItem.qty) };
              }
              return p;
            });
          });
        }

        // Dynamic automatic customer directory updates when order is submitted
        const custPhone = order.customerPhone;
        const custName = order.customerName;
        if (custPhone && custName) {
          setCustomers(prevCust => {
            const clean = (ph) => ph ? ph.replace(/[^0-9]/g, "") : "";
            const targetClean = clean(custPhone);
            const existing = prevCust.find(c => clean(c.phone).endsWith(targetClean.slice(-10)));

            const itemTotal = order.total || order.subtotal || 0;
            if (existing) {
              return prevCust.map(c => c.id === existing.id ? {
                ...c,
                orderCount: (c.orderCount || 0) + 1,
                totalSpent: (c.totalSpent || 0) + itemTotal
              } : c);
            } else {
              const newId = prevCust.length > 0 ? Math.max(...prevCust.map(c => c.id)) + 1 : 101;
              const newC = {
                id: newId,
                name: custName,
                phone: custPhone,
                email: `${custName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
                registeredAt: new Date().toISOString().split('T')[0],
                orderCount: 1,
                totalSpent: itemTotal,
                status: 'Active'
              };
              return [...prevCust, newC];
            }
          });
        }

        return { success: true, order: createdOrder };
      } else {
        const errorData = await res.json();
        return { success: false, error: errorData.error, errorHi: errorData.error_hi };
      }
    } catch (e) {
      console.error(e);
      setOrders(prev => [order, ...prev]);
      if (order.items) {
        setProducts(prevProducts => {
          return prevProducts.map(p => {
            const orderedItem = order.items.find(item => item.productId === p.id);
            if (orderedItem) {
              return { ...p, stockCount: Math.max(0, (p.stockCount || 100) - orderedItem.qty) };
            }
            return p;
          });
        });
      }
      return { success: true, order };
    }
  };

  const updateOrder = async (id, updated) => {
    try {
      const existingOrder = orders.find(o => String(o.id) === String(id));
      if (existingOrder && isOrder1HourLocked(existingOrder)) {
        const keys = Object.keys(updated);
        const allowedPaymentKeys = [
          'paymentStatus', 'paymentMethod', 'codStatus', 'codNotes', 
          'codCollectedAt', 'adminCollectedConfirm', 'adminCollectedAt', 
          'isSettled', 'settledAt', 'settlementStatus', 'settledAmount', 'id'
        ];
        const hasRestrictedChanges = keys.some(k => !allowedPaymentKeys.includes(k) && JSON.stringify(existingOrder[k]) !== JSON.stringify(updated[k]));
        if (hasRestrictedChanges) {
          console.warn(`Order #${id} is locked (delivered > 1 hour ago). Non-payment updates blocked.`);
          const sanitizedPayload = {};
          allowedPaymentKeys.forEach(k => {
            if (updated[k] !== undefined) sanitizedPayload[k] = updated[k];
          });
          if (Object.keys(sanitizedPayload).length === 0) return;
          updated = sanitizedPayload;
        }
      }

      const res = await fetch(`/api/orders/${id}/transit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, ...updated } : o));
    } catch (e) {
      console.error(e);
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, ...updated } : o));
    }
  };

  const deleteOrder = async (id) => {
    try {
      const target = orders.find(o => o.id === id || String(o.id) === String(id));
      if (target) {
        // Restore redeemed loyalty points to customer profile if applicable
        const redeemedPts = Number(target.appliedPoints || target.pointsRedeemed || 0);
        const custPhone = target.customerPhone || target.userMobile || target.phone;
        if (redeemedPts > 0 && custPhone) {
          setCustomers(prev => prev.map(c => {
            if (c.mobile === custPhone || c.phone === custPhone) {
              return { ...c, points: (c.points || 0) + redeemedPts };
            }
            return c;
          }));
        }
      }

      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      setOrders(prev => prev.filter(o => o.id !== id && String(o.id) !== String(id)));
    } catch (e) {
      console.error("Order deletion error:", e);
      setOrders(prev => prev.filter(o => o.id !== id && String(o.id) !== String(id)));
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
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // Dynamic offers CRUD
  const addOffer = (off) => {
    const newId = offers.length > 0 ? Math.max(...offers.map(o => o.id)) + 1 : 1;
    setOffers(prev => [...prev, { ...off, id: newId }]);
  };
  const updateOffer = (id, updated) => {
    setOffers(prev => prev.map(o => o.id === Number(id) ? { ...o, ...updated } : o));
  };
  const deleteOffer = (id) => {
    setOffers(prev => prev.filter(o => o.id !== Number(id)));
  };

  // Dynamic contact messages submission
  const addContactMessage = (msg) => {
    const newId = contactMessages.length > 0 ? Math.max(...contactMessages.map(m => m.id)) + 1 : 1;
    setContactMessages(prev => [{ ...msg, id: newId, date: "Just now", answer: "" }, ...prev]);
  };
  const updateContactMessage = (id, updated) => {
    setContactMessages(prev => prev.map(m => m.id === Number(id) ? { ...m, ...updated } : m));
  };

  // Dynamic customers register & synchronization with backend
  const upsertCustomer = async (custData) => {
    if (!custData) return null;
    const cleanDigits = (ph) => ph ? String(ph).replace(/[^0-9]/g, "") : "";
    const rawPhone = custData.phone || custData.phoneNumber || custData.mobile || "";
    const phoneDigits = cleanDigits(rawPhone);
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : (phoneDigits.length === 10 ? `+91 ${phoneDigits}` : rawPhone);
    const rawName = (custData.name || custData.fullName || `Customer ${phoneDigits.slice(-4)}`).trim();

    let targetCust = null;
    setCustomers(prev => {
      const existingIdx = prev.findIndex(c => cleanDigits(c.phone).endsWith(phoneDigits.slice(-10)));
      if (existingIdx >= 0) {
        const current = prev[existingIdx];
        targetCust = {
          ...current,
          ...custData,
          id: current.id,
          name: rawName || current.name,
          phone: formattedPhone || current.phone,
          email: custData.email !== undefined ? custData.email : current.email,
          address: custData.address !== undefined ? custData.address : (current.address || ""),
          points: custData.points !== undefined ? custData.points : (current.points || 0),
          isPrimeActive: custData.isPrimeActive !== undefined ? Boolean(custData.isPrimeActive) : Boolean(current.isPrimeActive),
          primeMembershipNo: custData.primeMembershipNo !== undefined ? custData.primeMembershipNo : (current.primeMembershipNo || ""),
          dob: custData.dob !== undefined ? custData.dob : (current.dob || ""),
          anniversary: custData.anniversary !== undefined ? custData.anniversary : (current.anniversary || ""),
          password: custData.password !== undefined ? custData.password : (current.password || ""),
          image: custData.image !== undefined ? custData.image : (current.image || ""),
          orderCount: custData.orderCount !== undefined ? custData.orderCount : (current.orderCount || 0),
          totalSpent: custData.totalSpent !== undefined ? custData.totalSpent : (current.totalSpent || 0)
        };
        const updatedList = [...prev];
        updatedList[existingIdx] = targetCust;
        localStorage.setItem('swastik_customers', JSON.stringify(updatedList));
        return updatedList;
      } else {
        const newId = prev.length > 0 ? Math.max(...prev.map(c => Number(c.id) || 0)) + 1 : 101;
        targetCust = {
          id: newId,
          name: rawName,
          phone: formattedPhone,
          email: custData.email || `${rawName.toLowerCase().replace(/\s+/g, '')}@swastik.com`,
          address: custData.address || "",
          status: custData.status || 'Active',
          points: custData.points !== undefined ? custData.points : 100,
          firstLoginPointsAwarded: custData.firstLoginPointsAwarded !== undefined ? custData.firstLoginPointsAwarded : 100,
          referralPointsAwarded: custData.referralPointsAwarded || 0,
          referredBy: custData.referredBy || "",
          isPrimeActive: Boolean(custData.isPrimeActive),
          primeMembershipNo: custData.primeMembershipNo || "",
          dob: custData.dob || "",
          anniversary: custData.anniversary || "",
          password: custData.password || "",
          image: custData.image || "",
          registeredAt: custData.registeredAt || new Date().toISOString().split('T')[0],
          orderCount: custData.orderCount || 0,
          totalSpent: custData.totalSpent || 0
        };
        const updatedList = [targetCust, ...prev];
        localStorage.setItem('swastik_customers', JSON.stringify(updatedList));
        return updatedList;
      }
    });

    // Notify listeners
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('swastik_customers_updated', { detail: custData }));

    // Send to backend REST API
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(custData)
      });
    } catch (e) {
      console.warn("Could not push customer to /api/customers:", e);
    }

    return targetCust;
  };

  const addCustomer = (cust) => {
    return upsertCustomer(cust);
  };

  const updateCustomer = async (id, updated) => {
    const custId = Number(id);
    setCustomers(prev => {
      const updatedList = prev.map(c => c.id === custId ? { ...c, ...updated } : c);
      localStorage.setItem('swastik_customers', JSON.stringify(updatedList));
      return updatedList;
    });

    window.dispatchEvent(new Event('storage'));

    try {
      await fetch(`/api/customers/${custId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn(`Could not update customer ${custId} on backend:`, e);
    }
  };

  const deleteCustomer = async (id) => {
    const custId = Number(id);
    setCustomers(prev => {
      const updatedList = prev.filter(c => c.id !== custId);
      localStorage.setItem('swastik_customers', JSON.stringify(updatedList));
      return updatedList;
    });

    window.dispatchEvent(new Event('storage'));

    try {
      await fetch(`/api/customers/${custId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(`Could not delete customer ${custId} on backend:`, e);
    }
  };

  // ------------------------------------
  // STAFF & PERMISSIONS SYSTEM
  // ------------------------------------
  const initialStaff = [
    {
      id: 1,
      name: "Sanjay Kumar (Admin)",
      mobile: "9999999999",
      password: "admin123",
      permissions: ["dashboard", "products", "categories", "orders", "offers", "customers", "partners", "reviews", "pages", "staff", "delivery"]
    },
    {
      id: 2,
      name: "Rahul Sharma (Store Manager)",
      mobile: "9876543210",
      password: "manager123",
      permissions: ["dashboard", "products", "orders", "customers"]
    },
    {
      id: 3,
      name: "Aman Patel (Logistics Lead)",
      mobile: "9123456789",
      password: "staff123",
      permissions: ["orders"]
    },
    {
      id: 4,
      name: "Pradeep Kumar (Delivery Executive)",
      mobile: "9540012099",
      password: "delivery123",
      permissions: ["delivery"]
    },
    {
      id: 5,
      name: "Rakesh Pilot (Delivery Rider)",
      mobile: "9999988888",
      password: "delivery123",
      permissions: ["delivery"]
    }
  ];

  const [staff, setStaff] = useState(() => {
    return safeJsonParse('swastik_staff', initialStaff);
  });

  useEffect(() => {
    localStorage.setItem('swastik_staff', JSON.stringify(staff));
  }, [staff]);

  const addStaff = (s) => {
    const newId = staff.length > 0 ? Math.max(...staff.map(x => x.id)) + 1 : 1;
    setStaff(prev => [...prev, { ...s, id: newId }]);
  };

  const updateStaff = (id, updated) => {
    setStaff(prev => prev.map(s => s.id === Number(id) ? { ...s, ...updated } : s));
  };

  const deleteStaff = (id) => {
    setStaff(prev => prev.filter(s => s.id !== Number(id)));
  };

  const changeStaffPassword = async (mobile, oldPassword, newPassword) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, oldPassword, newPassword })
      });
      if (res.ok) {
        setStaff(prev => prev.map(s => s.mobile === mobile ? { ...s, password: newPassword } : s));
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
      console.warn("Backend update bypassed, local offline persistent change instead:", e);
      setStaff(prev => prev.map(s => s.mobile === mobile ? { ...s, password: newPassword } : s));
      return { success: true, warning: 'Simulated change offline-first fallback' };
    }
  };

  // Dynamic Privacy, Terms and Refund state
  const [privacySections, setPrivacySections] = useState(() => {
    return safeJsonParse('swastik_privacy_sections', initialPrivacySections);
  });

  const [termsSections, setTermsSections] = useState(() => {
    return safeJsonParse('swastik_terms_sections', initialTermsSections);
  });

  const [refundSections, setRefundSections] = useState(() => {
    return safeJsonParse('swastik_refund_sections', initialRefundSections);
  });

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
    setPrivacySections(prev => prev.filter(s => s.id !== Number(id)));
  };

  const addTermsSection = (sect) => {
    const newId = termsSections.length > 0 ? Math.max(...termsSections.map(s => s.id)) + 1 : 1;
    setTermsSections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updateTermsSection = (id, updated) => {
    setTermsSections(prev => prev.map(s => s.id === Number(id) ? { ...s, ...updated } : s));
  };
  const deleteTermsSection = (id) => {
    setTermsSections(prev => prev.filter(s => s.id !== Number(id)));
  };

  const addRefundSection = (sect) => {
    const newId = refundSections.length > 0 ? Math.max(...refundSections.map(s => s.id)) + 1 : 1;
    setRefundSections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updateRefundSection = (id, updated) => {
    setRefundSections(prev => prev.map(s => s.id === Number(id) ? { ...s, ...updated } : s));
  };
  const deleteRefundSection = (id) => {
    setRefundSections(prev => prev.filter(s => s.id !== Number(id)));
  };

  // Dynamic Slider/Banner CRUD Actions
  const addSlide = (slide) => {
    const newId = slides.length > 0 ? Math.max(...slides.map(s => s.id)) + 1 : 1;
    setSlides(prev => [...prev, { ...slide, id: newId }]);
  };
  const updateSlide = (id, updated) => {
    setSlides(prev => prev.map(s => s.id === Number(id) ? { ...s, ...updated } : s));
  };
  const deleteSlide = (id) => {
    setSlides(prev => prev.filter(s => s.id !== Number(id)));
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
      customers,
      setCustomers,
      addCustomer,
      upsertCustomer,
      updateCustomer,
      deleteCustomer,
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
      changeStaffPassword
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
