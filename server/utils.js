import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { products } from "../client/data/products.js";
import { db } from "../database/db.js";

dotenv.config();

export const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max limit
});

export let fallbackOtps = {};

// Brand mapping helper
export function getBrand(name, category) {
  const n = (name || "").toLowerCase();
  if (n.includes("huggies")) return "Huggies";
  if (n.includes("johnson")) return "Johnson's";
  if (n.includes("pampers")) return "Pampers";
  if (n.includes("mamy")) return "MamyPoko";
  if (n.includes("himalaya")) return "Himalaya";
  if (n.includes("nestle") || n.includes("nescafe") || n.includes("kit kat") || n.includes("munch")) return "Nestle";
  if (n.includes("cadbury") || n.includes("dairy milk") || n.includes("5 star") || n.includes("choclairs") || n.includes("bournvita")) return "Cadbury";
  if (n.includes("coke") || n.includes("coca")) return "Coca-Cola";
  if (n.includes("frooti") || n.includes("appy")) return "Parle Agro";
  if (n.includes("maaza") || n.includes("limca") || n.includes("thums")) return "Coca-Cola";
  if (n.includes("pepsi") || n.includes("sting") || n.includes("slice") || n.includes("tropicana")) return "PepsiCo";
  if (n.includes("amul")) return "Amul";
  if (n.includes("mother dairy")) return "Mother Dairy";
  if (n.includes("fortune")) return "Fortune";
  if (n.includes("india gate")) return "India Gate";
  if (category === "swastik") return "Swastik";
  return "General";
}

// Payment Settings
export const PAYMENT_SETTINGS_FILE = path.join(process.cwd(), "payment-settings.json");
export let paymentSettings = {
  enabled: true,
  appId: process.env.CASHFREE_APP_ID || "",
  secretKey: process.env.CASHFREE_SECRET_KEY || "",
  environment: process.env.CASHFREE_ENVIRONMENT || "TEST"
};

