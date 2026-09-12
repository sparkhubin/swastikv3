import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { useCart } from '../context/CartContext';
import { 
  User, 
  Lock, 
  Package, 
  Languages, 
  Bell,
  Eye, 
  EyeOff,
  CheckSquare,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Smartphone,
  Send,
  Key,
  KeyRound,
  FileSpreadsheet,
  History,
  Truck,
  MapPin,
  Clock,
  Phone,
  Calendar,
  Gift,
  Copy,
  Check,
  Share2,
  Search,
  Filter,
  X,
  Crown,
  Printer,
  AlertCircle,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  RefreshCw,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

import ProfileTab from '../components/account/ProfileTab';
import OrdersTab from '../components/account/OrdersTab';
import PasswordTab from '../components/account/PasswordTab';
import MembershipTab from '../components/account/MembershipTab';
import RewardsTab from '../components/account/RewardsTab';
import CartTab from '../components/account/CartTab';
import PreferencesTab from '../components/account/PreferencesTab';
import PrivacyDataTab from '../components/account/PrivacyDataTab';

export default function Account({ onViewChange }) {
  const { language, setLanguage, t } = useLanguage();
  const isHindi = language === 'hi';
  const { products = [], orders, referralSettings, customers, primeSettings, updateCustomer, addCustomer, upsertCustomer, addOrder, deleteOrder, paymentEnabled, paymentEnvironment, contactSettings, staff, setUserRole, fetchOrders, fetchCustomers, fetchProducts, fetchDataDeletionRequests } = useData();
  const [authSubmitting, setAuthSubmitting] = useState(false);
  // Print Official Tax Invoice PDF
  const handlePrintInvoice = (order) => {
    if (!order) return;
    const storeName = contactSettings?.brandName || "Swastik Supermarket";
    const storeAddress = contactSettings?.address || "Survey no. 100 Sanjit road opposite of Saraswati school , Mandsaur, India, Madhya Pradesh";
    const storePhone = contactSettings?.phone || "094845 40001";
    const storeEmail = contactSettings?.email || "info.swastiksupermarket@gmail.com";
    const storeGst = contactSettings?.gst || contactSettings?.gstin || "23AAAAA0000A1Z5";
    const storeFssai = contactSettings?.fssai || "12721001000123";
    const storeLogo = contactSettings?.logo || "";

    const custName = order.customerName || order.name || profile?.fullName || "Valued Customer";
    const custPhone = order.customerPhone || order.customerMobile || order.phone || profile?.phone || "N/A";
    const custAddress = order.shippingAddress || order.address || "Store Pickup";
    const custEmail = order.customerEmail || order.email || profile?.email || "N/A";

    const items = order.items || [];
    
    // Calculate slab-wise GST and item-level details
    const slabMap = {};
    let computedTaxable = 0;
    let computedGst = 0;

    const mappedItems = items.map((it, idx) => {
      // Find matching product in catalog to check if GST column exists
      const matchedProd = products.find(p => String(p.id) === String(it.productId || it.id) || String(p.code) === String(it.code || ''));
      
      let rawGst = undefined;
      if (it.gstPercent !== undefined && it.gstPercent !== null && it.gstPercent !== '') {
        rawGst = Number(it.gstPercent);
      } else if (matchedProd) {
        if (matchedProd.gstPercent !== undefined && matchedProd.gstPercent !== null && matchedProd.gstPercent !== '') {
          rawGst = Number(matchedProd.gstPercent);
        } else if (matchedProd.gst_percent !== undefined && matchedProd.gst_percent !== null && matchedProd.gst_percent !== '') {
          rawGst = Number(matchedProd.gst_percent);
        }
      }

      // If product has no GST or GST is 0, do not treat as GST applicable
      const hasItemGst = rawGst !== undefined && rawGst !== null && rawGst > 0;
      const rate = hasItemGst ? rawGst : 0;

      // Brand: Only show if brand exists and is not a generic placeholder
      const rawBrand = (it.brand || (matchedProd ? (matchedProd.brand || matchedProd.subEn) : '') || '').trim();
      const itemBrand = (rawBrand && rawBrand.toLowerCase() !== 'general') ? rawBrand : '';

      const qty = Number(it.qty || it.quantity || 1);
      const unitPrice = Number(it.price || 0);
      const lineTaxable = Math.round(unitPrice * qty * 100) / 100;
      const taxAmount = hasItemGst ? Math.round(((lineTaxable * rate) / 100) * 100) / 100 : 0;
      const cgst = Math.round((taxAmount / 2) * 100) / 100;
      const sgst = Math.round((taxAmount - cgst) * 100) / 100;
      const lineTotal = Math.round((lineTaxable + taxAmount) * 100) / 100;

      computedTaxable += lineTaxable;
      computedGst += taxAmount;

      if (hasItemGst) {
        if (!slabMap[rate]) {
          slabMap[rate] = { slab: rate, taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
        }
        slabMap[rate].taxable += lineTaxable;
        slabMap[rate].cgst += cgst;
        slabMap[rate].sgst += sgst;
        slabMap[rate].totalTax += taxAmount;
      }

      return {
        ...it,
        brand: itemBrand,
        hasItemGst,
        rate,
        qty,
        unitPrice,
        lineTaxable,
        taxAmount,
        cgst,
        sgst,
        lineTotal
      };
    });

    const hasAnyGst = mappedItems.some(it => it.hasItemGst);

    const subtotal = Number(order.subtotal || computedTaxable || 0);
    const gst = hasAnyGst ? Number(order.gst || computedGst || 0) : 0;
    const cgstTotal = Math.round((gst / 2) * 100) / 100;
    const sgstTotal = Math.round((gst - cgstTotal) * 100) / 100;
    const deliveryFee = Number(order.deliveryFee || 0);
    const referralDiscount = Number(order.referralDiscount || 0);
    const couponDiscount = Number(order.couponDiscount || 0);
    const celebrationDiscount = Number(order.celebrationDiscount || 0);
    const grandTotal = Number(order.total || order.grand_total || (subtotal + gst + deliveryFee - referralDiscount - couponDiscount - celebrationDiscount));

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${hasAnyGst ? 'Tax Invoice' : 'Order Invoice'} - #${order.id} - ${storeName}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 24px; font-size: 11px; line-height: 1.4; }
            .invoice-box { max-width: 860px; margin: 0 auto; border: 2px solid #cbd5e1; padding: 24px; border-radius: 14px; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 14px; }
            .brand-logo-title { display: flex; align-items: center; gap: 12px; }
            .brand-logo-title img { max-height: 50px; max-width: 110px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; }
            .brand-name { font-size: 20px; font-weight: 900; color: #0284c7; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
            .store-contact { font-size: 10px; color: #475569; margin-top: 3px; font-weight: 500; }
            .invoice-heading { text-align: right; }
            .tax-badge { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .inv-no { font-size: 12px; font-weight: 800; color: #0284c7; margin-top: 3px; font-family: monospace; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
            .meta-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
            .card-head { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10.5px; }
            .row-label { color: #64748b; font-weight: 600; }
            .row-val { color: #0f172a; font-weight: 700; word-break: break-word; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; }
            th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 9.5px; font-weight: 800; padding: 8px 10px; text-align: left; letter-spacing: 0.4px; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; font-weight: 600; }
            .bottom-grid { display: grid; grid-template-columns: ${hasAnyGst ? '1.2fr 1fr' : '1fr'}; gap: 14px; align-items: start; }
            .gst-breakdown-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
            .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; ${hasAnyGst ? '' : 'max-width: 360px; margin-left: auto;'} }
            .summary-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10.5px; }
            .total-row { border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; font-size: 14px; font-weight: 900; color: #0284c7; }
            .footer { margin-top: 20px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 9.5px; color: #64748b; }
            @media print {
              body { padding: 0; background: #fff; }
              .invoice-box { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div class="brand-logo-title">
                ${storeLogo ? `<img src="${storeLogo}" alt="Logo" />` : ''}
                <div>
                  <h1 class="brand-name">${storeName}</h1>
                  <div class="store-contact">
                    <div><b>Address:</b> ${storeAddress}</div>
                    <div><b>Helpline:</b> ${storePhone} | <b>Email:</b> ${storeEmail}</div>
                    ${storeGst ? `<div><b>GSTIN:</b> ${storeGst} | <b>FSSAI Lic:</b> ${storeFssai}</div>` : ''}
                  </div>
                </div>
              </div>
              <div class="invoice-heading">
                <div class="tax-badge">${hasAnyGst ? 'TAX INVOICE' : 'RETAIL INVOICE / RECEIPT'}</div>
                <div class="inv-no">ORDER #${order.id}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                  Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-card">
                <div class="card-head">CUSTOMER DETAILS (ग्राहक विवरण)</div>
                <div class="row"><span class="row-label">Customer Name:</span> <span class="row-val">${custName}</span></div>
                <div class="row"><span class="row-label">Mobile Number:</span> <span class="row-val">${custPhone}</span></div>
                <div class="row"><span class="row-label">Delivery Address:</span> <span class="row-val">${custAddress}</span></div>
                <div class="row"><span class="row-label">Email ID:</span> <span class="row-val">${custEmail}</span></div>
              </div>

              <div class="meta-card">
                <div class="card-head">ORDER & PAYMENT SUMMARY</div>
                <div class="row"><span class="row-label">Payment Mode:</span> <span class="row-val">${order.paymentMethod || 'COD'}</span></div>
                <div class="row"><span class="row-label">Payment Status:</span> <span class="row-val" style="color:${(order.paymentStatus||'').toUpperCase()==='PAID' ? '#16a34a' : '#d97706'}">${order.paymentStatus || 'PENDING'}</span></div>
                <div class="row"><span class="row-label">Order Status:</span> <span class="row-val">${order.status || 'CONFIRMED'}</span></div>
                <div class="row"><span class="row-label">Dispatch Rider:</span> <span class="row-val">${order.deliveryPartnerName || 'Swastik Rider'} (${order.deliveryPartnerPhone || '+91 95400 12099'})</span></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:30px;">#</th>
                  <th>Item Description</th>
                  <th>Pack / Unit</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Rate (₹)</th>
                  ${hasAnyGst ? `
                    <th style="text-align:center;">GST %</th>
                    <th style="text-align:right;">Taxable Amt</th>
                    <th style="text-align:right;">Tax (CGST+SGST)</th>
                  ` : ''}
                  <th style="text-align:right;">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${mappedItems.map((it, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>
                      <b>${it.nameEn || it.nameHi || it.name || 'Grocery Item'}</b>
                      ${it.brand ? `<div style="font-size: 9px; color: #64748b; font-weight: 700; margin-top: 1px;">Brand: ${it.brand}</div>` : ''}
                    </td>
                    <td>${it.weight || it.unit || '1 Unit'}</td>
                    <td style="text-align:center;"><b>${it.qty}</b></td>
                    <td style="text-align:right;">₹${it.unitPrice.toFixed(2)}</td>
                    ${hasAnyGst ? `
                      <td style="text-align:center;">
                        ${it.hasItemGst 
                          ? `<span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:700;">${it.rate}%</span>` 
                          : `<span style="color:#94a3b8; font-size:9.5px;">-</span>`}
                      </td>
                      <td style="text-align:right;">₹${it.lineTaxable.toFixed(2)}</td>
                      <td style="text-align:right; color:#64748b;">₹${it.taxAmount.toFixed(2)}</td>
                    ` : ''}
                    <td style="text-align:right; font-weight:800; color:#0f172a;">₹${it.lineTotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="bottom-grid">
              ${hasAnyGst ? `
                <!-- GST Rate-wise computation box -->
                <div class="gst-breakdown-card">
                  <div class="card-head">GST TAX BREAKDOWN (कर विवरण)</div>
                  <table style="margin: 0; font-size: 10px;">
                    <thead>
                      <tr style="background:#334155;">
                        <th style="padding:4px 6px; font-size:9px;">Rate</th>
                        <th style="padding:4px 6px; font-size:9px; text-align:right;">Taxable Value</th>
                        <th style="padding:4px 6px; font-size:9px; text-align:right;">CGST</th>
                        <th style="padding:4px 6px; font-size:9px; text-align:right;">SGST</th>
                        <th style="padding:4px 6px; font-size:9px; text-align:right;">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.values(slabMap).map(s => `
                        <tr>
                          <td style="padding:4px 6px; font-weight:700;">${s.slab}%</td>
                          <td style="padding:4px 6px; text-align:right;">₹${s.taxable.toFixed(2)}</td>
                          <td style="padding:4px 6px; text-align:right;">₹${s.cgst.toFixed(2)}</td>
                          <td style="padding:4px 6px; text-align:right;">₹${s.sgst.toFixed(2)}</td>
                          <td style="padding:4px 6px; text-align:right; font-weight:700; color:#0284c7;">₹${s.totalTax.toFixed(2)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <!-- Grand Total Summary box -->
              <div class="summary-box">
                <div class="summary-row"><span class="row-label">Subtotal:</span> <span class="row-val">₹${subtotal.toFixed(2)}</span></div>
                ${hasAnyGst ? `
                  <div class="summary-row"><span class="row-label">CGST (Central Tax):</span> <span class="row-val">₹${cgstTotal.toFixed(2)}</span></div>
                  <div class="summary-row"><span class="row-label">SGST (State Tax):</span> <span class="row-val">₹${sgstTotal.toFixed(2)}</span></div>
                  <div class="summary-row" style="font-weight:700;"><span class="row-label">Total GST Tax:</span> <span class="row-val" style="color:#0284c7;">₹${gst.toFixed(2)}</span></div>
                ` : ''}
                <div class="summary-row"><span class="row-label">Delivery Charges:</span> <span class="row-val">${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span></div>
                ${referralDiscount > 0 ? `<div class="summary-row" style="color:#d97706;"><span class="row-label">Loyalty Points Discount:</span> <span class="row-val">-₹${referralDiscount.toFixed(2)}</span></div>` : ''}
                ${couponDiscount > 0 ? `<div class="summary-row" style="color:#16a34a;"><span class="row-label">Coupon Discount:</span> <span class="row-val">-₹${couponDiscount.toFixed(2)}</span></div>` : ''}
                ${celebrationDiscount > 0 ? `<div class="summary-row" style="color:#9333ea;"><span class="row-label">Celebration Discount:</span> <span class="row-val">-₹${celebrationDiscount.toFixed(2)}</span></div>` : ''}
                
                <div class="summary-row total-row">
                  <span>Grand Total (कुल राशि):</span>
                  <span>₹${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p style="font-weight: 800; color: #0284c7; margin-bottom: 2px;">THANK YOU FOR SHOPPING AT ${storeName.toUpperCase()}!</p>
              <p>${hasAnyGst ? 'This is a computer-generated tax invoice under the GST Act. All taxes are calculated as per applicable rates.' : 'This is a computer-generated invoice and sales receipt.'}</p>
              <p style="font-size: 8.5px; font-family: monospace; color: #94a3b8; margin-top: 4px;">${storeGst && hasAnyGst ? `GSTIN: ${storeGst} | ` : ''}FSSAI LIC: ${storeFssai} | STORE HELPLINE: ${storePhone}</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const [cashfreeOrderSession, setCashfreeOrderSession] = useState(null);
  const [cfSimulatingProgress, setCfSimulatingProgress] = useState('');

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
      if (typeof window !== 'undefined' && window.Cashfree) return resolve(true);
      if (typeof window === 'undefined') return resolve(false);
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

  const handleProcessPrimePayment = async () => {
    setPrimePaymentStep('processing');
    setPaymentErrorMessage('');

    try {
      if (!['RAZORPAY', 'CASHFREE'].includes(selectedGateway)) throw new Error('Choose a configured online payment gateway.');
      const plansResponse = await fetch('/api/membership/plans');
      const plans = await plansResponse.json().catch(() => []);
      if (!plansResponse.ok || plans.length !== 1) throw new Error('Configure exactly one active membership plan before purchase.');
      const intentResponse = await fetch('/api/membership/purchase-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plans[0].id, gateway: selectedGateway }) });
      const intent = await intentResponse.json().catch(() => ({}));
      if (!intentResponse.ok) throw new Error(intent.error || 'Unable to create membership payment.');
      if (selectedGateway === 'CASHFREE') {
        if (!intent.payment_session_id || !await ensureCashfreeLoaded() || !window.Cashfree) throw new Error('Cashfree checkout SDK is unavailable.');
        const cashfree = window.Cashfree({ mode: String(gatewaySettings.environment).toUpperCase() === 'PRODUCTION' ? 'production' : 'sandbox' });
        const checkout = await cashfree.checkout({ paymentSessionId: intent.payment_session_id, redirectTarget: '_modal' });
        if (checkout?.error) throw new Error(checkout.error.message || 'Cashfree checkout was cancelled.');
        const verification = await fetch('/api/cashfree/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: intent.order_id }) });
        const result = await verification.json().catch(() => ({}));
        if (!verification.ok || result.status !== 'PAID') throw new Error(result.error || 'Membership payment verification failed.');
        const me = await fetch('/api/auth/customer/me').then(value => value.json());
        setProfile(previous => ({ ...previous, membershipStatus: me.customer?.membershipStatus || null, membershipNumber: me.customer?.membershipNumber || null }));
        setPrimePaymentStep('success');
        return;
      }
      if (!await ensureRazorpayLoaded() || !window.Razorpay) throw new Error('Razorpay checkout SDK is unavailable.');
      new window.Razorpay({ key: intent.key_id, amount: intent.amount, currency: intent.currency, order_id: intent.razorpay_order_id, name: 'Swastik Supermarket', description: plans[0].name,
        handler: async response => {
          const verification = await fetch('/api/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(response) });
          const result = await verification.json().catch(() => ({}));
          if (!verification.ok) { setPrimePaymentStep('error'); setPaymentErrorMessage(result.error || 'Membership payment verification failed.'); return; }
          const me = await fetch('/api/auth/customer/me').then(value => value.json());
          setProfile(previous => ({ ...previous, membershipStatus: me.customer?.membershipStatus || null, membershipNumber: me.customer?.membershipNumber || null }));
          setPrimePaymentStep('success');
        }, modal: { ondismiss: () => setPrimePaymentStep('select') } }).open();
    } catch (error) {
      setPrimePaymentStep('error');
      setPaymentErrorMessage(error.message);
    }
  };
  // --- 1. USER SESSION CONTROLS WITH LOCALSTORAGE SYNC ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login | signup | forgot_password
  const [authType, setAuthType] = useState('password'); // password | otp

  // Staff Session State & Sync Listener
  const [activeStaffSession, setActiveStaffSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('swastik_logged_in_staff');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = sessionStorage.getItem('swastik_logged_in_staff');
        setActiveStaffSession(saved ? JSON.parse(saved) : null);
      } catch (e) {
        setActiveStaffSession(null);
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('staff_session_change', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('staff_session_change', handleSync);
    };
  }, []);

  const handleExitStaffSession = () => {
    fetch('/api/auth/staff/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem('swastik_logged_in_staff');
    sessionStorage.removeItem('swastik_staff_token');
    setActiveStaffSession(null);
    window.dispatchEvent(new Event('staff_session_change'));
    window.dispatchEvent(new Event('storage'));
  };

  // --- AUTH FORM STATES ---
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [referralAppliedCode, setReferralAppliedCode] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // --- PRIME MEMBERSHIP SECURE PAYMENT GATEWAY STATES ---
  const [showPrimePayment, setShowPrimePayment] = useState(false);
  const [primePaymentStep, setPrimePaymentStep] = useState('select'); // select | processing | success | error
  const [selectedGateway, setSelectedGateway] = useState('RAZORPAY'); // RAZORPAY | CASHFREE | OFFLINE
  const [gatewaySettings, setGatewaySettings] = useState({
    activeGateway: 'RAZORPAY',
    razorpayEnabled: true,
    razorpayKeyId: '',
    cashfreeEnabled: true,
    environment: 'TEST'
  });
  const [primePaymentMethod, setPrimePaymentMethod] = useState('upi'); // upi | card | netbanking
  const [primePaymentUpiApp, setPrimePaymentUpiApp] = useState('gpay'); // gpay | phonepe | paytm | upiid
  const [customUpiId, setCustomUpiId] = useState('');
  const [primeCardNum, setPrimeCardNum] = useState('');
  const [primeCardName, setPrimeCardName] = useState('');
  const [primeCardExpiry, setPrimeCardExpiry] = useState('');
  const [primeCardCvv, setPrimeCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('sbi'); // sbi | hdfc | icici | axis
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');

  // Fetch Payment Gateway configurations dynamically when membership modal opens
  useEffect(() => {
    fetch('/api/config')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const rzpEnabled = data.razorpayEnabled !== false;
        const cfEnabled = data.enabled !== false;
        setGatewaySettings({
          activeGateway: data.activeGateway || 'RAZORPAY',
          razorpayEnabled: rzpEnabled,
          razorpayKeyId: data.razorpayKeyId || '',
          cashfreeEnabled: cfEnabled,
          environment: data.environment || 'TEST'
        });

        // Set default gateway preference based on active setting & availability
        if (data.activeGateway === 'RAZORPAY' && rzpEnabled) {
          setSelectedGateway('RAZORPAY');
        } else if (data.activeGateway === 'CASHFREE' && cfEnabled) {
          setSelectedGateway('CASHFREE');
        } else if (rzpEnabled) {
          setSelectedGateway('RAZORPAY');
        } else if (cfEnabled) {
          setSelectedGateway('CASHFREE');
        } else {
          setSelectedGateway('OFFLINE');
        }
      })
      .catch(e => console.warn("Could not fetch payment settings for membership:", e));
  }, [showPrimePayment]);

  // Customer identity is authoritative only when returned by the server session.
  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "", address: "", points: 0, dob: "", anniversary: "", membershipStatus: null, membershipNumber: null });

  useEffect(() => {
    let active = true;
    fetch('/api/auth/customer/me').then(async response => {
      if (!response.ok) throw new Error('No active customer session');
      return response.json();
    }).then(({ customer }) => {
      if (!active || !customer) return;
      setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus, membershipNumber: customer.membershipNumber || null, referralCode: customer.referralCode || '' });
      setIsLoggedIn(true);
    }).catch(() => { if (active) setIsLoggedIn(false); });
    return () => { active = false; };
  }, []);

  const [copied, setCopied] = useState(false);

  const [activeTab, setActiveTab] = useState('profile'); // profile | orders | password | membership | rewards | cart | preferences
  // --- CUSTOMER POINTS LEDGER HISTORY ---
  const [pointsHistory, setPointsHistory] = useState([]);

  useEffect(() => {
    const customerId = profile?.id;
    if (!customerId || activeTab !== 'rewards') return;
    fetch(`/api/customers/${customerId}/points`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(payload => setPointsHistory(Array.isArray(payload.history) ? payload.history : []))
      .catch(() => setPointsHistory([]));
  }, [profile?.id, activeTab]);

  const pointsLedger = React.useMemo(() => {
    const ledger = [];

    (pointsHistory || []).forEach(tx => {
      const amount = Number(tx.points || 0);
      const type = String(tx.type || '').toUpperCase();
      const isAddition = amount > 0;
      ledger.push({
        id: `point_${tx.id}`,
        type,
        title: type === 'WELCOME'
          ? (isHindi ? '🎁 नए सदस्य का स्वागत बोनस' : '🎁 New Member Welcome Bonus')
          : type === 'REFERRAL'
            ? (isHindi ? `👥 रेफ़रल बोनस (${tx.referenceId || 'Referral'})` : `👥 Referral Bonus (${tx.referenceId || 'Referral'})`)
            : (tx.description || type),
        date: tx.createdAt || '',
        points: Math.abs(amount),
        isAddition
      });
    });

    return ledger;
  }, [pointsHistory, isHindi]);

  const userReferralCode = profile.referralCode || '';

  // The server already scopes this collection to the authenticated customer.
  const myOrders = orders || [];

  // Referral history comes from customer_points, not customer columns.
  const [referralsHistory, setReferralsHistory] = useState([]);

  useEffect(() => {
    const customerId = profile?.id;
    if (!customerId || activeTab !== 'rewards') return;
    fetch(`/api/customers/${customerId}/referrals`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => setReferralsHistory(Array.isArray(rows) ? rows : []))
      .catch(() => setReferralsHistory([]));
  }, [profile?.id, activeTab]);

  const myReferredCustomers = React.useMemo(() => referralsHistory || [], [referralsHistory]);

  const handleCopyCode = () => {
    if (!userReferralCode) return;
    navigator.clipboard.writeText(userReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = isHindi
      ? `नमस्ते! स्वस्तिक सुपरमार्केट ऐप पर साइन अप करें और मेरे रेफ़रल कोड *${userReferralCode}* का उपयोग कर ₹${referralSettings?.referralPointsEarned ?? 50} मूल्य के फ़्री शॉपिंग पॉइंट्स पाएं! यहाँ खरीदें: ${window.location.origin}`
      : `Hey! Shop fresh groceries at Swastik Supermarket. Sign up using my referral code *${userReferralCode}* and get ${referralSettings?.referralPointsEarned ?? 50} free shopping points immediately! Order now: ${window.location.origin}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const { cartItems, removeFromCart, updateQuantity, subtotal, grandTotal } = useCart();

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'membership' || activeTab === 'rewards') {
      fetchCustomers();
    } else if (activeTab === 'cart') {
      fetchProducts();
    } else if (activeTab === 'privacy') {
      fetchDataDeletionRequests();
    }
  }, [activeTab, fetchOrders, fetchCustomers, fetchProducts, fetchDataDeletionRequests]);

  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [orderUpdatesNotify, setOrderUpdatesNotify] = useState(true);
  const [promoOffersNotify, setPromoOffersNotify] = useState(false);

  // Success messages feedback states
  const [securityMessage, setSecurityMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // --- 2. ORDER HISTORY DATABASE WITH DETAILS ---
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // all | active | completed
  const [orderSearchText, setOrderSearchText] = useState('');
  // --- 3. AUTH LOGICS ---
  const verifyServerOtp = async (phone, enteredCode) => {
    const cleanCode = (enteredCode || '').trim();
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code: cleanCode })
      });
      const data = await res.json();
      return res.ok && data.status === 'verified' ? data : null;
    } catch (e) {
      return false;
    }
  };

  const triggerOtpSend = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setAuthError(isHindi ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    setAuthError('');
    setOtpCode('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: mobileNumber })
      });
      if (res.ok) {
        setAuthSuccess(isHindi 
          ? "सुरक्षा ओटीपी कोड आपके व्हाट्सएप नंबर पर भेज दिया गया है।" 
          : "Security OTP code has been dispatched to your WhatsApp number."
        );
      } else {
        setAuthError(isHindi ? "ओटीपी भेजने में असमर्थ। कृपया पुनः प्रयास करें।" : "Unable to dispatch OTP. Please check your number and retry.");
      }
    } catch(e) {
      setAuthError(isHindi ? "ओटीपी सेवा उपलब्ध नहीं है।" : "OTP delivery service is unavailable.");
    }
  };

  const verifyOtpAndProceed = async (e) => {
    e.preventDefault();
  
    if (authSubmitting) return;
  
    // Validate everything before locking the submit action.
    if (!mobileNumber) {
      setAuthError(
        isHindi
          ? "मोबाइल नंबर दर्ज करना आवश्यक है।"
          : "Mobile number is required."
      );
      return;
    }
  
    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError(
        isHindi
          ? "पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!"
          : "Password and Confirm Password do not match!"
      );
      return;
    }
  
    if (!otpCode) {
      setAuthError(
        isHindi
          ? "कृपया सत्यापित करने के लिए छह अंकों का ओटीपी पिन दर्ज करें।"
          : "Please enter the six digit OTP code pin."
      );
      return;
    }
  
    setAuthSubmitting(true);
    setAuthError('');
  
    try {
      const cleanCode = (otpCode || '').trim();
  
      const otpResult = await verifyServerOtp(mobileNumber, cleanCode);

      if (!otpResult) {
        setAuthError(
          isHindi
            ? "गलत ओटीपी कोड! कृपया सही ओटीपी दर्ज करें।"
            : "Invalid OTP code! Please enter the correct OTP sent to your WhatsApp."
        );
        return;
      }

      if (otpResult.customer) {
        const customer = otpResult.customer;
        setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus, membershipNumber: customer.membershipNumber || null, referralCode: customer.referralCode || '' });
        setIsLoggedIn(true);
        setAuthSuccess(isHindi ? "लॉगिन सफल।" : "Login successful.");
        return;
      }

      if (!otpResult.registrationRequired || authMode !== 'signup' || fullName.trim().length < 2) {
        throw new Error('Complete sign-up with your real name before creating an account.');
      }
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          phone: mobileNumber,
          email: String(emailAddress || '').trim().toLowerCase(),
          password: password || undefined,
          referralCode: String(referralAppliedCode || '').trim()
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.customer) throw new Error(result.error || 'Customer registration failed.');
      const customer = result.customer;
      setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus, membershipNumber: customer.membershipNumber || null, referralCode: customer.referralCode || '' });
      setIsLoggedIn(true);
      setAuthSuccess(isHindi ? 'खाता सफलतापूर्वक बनाया गया।' : 'Account created successfully.');
      return;
  

  
    } catch (err) {
      console.error('OTP verification/login failed:', err);
  
      setAuthError(
        isHindi
          ? 'लॉगिन प्रक्रिया में समस्या हुई। कृपया पुनः प्रयास करें।'
          : 'Login process failed. Please try again.'
      );
  
      setAuthSuccess('');
    } finally {
      // Always unlock the button, even when validation/API fails.
      setAuthSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!mobileNumber || mobileNumber.length < 10) {
      setAuthError(isHindi ? "कृपया वैध 10 अंकों का मोबाइल दर्ज करें।" : "Please enter valid 10-digit mobile number.");
      return;
    }
    if (!password || !password.trim()) {
      setAuthError(isHindi ? "कृपया पासवर्ड भरें।" : "Please fill in password.");
      return;
    }

    // Staff credentials are always verified by the server.
    try {
      const staffResponse = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileNumber, password })
      });
      if (staffResponse.ok) {
        const session = await staffResponse.json();
        sessionStorage.setItem('swastik_staff_token', session.token);
        sessionStorage.setItem('swastik_logged_in_staff', JSON.stringify(session.user));
        const perms = session.user.permissions || [];
        const isSuper = session.user.isMasterAdmin || session.user.role_code === 'admin';
        const isDeliveryOnly = perms.length === 1 && perms[0] === 'delivery';
        if (setUserRole) setUserRole(isDeliveryOnly ? 'delivery' : (isSuper ? 'admin' : 'manager'));
        setActiveStaffSession(session.user);
        setAuthSuccess(isHindi ? `लॉगिन सफल (${session.user.name})!` : `Staff login successful (${session.user.name}).`);
        setTimeout(() => onViewChange?.('admin'), 500);
        return;
      }
    } catch (error) {
      console.error('Staff authentication request failed:', error);
    }

    try {
      const response = await fetch('/api/auth/customer/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: mobileNumber, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.customer) throw new Error(data.error || 'Invalid customer credentials.');
      const customer = data.customer;
      setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus, membershipNumber: customer.membershipNumber || null, referralCode: customer.referralCode || '' });
      setIsLoggedIn(true);
      setAuthSuccess(isHindi ? "लॉगिन सफल।" : "Login successful.");
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
      setAuthSuccess('');
    }
  };

  const handleForgotPasswordReset = async (e) => {
    e.preventDefault();
    const cleanCode = (otpCode || '').trim();
    if (!cleanCode) {
      setAuthError(isHindi ? "कृपया 6 अंकों का ओटीपी कोड दर्ज करें।" : "Please enter 6-digit OTP code.");
      return;
    }
    const isValid = await verifyServerOtp(mobileNumber, cleanCode);
    if (!isValid) {
      setAuthError(isHindi ? "गलत ओटीपी कोड! कृपया सही ओटीपी दर्ज करें।" : "Invalid OTP code! Please enter the correct OTP sent to your WhatsApp.");
      return;
    }
    if (!password) {
      setAuthError(isHindi ? "कृपया नया पासवर्ड दर्ज करें!" : "Please write a new password!");
      return;
    }
    if (password !== resetConfirmPassword) {
      setAuthError(isHindi ? "नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!" : "New Password and Confirm Password do not match!");
      return;
    }
    
    const response = await fetch('/api/auth/customer/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: password }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setAuthError(result.error || 'Password reset failed.'); setAuthSuccess(''); return; }
    setAuthError('');
    setAuthSuccess(isHindi ? 'पासवर्ड सफलतापूर्वक रीसेट हुआ।' : 'Password reset successfully.');
    setAuthMode('login');
  };

  // --- 4. PROFILE LOGICS ---
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert(isHindi ? 'कृपया नया पासवर्ड दर्ज करें!' : 'Please enter a new password!');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert(isHindi ? 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!' : 'New Password and Confirm Password do not match!');
      return;
    }
    const response = await fetch('/api/auth/customer/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setSecurityMessage(result.error || 'Password update failed.'); return; }
    setSecurityMessage(isHindi ? 'पासवर्ड सफलतापूर्वक बदल गया!' : 'Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setTimeout(() => setSecurityMessage(''), 2000);
  };

  const handleUpdateProfile = async () => {
    if (isEditing) {
      if (!profile.address || !profile.address.trim()) {
        const msg = isHindi ? 'कृपया डिलीवरी पता दर्ज करें! डिलीवरी पता अनिवार्य है।' : 'Please enter delivery address! Delivery address is mandatory.';
        alert(msg);
        setProfileMessage(msg);
        return;
      }

      const response = await fetch('/api/customers/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profile.fullName, email: profile.email, address: profile.address, dob: profile.dob, anniversary: profile.anniversary }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setProfileMessage(result.error || 'Profile update failed.'); return; }
      const customer = result.customer;
      setProfile({ id: customer.id, fullName: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', points: Number(customer.points || 0), dob: customer.dob || '', anniversary: customer.anniversary || '', membershipStatus: customer.membershipStatus, membershipNumber: customer.membershipNumber || null, referralCode: customer.referralCode || '' });
      setProfileMessage(isHindi ? 'प्रोफ़ाइल अपडेट हो गई!' : 'Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 2000);
    }
    setIsEditing(!isEditing);
  };

  // --- --- --- RENDERING --- --- ---

  // Check if DOB and Anniversary were already submitted in the database.
  const cleanPhoneForLock = (ph) => ph ? ph.replace(/[^0-9]/g, "") : "";
  const dbCustForLock = (customers || []).find(c => {
    const cPhone = c.phone || "";
    const pPhone = profile.phone || "";
    return cPhone && pPhone && cleanPhoneForLock(cPhone).endsWith(cleanPhoneForLock(pPhone).slice(-10));
  });

  const isDobLocked = !!profile.dob || !!(dbCustForLock && dbCustForLock.dob);
  const isAnniversaryLocked = !!profile.anniversary || !!(dbCustForLock && dbCustForLock.anniversary);

  return (
    <div className="flex flex-col gap-6 pb-20 justify-center items-center w-full" id="account-view">
      
      {/* CASE A: USER IS NOT LOGGED IN - RENDER SENSATIONAL MULTI-AUTH PANEL */}
      {!isLoggedIn ? (
        <div className="w-full max-w-lg mx-auto py-10 px-4">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm text-slate-900">
            
            {/* Header Branding */}
            <div className="flex flex-col items-center text-center gap-1.5 mb-6">
              <div className="w-12 h-12 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center text-xl shadow-xs text-emerald-800">
                ✨
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 mt-2 leading-none">
                {isHindi ? "स्वास्तिक सुरक्षा हब" : "Swastik Access Room"}
              </h3>
              <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
                {authMode === 'login' && (isHindi ? "डिजिटल प्रमाणीकरण" : "Digital Authentication")}
                {authMode === 'signup' && (isHindi ? "नया खाता निर्माण" : "Direct Account Registration")}
                {authMode === 'forgot_password' && (isHindi ? "सुरक्षा साख पुनर्प्राप्ति" : "Security Trajectory Recovery")}
              </p>
            </div>

            {/* Error and Success Banners */}
            {authError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2.5 font-bold">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 animate-bounce" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Switch Tabs for Mode Toggle */}
            {authMode === 'login' && (
              <div className="grid grid-cols-2 bg-slate-100 p-1 border border-slate-200 rounded-xl mb-6 font-bold text-xs select-none">
                <button
                  type="button"
                  onClick={() => { setAuthType('password'); setAuthError(''); }}
                  className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${authType === 'password' ? 'bg-emerald-600 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🚀 {isHindi ? "पासवर्ड लॉगिन" : "Password Login"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthType('otp'); setAuthError(''); }}
                  className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${authType === 'otp' ? 'bg-emerald-600 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  ✉️ {isHindi ? "ओटीपी लॉगिन" : "OTP-PIN Login"}
                </button>
              </div>
            )}

            {/* ----------------- SUBMODE: STANDARD/OTP LOGIN ----------------- */}
            {authMode === 'login' && (
              <form onSubmit={authType === 'password' ? handlePasswordLogin : verifyOtpAndProceed} className="space-y-4">
                
                {/* Mobile Input Field */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">{isHindi ? "मोबाइल नंबर *" : "Mobile Number *"}</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder={isHindi ? "अपना मोबाइल नंबर" : "Enter 10-digit mobile"}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g,''))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 font-extrabold outline-none font-mono focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Switchable Credential check (Password vs OTP) */}
                {authType === 'password' ? (
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">{isHindi ? "पासवर्ड *" : "Secure Password *"}</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">{isHindi ? "सत्यापन ओटीपी कोड *" : "Verification OTP Pin *"}</label>
                      <button
                        type="button"
                        onClick={triggerOtpSend}
                        className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-lg uppercase font-black tracking-wider transition-all cursor-pointer active:scale-95"
                      >
                        {isHindi ? "ओटीपी भेजें" : "SEND OTP PIN"}
                      </button>
                    </div>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="Enter OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g,''))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 font-extrabold outline-none tracking-widest font-mono focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* CTA Submit Buttons */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>{isHindi ? "प्रवेश प्रमाणित करें" : "LOG IN NOW"}</span>
                </button>

                {/* Bottom interactive toggles */}
                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-3 border-t border-slate-200 font-bold">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot_password'); setAuthError(''); setAuthSuccess(''); }}
                    className="hover:text-slate-900 cursor-pointer transition-all"
                  >
                    {isHindi ? "पासवर्ड भूल गए?" : "Forgot Password?"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                    className="text-emerald-700 hover:text-emerald-900 font-extrabold cursor-pointer transition-all uppercase tracking-wider"
                  >
                    {isHindi ? "नया खाता बनाएं" : "Create Account"}
                  </button>
                </div>

                {/* Staff / Delivery Boy Quick Notice */}
                <div className="mt-3 p-3 bg-slate-900 rounded-xl text-slate-300 text-[11px] flex items-center justify-between gap-2 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-cyan-400 shrink-0 animate-pulse" />
                    <span>
                      {isHindi 
                        ? 'कर्मचारी / डिलीवरी बॉय? अपने रजिस्टर्ड मोबाइल और पासवर्ड से यहाँ लॉगिन करें।' 
                        : 'Staff or Delivery Boy? Log in here with your mobile & staff password.'}
                    </span>
                  </div>
                </div>
              </form>
            )}

            {/* ----------------- SUBMODE: SIGN UP REGISTER ----------------- */}
            {authMode === 'signup' && (
              <form onSubmit={verifyOtpAndProceed} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">{isHindi ? "पूरा नाम *" : "Full Name *"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Rahul Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">{isHindi ? "ईमेल पता" : "Email Address"}</label>
                    <input
                      type="email"
                      placeholder="rahul@example.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">{isHindi ? "मोबाइल नंबर *" : "Mobile Number *"}</label>
                  <input
                    type="tel"
                    required
                    maxLength="10"
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g,''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-black outline-none font-mono focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">{isHindi ? "नया पासवर्ड *" : "Choose Password *"}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">{isHindi ? "पुष्टि पासवर्ड *" : "Confirm Password *"}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">{isHindi ? "रेफ़रल कोड (वैकल्पिक)" : "Referral Code (Optional)"}</label>
                  <input
                    type="text"
                    placeholder={isHindi ? "रेफ़रल कोड" : "Referral code"}
                    value={referralAppliedCode}
                    onChange={(e) => setReferralAppliedCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-extrabold outline-none tracking-widest font-mono focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">{isHindi ? "सुरक्षित सत्यापन ओटीपी *" : "Simulated OTP Confirm *"}</label>
                    <button
                      type="button"
                      onClick={triggerOtpSend}
                      className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-lg uppercase font-black transition-all cursor-pointer"
                    >
                      {isHindi ? "कोड मंगवाएं" : "SEND CODE"}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g,''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none tracking-widest font-mono focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
                >
                  {isHindi ? "खाता रजिस्टर करें" : "REGISTER PROFILE NOW"}
                </button>

                <div className="text-center pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold transition-all cursor-pointer"
                  >
                    ← {isHindi ? "लॉगिन पेज पर वापस जाएँ" : "Back to Security Login"}
                  </button>
                </div>
              </form>
            )}

            {/* ----------------- SUBMODE: FORGOT PASSWORD RECOVERY ----------------- */}
            {authMode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">{isHindi ? "पंजीकृत मोबाइल नंबर" : "Registered Mobile Number"}</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g,''))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 font-extrabold outline-none font-mono focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">{isHindi ? "मोबाइल रीसेट कोड ओटीपी" : "Mobile Reset OTP PIN"}</label>
                    <button
                      type="button"
                      onClick={triggerOtpSend}
                      className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-lg uppercase font-black transition-all cursor-pointer"
                    >
                      {isHindi ? "ओटीपी भेजें" : "SEND RESET CODE"}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="Reset code pin"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g,''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-xs text-slate-900 placeholder-slate-400 font-extrabold outline-none tracking-widest font-mono focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">{isHindi ? "नया सुरक्षा पासवर्ड दर्ज करें *" : "Choose New Password *"}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">{isHindi ? "पुष्टि नया पासवर्ड *" : "Confirm New Password *"}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-xs text-slate-900 placeholder-slate-400 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Manual Admin Reset Help Banner */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
                    <span>💬</span>
                    <span>{isHindi ? "ओटीपी प्राप्त नहीं हुआ या कोई समस्या?" : "Facing OTP Issues or Failure?"}</span>
                  </p>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    {isHindi
                      ? "यदि ओटीपी प्राप्त करने में समस्या आ रही है, तो पासवर्ड रीसेट के लिए स्टोर एडमिन से व्हाट्सएप/कॉल पर संपर्क करें (+91 98765 43210)। एडमिन मैन्युअली आपका पासवर्ड बदल देंगे।"
                      : "If you face any issue receiving OTP, please contact Store Admin at +91 98765 43210 for manual password reset."}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs mt-2"
                >
                  {isHindi ? "नया क्रेडेंशियल सेव करें" : "UPDATE PASSWORD & SAVE"}
                </button>

                <div className="text-center pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold transition-all cursor-pointer"
                  >
                    ← {isHindi ? "लॉगिन पेज पर वापस जाएँ" : "Back to Security Login"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      ) : (
        /* CASE B: USER IS LOGGED IN - SHOW PROFILE & ORDER SYSTEM */
        <div className="flex flex-col gap-6 pb-20 mt-4 px-4 md:px-8 w-full max-w-7xl">
          
          {/* Account Info Header */}
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight md:text-2xl">{t('myAccount')}</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('accountDesc')}</p>
            </div>
            <button 
              onClick={() => {
                fetch('/api/auth/customer/logout', { method: 'POST' }).catch(() => {});
                setIsLoggedIn(false);
                setProfile({ fullName: "", email: "", phone: "", address: "", points: 0, dob: "", anniversary: "", membershipStatus: null, membershipNumber: null });
                sessionStorage.removeItem('swastik_logged_in_staff');
                sessionStorage.removeItem('swastik_staff_token');
                setActiveStaffSession(null);
                window.dispatchEvent(new Event('staff_session_change'));
                window.dispatchEvent(new Event('storage'));
                setAuthError('');
                setMobileNumber('');
                setPassword('');
                setOtpCode('');
                alert(isHindi ? 'सफलतापूर्वक लॉगआउट किया गया।' : 'Successfully logged out.');
              }}
              className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider self-start active:scale-95 shadow-xs shrink-0 transition-all cursor-pointer"
            >
              {t('logout')}
            </button>
          </section>

          {/* Staff Partner Session Quick Switcher Banner */}
          {activeStaffSession && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 shrink-0">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">Active Staff Session</span>
                    <span className="text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Browser Saved
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-white">
                    {activeStaffSession.name} ({activeStaffSession.role || 'Staff'})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isHindi 
                      ? 'आप अभी ग्राहक खाते में हैं। यह सत्र पहले एडमिन/स्टाफ पैनल में लॉगिन रहने के कारण सेव है।'
                      : 'You are signed into your Customer Account. A staff session is also saved in your browser.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewChange && onViewChange('admin')}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {isHindi ? 'एडमिन / डिलीवरी डैशबोर्ड खोलें →' : 'Open Staff Workspace →'}
                </button>
                <button
                  type="button"
                  onClick={handleExitStaffSession}
                  className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Log out of Staff Session and dismiss this banner"
                >
                  {isHindi ? 'स्टाफ सत्र बंद करें' : 'Exit Staff Mode'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full border-b border-slate-200 mb-6">
            {[
              { id: 'profile', icon: User, labelEn: 'My Profile', labelHi: 'मेरी प्रोफ़ाइल' },
              { id: 'orders', icon: Package, labelEn: 'My Orders', labelHi: 'मेरे ऑर्डर', badge: myOrders.length },
              { id: 'password', icon: Lock, labelEn: 'Security & Password', labelHi: 'सुरक्षा एवं पासवर्ड' },
              { id: 'membership', icon: Crown, labelEn: 'Prime Membership', labelHi: 'प्राइम सदस्यता', badgeText: profile.membershipStatus === 'Active' ? 'VIP' : null, color: 'text-amber-500' },
              { id: 'rewards', icon: Gift, labelEn: 'Rewards & Referrals', labelHi: 'रिवॉर्ड्स और रेफ़रल', badgeText: `${profile.points || 0} PTS`, color: 'text-amber-500' },
              { id: 'cart', icon: ShoppingCart, labelEn: 'My Cart', labelHi: 'मेरी कार्ट', badge: (cartItems || []).reduce((acc, item) => acc + item.quantity, 0), color: 'text-emerald-600' },
              { id: 'preferences', icon: Languages, labelEn: 'Preferences', labelHi: 'प्राथमिकताएं' },
              { id: 'privacy', icon: ShieldCheck, labelEn: 'Data & Privacy', labelHi: 'डेटा एवं गोपनीयता', color: 'text-rose-500' }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <IconComp className={`h-4 w-4 ${isActive ? 'text-white' : (tab.color || 'text-slate-500')}`} />
                  <span>{isHindi ? tab.labelHi : tab.labelEn}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full font-mono ${
                      isActive ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.badgeText && (
                    <span className={`ml-1 px-1.5 py-0.2 text-[9px] font-extrabold rounded font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {tab.badgeText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="w-full">
            {activeTab === 'profile' && (
              <ProfileTab 
                profile={profile}
                setProfile={setProfile}
                isEditing={isEditing}
                handleUpdateProfile={handleUpdateProfile}
                profileMessage={profileMessage}
                isHindi={isHindi}
                t={t}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersTab 
                orders={myOrders}
                orderSearchText={orderSearchText}
                setOrderSearchText={setOrderSearchText}
                orderStatusFilter={orderStatusFilter}
                setOrderStatusFilter={setOrderStatusFilter}
                setSelectedOrder={setSelectedOrder}
                isHindi={isHindi}
                t={t}
              />
            )}

            {activeTab === 'password' && (
              <PasswordTab 
                currentPassword={currentPassword}
                setCurrentPassword={setCurrentPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmNewPassword={confirmNewPassword}
                setConfirmNewPassword={setConfirmNewPassword}
                handleUpdatePassword={handleUpdatePassword}
                securityMessage={securityMessage}
                isHindi={isHindi}
                t={t}
              />
            )}

            {activeTab === 'membership' && (
              <MembershipTab 
                profile={profile}
                setProfile={setProfile}
                setShowPrimePayment={setShowPrimePayment}
                primeSettings={primeSettings}
                isHindi={isHindi}
              />
            )}

            {activeTab === 'rewards' && (
              <RewardsTab 
                profile={profile}
                userReferralCode={userReferralCode}
                handleCopyCode={handleCopyCode}
                copied={copied}
                handleWhatsAppShare={handleWhatsAppShare}
                referralSettings={referralSettings}
                myReferredCustomers={myReferredCustomers}
                isHindi={isHindi}
              />
            )}

            {activeTab === 'cart' && (
              <CartTab isHindi={isHindi} onViewChange={onViewChange} />
            )}

            {activeTab === 'preferences' && (
              <PreferencesTab 
                language={language}
                setLanguage={setLanguage}
                orderUpdatesNotify={orderUpdatesNotify}
                setOrderUpdatesNotify={setOrderUpdatesNotify}
                promoOffersNotify={promoOffersNotify}
                setPromoOffersNotify={setPromoOffersNotify}
                isHindi={isHindi}
                t={t}
              />
            )}

            {activeTab === 'privacy' && (
              <PrivacyDataTab 
                profile={profile}
                myOrders={myOrders}
                isHindi={isHindi}
              />
            )}
          </div>

          {/* Old Bento Grid Commented Out / Removed */}
          <div className="hidden">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg md:col-span-8 flex flex-col justify-between text-white">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 text-glow">
                    <User className="h-4 w-4 text-cyan-400" />
                    <span>{t('profileManagement')}</span>
                  </h3>
                  <button 
                    onClick={handleUpdateProfile}
                    className="text-xs font-black text-cyan-400 hover:underline uppercase transition-all"
                  >
                    {isEditing ? 'Save' : t('editInfo')}
                  </button>
                </div>

                {profileMessage && (
                  <p className="mb-4 text-xs font-bold text-cyan-400">{profileMessage}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('fullName')}</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.fullName} 
                        onChange={e => setProfile({...profile, fullName: e.target.value})}
                        className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans"
                      />
                    ) : (
                      <div className="px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                        {profile.fullName}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</label>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={profile.email} 
                        onChange={e => setProfile({...profile, email: e.target.value})}
                        className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans"
                      />
                    ) : (
                      <div className="px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                        {profile.email}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('phoneNumber')}</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.phone} 
                        onChange={e => setProfile({...profile, phone: e.target.value})}
                        className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-mono"
                      />
                    ) : (
                      <div className="px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-xs font-semibold text-slate-200 font-mono">
                        {profile.phone}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('deliveryAddress')}</label>
                    {isEditing ? (
                      <textarea 
                        rows="1"
                        value={profile.address} 
                        onChange={e => setProfile({...profile, address: e.target.value})}
                        className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans"
                      />
                    ) : (
                      <div className="px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-xs font-semibold text-slate-200 overflow-hidden text-ellipsis">
                        {profile.address}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">🗓️ {isHindi ? "जन्म तिथि (DOB)" : "Date of Birth (DOB)"}</label>
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          type="date" 
                          value={profile.dob || ''} 
                          onChange={e => setProfile({...profile, dob: e.target.value})}
                          disabled={isDobLocked}
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {!isDobLocked && (
                          <button
                            type="button"
                            onClick={() => setProfile({...profile, dob: new Date().toISOString().split('T')[0]})}
                            className="px-2.5 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/20 rounded-lg text-[9px] font-black uppercase tracking-wider text-pink-300 transition-all active:scale-95 shrink-0"
                            title="Set to today's date for quick-test"
                          >
                            {isHindi ? "आज का सेट करें 🎂" : "Set Today 🎂"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                        {profile.dob ? new Date(profile.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : (isHindi ? "सेट नहीं है" : "Not Set")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">💍 {isHindi ? "विवाह वर्षगांठ" : "Marriage Anniversary"}</label>
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          type="date" 
                          value={profile.anniversary || ''} 
                          onChange={e => setProfile({...profile, anniversary: e.target.value})}
                          disabled={isAnniversaryLocked}
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {!isAnniversaryLocked && (
                          <button
                            type="button"
                            onClick={() => setProfile({...profile, anniversary: new Date().toISOString().split('T')[0]})}
                            className="px-2.5 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/20 rounded-lg text-[9px] font-black uppercase tracking-wider text-indigo-300 transition-all active:scale-95 shrink-0"
                            title="Set to today's date for quick-test"
                          >
                            {isHindi ? "आज का सेट करें 💍" : "Set Today 💍"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                        {profile.anniversary ? new Date(profile.anniversary).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : (isHindi ? "सेट नहीं है" : "Not Set")}
                      </div>
                    )}
                  </div>
                </div>              </div>
            </div>

            {/* Security Password Box (Right second) */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg md:col-span-4 flex flex-col justify-between text-white border-white/10">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3 mb-2 text-glow">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  <span>{t('security')}</span>
                </h3>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-4">
                  {t('securityDesc')}
                </p>

                {securityMessage && (
                  <p className="mb-3 text-xs font-bold text-cyan-400">{securityMessage}</p>
                )}

                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('currentPassword')}</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/50 transition-all font-mono" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('newPassword')}</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/20 transition-all font-sans" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{isHindi ? 'पुष्टि नया पासवर्ड' : 'Confirm New Password'}</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-xs text-white font-semibold outline-none focus:bg-white/10 focus:border-cyan-400/20 transition-all font-sans" 
                    />
                  </div>
                  <button 
                    type="submit"
                    className="mt-2 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/30 text-cyan-200 font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg"
                  >
                    {t('updatePassword')}
                  </button>
                </form>
              </div>
            </div>

            {/* My Orders Table list container */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg md:col-span-8 overflow-hidden text-white border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 text-glow">
                  <Package className="h-4 w-4 text-cyan-400" />
                  <span>{t('myOrders')}</span>
                </h3>
                <span className="text-[10px] font-bold text-cyan-300 uppercase bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-md self-start sm:self-auto">
                  {isHindi ? "सक्रिय नियंत्रण" : "Interactive Tracker"}
                </span>
              </div>

              {/* Interactive Search and Filter Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder={isHindi ? "ऑर्डर ID या आइटम का नाम खोजें..." : "Search Order ID or item..."}
                    value={orderSearchText}
                    onChange={(e) => setOrderSearchText(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-[11px] text-white placeholder-slate-500 focus:bg-slate-950 focus:border-cyan-400 outline-none transition-all font-semibold font-mono"
                  />
                </div>

                {/* Status Switcher pills */}
                <div className="flex bg-slate-950/80 border border-white/10 rounded-xl p-1 items-center gap-1 font-mono">
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('all')}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                      orderStatusFilter === 'all'
                        ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 text-slate-950 font-black shadow shadow-cyan-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isHindi ? "सभी" : "All"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('active')}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                      orderStatusFilter === 'active'
                        ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 text-slate-950 font-black shadow shadow-cyan-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isHindi ? "सक्रिय" : "Transit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('completed')}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                      orderStatusFilter === 'completed'
                        ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 text-slate-950 font-black shadow shadow-cyan-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isHindi ? "पूर्ण" : "Delivered"}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b border-white/15 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-2 px-2 pb-3">{t('orderIdTitle')}</th>
                      <th className="py-2 px-2 pb-3">{t('dateTitle')}</th>
                      <th className="py-2 px-2 pb-3">{t('statusTitle')}</th>
                      <th className="py-2 px-2 pb-3">{t('totalTitle')}</th>
                      <th className="py-2 px-2 pb-3 text-right">{t('actionTitle')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs font-semibold text-slate-200">
                    {(() => {
                      const userCleanPhone = (profile?.phone || mobileNumber || '').replace(/\D/g, '').slice(-10);
                      const userCleanEmail = (profile?.email || emailAddress || '').toLowerCase().trim();

                      const list = (orders || []).filter(ord => {
                        const ordCleanPhone = (ord.customerPhone || ord.customerMobile || '').replace(/\D/g, '').slice(-10);
                        const ordCleanEmail = (ord.customerEmail || '').toLowerCase().trim();

                        if (userCleanPhone || userCleanEmail) {
                          const matchesPhone = Boolean(
                            userCleanPhone && ordCleanPhone && (
                              ordCleanPhone === userCleanPhone ||
                              userCleanPhone.endsWith(ordCleanPhone) ||
                              ordCleanPhone.endsWith(userCleanPhone)
                            )
                          );
                          const matchesEmail = Boolean(
                            userCleanEmail && ordCleanEmail && ordCleanEmail === userCleanEmail
                          );
                          if (!matchesPhone && !matchesEmail) {
                            return false;
                          }
                        }

                        if (orderStatusFilter === 'active' && !ord.isActive) return false;
                        if (orderStatusFilter === 'completed' && ord.isActive) return false;
                        if (orderSearchText.trim()) {
                          const query = orderSearchText.toLowerCase();
                          const idMatch = (ord.id || '').toLowerCase().includes(query);
                          const itemsMatch = ord.items && ord.items.some(it => 
                            (it.nameEn || '').toLowerCase().includes(query) || 
                            (it.nameHi || '').toLowerCase().includes(query)
                          );
                          if (!idMatch && !itemsMatch) return false;
                        }
                        return true;
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" className="text-center py-10 px-4 text-slate-400">
                              <Package className="h-8 w-8 text-cyan-400/50 mx-auto mb-2.5 animate-bounce" />
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                {orderSearchText || orderStatusFilter !== 'all' 
                                  ? (isHindi ? "कोई मेल खाता आर्डर नहीं मिला" : "No Matching Records Found") 
                                  : (isHindi ? "कोई आर्डर इतिहास उपलब्ध नहीं है" : "No Purchases Found")}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm mx-auto mt-1">
                                {orderSearchText || orderStatusFilter !== 'all'
                                  ? (isHindi ? "अपनी खोज या फ़िल्टर को बदलने का प्रयास करें।" : "Try refining your search terms or shifting status filters to view historical entries.")
                                  : (isHindi 
                                      ? "आपका ऑर्डर इतिहास खाली है। कार्ट में ताजी सब्जियां, डेयरी और अपने किराना उत्पाद जोड़ें और अपना पहला होम-डिलीवरी ऑर्डर प्लेस करें!" 
                                      : "You haven't ordered anything yet! Grab standard dairy, seasonal products or green grocery and complete your checkout to populate this ledger."
                                    )
                                }
                              </p>
                            </td>
                          </tr>
                        );
                      }

                      return list.map((ord) => (
                        <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-2">
                            <span className="text-white font-mono font-bold block">{ord.id}</span>
                            {/* Order items data inline preview list */}
                            <div className="mt-1.5 flex flex-wrap gap-1 max-w-xs sm:max-w-md">
                              {ord.items && ord.items.map((it, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center bg-white/10 border border-white/5 text-[9px] text-cyan-300 rounded px-1.5 py-0.5 leading-none"
                                >
                                  {it.qty} × {isHindi ? it.nameHi : it.nameEn}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-400 font-mono whitespace-nowrap">{ord.date || (ord.orderDate ? new Date(ord.orderDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A')}</td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                                ord.isActive 
                                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' 
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              }`}>
                                {ord.isActive ? (isHindi ? "मार्ग में" : "Transit") : (isHindi ? "वितरित" : "Delivered")}
                              </span>
                              <div className="flex gap-1">
                                <span className="text-[8px] font-mono text-slate-400 bg-white/10 border border-white/10 px-1 py-0.2 rounded uppercase tracking-wider font-extrabold shadow-sm">
                                  {ord.paymentMethod || 'COD'}
                                </span>
                                <span className={`text-[8px] font-mono px-1 py-0.2 rounded uppercase font-extrabold tracking-wider ${
                                  (ord.paymentStatus || 'PENDING').toUpperCase() === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-300'
                                    : 'bg-rose-500/10 text-rose-300'
                                }`}>
                                  {ord.paymentStatus || 'PENDING'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-mono font-bold text-yellow-400">₹{ord.total}</td>
                          <td className="py-3 px-2 text-right">
                            <button 
                              type="button"
                              onClick={() => setSelectedOrder(ord)}
                              className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider hover:bg-cyan-500/25 transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              {t('details')}
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preferences Language & Settings */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg md:col-span-4 flex flex-col justify-between text-white border-white/10">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3 mb-4 text-glow">
                  <Languages className="h-4 w-4 text-cyan-400" />
                  <span>{t('preferences')}</span>
                </h3>

                {/* Language Selector */}
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    {t('languagePref')}
                  </label>
                  
                  <div className="flex flex-col gap-2">
                    {[
                      { code: 'en', label: 'English (US)' },
                      { code: 'hi', label: 'Hindi (हिन्दी)' }
                    ].map((lang) => (
                      <label 
                        key={lang.code}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                          language === lang.code 
                            ? 'border-cyan-400 bg-white/10 font-bold text-white' 
                            : 'border-white/10 hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="account-lang" 
                          checked={language === lang.code}
                          onChange={() => setLanguage(lang.code)}
                          className="hidden"
                        />
                        <span className="text-xs">{lang.label}</span>
                        <div className={`ml-auto w-4 h-4 rounded-full border flex items-center justify-center ${
                          language === lang.code ? 'border-cyan-400' : 'border-white/30'
                        }`}>
                          {language === lang.code && <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full" />}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notification settings slider switches */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    {t('notificationPref')}
                  </label>

                  {/* Order Updates switches */}
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setOrderUpdatesNotify(!orderUpdatesNotify)}>
                    <span className="text-xs font-semibold text-slate-200">{t('orderUpdates')}</span>
                    <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${orderUpdatesNotify ? 'bg-cyan-400' : 'bg-white/15'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow ${orderUpdatesNotify ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>

                  {/* Promotional Switch */}
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setPromoOffersNotify(!promoOffersNotify)}>
                    <span className="text-xs font-semibold text-slate-200">{t('promotionalOffers')}</span>
                    <div className={`w-10 h-6 rounded-full relative transition-all duration-350 ${promoOffersNotify ? 'bg-cyan-400' : 'bg-white/15'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-350 shadow ${promoOffersNotify ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Refer & Earn Customer Loyalty Widget Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900 border border-amber-500/20 rounded-2xl p-5 shadow-xl md:col-span-4 flex flex-col justify-between text-white border-white/10">
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-yellow-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3 text-glow">
                  <Gift className="h-4.5 w-4.5 text-yellow-400" />
                  <span>{isHindi ? "रेफ़र करें और कमाएं" : "Refer & Earn Center"}</span>
                </h3>

                {/* Points wallet status */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="p-2 bg-yellow-400/20 border border-yellow-400/30 rounded-lg text-yellow-400 font-bold text-sm select-none">
                    🪙
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{isHindi ? "कुल संचित रिवॉर्ड पॉइंट्स" : "Total Accumulated Reward Points"}</div>
                    <div className="text-sm font-black text-white font-mono flex items-baseline gap-1.5">
                      <span>{profile.points || 0} PTS</span>
                      <span className="text-[10px] text-zinc-400 font-medium font-sans">
                        (≈ ₹{((profile.points || 0) * (referralSettings?.pointsValueInINR ?? 1)).toFixed(1)} INR)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Points breakdown details & Ledger history */}
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-950/65 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-semibold">{isHindi ? "🎁 पहली बार साइन-अप इनाम" : "🎁 Welcome Bonus"}</span>
                      <span className="font-mono text-emerald-400 font-black">
                        +{(pointsHistory || []).filter(x => String(x.type || '').toUpperCase() === 'WELCOME').reduce((sum, x) => sum + Math.max(0, Number(x.points || 0)), 0)} PTS
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-2">
                      <span className="text-slate-400 font-semibold">{isHindi ? "👥 मित्र रेफ़रल बोनस" : "👥 Invite & Referrals Bonus"}</span>
                      <span className="font-mono text-cyan-400 font-black">
                        +{(pointsHistory || []).filter(x => String(x.type || '').toUpperCase() === 'REFERRAL').reduce((sum, x) => sum + Math.max(0, Number(x.points || 0)), 0)} PTS
                      </span>
                    </div>
                  </div>

                  {/* High fidelity interactive ledger timeline list */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      {isHindi ? "रिवॉर्ड पॉइंट इतिहास बहीखाता" : "Loyalty Rewards Ledger History"}
                    </span>
                    <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {pointsLedger.map((item, idx) => (
                        <div key={item.id || idx} className="p-2 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center text-[10px]">
                          <div>
                            <p className="font-bold text-slate-200">{item.title}</p>
                            <p className="text-[8px] text-slate-500 font-mono mt-0.5">{item.date}</p>
                          </div>
                          <div className="text-right">
                            {item.isNeutral ? (
                              <span className="text-[9px] text-amber-300 font-semibold uppercase">{item.extra}</span>
                            ) : (
                              <span className={`font-mono font-extrabold text-[11px] ${item.isAddition ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.isAddition ? '+' : '-'}{item.points} PTS
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-[9px] bg-amber-500/10 border border-amber-500/15 p-2 rounded-xl text-amber-300 leading-normal font-bold flex gap-1.5 items-start">
                    <span>🛒</span>
                    <span>
                      {isHindi 
                        ? "रिवॉर्ड पॉइंट केवल स्टोर शॉपिंग डिस्काउंट के लिए लागू हैं। इसे नकद में परिवर्तित नहीं किया जा सकता।" 
                        : "Applicable only for shopping purchases. Points can be redeemed exclusively on Swastik checkout carts."
                      }
                    </span>
                  </div>
                </div>

                {/* Display referral code block */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "आपका विशेष रेफ़रल कोड" : "Your Personal Invite Code"}
                  </span>
                  <div className="flex bg-slate-950/80 border border-white/12 rounded-xl overflow-hidden pl-3.5 pr-1.5 py-1.5 items-center justify-between">
                    <span className="font-mono text-xs font-black text-amber-300 tracking-wider select-all">{userReferralCode}</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-1 px-2.5 rounded bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Social Share Call-to-action button */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{isHindi ? "व्हाट्सएप पर शेयर करें" : "Share on WhatsApp"}</span>
                </button>

                {/* Claim referral coupon section */}
                {profile.referredBy && (
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="p-2.5 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-[10px] font-semibold">
                      🎁 {isHindi ? "रेफ़रल कोड लिंक है: " : "Referral code linked: "} 
                      <span className="font-mono font-black">{profile.referredBy}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Swastik Prime Membership Card Widget */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-2xl p-5 shadow-xl md:col-span-4 flex flex-col justify-between text-white border-white/10">
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3 text-glow">
                  <Crown className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                  <span>{isHindi ? "स्वास्तिक प्राइम मेंबरशिप" : "Swastik Prime Membership"}</span>
                </h3>

                {profile.membershipStatus !== 'Active' ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        {isHindi 
                          ? "स्वास्तिक प्राइम के साथ विशेष सुविधाओं का आनंद लें और हर ऑर्डर पर डिलीवरी चार्ज बचाएं!" 
                          : "Unlock elite membership privileges, free delivery options, and ultra priority dispatches!"}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-indigo-400">⚡</span>
                          <div>
                            <p className="font-bold text-slate-200">{isHindi ? (primeSettings?.primeBenefit1Hi || "जीरो डिलीवरी शुल्क") : (primeSettings?.primeBenefit1En || "Free / Reduced Delivery")}</p>
                            <p className="text-[10px] text-slate-400">{isHindi ? (primeSettings?.primeBenefitDesc1Hi || "सभी चुनिंदा क्षेत्रों पर भारी बचत") : (primeSettings?.primeBenefitDesc1En || "Maximum relief on all location groups")}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-indigo-400">📦</span>
                          <div>
                            <p className="font-bold text-slate-200">{isHindi ? (primeSettings?.primeBenefit2Hi || "अल्ट्रा-फास्ट स्लॉट") : (primeSettings?.primeBenefit2En || "VIP Priority Dispatch")}</p>
                            <p className="text-[10px] text-slate-400">{isHindi ? (primeSettings?.primeBenefitDesc2Hi || "आपका आर्डर सबसे पहले पैक और डिलीवर होगा") : (primeSettings?.primeBenefitDesc2En || "Express processing by our direct team")}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-indigo-400">🪙</span>
                          <div>
                            <p className="font-bold text-slate-200">{isHindi ? (primeSettings?.primeBenefit3Hi || "दोगुना रिवॉर्ड") : (primeSettings?.primeBenefit3En || "2x Loyalty Points")}</p>
                            <p className="text-[10px] text-slate-400">{isHindi ? (primeSettings?.primeBenefitDesc3Hi || "हर खरीद पर डबल अंक कमाएं") : (primeSettings?.primeBenefitDesc3En || "Earn bonus cashbacks on every single cart")}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-center text-xs text-slate-400 mb-2">
                        {isHindi ? "एक वर्ष के लिए केवल" : "Predefined Annual Privilege Amount"}{" "}
                        <span className="text-yellow-400 font-extrabold text-sm font-mono">₹{primeSettings?.primePlanFee ?? 299}</span>
                      </p>

                      {primeSettings?.isMembershipEnabled === false ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
                          <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                            {isHindi ? "🔒 ग्राहक स्व-सदस्यता निर्माण बंद है" : "🔒 Self-Service Card Generation Closed"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {isHindi 
                              ? "ऑनलाइन मेंबरशिप जनरेशन वर्तमान में स्टोर प्रबंधन द्वारा बंद है। नया वीआईपी कार्ड प्राप्त करने के लिए कृपया स्टोर एडमिन से संपर्क करें।" 
                              : "Self-activation is currently disabled by store management. Please contact store admin to manually issue your VIP Membership Card."}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowPrimePayment(true);
                            setPrimePaymentStep('select');
                            setPaymentErrorMessage('');
                          }}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 border border-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg text-center cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          🚀 {isHindi ? `प्राइम सक्रिय करें @ ₹${primeSettings?.primePlanFee ?? 299}` : `Activate Prime Plan @ ₹${primeSettings?.primePlanFee ?? 299}`}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* VIP Print Friendly Membership Card Render */}
                    <div 
                      id="prime-vip-card" 
                      className="relative p-4 rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-black border-2 border-amber-400/70 shadow-2xl overflow-hidden flex flex-col justify-between text-white aspect-[1.586] min-h-[220px]"
                    >
                      {/* Abstract holograph mesh overlay */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(129,140,248,0.15),transparent_60%)] pointer-events-none"></div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-400/10 to-transparent rounded-bl-full pointer-events-none"></div>

                      <div className="z-10 flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-5 h-5 text-amber-300 animate-pulse fill-amber-300" />
                          <div>
                            <p className="text-[11px] font-black tracking-widest text-amber-300 leading-none">SWASTIK PRIME</p>
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">VIP PRIVILEGE PASS</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-extrabold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded shadow-sm tracking-widest uppercase">
                          ACTIVE
                        </span>
                      </div>

                      {/* Middle Grid containing core data and QR code */}
                      <div className="z-10 mt-3 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-8 space-y-1">
                          <div className="space-y-0.5" style={{ minWidth: 0 }}>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block">{isHindi ? "सदस्य का नाम" : "Member Name"}</span>
                            <span className="text-xs font-black text-white uppercase tracking-wide block truncate">{profile.fullName}</span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block">{isHindi ? "सदस्यता पहचान संख्या" : "Membership Identifier"}</span>
                            <span className="text-[10px] font-mono font-bold text-amber-300 block">
                              {profile.membershipNumber || (isHindi ? 'उपलब्ध नहीं' : 'Not available')}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-4 flex flex-col items-center justify-center bg-white p-1 rounded-lg shadow-lg border border-indigo-400/20">
                          {/* QR Code dynamically loaded to redirect to swastiksupermarket.com */}
                          {profile.membershipNumber && <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(profile.membershipNumber)}`}
                            alt="Membership number QR"
                            className="w-14 h-14 object-contain"
                            referrerPolicy="no-referrer"
                          />}
                        </div>
                      </div>

                      {/* Bottom Footer block */}
                      <div className="z-10 mt-3 border-t border-white/10 pt-1.5 flex justify-between items-center">
                        <div className="flex gap-3 text-[7px] text-slate-400 uppercase tracking-wider font-extrabold">
                          <div>
                            <span>{isHindi ? "वैधता" : "Status"}:</span>{" "}
                            <span className="text-green-400">{isHindi ? "सक्रिय" : "Active"}</span>
                          </div>
                        </div>
                        <span className="text-[7.5px] font-mono text-zinc-400 tracking-tight">swastiksupermarket.com</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] text-center text-slate-400 leading-normal font-medium">
                        {isHindi 
                          ? "💡 भौतिक सत्यापन हेतु इस कार्ड को प्रिंट करें अथवा क्यूआर कोड को स्कैन करें जो स्वास्तिक सुपरमार्केट वेबसाइट पर निर्देशित करेगा।" 
                          : "💡 QR Code points directly to swastiksupermarket.com for live verification."}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Custom window print with print stylesheet injection for perfect card print output
                            const printWindow = window.open('', '_blank');
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Swastik Prime VIP Member Pass - ${profile.fullName}</title>
                                  <style>
                                    body {
                                      background: #ffffff;
                                      color: #000000;
                                      font-family: 'Helvetica Neue', Arial, sans-serif;
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      height: 100vh;
                                      margin: 0;
                                    }
                                    .card {
                                      width: 450px;
                                      height: 280px;
                                      border: 3px solid #b45309;
                                      border-radius: 16px;
                                      background: linear-gradient(135deg, #0f172a, #1e1b4b);
                                      color: white;
                                      padding: 24px;
                                      box-sizing: border-box;
                                      display: flex;
                                      flex-direction: column;
                                      justify-content: space-between;
                                      position: relative;
                                      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                                      -webkit-print-color-adjust: exact;
                                      print-color-adjust: exact;
                                    }
                                    .header {
                                      display: flex;
                                      justify-content: space-between;
                                      align-items: center;
                                    }
                                    .logo {
                                      font-weight: 900;
                                      font-size: 18px;
                                      color: #f59e0b;
                                      letter-spacing: 2px;
                                    }
                                    .badge {
                                      border: 1.5px solid #f59e0b;
                                      background: rgba(245, 158, 11, 0.2);
                                      color: #f59e0b;
                                      font-size: 10px;
                                      font-weight: 800;
                                      padding: 3px 8px;
                                      border-radius: 4px;
                                      letter-spacing: 1.5px;
                                    }
                                    .content {
                                      display: grid;
                                      grid-template-cols: 2.2fr 1fr;
                                      align-items: center;
                                      margin-top: 15px;
                                    }
                                    .info-label {
                                      font-size: 8px;
                                      color: rgb(156, 163, 175);
                                      text-transform: uppercase;
                                      letter-spacing: 1.5px;
                                      margin-bottom: 2px;
                                    }
                                    .info-val {
                                      font-size: 14px;
                                      font-weight: 800;
                                      color: #ffffff;
                                      margin-bottom: 12px;
                                    }
                                    .qr-box {
                                      background: white;
                                      padding: 6px;
                                      border-radius: 8px;
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                    }
                                    .qr-box img {
                                      width: 80px;
                                      height: 80px;
                                    }
                                    .footer {
                                      border-top: 1px solid rgba(255,255,255,0.15);
                                      padding-top: 10px;
                                      display: flex;
                                      justify-content: space-between;
                                      font-size: 9px;
                                      color: rgb(156, 163, 175);
                                    }
                                    .footer span {
                                      color: white;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="card">
                                    <div class="header">
                                      <div class="logo">⭐ SWASTIK PRIME</div>
                                      <div class="badge">VIP PASS</div>
                                    </div>
                                    
                                    <div class="content">
                                      <div>
                                        <div class="info-label">${isHindi ? "सदस्यता नाम" : "VIP Member"}</div>
                                        <div class="info-val">${profile.fullName}</div>
                                        <div class="info-label">${isHindi ? "पहचान पत्र संख्या" : "Membership Identifier"}</div>
                                        <div class="info-val" style="font-family: monospace; color: rgb(129, 140, 248);">SWS-PRM-${(profile.phone || "8888").replace(/\s/g, '').slice(-6)}</div>
                                      </div>
                                      <div class="qr-box">
                                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://swastiksupermarket.com" />
                                      </div>
                                    </div>

                                    <div class="footer">
                                      <div>${isHindi ? "योजना" : "Plan"}: <span>{LIFETIME PRIVILEGE}</span></div>
                                      <div>swastiksupermarket.com</div>
                                    </div>
                                  </div>
                                  <script>
                                    window.onload = function() {
                                      setTimeout(function() {
                                        window.print();
                                        window.close();
                                      }, 500);
                                    }
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 text-slate-100 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="h-4 w-4 text-indigo-400" />
                          <span>{isHindi ? "कार्ड प्रिंट करें" : "Print Pass Card"}</span>
                        </button>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- --- --- 5. MODAL: DETAILED ORDER OVERLAY DIALOG --- --- --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 transition-opacity animate-fade-in text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh] overflow-y-auto hide-scrollbar scrollbar-none font-sans">
            
            {/* Close Cross */}
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute top-5 right-5 rounded-full p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all duration-150 cursor-pointer"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Headline section */}
            <div className="border-b border-slate-200 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs">
                  {selectedOrder.isActive ? (isHindi ? "ट्रांजिट में" : "In Transit") : (isHindi ? "वितरित पूरा" : "Delivered")}
                </span>
                <h4 className="font-extrabold text-base text-slate-900 mt-1.5 flex items-center gap-2">
                  <Package className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{isHindi ? "आर्डर संख्या:" : "Order Slot:"}</span>
                  <span className="font-mono text-emerald-700">{selectedOrder.id}</span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs mt-1 sm:mt-0">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>{selectedOrder.date || (selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A')}</span>
              </div>
            </div>

            {/* Delivery trajectory step metrics */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mb-3">
                {isHindi ? "वितरण यात्रा सूचकांक" : "Delivery Trajectory Stepper"}
              </span>

              {/* Progress Stepper chart metrics */}
              <div className="relative">
                {/* Connector strip */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-10" />
                <div 
                  className="absolute top-4 left-4 h-0.5 bg-emerald-600 transition-all duration-500 -z-10"
                  style={{ width: selectedOrder.step === 2 ? '50%' : selectedOrder.step === 3 ? '100%' : '5%' }}
                />

                <div className="flex justify-between items-center text-center">
                  {[
                    { labelEn: "Confirmed", labelHi: "स्वीकृत", subEn: "Order Booked", subHi: "ऑर्डर बुक" },
                    { labelEn: "In Transit", labelHi: "रास्ते में", subEn: "Partner Dispatched", subHi: "पार्टनर रवाना" },
                    { labelEn: "Delivered", labelHi: "पहुँचा", subEn: "Completed Secure", subHi: "सफलतापूर्वक" }
                  ].map((stepVal, idx) => {
                    const isPassed = selectedOrder.step >= idx;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                          isPassed 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200' 
                            : 'bg-white border-slate-300 text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-[10px] font-extrabold mt-1.5 ${isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                          {isHindi ? stepVal.labelHi : stepVal.labelEn}
                        </span>
                        <span className="text-[8px] text-slate-500 block">
                          {isHindi ? stepVal.subHi : stepVal.subEn}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Customer & Store Details Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              {/* Customer Details */}
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 block mb-1">
                  {isHindi ? "ग्राहक विवरण" : "Customer Details"}
                </span>
                <p className="text-slate-900 font-extrabold">{selectedOrder.customerName || selectedOrder.name || profile?.fullName || "Valued Customer"}</p>
                <p className="text-slate-600 text-[11px] font-mono">📱 {selectedOrder.customerPhone || selectedOrder.customerMobile || selectedOrder.phone || profile?.phone || "N/A"}</p>
                <p className="text-slate-500 text-[10px] line-clamp-2">📍 {selectedOrder.shippingAddress || selectedOrder.address || "Store Pickup"}</p>
              </div>

              {/* Store / Office Details */}
              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 block mb-1">
                  {isHindi ? "दुकान/कार्यालय विवरण" : "Store/Office Details"}
                </span>
                <p className="text-slate-900 font-extrabold">{contactSettings?.brandName || "Swastik Supermarket"}</p>
                <p className="text-slate-600 text-[11px] font-mono">☎️ {contactSettings?.phone || "094845 40001"}</p>
                <p className="text-slate-500 text-[10px] line-clamp-2">🏢 {contactSettings?.address || "Survey no. 100 Sanjit road opposite of Saraswati school , Mandsaur, India, Madhya Pradesh"}</p>
                {contactSettings?.gst && (
                  <p className="text-slate-500 text-[9px] font-mono">GSTIN: {contactSettings.gst}</p>
                )}
              </div>
            </div>

            {/* List of Ordered items */}
            <div className="space-y-3 mb-5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">
                {isHindi ? "खरीदे गए सामान की सूची" : "Ordered Items List"}
              </span>
              
              <div className="space-y-2 divide-y divide-slate-100 max-h-[30vh] overflow-y-auto pr-1">
                {(selectedOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs font-semibold">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold">{isHindi ? (it.nameHi || it.nameEn || it.name || 'Grocery Item') : (it.nameEn || it.nameHi || it.name || 'Grocery Item')}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{isHindi ? `वजन: ${it.weight || it.unit || '1 Unit'}` : `Weight: ${it.weight || it.unit || '1 Unit'}`}</span>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 font-bold font-mono">
                      <span className="text-slate-500 text-[11px]">₹{it.price || 0} x {it.qty || it.quantity || 1}</span>
                      <span className="text-slate-900 w-14 text-right">₹{(it.price || 0) * (it.qty || it.quantity || 1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping, delivery coordinates and calculations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-200 pt-4">
              
              {/* Delivery Driver Info details */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 block mb-1">
                  {isHindi ? "वितरण एजेंट विवरण" : "Delivery Agent Status"}
                </span>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-extrabold text-xs shrink-0 uppercase">
                    {(selectedOrder.deliveryPartnerName || 'Swastik Rider').split(' ')[0][0]}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 leading-none">{selectedOrder.deliveryPartnerName || (isHindi ? 'स्वास्तिक राइडर (असाइन किया गया)' : 'Swastik Delivery Executive')}</h5>
                    <p className="text-[9px] text-slate-500 mt-0.5">{selectedOrder.hubName || 'Dispatch Hub, Sector 12'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{selectedOrder.deliveryPartnerPhone || '+91 95400 12099'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isHindi ? "अनुमानित समय:" : "Estimated Arrival:"} <b className="text-emerald-800">{selectedOrder.eta || '20 Mins'}</b></span>
                </div>
              </div>

              {/* Order pricing summary details */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 font-mono">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mb-1.5 font-sans">
                  {isHindi ? "बिल विवरण" : "Billing Details"}
                </span>

                <div className="flex justify-between font-sans text-[10px] text-slate-600">
                  <span>{isHindi ? "भुगतान विधि" : "Payment Method"}</span>
                  <span className="text-emerald-800 font-extrabold uppercase tracking-wider font-mono">{selectedOrder.paymentMethod || 'COD'}</span>
                </div>

                <div className="flex justify-between font-sans text-[10px] text-slate-600 border-b border-slate-200 pb-1.5 mb-1">
                  <span>{isHindi ? "भुगतान स्थिति" : "Payment Status"}</span>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                    (selectedOrder.paymentStatus || 'PENDING').toUpperCase() === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>{selectedOrder.paymentStatus || 'PENDING'}</span>
                </div>

                <div className="flex justify-between">
                  <span>{t('subtotal')}</span>
                  <span className="text-slate-900">₹{selectedOrder.subtotal || selectedOrder.total || 0}</span>
                </div>

                <div className="flex justify-between">
                  <span>{t('deliveryFee')}</span>
                  <span className={`${selectedOrder.deliveryFee === 0 || !selectedOrder.deliveryFee ? 'text-emerald-700 font-bold' : 'text-slate-900'}`}>
                    {selectedOrder.deliveryFee === 0 || !selectedOrder.deliveryFee ? 'FREE' : `₹${selectedOrder.deliveryFee}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>GST</span>
                  <span className="text-slate-900 font-mono">₹{selectedOrder.gst || 0}</span>
                </div>

                {selectedOrder.referralDiscount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>{isHindi ? "रेफ़रल पॉइंट्स डिस्काउंट (-)" : "Referral Points (-)"}</span>
                    <span>-₹{selectedOrder.referralDiscount}</span>
                  </div>
                )}

                {selectedOrder.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>
                      {isHindi ? "कूपन छूट (-)" : "Coupon Discount (-)"}
                      {selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ""}
                    </span>
                    <span>-₹{selectedOrder.couponDiscount}</span>
                  </div>
                )}

                {selectedOrder.celebrationDiscount > 0 && (
                  <div className="flex justify-between text-purple-700 font-bold">
                    <span>
                      {isHindi ? "उत्सव/जन्मदिन छूट (-)" : "Celebration Offer (-)"}
                    </span>
                    <span>-₹{selectedOrder.celebrationDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                  <span className="font-sans">{t('grandTotal')}</span>
                  <span className="text-emerald-700 font-mono">₹{selectedOrder.total || selectedOrder.totalAmount || 0}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handlePrintInvoice(selectedOrder)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>{isHindi ? "टैक्स बिल / चालान प्रिंट करें" : "Print Official Tax Invoice"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all text-slate-700 hover:text-slate-900 active:scale-95 cursor-pointer"
              >
                {isHindi ? "बंद करें" : "Close"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- SWASTIK SECURED MERCHANT PAYMENT GATEWAY MODAL --- */}
      {showPrimePayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in text-slate-900">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-slate-900 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                <div>
                  <h4 className="font-extrabold text-sm tracking-wide text-slate-900">{isHindi ? "स्वास्तिक मर्चेंट पेमेंट गेटवे" : "Swastik Secured Payment Gateway"}</h4>
                  <p className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-widest font-mono">PCI-DSS Compliant Secure Node</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrimePayment(false)}
                className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price tag */}
            <div className="bg-amber-50 p-4 border-b border-amber-200 flex justify-between items-center px-5">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-600">{isHindi ? "प्राइम एनुअल पास शुल्क" : "Annual Prime Gold Fee"}</span>
              <span className="font-mono text-lg font-black text-amber-800">₹{primeSettings?.primePlanFee ?? 299}.00</span>
            </div>

            {/* Gateway states */}
            <div className="p-5">
              {primePaymentStep === 'select' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-normal font-semibold">
                    {isHindi 
                      ? "कृपया स्वास्तिक प्राइम गोल्ड मेंबरशिप सक्रिय करने के लिए भुगतान गेटवे का चयन करें:" 
                      : "Select your payment gateway to activate Swastik Prime Gold Membership:"}
                  </p>

                  {/* Payment Gateway Cards */}
                  <div className="space-y-2">
                    {/* Razorpay Option */}
                    {gatewaySettings.razorpayEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGateway('RAZORPAY');
                          setPaymentErrorMessage('');
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedGateway === 'RAZORPAY'
                            ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 text-slate-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs">
                            ⚡
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900">Razorpay Online</span>
                              <span className="text-[9px] bg-sky-100 text-sky-800 font-mono px-1.5 py-0.2 rounded font-extrabold uppercase">Fast & Instant</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              UPI (PhonePe, GPay, Paytm), Cards & Netbanking
                            </p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedGateway === 'RAZORPAY' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'}`}>
                          {selectedGateway === 'RAZORPAY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    )}

                    {/* Cashfree Option */}
                    {gatewaySettings.cashfreeEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGateway('CASHFREE');
                          setPaymentErrorMessage('');
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedGateway === 'CASHFREE'
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                            🛡️
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900">Cashfree Payments</span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.2 rounded font-extrabold uppercase">Secure PG</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              UPI, RuPay Cards & All Netbanking
                            </p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedGateway === 'CASHFREE' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                          {selectedGateway === 'CASHFREE' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    )}

                    {/* Offline / Cash Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('OFFLINE');
                        setPaymentErrorMessage('');
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        selectedGateway === 'OFFLINE'
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-slate-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                          💵
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">
                            {isHindi ? "ऑफलाइन / स्टोर काउंटर कैश" : "Offline / Store Counter Cash"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {isHindi ? "स्वास्तिक काउंटर पर या अगली डिलीवरी पर नकद भुगतान करें" : "Pay via cash at store counter or next COD order"}
                          </p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedGateway === 'OFFLINE' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'}`}>
                        {selectedGateway === 'OFFLINE' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>

                    {!gatewaySettings.razorpayEnabled && !gatewaySettings.cashfreeEnabled && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
                        <span>⚠️</span>
                        <span>
                          {isHindi 
                            ? "ऑनलाइन भुगतान गेटवे वर्तमान में स्टोर प्रबंधन द्वारा अक्षम हैं। आप स्टोर नकद द्वारा मेंबरशिप एक्टिव कर सकते हैं।" 
                            : "Online payment gateways are currently disabled in store settings. You can complete membership via store cash."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sub-method details for Online Gateways */}
                  {selectedGateway !== 'OFFLINE' && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'upi', label: 'UPI / QR', icon: '⚡' },
                          { id: 'card', label: isHindi ? 'कार्ड' : 'Card', icon: '💳' },
                          { id: 'netbanking', label: 'NetBank', icon: '🏛️' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setPrimePaymentMethod(tab.id);
                              setPaymentErrorMessage('');
                            }}
                            className={`py-2 rounded-xl border text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              primePaymentMethod === tab.id
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-sm">{tab.icon}</span>
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </div>

                      {primePaymentMethod === 'upi' && (
                        <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'gpay', name: 'Google Pay' },
                              { id: 'phonepe', name: 'PhonePe' },
                              { id: 'paytm', name: 'Paytm UPI' }
                            ].map(app => (
                              <button
                                key={app.id}
                                type="button"
                                onClick={() => setPrimePaymentUpiApp(app.id)}
                                className={`py-1.5 rounded-lg border text-[9px] font-bold text-center transition-all cursor-pointer ${
                                  primePaymentUpiApp === app.id
                                    ? 'bg-sky-100 border-sky-400 text-sky-800 font-extrabold'
                                    : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                {app.name}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-600 font-bold uppercase block">
                              {isHindi ? "वैकल्पिक यूपीआई आईडी" : "Or Custom UPI ID"}
                            </label>
                            <input
                              type="text"
                              placeholder="username@okhdfcbank"
                              value={customUpiId}
                              onChange={(e) => setCustomUpiId(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {primePaymentMethod === 'card' && (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-600 font-bold uppercase block">{isHindi ? "कार्ड धारक का नाम" : "Cardholder Name"}</label>
                            <input
                              type="text"
                              placeholder="Abhishek Sharma"
                              value={primeCardName}
                              onChange={(e) => setPrimeCardName(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-sky-500 font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-600 font-bold uppercase block">{isHindi ? "१६ अंकों का कार्ड नंबर" : "16 Digit Card Number"}</label>
                            <input
                              type="text"
                              placeholder="4321 5678 9012 3456"
                              value={primeCardNum}
                              onChange={(e) => setPrimeCardNum(e.target.value.replace(/[^0-9]/g, ''))}
                              maxLength={16}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-sky-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-600 font-bold uppercase block">{isHindi ? "समाप्ति तिथि" : "Expiry"}</label>
                              <input
                                type="text"
                                placeholder="MM/YY"
                                value={primeCardExpiry}
                                onChange={(e) => setPrimeCardExpiry(e.target.value)}
                                maxLength={5}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-sky-500 text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-600 font-bold uppercase block">CVV</label>
                              <input
                                type="password"
                                placeholder="***"
                                value={primeCardCvv}
                                onChange={(e) => setPrimeCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                maxLength={3}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-sky-500 text-center"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {primePaymentMethod === 'netbanking' && (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">
                            {isHindi ? "अपना बैंक चुनें" : "Select Bank Account"}
                          </label>
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                          >
                            <option value="sbi">State Bank of India (SBI)</option>
                            <option value="hdfc">HDFC Bank</option>
                            <option value="icici">ICICI Bank</option>
                            <option value="axis">Axis Bank Ltd</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentErrorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                      ⚠️ {paymentErrorMessage}
                    </div>
                  )}

                  {/* Pay Securely Button */}
                  <div className="space-y-2 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={handleProcessPrimePayment}
                      className={`w-full py-3.5 font-extrabold text-xs uppercase tracking-widest rounded-xl text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                        selectedGateway === 'RAZORPAY'
                          ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                          : selectedGateway === 'CASHFREE'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                          : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      }`}
                    >
                      <span>{selectedGateway === 'OFFLINE' ? '💵' : '🔒'}</span>
                      <span>
                        {selectedGateway === 'RAZORPAY'
                          ? (isHindi ? `रेज़रपे गेटवे से ₹${primeSettings?.primePlanFee ?? 299} भुगतान करें` : `Pay ₹${primeSettings?.primePlanFee ?? 299} via Razorpay Gateway`)
                          : selectedGateway === 'CASHFREE'
                          ? (isHindi ? `कैशफ्री गेटवे से ₹${primeSettings?.primePlanFee ?? 299} भुगतान करें` : `Pay ₹${primeSettings?.primePlanFee ?? 299} via Cashfree Gateway`)
                          : (isHindi ? "ऑफलाइन नकद भुगतान द्वारा मेंबरशिप एक्टिव करें" : "Activate Membership via Offline Store Cash")}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {primePaymentStep === 'processing' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-xs relative">
                    <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm text-slate-900">{isHindi ? "कैशफ्री गेटवे से कनेक्ट हो रहा है..." : "Connecting Cashfree Gateway Node..."}</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wide">{isHindi ? "वेबहुक ट्रिगर एवं 256-बिट SSL वेरिफिकेशन जारी है..." : "Authenticating session token & triggering merchant webhook..."}</p>
                  </div>
                  
                  {/* Real-time terminal log window */}
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-left font-mono text-[9.5px] text-emerald-400 leading-normal max-h-36 overflow-y-auto space-y-1 shadow-inner select-none transition-all">
                    <p className="text-slate-500 font-bold">&gt; CASHFREE GATEWAY LOGS:</p>
                    <p className="opacity-70 animate-pulse">&gt; [POST] /api/cashfree/create-order</p>
                    {cfSimulatingProgress && <p className="text-cyan-300 font-bold">&gt; {cfSimulatingProgress}</p>}
                    <p className="opacity-50">&gt; ledger_hash: 256-bit PCI-DSS verified</p>
                  </div>
                </div>
              )}

              {primePaymentStep === 'success' && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 shadow-xs">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-black text-base text-emerald-800 uppercase tracking-wider">{isHindi ? "भुगतान सफलतापूर्वक पूर्ण!" : "Payment Settled & Verified!"}</h5>
                    <p className="text-xs text-slate-600 max-w-xs leading-relaxed font-medium">
                      {isHindi 
                        ? "बधाई हो! स्वास्तिक मर्चेंट वेबहुक द्वारा आपका पेमेंट रिकॉर्ड दर्ज कर लिया गया है। आपकी वीआईपी गोल्ड मेंबरशिप चालू हो गई है!" 
                        : "Congratulations! Swastik webhook processed your payment. Your digital Swastik Prime membership is now active."}
                    </p>
                  </div>

                  {cashfreeOrderSession && (
                    <div className="w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-left text-xs font-mono flex justify-between items-center text-slate-800">
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-slate-500 font-bold uppercase">CASHFREE PG TRANS-ID</p>
                        <p className="font-black text-[10px] text-slate-900">TXN_{cashfreeOrderSession.cf_order_id || 'CF_992100'}</p>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase tracking-widest">SUCCESSFUL</span>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setShowPrimePayment(false)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    {isHindi ? "वीआईपी मेंबर पास देखें" : "Finish & View Prime Pass"}
                  </button>
                </div>
              )}

              {primePaymentStep === 'error' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 bg-rose-100 border border-rose-300 rounded-full flex items-center justify-center text-rose-700 text-2xl font-black">
                    ✗
                  </div>
                  <div className="space-y-2.5">
                    <h5 className="font-black text-base text-rose-700 uppercase tracking-wider">{isHindi ? "भुगतान विफल हुआ" : "Transaction Declined"}</h5>
                    <p className="text-xs text-slate-700 font-medium font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-rose-200">
                      {paymentErrorMessage || (isHindi ? "बैंक ने ट्रांजैक्शन अस्वीकार कर दिया।" : "Card declined / Insufficient bank funds.")}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => setPrimePaymentStep('select')}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      {isHindi ? "पुनः प्रयास करें" : "Try Again"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrimePayment(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      {isHindi ? "रद्द करें" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