try {
  if (fs.existsSync(PAYMENT_SETTINGS_FILE)) {
    const fileData = fs.readFileSync(PAYMENT_SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(fileData);
    paymentSettings = { ...paymentSettings, ...parsed };
    console.log("✓ Dynamic payment settings loaded successfully:", paymentSettings);
  }
} catch (err) {
  console.error("Error parsing payment-settings.json:", err);
}

// Fallback Products Seeding
export const PRODUCTS_DB_FILE = path.join(process.cwd(), "products-db.json");
export let fallbackProducts = [];
let shouldSeedProducts = true;

try {
  if (fs.existsSync(PRODUCTS_DB_FILE)) {
    const fileData = fs.readFileSync(PRODUCTS_DB_FILE, "utf-8");
    fallbackProducts = JSON.parse(fileData);
    shouldSeedProducts = false;
    console.log(`✓ Loaded ${fallbackProducts.length} products from products-db.json successfully.`);
  }
} catch (err) {
  console.error("Error loading products-db.json, using default seed:", err);
}

try {
  if (shouldSeedProducts) {
    const jsonPath = path.join(process.cwd(), "client", "data", "raw_products_1.json");
    if (fs.existsSync(jsonPath)) {
      const rawData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (Array.isArray(rawData)) {
        fallbackProducts = rawData.map((item, i) => {
          if (!Array.isArray(item) || item.length < 3) return null;
          const name = item[0];
          const originalPriceVal = Number(item[1]);
          const priceVal = Number(item[2]);
          const discountVal = originalPriceVal - priceVal;
          const br = getBrand(name, "swastik");
          return {
            id: i + 1,
            code: `SW-SW${String(i + 1).padStart(4, "0")}`,
            nameEn: name,
            nameHi: name,
            category: "swastik",
            brand: br,
            subEn: br,
            subHi: br,
            price: priceVal,
            originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
            discountTag: originalPriceVal > priceVal ? `₹${Math.round(discountVal)} OFF` : "",
            imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
            stockCount: 100,
            unit: "1 kg",
            unitPrices: `1 kg:${priceVal}`,
            packEn: "1 kg",
            packHi: "1 kg"
          };
        }).filter(Boolean);
        console.log(`✓ Node Fallback: Successfully seeded ${fallbackProducts.length} products from raw_products_1.json`);
      } else {
        fallbackProducts = products;
      }
    } else {
      fallbackProducts = products;
    }

    // Load baby care products from baby_products.json
    const babyJsonPath = path.join(process.cwd(), "client", "data", "baby_products.json");
    if (fs.existsSync(babyJsonPath)) {
      const babyData = JSON.parse(fs.readFileSync(babyJsonPath, "utf-8"));
      if (Array.isArray(babyData)) {
        const startId = fallbackProducts.length + 1;
        const babyProductsMapped = babyData.map((item, i) => {
          const name = item.name;
          const originalPriceVal = Number(item.originalPrice || item.price);
          const priceVal = Number(item.price);
          const br = getBrand(name, "babycare");
          return {
            id: startId + i,
            code: `SW-BB${String(i + 1).padStart(4, "0")}`,
            nameEn: name,
            nameHi: name,
            category: "babycare",
            brand: br,
            subEn: br,
            subHi: br,
            price: priceVal,
            originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
            discountTag: originalPriceVal > priceVal ? `₹${Math.round(originalPriceVal - priceVal)} OFF` : "",
            imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1519689680058-324335c77ebe?auto=format&fit=crop&q=80&w=400",
            stockCount: 100,
            unit: item.unit || "1 Pack",
            unitPrices: `${item.unit || "1 Pack"}:${priceVal}`,
            packEn: item.unit || "1 Pack",
            packHi: item.unit || "1 Pack"
          };
        });
        fallbackProducts = [...fallbackProducts, ...babyProductsMapped];
        console.log(`✓ Node Fallback: Loaded ${babyProductsMapped.length} Baby Care items dynamically.`);
      }
    }

    // Load beverage products from beverage_products.json
    const beverageJsonPath = path.join(process.cwd(), "client", "data", "beverage_products.json");
    if (fs.existsSync(beverageJsonPath)) {
      const beverageData = JSON.parse(fs.readFileSync(beverageJsonPath, "utf-8"));
      if (Array.isArray(beverageData)) {
        const startId = fallbackProducts.length + 1;
        const beverageProductsMapped = beverageData.map((item, i) => {
          const name = item.name;
          const originalPriceVal = Number(item.originalPrice || item.price);
          const priceVal = Number(item.price);
          const br = getBrand(name, "beverage");
          const code = item.code || `SW-BV${String(i + 1).padStart(4, "0")}`;
          return {
            id: startId + i,
            code: code,
            nameEn: name,
            nameHi: name,
            category: "beverage",
            brand: br,
            subEn: br,
            subHi: br,
            price: priceVal,
            originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
            discountTag: originalPriceVal > priceVal ? `₹${Math.round(originalPriceVal - priceVal)} OFF` : "",
            imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400",
            stockCount: 100,
            unit: "1 Unit",
            unitPrices: `1 Unit:${priceVal}`,
            packEn: "1 Unit",
            packHi: "1 Unit"
          };
        });
        fallbackProducts = [...fallbackProducts, ...beverageProductsMapped];
        console.log(`✓ Node Fallback: Loaded ${beverageProductsMapped.length} Beverage items dynamically.`);
      }
    }

    // Load chocolate products from chocolate_products.json
    const chocolateJsonPath = path.join(process.cwd(), "client", "data", "chocolate_products.json");
    if (fs.existsSync(chocolateJsonPath)) {
      const chocolateData = JSON.parse(fs.readFileSync(chocolateJsonPath, "utf-8"));
      if (Array.isArray(chocolateData)) {
        const startId = fallbackProducts.length + 1;
        const chocolateProductsMapped = chocolateData.map((item, i) => {
          const name = item.name;
          const originalPriceVal = Number(item.originalPrice || item.price);
          const priceVal = Number(item.price);
          const br = getBrand(name, "chocolate");
          const code = item.code || `SW-CH${String(i + 1).padStart(4, "0")}`;
          return {
            id: startId + i,
            code: code,
            nameEn: name,
            nameHi: name,
            category: "chocolate",
            brand: br,
            subEn: br,
            subHi: br,
            price: priceVal,
            originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
            discountTag: originalPriceVal > priceVal ? `₹${Math.round(originalPriceVal - priceVal)} OFF` : "",
            imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1548907040-4d42b52125ca?auto=format&fit=crop&q=80&w=400",
            stockCount: 100,
            unit: "1 Unit",
            unitPrices: `1 Unit:${priceVal}`,
            packEn: "1 Unit",
            packHi: "1 Unit"
          };
        });
        fallbackProducts = [...fallbackProducts, ...chocolateProductsMapped];
        console.log(`✓ Node Fallback: Loaded ${chocolateProductsMapped.length} Chocolate items dynamically.`);
      }
    }
  }
} catch (err) {
  console.warn("Warning: Could not parse database JSON files, using default products array:", err.message);
  fallbackProducts = products;
}

// Fallback Partners
export let fallbackPartners = [
  {
    id: 1,
    name: "Rajesh Patidar",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    designation: "Sourcing Director (Fruits & Vegetables)",
    about: "Rajesh manages our fresh local grower networks. He is responsible for testing purity, supervising rapid logistics collection timelines, and ensuring organic quality on all botanical essentials."
  },
  {
    id: 2,
    name: "Sunita Deshmukh",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    designation: "Organic Dairy Lead",
    about: "Sunita supervises our direct milk co-operatives and poultry segments in Greater Noida. She has over 15 years of quality control experience and works to assure pristine hormone-free daily dairy products."
  },
  {
    id: 3,
    name: "Vikram Sen",
    photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=200",
    designation: "Hyper-Local Logistics Coordinator",
    about: "Vikram keeps our dispatch hubs and courier networks perfectly synchronized, assuring zero delays in Swastik's rapid checkout SLA. He coordinates active transit pathways across Noida Sectors."
  }
];

// Fallback Reviews
export let fallbackReviews = [
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
  }
];

// Fallback Orders
export let fallbackOrders = [
  {
    id: "SW-9831",
    orderDate: "2026-06-02T12:00:00Z",
    status: "In Transit",
    isActive: true,
    step: 1,
    subtotal: 449,
    deliveryFee: 0,
    gst: 81,
    total: 530,
    deliveryPartnerName: "Pradeep Kumar (Swastik Rider)",
    deliveryPartnerPhone: "+91 95400 12099",
    hubName: "Alpha Hub, Sector 12",
    eta: "15 Mins",
    shippingAddress: "Sector 15, Noida, UP",
    items: [
      { id: 1, productId: 3, nameEn: "Long Grain Basmati Rice (5kg)", nameHi: "लॉन्ग ग्रेन बासमती चावल (5 किलो)", price: 449, qty: 1, weight: "5kg" }
    ]
  },
  {
    id: "SW-9824",
    orderDate: "2026-05-30T10:30:00Z",
    status: "Delivered",
    isActive: false,
    step: 2,
    subtotal: 350,
    deliveryFee: 40,
    gst: 63,
    total: 453,
    deliveryStaffId: 4,
    deliveryPartnerName: "Suresh Mehra",
    deliveryPartnerPhone: "+91 98111 22334",
    hubName: "Alpha Hub, Sector 12",
    eta: "Delivered",
    shippingAddress: "Preet Vihar Road, New Delhi",
    items: [
      { id: 1, productId: 1, nameEn: "Premium Royal Gala Apples (1kg)", nameHi: "प्रीमियम रॉयल गाला सेब (1 किलो)", price: 180, qty: 1, weight: "1kg" }
    ]
  }
];

// --- SQL DATABASE HELPER MAPPERS ---
export function mapProduct(p) {
  if (!p) return p;
  return {
    id: p.id,
    code: p.code,
    nameEn: p.name_en,
    nameHi: p.name_hi,
    category: p.category,
    brand: p.sub_en || "General",
    subEn: p.sub_en,
    subHi: p.sub_hi,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : undefined,
    discountTag: p.discount_tag || "",
    imageUrl: p.image_url,
    stockCount: p.stock_count,
    unit: p.unit,
    unitPrices: p.unit_prices,
    packEn: p.pack_en,
    packHi: p.pack_hi,
    gstPercent: p.gst_percent !== undefined && p.gst_percent !== null ? Number(p.gst_percent) : 5
  };
}

export function mapPartner(pt) {
  if (!pt) return pt;
  return {
    id: pt.id,
    name: pt.name,
    photo: pt.photo,
    designation: pt.designation,
    about: pt.about
  };
}

export function mapReview(rv) {
  if (!rv) return rv;
  return {
    id: rv.id,
    name: rv.author_name,
    author_name: rv.author_name,
    rating: rv.rating,
    commentEn: rv.comment_en,
    commentHi: rv.comment_hi,
    avatarBg: rv.avatar_bg,
    response: rv.owner_response,
    owner_response: rv.owner_response,
    date: rv.date_label,
    date_label: rv.date_label,
    isApproved: Boolean(rv.is_approved)
  };
}

export async function getOrderItems(orderId) {
  const items = await db.query("SELECT * FROM order_item WHERE order_id = ?", [orderId]);
  return items.map((it) => ({
    id: it.id,
    orderId: it.order_id,
    productId: it.product_id,
    nameEn: it.name_en,
    nameHi: it.name_hi,
    price: Number(it.price),
    qty: it.qty,
    weight: it.weight_label,
    weight_label: it.weight_label
  }));
}

export async function mapOrder(o) {
  if (!o) return o;
  const items = await getOrderItems(o.id);
  const subtotal = Number(o.subtotal || 0);
  const deliveryFee = Number(o.delivery_fee || 0);
  const gst = Number(o.gst_amount || 0);
  const referralDiscount = Number(o.referral_discount || 0);
  const couponDiscount = Number(o.coupon_discount || 0);
  const celebrationDiscount = Number(o.celebration_discount || 0);
  
  const itemsSum = Array.isArray(items) ? items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0) : 0;
  const computedSubtotal = subtotal > 0 ? subtotal : itemsSum;
  const computedTotal = Math.max(0, computedSubtotal + deliveryFee + gst - referralDiscount - couponDiscount - celebrationDiscount);

  const finalTotal = Number(o.grand_total || 0) > 0 ? Number(o.grand_total) : (computedTotal > 0 ? computedTotal : (computedSubtotal > 0 ? computedSubtotal : 350));

  let dynamicUserId = o.customer_id ? Number(o.customer_id) : (o.user_id ? Number(o.user_id) : (o.rel_customer_id ? Number(o.rel_customer_id) : null));
  let dynamicCustName = o.rel_customer_name || o.customer_name;
  let dynamicCustPhone = o.rel_customer_phone || o.customer_phone;
  let dynamicCustEmail = o.rel_customer_email || o.customer_email || "";

  // Dynamic Relational ID Mapping: Look up real customer name from customer table
  try {
    let matchedCust = null;
    if (dynamicUserId) {
      const custRows = await db.query("SELECT * FROM customer WHERE id = ?", [dynamicUserId]);
      if (custRows && custRows.length > 0) matchedCust = custRows[0];
    }
    if (!matchedCust && dynamicCustPhone) {
      const cleanP = String(dynamicCustPhone).replace(/\D/g, "").slice(-10);
      if (cleanP) {
        const custRows = await db.query(
          "SELECT * FROM customer WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? OR phone = ? LIMIT 1",
          [`%${cleanP}%`, dynamicCustPhone]
        );
        if (custRows && custRows.length > 0) matchedCust = custRows[0];
      }
    }
    if (matchedCust) {
      dynamicUserId = Number(matchedCust.id);
      dynamicCustName = matchedCust.name;
      dynamicCustPhone = matchedCust.phone || dynamicCustPhone;
      dynamicCustEmail = matchedCust.email || dynamicCustEmail;
    }
  } catch (lookupErr) {}

  let dynamicRiderId = o.delivery_staff_id ? Number(o.delivery_staff_id) : (o.rel_rider_id ? Number(o.rel_rider_id) : (o.rel_staff_id ? Number(o.rel_staff_id) : null));
  let dynamicRiderName = o.rel_rider_name || o.rel_staff_name || o.delivery_partner_name || "";
  let dynamicRiderPhone = o.rel_rider_phone || o.rel_staff_phone || o.delivery_partner_phone || "";

  // Dynamic Relational Staff/Rider Lookup from user table
  try {
    let matchedRider = null;
    if (dynamicRiderId) {
      const riderRows = await db.query('SELECT * FROM "user" WHERE id = ?', [dynamicRiderId]);
      if (riderRows && riderRows.length > 0) matchedRider = riderRows[0];
    }
    if (!matchedRider && dynamicRiderName && !dynamicRiderName.toLowerCase().includes('arun dev')) {
      const riderRows = await db.query('SELECT * FROM "user" WHERE LOWER(full_name) = ? OR LOWER(full_name) LIKE ? LIMIT 1', [dynamicRiderName.toLowerCase(), `%${dynamicRiderName.toLowerCase()}%`]);
      if (riderRows && riderRows.length > 0) matchedRider = riderRows[0];
    }
    if (matchedRider) {
      dynamicRiderId = Number(matchedRider.id);
      dynamicRiderName = matchedRider.full_name;
      dynamicRiderPhone = matchedRider.phone_number;
    }
  } catch (rErr) {}

  // Fallback: If invalid rider name like Arun Dev, remap to registered rider
  if (dynamicRiderName && dynamicRiderName.toLowerCase().includes('arun dev')) {
    dynamicRiderId = 4;
    dynamicRiderName = "Suresh Mehra";
    dynamicRiderPhone = "+91 98111 22334";
  }

  return {
    id: o.id,
    customerId: dynamicUserId,
    userId: dynamicUserId,
    deliveryStaffId: dynamicRiderId,
    orderDate: o.order_date,
    date: o.order_date ? new Date(o.order_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A',
    isActive: Boolean(o.is_active),
    step: o.step_level,
    step_level: o.step_level,
    status: o.status_label,
    status_label: o.status_label,
    subtotal: computedSubtotal,
    deliveryFee: deliveryFee,
    gst: gst,
    gst_amount: gst,
    total: finalTotal,
    grand_total: finalTotal,
    referralDiscount: referralDiscount,
    appliedPoints: Number(o.applied_points || 0),
    couponDiscount: couponDiscount,
    couponCode: o.coupon_code || '',
    celebrationDiscount: celebrationDiscount,
    celebrationOfferName: o.celebration_offer_name || '',
    paymentMethod: o.payment_method || 'COD',
    paymentStatus: o.payment_status || 'UNPAID',
    codStatus: o.cod_status || 'PENDING_CLEARANCE',
    codSettledAt: o.cod_settled_at || null,
    codClearedBy: o.cod_cleared_by || null,
    codSettlementNote: o.cod_settlement_note || null,
    deliveryPartnerName: dynamicRiderName,
    deliveryPartnerPhone: dynamicRiderPhone,
    dispatchHub: o.dispatch_hub,
    etaStatus: o.eta_status,
    eta: o.eta_status,
    shippingAddress: o.shipping_address,
    customerName: dynamicCustName,
    customerPhone: dynamicCustPhone,
    customerMobile: dynamicCustPhone,
    customerEmail: dynamicCustEmail,
    isMargBill: Boolean(o.is_marg_bill),
    pointsEarned: o.points_earned,
    pdfUrl: o.pdf_url,
    items
  };
}

export const whatsappOutbox = [];

export async function sendWhatsappMessageUnified(
  to,
  body,
  isOtp = false,
  otpCode = undefined,
  templateName = undefined,
  templateParams = [],
  mediaUrl = undefined,
  languageCode = "en_US"
) {
  let metaPhoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  let metaToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  let defaultMetaTemplate = process.env.META_WHATSAPP_TEMPLATE_NAME || "reference_no";

  // Check database settings for custom WhatsApp Meta configuration
  try {
    const rows = await db.query("SELECT value_text FROM app_settings WHERE key_name = 'swastik_whatsapp_settings'");
    if (rows.length > 0 && rows[0].value_text) {
      const saved = JSON.parse(rows[0].value_text);
      if (saved) {
        if (!metaPhoneId && saved.metaPhoneNumberId) metaPhoneId = saved.metaPhoneNumberId;
        if (!metaToken && saved.metaAccessToken) metaToken = saved.metaAccessToken;
        if (saved.metaTemplateName) defaultMetaTemplate = saved.metaTemplateName;
      }
    }
  } catch (e) {}

  let cleanTo = String(to || "").replace(/[^\d]/g, "");
  if (cleanTo.length === 10) {
    cleanTo = "91" + cleanTo;
  } else if (cleanTo.length === 11 && cleanTo.startsWith("0")) {
    cleanTo = "91" + cleanTo.slice(1);
  }

  if (!cleanTo) {
    console.error("[WhatsApp Error] Missing target phone number");
    return { success: false, error: "Missing target phone number" };
  }

  // 1. Try Meta WhatsApp Cloud API if configured
  if (metaPhoneId && metaToken) {
    const url = `https://graph.facebook.com/v18.0/${metaPhoneId}/messages`;

    let payload;
    if (templateName || (isOtp && otpCode)) {
      const activeTpl = templateName || defaultMetaTemplate;
      const paramsList = templateParams && templateParams.length > 0 
        ? templateParams.map(p => ({ type: "text", text: String(p) }))
        : (otpCode ? [{ type: "text", text: String(otpCode) }] : []);

      const components = [];

      if (mediaUrl) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: mediaUrl,
                filename: "Swastik_Invoice.pdf"
              }
            }
          ]
        });
      }

      if (paramsList.length > 0) {
        components.push({
          type: "body",
          parameters: paramsList
        });
      }

      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "template",
        template: {
          name: activeTpl,
          language: {
            code: languageCode || "en_US"
          },
          ...(components.length > 0 ? { components } : {})
        }
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "text",
        text: {
          body: body
        }
      };
    }

    try {
      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${metaToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let data = await response.json();

      // Fallback: If template failed (e.g. template not approved or param mismatch), retry as plain text message
      if (!response.ok && payload.type === "template") {
        console.warn("[Meta WA Warning] Template failed, retrying with plain text body...", JSON.stringify(data));
        const textPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTo,
          type: "text",
          text: { body }
        };

        const textResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${metaToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(textPayload)
        });
        const textData = await textResponse.json();
        if (textResponse.ok) {
          console.log(`[Meta WA Text Success] Fallback text message sent to ${cleanTo}. ID: ${textData.messages?.[0]?.id}`);
          return { success: true, provider: "meta_text_fallback", id: textData.messages?.[0]?.id };
        }
      }

      if (response.ok) {
        console.log(`[Meta WA Success] Message sent to ${cleanTo}. ID: ${data.messages?.[0]?.id}`);
        return { success: true, provider: "meta", id: data.messages?.[0]?.id };
      } else {
        console.error("[Meta WA Error] API response failure:", JSON.stringify(data));
      }
    } catch (err) {
      console.error("[Meta WA Error] Connection failed:", err.message);
    }
  }

  // 2. Try Twilio if Meta failed or is unconfigured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_WHATSAPP_FROM || "+14155238886";

  if (accountSid && authToken) {
    let twilioCleanTo = cleanTo.startsWith("+") ? cleanTo : "+" + cleanTo;
    const twilioTo = twilioCleanTo.startsWith("whatsapp:") ? twilioCleanTo : `whatsapp:${twilioCleanTo}`;
    const twilioFrom = fromNum.startsWith("whatsapp:") ? fromNum : `whatsapp:${fromNum}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const params = new URLSearchParams();
    params.append("To", twilioTo);
    params.append("From", twilioFrom);
    params.append("Body", body);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[Twilio WA Success] Message sent to ${cleanTo}. SID: ${data.sid}`);
        whatsappOutbox.unshift({
          id: data.sid,
          to: cleanTo,
          body,
          provider: "twilio",
          status: "DELIVERED",
          timestamp: new Date().toISOString()
        });
        if (whatsappOutbox.length > 50) whatsappOutbox.pop();
        return { success: true, provider: "twilio", id: data.sid };
      } else {
        console.error("[Twilio WA Error] API response failure:", data);
      }
    } catch (err) {
      console.error("[Twilio WA Error] Connection failed:", err.message);
    }
  }

  // 3. Fallback: Log to Simulated Outbox
  console.log(`[SIMULATED WHATSAPP OUTBOX] To: ${cleanTo} | Msg: ${body}`);
  const outboxEntry = {
    id: `WA-SIM-${Date.now()}`,
    to: cleanTo,
    body,
    provider: "simulated_outbox",
    status: "DISPATCHED",
    timestamp: new Date().toISOString()
  };
  whatsappOutbox.unshift(outboxEntry);
  if (whatsappOutbox.length > 50) whatsappOutbox.pop();

  return { success: true, provider: "simulation", id: outboxEntry.id };
}

export function isR2ConfiguredAndValid() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return false;
  }

  const values = [accountId, accessKeyId, secretAccessKey, bucketName];
  for (const val of values) {
    const v = val.trim().toLowerCase();
    if (
      v === "" || 
      v.includes("placeholder") || 
      v.includes("your_") || 
      v.includes("your-") || 
      v.startsWith("<") || 
      v.endsWith(">")
    ) {
      return false;
    }
  }
  return true;
}
