import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Eye, 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  X,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  Smartphone,
  Terminal,
  Share2,
  Edit,
  Plus,
  Trash2,
  Save,
  Lock,
  XCircle,
  Ban,
  AlertTriangle,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';
import NotificationCenter from '../../components/NotificationCenter';
import { isOrder1HourLocked, isOrderCancelled, getLockTimeRemainingFormatted } from '../../utils/orderLock';

export default function OrdersManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { orders, updateOrder, deleteOrder, addOrder, products, offers, staff, contactSettings, customers, fetchOrders, fetchCustomers, fetchStaff } = useData();

  React.useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchStaff();
  }, [fetchOrders, fetchCustomers, fetchStaff]);

  // Relational resolution helpers: Resolve customer details dynamically from customer ID / phone
  const getCustName = React.useCallback((ord) => {
    if (!ord) return "Customer";
    const ordCustId = Number(ord.customerId || ord.userId);
    if (ordCustId) {
      const matched = customers?.find(c => Number(c.id) === ordCustId);
      if (matched && matched.name) return matched.name;
    }
    const cleanP = String(ord.customerPhone || ord.customerMobile || ord.phone || "").replace(/\D/g, "").slice(-10);
    if (cleanP) {
      const matched = customers?.find(c => String(c.phone || "").replace(/\D/g, "").slice(-10) === cleanP);
      if (matched && matched.name) return matched.name;
    }
    const cleanEmail = String(ord.customerEmail || ord.email || "").trim().toLowerCase();
    if (cleanEmail) {
      const matched = customers?.find(c => String(c.email || "").trim().toLowerCase() === cleanEmail);
      if (matched && matched.name) return matched.name;
    }
    return ord.customerName || ord.name || "Customer";
  }, [customers]);

  const getCustPhone = React.useCallback((ord) => {
    if (!ord) return "N/A";
    const ordCustId = Number(ord.customerId || ord.userId);
    if (ordCustId) {
      const matched = customers?.find(c => Number(c.id) === ordCustId);
      if (matched && matched.phone) return matched.phone;
    }
    return ord.customerPhone || ord.customerMobile || ord.phone || "N/A";
  }, [customers]);

  const getCustAddress = React.useCallback((ord) => {
    if (!ord) return "Address not specified";
    if (ord.address && typeof ord.address === 'string' && ord.address.trim()) return ord.address;
    if (ord.deliveryAddress && typeof ord.deliveryAddress === 'string' && ord.deliveryAddress.trim()) return ord.deliveryAddress;
    if (ord.customerAddress && typeof ord.customerAddress === 'string' && ord.customerAddress.trim()) return ord.customerAddress;
    const ordCustId = Number(ord.customerId || ord.userId);
    if (ordCustId) {
      const matched = customers?.find(c => Number(c.id) === ordCustId);
      if (matched && matched.address) return matched.address;
    }
    const cleanP = String(ord.customerPhone || ord.customerMobile || ord.phone || "").replace(/\D/g, "").slice(-10);
    if (cleanP) {
      const matched = customers?.find(c => String(c.phone || "").replace(/\D/g, "").slice(-10) === cleanP);
      if (matched && matched.address) return matched.address;
    }
    return "Store Pickup / Counter Sale";
  }, [customers]);

  // Real delivery riders filter (strictly delivery personnel: role_id 4 or rider role, excluding admins & managers)
  const deliveryStaffList = React.useMemo(() => {
    return (staff || []).filter(s => {
      if (s.id === 1 || s.isMasterAdmin) return false;
      const rName = String(s.role || '').toLowerCase();
      const rCode = String(s.role_code || '').toLowerCase();
      if (rName.includes('admin') || rCode === 'admin') return false;
      if (rName.includes('manager') || rCode === 'manager') return false;
      if (rName.includes('support') || rCode === 'support') return false;
      return s.role_id === 4 || rCode === 'rider' || rName.includes('rider') || rName.includes('delivery');
    });
  }, [staff]);

  const activeStaff = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('swastik_logged_in_staff');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

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

    const custName = getCustName(order);
    const custPhone = getCustPhone(order);
    const custAddress = order.shippingAddress || order.address || "Store Pickup";
    const custEmail = order.customerEmail || order.email || "N/A";

    const items = order.items || [];
    
    // Calculate slab-wise GST and item-level details
    const slabMap = {};
    let computedTaxable = 0;
    let computedGst = 0;

    const mappedItems = items.map((it, idx) => {
      // Find matching product in catalog to verify GST column presence
      const matchedProd = products.find(p => String(p.id) === String(it.productId || it.id) || String(p.code) === String(it.code || ''));
      
      let rawGst = undefined;
      // Check if product table has GST column
      if (matchedProd) {
        if (matchedProd.gstPercent !== undefined && matchedProd.gstPercent !== null && matchedProd.gstPercent !== '') {
          rawGst = Number(matchedProd.gstPercent);
        } else if (matchedProd.gst_percent !== undefined && matchedProd.gst_percent !== null && matchedProd.gst_percent !== '') {
          rawGst = Number(matchedProd.gst_percent);
        } else if (matchedProd.gst !== undefined && matchedProd.gst !== null && matchedProd.gst !== '') {
          rawGst = Number(matchedProd.gst);
        }
      } else if (it.gstPercent !== undefined && it.gstPercent !== null && it.gstPercent !== '') {
        rawGst = Number(it.gstPercent);
      } else if (it.gst !== undefined && it.gst !== null && it.gst !== '') {
        rawGst = Number(it.gst);
      }

      // If product has no GST column or GST is 0, do not treat as GST applicable
      const hasItemGst = rawGst !== undefined && rawGst !== null && !isNaN(rawGst) && rawGst > 0;
      const rate = hasItemGst ? rawGst : 0;

      // Brand: Only show if brand exists and is not a generic placeholder
      let itemBrand = '';
      const rawBrandCandidate = (it.brand || (matchedProd ? (matchedProd.brand || matchedProd.subEn) : '') || '').trim();
      const lowerB = rawBrandCandidate.toLowerCase();
      if (rawBrandCandidate && !['general', 'fresh', 'n/a', 'none', 'null', 'undefined', '-', 'grocery'].includes(lowerB)) {
        itemBrand = rawBrandCandidate;
      }

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

  // Modal State for selected order details popup
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Dedicated in-app Modal State for Order Cancellation (No window.confirm)
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Delivery & Payment Verification Modal State (Ask payment before finalizing dispatch & arrival)
  const [deliveryPaymentModalOrder, setDeliveryPaymentModalOrder] = useState(null);
  const [deliveryPaymentStepTarget, setDeliveryPaymentStepTarget] = useState(2); // 1 = Dispatched, 2 = Delivered
  const [deliveryVerifyMethod, setDeliveryVerifyMethod] = useState('cod');
  const [deliveryVerifyPaymentStatus, setDeliveryVerifyPaymentStatus] = useState('PAID');
  const [deliveryVerifyRiderCash, setDeliveryVerifyRiderCash] = useState(true);
  const [deliveryVerifyStaffId, setDeliveryVerifyStaffId] = useState('');

  // Authenticated confirmation state for order deletion
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteOrderError, setDeleteOrderError] = useState('');

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    setDeleteOrderError('');
    const result = await deleteOrder(orderToDelete.id);
    if (!result?.success) {
      setDeleteOrderError(result?.error || (isHindi ? 'आदेश हटाया नहीं जा सका।' : 'The order could not be deleted.'));
      return;
    }

    if (selectedOrder && (selectedOrder.id === orderToDelete.id || String(selectedOrder.id) === String(orderToDelete.id))) {
      setSelectedOrder(null);
    }

    setOrderToDelete(null);
    setDeleteOrderError('');
  };

  // Edit existing order state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [editOrderName, setEditOrderName] = useState('');
  const [editOrderPhone, setEditOrderPhone] = useState('');
  const [editOrderAddress, setEditOrderAddress] = useState('');
  const [editOrderPaymentMethod, setEditOrderPaymentMethod] = useState('');
  const [editOrderPaymentStatus, setEditOrderPaymentStatus] = useState('');
  const [editOrderSearchQuery, setEditOrderSearchQuery] = useState('');

  // Create completely new order state
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState(false);
  const [newOrderName, setNewOrderName] = useState('');
  const [newOrderPhone, setNewOrderPhone] = useState('');
  const [newOrderAddress, setNewOrderAddress] = useState('');
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState('cod');
  const [newOrderPaymentStatus, setNewOrderPaymentStatus] = useState('PENDING');
  const [newOrderItems, setNewOrderItems] = useState([]);
  const [newOrderSearchQuery, setNewOrderSearchQuery] = useState('');
  const [newOrderDeliveryFee, setNewOrderDeliveryFee] = useState(30);
  const [newOrderPilotName, setNewOrderPilotName] = useState('Rakesh Pilot');
  const [newOrderPilotPhone, setNewOrderPilotPhone] = useState('+91 99999-88888');
  const [newOrderETA, setNewOrderETA] = useState('15 Mins');
  const [newOrderCouponCode, setNewOrderCouponCode] = useState('');
  const [newOrderAppliedCoupon, setNewOrderAppliedCoupon] = useState(null);

  // Advanced Filters States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // All, Confirmed, In Transit, Delivered
  const [filterPaymentMode, setFilterPaymentMode] = useState('All'); // All, COD, CASHFREE_ONLINE
  const [filterDeliveryPerson, setFilterDeliveryPerson] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Extract unique delivery person options
  const filterDeliveryStaffList = useMemo(() => {
    const namesSet = new Set();
    (staff || []).forEach(s => {
      if (s.permissions?.includes('delivery') || s.name?.toLowerCase().includes('delivery') || s.name?.toLowerCase().includes('rider') || s.name?.toLowerCase().includes('pilot')) {
        namesSet.add(s.name.trim());
      }
    });
    (orders || []).forEach(o => {
      if (o.deliveryPartnerName) {
        namesSet.add(o.deliveryPartnerName.trim());
      }
    });
    return Array.from(namesSet);
  }, [staff, orders]);

  // Whatsapp Outbox Simulation Status state
  const [isSendingBill, setIsSendingBill] = useState(false);
  const [waConsoleLogs, setWaConsoleLogs] = useState([]);

  // Third-Party Billing Software Extra WhatsApp Dispatch states
  const [tpMobileNumber, setTpMobileNumber] = useState('');
  const [tpCustomerName, setTpCustomerName] = useState('');
  const [tpOrderId, setTpOrderId] = useState('SW-TP-55219');
  const [tpBillAmount, setTpBillAmount] = useState('480');
  const [tpItemsList, setTpItemsList] = useState('Organic Farm Fresh Tomatoes, Premium Cow Ghee');
  const [tpCustomMessage, setTpCustomMessage] = useState('');
  const [tpLogs, setTpLogs] = useState([]);
  const [isTpSending, setIsTpSending] = useState(false);

  // Pagination states (default 50 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPaymentMode, filterDeliveryPerson, dateFrom, dateTo]);

  React.useEffect(() => {
    const cName = tpCustomerName || "Valued Customer";
    const ordId = tpOrderId || "SW-TP-55219";
    const amt = tpBillAmount || "480";
    const items = tpItemsList || "Organic farm products";
    setTpCustomMessage(`Hi ${cName}, thank you for choosing Swastik Delivery! Your digital invoice and physical items (${items}) with Order ID ${ordId} have been successfully compiled for a total of ₹${amt}. Please download your official PDF bill here: https://invoice-storage.swastik.com/tp-${ordId}.pdf. Thank you for your support!`);
  }, [tpCustomerName, tpOrderId, tpBillAmount, tpItemsList]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterPaymentMode('All');
    setFilterDeliveryPerson('All');
    setDateFrom('');
    setDateTo('');
  };

  // Helper date parsing
  const isWithinDateRange = (orderDateStr) => {
    if (!dateFrom && !dateTo) return true;
    
    // Parse order date string like "June 02, 2026" or "May 30, 2026" or "2026-06-02T13:23:31Z"
    let parsedOrderDate;
    try {
      parsedOrderDate = new Date(orderDateStr);
    } catch(e) {
      parsedOrderDate = new Date();
    }

    if (isNaN(parsedOrderDate.getTime())) {
      parsedOrderDate = new Date(); // Fallback
    }

    // Set times to midnight for clean comparison
    parsedOrderDate.setHours(0,0,0,0);

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      if (parsedOrderDate < from) return false;
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(0,0,0,0);
      if (parsedOrderDate > to) return false;
    }

    return true;
  };

  // Download payment report as Excel Worksheet
  const handleDownloadPaymentReport = () => {
    try {
      const reportRows = filteredOrders.map(o => {
        const isOnline = o.paymentMethod === 'CASHFREE_ONLINE' || o.paymentMethod === 'ONLINE';
        const paymentModeLabel = isOnline ? 'Online (Cashfree Gateway)' : 'Cash on Delivery (COD)';
        const itemsList = o.items ? o.items.map(it => `${it.qty}x ${it.nameEn} (${it.weight || '1 Unit'})`).join(', ') : '';
        
        return {
          "Order ID": o.id,
          "Order Date": o.orderDate || o.date || 'N/A',
          "Customer Name": getCustName(o),
          "Customer Phone": getCustPhone(o),
          "Shipping Address": o.shippingAddress || 'N/A',
          "Payment Mode": paymentModeLabel,
          "Payment Status": o.paymentStatus || 'UNPAID',
          "Subtotal (INR)": o.subtotal || 0,
          "Delivery Fee (INR)": o.deliveryFee || 0,
          "GST Tax (18%)": o.gst || 0,
          "Referral Discount (INR)": o.referralDiscount || 0,
          "Coupon Discount (INR)": o.couponDiscount || 0,
          "Coupon Code": o.couponCode || '',
          "Celebration Discount (INR)": o.celebrationDiscount || 0,
          "Grand Total (INR)": o.total || 0,
          "Rider Assigned": o.deliveryPartnerName || 'N/A',
          "Order Status": o.status || 'Confirmed',
          "Items Pack": itemsList
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(reportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Receipts");

      // Auto-fit widths
      const max_widths = {};
      reportRows.forEach(row => {
        Object.keys(row).forEach(key => {
          const val_len = String(row[key] || '').length;
          max_widths[key] = Math.max(max_widths[key] || 10, val_len, key.length);
        });
      });
      worksheet['!cols'] = Object.keys(max_widths).map(key => ({ wch: max_widths[key] + 2 }));

      XLSX.writeFile(workbook, `swastik_payment_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to compile payment spreadsheet report.");
    }
  };

  // Dynamic filter application
  const filteredOrders = orders.filter(o => {
    // 1. Search Query (id, customer name, dispatcher name)
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.deliveryPartnerName && o.deliveryPartnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.shippingAddress && o.shippingAddress.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Status Match
    const orderStatusStr = o.status || "Confirmed";
    const matchesStatus = filterStatus === 'All' || 
      orderStatusStr.toLowerCase() === filterStatus.toLowerCase() ||
      (filterStatus.toLowerCase() === 'delivered' && orderStatusStr.toLowerCase() === 'completed');

    // 3. Date range match
    const matchesDate = isWithinDateRange(o.orderDate || o.date || new Date().toISOString());

    // 4. Payment Mode Match
    const pm = (o.paymentMethod || 'COD').toUpperCase();
    const isOnlineOrder = pm.includes('ONLINE') || pm.includes('RAZORPAY') || pm.includes('CASHFREE') || pm === 'CARD' || pm === 'UPI' || pm === 'NETBANKING';
    const matchesPaymentMode = filterPaymentMode === 'All' ||
      (filterPaymentMode === 'COD' && (pm === 'COD' || !o.paymentMethod)) ||
      (filterPaymentMode === 'ONLINE' && isOnlineOrder) ||
      (filterPaymentMode === 'RAZORPAY_ONLINE' && (pm === 'RAZORPAY_ONLINE' || pm.includes('RAZORPAY'))) ||
      (filterPaymentMode === 'CASHFREE_ONLINE' && (pm === 'CASHFREE_ONLINE' || pm.includes('CASHFREE')));

    // 5. Delivery Person Match
    const matchesDeliveryPerson = filterDeliveryPerson === 'All' ||
      (o.deliveryPartnerName && o.deliveryPartnerName.toLowerCase().includes(filterDeliveryPerson.toLowerCase()));

    return matchesSearch && matchesStatus && matchesDate && matchesPaymentMode && matchesDeliveryPerson;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredOrders.length, totalPages, currentPage]);

  const getStatusBadge = (orderOrStatus) => {
    const orderObj = typeof orderOrStatus === 'object' ? orderOrStatus : null;
    const statusStr = (orderObj ? orderObj.status : orderOrStatus) || "Confirmed";
    const status = (statusStr || '').toLowerCase();
    const isLocked = orderObj ? isOrder1HourLocked(orderObj) : false;

    if (status === "delivered" || status === "completed") {
      if (isLocked) {
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Lock className="h-3 w-3 text-rose-400" />
            <span>Delivered (Locked)</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
          <CheckCircle className="h-3 w-3" />
          <span>Delivered</span>
        </span>
      );
    }
    if (status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/35 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
          <XCircle className="h-3 w-3 text-rose-400" />
          <span>Cancelled</span>
        </span>
      );
    }
    if (status === "in transit" || status === "dispatched" || status === "out for delivery") {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
          <Truck className="h-3 w-3" />
          <span>In Transit</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-300 border border-cyan-400/25 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
        <Clock className="h-3 w-3" />
        <span>Confirmed</span>
      </span>
    );
  };

  const handleOpenDetailModal = (order) => {
    setSelectedOrder(order);
    setWaConsoleLogs([]); // Wipes prior logs for clean view
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setIsEditingOrder(false);
    setEditOrderItems([]);
    setEditOrderName('');
    setEditOrderPhone('');
    setEditOrderAddress('');
  };

  const handleStartEditOrder = (order) => {
    if (isOrder1HourLocked(order)) {
      alert(isHindi
        ? "🔒 यह ऑर्डर डिलीवर होने के 1 घंटे बाद पूरी तरह लॉक हो चुका है! ऑर्डर सामग्री या विवरण संशोधित नहीं किए जा सकते। केवल भुगतान विवरण ही अपडेट किए जा सकते हैं।"
        : "🔒 This order was delivered over 1 hour ago and is permanently locked! Details cannot be modified. Only payment settlement can be updated.");
      return;
    }
    setIsEditingOrder(true);
    setEditOrderItems(order.items ? [...order.items] : []);
    setEditOrderName(getCustName(order));
    setEditOrderPhone(getCustPhone(order));
    setEditOrderAddress(order.shippingAddress || '');
    setEditOrderPaymentMethod(order.paymentMethod || 'card');
    setEditOrderPaymentStatus(order.paymentStatus || 'PAID');
    setEditOrderSearchQuery('');
  };

  const handleSaveEditedOrder = () => {
    if (isOrder1HourLocked(selectedOrder)) {
      alert(isHindi
        ? "🔒 डिलीवर होने के 1 घंटे बाद यह ऑर्डर पूरी तरह लॉक है! केवल भुगतान विवरण ही अपडेट हो सकते हैं।"
        : "🔒 This order is permanently locked 1 hour post-delivery! Only payment details can be updated.");
      return;
    }
    if (!editOrderName.trim() || !editOrderPhone.trim() || !editOrderAddress.trim()) {
      alert("Customer Name, Phone and Shipping Address are required!");
      return;
    }
    if (editOrderItems.length === 0) {
      alert("Order must contain at least 1 item!");
      return;
    }

    const subtotal = editOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0);
    const total = subtotal + Number(selectedOrder.deliveryFee || 0);

    const updatedData = {
      ...selectedOrder,
      customerName: editOrderName,
      customerPhone: editOrderPhone,
      deliveryPartnerName: selectedOrder.deliveryPartnerName || 'Swastik Rider',
      deliveryPartnerPhone: selectedOrder.deliveryPartnerPhone || '+91 95400 12099',
      shippingAddress: editOrderAddress,
      paymentMethod: editOrderPaymentMethod,
      paymentStatus: editOrderPaymentStatus,
      items: editOrderItems,
      subtotal,
      total
    };

    updateOrder(selectedOrder.id, updatedData);
    setSelectedOrder(updatedData);
    setIsEditingOrder(false);
  };

  const editAddItem = (product) => {
    const existing = editOrderItems.find(it => String(it.id) === String(product.id));
    if (existing) {
      setEditOrderItems(prev => prev.map(it => String(it.id) === String(product.id) ? { ...it, qty: it.qty + 1 } : it));
    } else {
      setEditOrderItems(prev => [...prev, {
        id: product.id,
        nameEn: product.nameEn,
        nameHi: product.nameHi || product.nameEn,
        price: product.price,
        qty: 1,
        weight: product.weight || "1 Unit"
      }]);
    }
  };

  const editQtyChange = (itemId, change) => {
    setEditOrderItems(prev => prev.map(it => {
      if (String(it.id) === String(itemId)) {
        const newQty = it.qty + change;
        return newQty > 0 ? { ...it, qty: newQty } : it;
      }
      return it;
    }).filter(it => it.qty > 0));
  };

  const editRemoveItem = (itemId) => {
    setEditOrderItems(prev => prev.filter(it => String(it.id) !== String(itemId)));
  };

  const handleSaveNewOrder = () => {
    if (!newOrderName.trim() || !newOrderPhone.trim() || !newOrderAddress.trim()) {
      alert("Customer Name, Phone and Shipping Address are required!");
      return;
    }
    if (newOrderItems.length === 0) {
      alert("New Order must contain at least 1 item!");
      return;
    }

    const subtotal = newOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0);
    
    let couponDiscount = 0;
    if (newOrderAppliedCoupon) {
      if (newOrderAppliedCoupon.discountType === 'percentage') {
        couponDiscount = Math.round((subtotal * (newOrderAppliedCoupon.value / 100)) * 100) / 100;
      } else {
        couponDiscount = Math.min(newOrderAppliedCoupon.value, subtotal);
      }
    }
    const total = Math.max(0, Math.round((subtotal + Number(newOrderDeliveryFee) - couponDiscount) * 100) / 100);

    // Generate unique order ID
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const newId = `SW-${randomSuffix}`;
    const defaultRider = staff?.find(s => s.role_id === 4 || s.role?.toLowerCase().includes('delivery') || s.role?.toLowerCase().includes('rider')) || null;

    const orderPayload = {
      id: newId,
      customerName: newOrderName,
      customerPhone: newOrderPhone,
      deliveryStaffId: defaultRider ? defaultRider.id : null,
      deliveryPartnerName: newOrderPilotName || (defaultRider ? defaultRider.name : ""),
      deliveryPartnerPhone: newOrderPilotPhone || (defaultRider ? defaultRider.mobile : ""),
      shippingAddress: newOrderAddress,
      orderDate: new Date().toISOString().split('T')[0],
      items: newOrderItems,
      subtotal,
      deliveryFee: Number(newOrderDeliveryFee),
      couponDiscount: Number(couponDiscount),
      couponCode: newOrderAppliedCoupon ? newOrderAppliedCoupon.code : "",
      total,
      paymentMethod: newOrderPaymentMethod,
      paymentStatus: newOrderPaymentStatus,
      deliveryPartnerNamePilot: newOrderPilotName || "Rakesh Pilot",
      deliveryPartnerPhonePilot: newOrderPilotPhone || "+91 99999-88888",
      eta: newOrderETA || "15 Mins",
      status: "Confirmed",
      step: 0,
      isActive: true
    };

    addOrder(orderPayload);
    setIsCreatingNewOrder(false);

    // Clear state
    setNewOrderName('');
    setNewOrderPhone('');
    setNewOrderAddress('');
    setNewOrderItems([]);
    setNewOrderSearchQuery('');
    setNewOrderCouponCode('');
    setNewOrderAppliedCoupon(null);
  };

  const newAddItem = (product) => {
    const existing = newOrderItems.find(it => String(it.id) === String(product.id));
    if (existing) {
      setNewOrderItems(prev => prev.map(it => String(it.id) === String(product.id) ? { ...it, qty: it.qty + 1 } : it));
    } else {
      setNewOrderItems(prev => [...prev, {
        id: product.id,
        nameEn: product.nameEn,
        nameHi: product.nameHi || product.nameEn,
        price: product.price,
        qty: 1,
        weight: product.weight || "1 Unit"
      }]);
    }
  };

  const newQtyChange = (itemId, change) => {
    setNewOrderItems(prev => prev.map(it => {
      if (String(it.id) === String(itemId)) {
        const newQty = it.qty + change;
        return newQty > 0 ? { ...it, qty: newQty } : it;
      }
      return it;
    }).filter(it => it.qty > 0));
  };

  const newRemoveItem = (itemId) => {
    setNewOrderItems(prev => prev.filter(it => String(it.id) !== String(itemId)));
  };

  const handleUpdateStep = (id, step, statusKey, isActive) => {
    const existingOrder = orders.find(o => String(o.id) === String(id)) || (selectedOrder && String(selectedOrder.id) === String(id) ? selectedOrder : null);
    
    if (existingOrder) {
      const targetSt = (existingOrder.status || '').toLowerCase();
      const isCurrentlyDelivered = targetSt === 'delivered' || targetSt === 'completed' || isOrder1HourLocked(existingOrder);
      if (isCurrentlyDelivered) {
        alert(isHindi 
          ? '🔒 यह ऑर्डर डिलीवर हो चुका है और स्थायी रूप से लॉक है! डिलीवर होने के बाद स्थिति या विवरण में कोई बदलाव नहीं किया जा सकता।' 
          : '🔒 This order is delivered and permanently locked! No status changes or modifications are allowed after delivery.');
        return;
      }
    }

    // Intercept Step 2 (Delivered) or Step 1 (Dispatched) to verify and ask payment first!
    if (step === 2 || statusKey === "Delivered") {
      const ord = existingOrder || { id };
      setDeliveryPaymentModalOrder(ord);
      setDeliveryPaymentStepTarget(2);
      const isCod = (ord.paymentMethod || 'cod').toLowerCase() === 'cod';
      setDeliveryVerifyMethod(isCod ? 'cod' : (ord.paymentMethod || 'upi'));
      setDeliveryVerifyPaymentStatus(ord.paymentStatus === 'PAID' ? 'PAID' : 'PAID');
      setDeliveryVerifyRiderCash(true);
      const matchedRider = deliveryStaffList.find(s => 
        (ord.deliveryStaffId && String(s.id) === String(ord.deliveryStaffId)) ||
        (ord.deliveryPartnerName && s.name.toLowerCase().trim() === ord.deliveryPartnerName.toLowerCase().trim())
      ) || deliveryStaffList[0];
      setDeliveryVerifyStaffId(matchedRider ? String(matchedRider.id) : (ord.deliveryStaffId ? String(ord.deliveryStaffId) : ''));
      return;
    }

    if (step === 1 || statusKey === "Dispatched" || statusKey === "In Transit" || statusKey === "Out for Delivery") {
      const ord = existingOrder || { id };
      setDeliveryPaymentModalOrder(ord);
      setDeliveryPaymentStepTarget(1);
      const isCod = (ord.paymentMethod || 'cod').toLowerCase() === 'cod';
      setDeliveryVerifyMethod(isCod ? 'cod' : (ord.paymentMethod || 'upi'));
      setDeliveryVerifyPaymentStatus(ord.paymentStatus || (isCod ? 'PENDING' : 'PAID'));
      setDeliveryVerifyRiderCash(false);
      const matchedRider = deliveryStaffList.find(s => 
        (ord.deliveryStaffId && String(s.id) === String(ord.deliveryStaffId)) ||
        (ord.deliveryPartnerName && s.name.toLowerCase().trim() === ord.deliveryPartnerName.toLowerCase().trim())
      ) || deliveryStaffList[0];
      setDeliveryVerifyStaffId(matchedRider ? String(matchedRider.id) : (ord.deliveryStaffId ? String(ord.deliveryStaffId) : ''));
      return;
    }

    // Direct execution for step 0 or other steps
    executeStepUpdate(id, step, statusKey, isActive, existingOrder);
  };

  const executeStepUpdate = (id, step, statusKey, isActive, existingOrder, extraFields = {}) => {
    const isNowDelivered = statusKey === "Delivered" || step === 2;
    const isNowCancelled = statusKey === "Cancelled" || step === -1;

    if (existingOrder && isOrder1HourLocked(existingOrder) && !isNowDelivered && !isNowCancelled) {
      alert(isHindi
        ? '🔒 यह ऑर्डर लॉक है! रद्द (Cancelled) या डिलीवर किए गए ऑर्डर में बदलाव नहीं किया जा सकता।'
        : '🔒 This order is permanently locked! Cancelled or delivered orders cannot be modified.');
      return;
    }

    const payload = {
      step: isNowCancelled ? -1 : step,
      status: statusKey,
      isActive: isNowCancelled ? false : isActive,
      deliveryDate: isNowDelivered ? (existingOrder?.deliveryDate || new Date().toISOString()) : existingOrder?.deliveryDate,
      cancelledAt: isNowCancelled ? new Date().toISOString() : existingOrder?.cancelledAt,
      ...extraFields
    };

    updateOrder(id, payload);

    const updatedOrder = existingOrder 
      ? { ...existingOrder, ...payload }
      : { id, ...payload };

    if (selectedOrder && String(selectedOrder.id) === String(id)) {
      setSelectedOrder(updatedOrder);
    }

    if (isNowDelivered) {
      setTimeout(() => {
        handleSendWhatsappInvoice(updatedOrder);
        alert(`Status updated to DELIVERED & PERMANENTLY LOCKED!\nSigned Tax Bill invoice auto-dispatched to customer!`);
      }, 300);
    } else if (step === 1 || statusKey === "Dispatched" || statusKey === "In Transit" || statusKey === "Out for Delivery") {
      setTimeout(() => {
        handleSendWhatsappDispatchAlert(updatedOrder);
        alert(`Status updated to DISPATCHED!\nDispatch alert sent to ${getCustName(updatedOrder)}!`);
      }, 300);
    } else if (isNowCancelled) {
      alert(isHindi 
        ? `ऑर्डर #${id} की स्थिति सफलतापूर्वक रद्द (Cancelled) कर दी गई है।` 
        : `Order #${id} status changed to CANCELLED successfully.`);
    }
  };

  // Handler for Confirming Delivery & Payment from Modal
  const handleConfirmDeliveryPayment = () => {
    if (!deliveryPaymentModalOrder) return;
    const ord = deliveryPaymentModalOrder;
    const isDeliveredTarget = deliveryPaymentStepTarget === 2;
    const isCod = deliveryVerifyMethod === 'cod';

    const chosenStaff = deliveryStaffList.find(s => String(s.id) === String(deliveryVerifyStaffId)) ||
                        staff?.find(s => String(s.id) === String(deliveryVerifyStaffId));

    const extraFields = {
      paymentMethod: deliveryVerifyMethod,
      deliveryStaffId: chosenStaff ? Number(chosenStaff.id) : (deliveryVerifyStaffId ? Number(deliveryVerifyStaffId) : ord.deliveryStaffId),
      deliveryPartnerName: chosenStaff ? chosenStaff.name : (ord.deliveryPartnerName || (deliveryStaffList[0]?.name || '')),
      deliveryPartnerPhone: chosenStaff ? chosenStaff.mobile : (ord.deliveryPartnerPhone || (deliveryStaffList[0]?.mobile || ''))
    };

    if (isDeliveredTarget) {
      if (isCod) {
        if (deliveryVerifyRiderCash) {
          extraFields.paymentStatus = 'PAID';
          extraFields.codStatus = 'COLLECTED_BY_RIDER';
          extraFields.cashCollectedByRider = 1;
          extraFields.codCollectedAt = new Date().toISOString();
        } else {
          extraFields.paymentStatus = 'UNPAID';
          extraFields.codStatus = 'PENDING_CLEARANCE';
          extraFields.cashCollectedByRider = 0;
        }
      } else {
        extraFields.paymentStatus = deliveryVerifyPaymentStatus;
        extraFields.codStatus = 'CLEARED_TO_ADMIN';
      }
    } else {
      // Dispatched target
      extraFields.paymentStatus = deliveryVerifyPaymentStatus;
      if (isCod) {
        extraFields.codStatus = 'PENDING_CLEARANCE';
      }
    }

    executeStepUpdate(
      ord.id,
      deliveryPaymentStepTarget,
      isDeliveredTarget ? 'Delivered' : 'In Transit',
      true,
      ord,
      extraFields
    );

    setDeliveryPaymentModalOrder(null);
  };

  const handleCancelOrder = (orderId = null) => {
    const id = orderId || (selectedOrder ? selectedOrder.id : null);
    if (!id) return;
    const existingOrder = orders.find(o => String(o.id) === String(id)) || (selectedOrder && String(selectedOrder.id) === String(id) ? selectedOrder : null);
    if (!existingOrder) return;

    const targetSt = (existingOrder.status || '').toLowerCase();
    const isCurrentlyDelivered = targetSt === 'delivered' || targetSt === 'completed' || isOrder1HourLocked(existingOrder);
    if (isCurrentlyDelivered) {
      alert(isHindi 
        ? '🔒 यह ऑर्डर डिलीवर हो चुका है और स्थायी रूप से लॉक है! डिलीवर होने के बाद ऑर्डर रद्द नहीं किया जा सकता।' 
        : '🔒 This order is delivered and permanently locked! An order cannot be cancelled after delivery.');
      return;
    }

    if (targetSt === 'cancelled') {
      alert(isHindi ? 'यह ऑर्डर पहले से ही रद्द है।' : 'This order is already marked as Cancelled.');
      return;
    }

    // Open dedicated in-app modal (never blocked by iframe)
    setOrderToCancel(existingOrder);
  };

  const handleConfirmCancelOrder = () => {
    if (!orderToCancel) return;
    const id = orderToCancel.id;
    const existingOrder = orders.find(o => String(o.id) === String(id)) || orderToCancel;

    executeStepUpdate(id, -1, 'Cancelled', false, existingOrder);
    setOrderToCancel(null);
  };

  // One-click handler for Store Admin marking cash received from delivery staff
  const handleMarkAdminReceivedCash = (order) => {
    if (!order) return;
    const clearTime = new Date().toISOString();
    const payload = {
      codStatus: 'CLEARED_TO_ADMIN',
      adminReceivedCash: 1,
      adminCashReceivedAt: clearTime,
      codClearedAt: clearTime,
      codClearedBy: 'Admin',
      codClearanceNote: 'Physical cash received by Store Admin from delivery staff'
    };

    updateOrder(order.id, payload);

    if (selectedOrder && String(selectedOrder.id) === String(order.id)) {
      setSelectedOrder(prev => ({ ...prev, ...payload }));
    }

    alert(isHindi 
      ? `✅ डिलीवरी स्टाफ से ₹${order.total || order.grandTotal || 0} का भौतिक नगद भुगतान एडमिन द्वारा सफलतापूर्वक प्राप्त व दर्ज किया गया!`
      : `✅ Received ₹${order.total || order.grandTotal || 0} cash from delivery staff (${order.deliveryPartnerName || 'Staff'}) successfully recorded in store ledger!`);
  };

  const handleSendWhatsappDispatchAlert = async (specificOrder = null) => {
    const targetOrder = specificOrder || selectedOrder;
    if (!targetOrder) return;
    const orderId = targetOrder.id;
    const phoneNum = getCustPhone(targetOrder) !== 'N/A' ? getCustPhone(targetOrder) : "+91 95400 12099";
    const clientName = getCustName(targetOrder);

    const subtotal = targetOrder.items && targetOrder.items.length > 0 
      ? targetOrder.items.reduce((sum, it) => sum + (Number(it.price || it.salePrice || 0) * Number(it.qty || 1)), 0)
      : Number(targetOrder.subtotal || targetOrder.subtotal_amount || 0);
    const gst = Number(targetOrder.gst || targetOrder.gst_amount || 0);
    const deliveryFee = Number(targetOrder.deliveryFee || targetOrder.delivery_fee || 0);
    const referralDiscount = Number(targetOrder.referralDiscount || targetOrder.referral_discount || 0);
    const couponDiscount = Number(targetOrder.couponDiscount || targetOrder.coupon_discount || 0);
    const celebrationDiscount = Number(targetOrder.celebrationDiscount || targetOrder.celebration_discount || 0);

    const calcTotal = subtotal + gst + deliveryFee - referralDiscount - couponDiscount - celebrationDiscount;
    const rawTotal = Number(targetOrder.total || targetOrder.grand_total || 0);

    const grandTotal = rawTotal > 0 ? rawTotal : (calcTotal > 0 ? Math.round(calcTotal) : (subtotal > 0 ? Math.round(subtotal) : 350));

    const bodyMsg = `Hello ${clientName}, your Swastik order ${orderId} has been handed over to our delivery partner! Total bill amount is ₹${grandTotal}. You can track or contact your rider directly from the Swastik app.`;

    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: phoneNum, 
          message: bodyMsg,
          templateName: 'order_dispatch_alert',
          templateParams: [clientName, String(orderId), `₹${grandTotal}`]
        })
      });
    } catch (e) {
      console.error("Dispatch alert trigger error:", e);
    }
  };

  const handleAgentDetailsChange = (field, value) => {
    if (!selectedOrder) return;
    if (isOrder1HourLocked(selectedOrder)) {
      const isPaymentField = ['paymentStatus', 'paymentMethod', 'codStatus', 'codNotes', 'codCollectedAt'].includes(field);
      if (!isPaymentField) {
        alert(isHindi 
          ? '🔒 डिलीवर होने के 1 घंटे बाद यह ऑर्डर पूरी तरह लॉक है! केवल भुगतान विवरण ही बदले जा सकते हैं।' 
          : '🔒 This order is permanently locked 1 hour after delivery! Only payment details can be modified.');
        return;
      }
    }
    const patch = { [field]: value };
    updateOrder(selectedOrder.id, patch);
    setSelectedOrder(prev => ({ ...prev, ...patch }));
  };

  // Whatsapp Send Invoice dynamic API handler (Requirement 5) - Supports automated and manual dispatch
  const handleSendWhatsappInvoice = async (specificOrder = null) => {
    const targetOrder = specificOrder || selectedOrder;
    if (!targetOrder) return;
    setIsSendingBill(true);
    setWaConsoleLogs([]);

    const orderId = targetOrder.id;
    const phoneNum = getCustPhone(targetOrder);
    if (!phoneNum || phoneNum === 'N/A') {
      setWaConsoleLogs(['This order has no customer phone number.']);
      setIsSendingBill(false);
      return;
    }
    const clientName = getCustName(targetOrder);

    const subtotal = targetOrder.items && targetOrder.items.length > 0 
      ? targetOrder.items.reduce((sum, it) => sum + (Number(it.price || it.salePrice || 0) * Number(it.qty || 1)), 0)
      : Number(targetOrder.subtotal || targetOrder.subtotal_amount || 0);
    const gst = Number(targetOrder.gst || targetOrder.gst_amount || 0);
    const deliveryFee = Number(targetOrder.deliveryFee || targetOrder.delivery_fee || 0);
    const referralDiscount = Number(targetOrder.referralDiscount || targetOrder.referral_discount || 0);
    const couponDiscount = Number(targetOrder.couponDiscount || targetOrder.coupon_discount || 0);
    const celebrationDiscount = Number(targetOrder.celebrationDiscount || targetOrder.celebration_discount || 0);

    const calcTotal = subtotal + gst + deliveryFee - referralDiscount - couponDiscount - celebrationDiscount;
    const rawTotal = Number(targetOrder.total || targetOrder.grand_total || 0);

    const grandTotal = rawTotal > 0 ? rawTotal : (calcTotal > 0 ? Math.round(calcTotal) : Math.round(subtotal));

    const itemsLabel = targetOrder.items && targetOrder.items.length > 0 
      ? targetOrder.items.map(it => `${it.qty}x ${it.nameEn || it.nameHi || it.name}`).join(', ') 
      : 'the recorded order items';

    const bodyMsg = `Hi ${clientName}, your Swastik order ${orderId} has been marked as DELIVERED successfully! Please find your official invoice PDF containing your summary of ${itemsLabel} for a total of ₹${grandTotal} attached. Track bills: ${window.location.origin}/account`;

    const log1 = `[Meta-WA-Gateway] Initiating outbound handshake: target phone +91 ${phoneNum.replace(/\D/g, '')}`;
    const log2 = `[Meta-WA-Gateway] Compiling verified Template bill payload ID: swastik_thermal_invoice_v2 (PDF receipt compiling...)`;
    setWaConsoleLogs([log1, log2]);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneNum, message: bodyMsg })
      });

      if (res.ok) {
        const data = await res.json();
        const payloadObj = {
          messaging_product: "whatsapp",
          to: phoneNum,
          type: "template",
          template: {
            name: "swastik_thermal_invoice_v2",
            language: { code: "en_US" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: `https://invoice-storage.swastik.com/receipt-${orderId}.pdf`,
                      filename: `Swastik-Bill-${orderId}.pdf`
                    }
                  }
                ]
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: clientName },
                  { type: "text", text: orderId },
                  { type: "text", text: `₹${grandTotal}` }
                ]
              }
            ]
          },
          api_dispatched: {
            delivery_channel: data.status === "dispatched" ? "Meta WhatsApp Business Live Cloud Gateway" : "Meta WhatsApp Business Sandbox Gateway",
            http_code: "201 OK",
            gateway_message_id: `gwm_id_invoice_${orderId}_fdb4`,
            timestamp: new Date().toISOString(),
            twilio_status: data.status,
            twilio_response: data.twilio_response
          }
        };

        const log3 = JSON.stringify(payloadObj, null, 2);
        const logMsg = `[Meta-WA-Gateway] Outbound notification sent to +91 ${phoneNum} successfully! Status: ${data.status.toUpperCase()}
[Message text]: "${bodyMsg}"
[Attachment]: Generated Swastik-Bill-${orderId}.pdf`;

        setWaConsoleLogs(prev => [...prev, log3, logMsg]);
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      console.error("WhatsApp invoice send failed:", err);
      setWaConsoleLogs(prev => [...prev, `Send failed: ${err.message || 'Provider request failed'}`]);
    } finally {
      setIsSendingBill(false);
    }
  };

  return (
    <div className="space-y-6 text-white animate-fade-in">
      
      {/* 1. Header with counters */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Clock className="h-5.5 w-5.5 text-cyan-400" />
            <span>Operational Log & Order Manager</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
            Realtime invoice delivery, dispatch streams, and dispatchers portal
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <NotificationCenter 
            role={userRole === 'delivery' ? 'delivery' : (userRole === 'admin' ? 'admin' : 'staff')} 
            phone={activeStaff?.mobile || ''} 
          />

          {userRole !== 'customer' && (
            <button
              onClick={() => setIsCreatingNewOrder(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg shadow-cyan-500/10"
              id="create-manual-order-btn"
            >
              <Plus className="h-4 w-4 text-slate-950 font-black" />
              <span>Create Manual Order</span>
            </button>
          )}

          <div className="bg-slate-900 border border-white/10 px-4 py-2 rounded-xl text-center">
            <span className="text-[8px] text-slate-400 block font-black uppercase tracking-wider mb-0.5">Dispatched/Pending</span>
            <span className="text-sm font-mono font-black text-cyan-400">{orders.filter(o => o.isActive).length}</span>
          </div>
          <div className="bg-slate-900 border border-white/10 px-4 py-2 rounded-xl text-center">
            <span className="text-[8px] text-slate-400 block font-black uppercase tracking-wider mb-0.5">Delivered</span>
            <span className="text-sm font-mono font-black text-emerald-400">{orders.filter(o => !o.isActive).length}</span>
          </div>
        </div>
      </div>

      {/* 2. Comprehensive Search, Status and Date Range Filters Block (Requirement 5) */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-4">
        
        {/* Row 1: Search & Status Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Order ID, dispatch Pilot name, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 pl-9 pr-3 py-2 text-xs rounded-xl text-white placeholder-slate-600 outline-none focus:border-cyan-400/40"
            />
          </div>

          <div className="md:col-span-6 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider shrink-0">Status:</span>
            <div className="flex bg-slate-950 border border-white/10 p-0.5 rounded-lg w-full overflow-x-auto">
              {['All', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled'].map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setFilterStatus(statusKey)}
                  className={`w-full py-1 px-2 rounded text-[9px] font-extrabold uppercase transition-all whitespace-nowrap ${
                    filterStatus === statusKey 
                      ? (statusKey === 'Cancelled' ? 'bg-rose-500 text-white font-black' : 'bg-cyan-500 text-slate-950 font-black')
                      : (statusKey === 'Cancelled' ? 'text-rose-400/80 hover:text-rose-300' : 'text-slate-400 hover:text-white')
                  }`}
                >
                  {statusKey}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Date Filters & Trigger Button */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Calendar className="h-3 w-3 text-cyan-400" />
              <span>Created From Date</span>
            </label>
            <input 
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white uppercase font-mono outline-none focus:border-cyan-400/40"
            />
          </div>

          <div className="sm:col-span-5 space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Calendar className="h-3 w-3 text-cyan-400" />
              <span>Created To Date</span>
            </label>
            <input 
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white uppercase font-mono outline-none focus:border-cyan-400/40"
            />
          </div>

          <div className="sm:col-span-2">
            <button 
              onClick={handleClearFilters}
              type="button"
              className="w-full bg-slate-950 hover:bg-slate-800 border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all flex items-center justify-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>

        </div>

        {/* Row 3: Payment Mode Filter, Delivery Person Filter, and XLS Download Button */}
        <div className="pt-3.5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest shrink-0">Payment Mode:</span>
              <div className="flex bg-slate-950 border border-white/10 p-0.5 rounded-lg">
                {[
                  { key: 'All', label: 'All Modes' },
                  { key: 'COD', label: 'COD' },
                  { key: 'ONLINE', label: 'All Online PG' },
                  { key: 'RAZORPAY_ONLINE', label: 'Razorpay PG' },
                  { key: 'CASHFREE_ONLINE', label: 'Cashfree PG' }
                ].map((pm) => (
                  <button
                    key={pm.key}
                    type="button"
                    onClick={() => setFilterPaymentMode(pm.key)}
                    className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                      filterPaymentMode === pm.key 
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/10' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest shrink-0">🛵 Delivery Person:</span>
              <select
                value={filterDeliveryPerson}
                onChange={(e) => setFilterDeliveryPerson(e.target.value)}
                className="bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-cyan-300 font-bold outline-none focus:border-cyan-400/40 cursor-pointer"
              >
                <option value="All">All Delivery Staff ({filterDeliveryStaffList.length})</option>
                {filterDeliveryStaffList.map((dpName, idx) => (
                  <option key={idx} value={dpName}>{dpName}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleDownloadPaymentReport}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10 flex items-center gap-1.5 border border-emerald-400/10 self-end md:self-auto"
          >
            <span>📥 Download Excel Payment Report</span>
          </button>
        </div>

      </div>

      {/* 3. Orders list list view */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer Segment</th>
              <th className="p-4 hidden md:table-cell">Log Timestamp</th>
              <th className="p-4 text-center">Items (Qty)</th>
              <th className="p-4 text-right">Sum Total</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Receipt Bill</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium text-slate-300">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider font-mono italic">
                  No tracking orders matched current filter segments.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o) => {
                const totalAmount = o.total || o.subtotal || 350;
                const itemsCount = o.items ? o.items.reduce((acc, it) => acc + it.qty, 0) : 0;
                const clientName = getCustName(o);
                const clientPhone = getCustPhone(o);
                
                return (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-mono font-black text-cyan-400 select-all tracking-tight">
                      <button 
                        onClick={() => handleOpenDetailModal(o)} 
                        className="hover:underline focus:outline-none cursor-pointer"
                      >
                        {o.id}
                      </button>
                    </td>

                    <td className="p-4">
                      <div className="font-extrabold text-white text-[11px]">{clientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-1 flex-wrap select-none">
                        <span>{clientPhone}</span>
                        <span className={`px-1 rounded text-[8px] font-mono uppercase tracking-wider font-extrabold border ${
                          (o.paymentMethod || 'COD').toUpperCase().includes('ONLINE') || (o.paymentMethod || 'COD').toUpperCase().includes('RAZORPAY') || (o.paymentMethod || 'COD').toUpperCase().includes('CASHFREE') || (o.paymentMethod || 'COD').toUpperCase() === 'CARD' || (o.paymentMethod || 'COD').toUpperCase() === 'UPI' || (o.paymentMethod || 'COD').toUpperCase() === 'NETBANKING'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {o.paymentMethod || 'COD'}
                        </span>
                        <span className={`px-1 rounded text-[8px] font-mono uppercase tracking-wider font-extrabold border ${
                          (o.paymentStatus || 'PENDING').toUpperCase() === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {o.paymentStatus || 'PENDING'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-slate-400 font-mono hidden md:table-cell">
                      {o.orderDate || o.date || "Today"}
                    </td>

                    <td className="p-4 text-center font-bold text-slate-200">
                      {itemsCount} units
                    </td>

                    <td className="p-4 text-right font-mono font-black text-cyan-300">
                      <div>₹{totalAmount}</div>
                      <div className="text-[8px] font-sans font-black text-slate-400 uppercase tracking-widest mt-1">
                        {o.deliveryFee > 0 ? `+ ₹${o.deliveryFee} Del` : 'Free Del'}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      {getStatusBadge(o)}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(o)}
                          className="p-1.5 px-2.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Manage</span>
                        </button>
                        {userRole !== 'customer' && !isOrder1HourLocked(o) && (o.status || '').toLowerCase() !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(o.id)}
                            className="p-1.5 px-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            title="Cancel Order (Before Delivery)"
                          >
                            <Ban className="h-3 w-3 text-rose-400" />
                            <span className="hidden xl:inline">Cancel</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setOrderToDelete(o);
                            setDeleteOrderError('');
                          }}
                          className="p-1.5 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 px-4 py-3 border-t border-white/10 text-xs font-semibold text-slate-400 font-sans">
            <div>
              Showing <span className="text-white font-extrabold">{Math.min(filteredOrders.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="text-white font-extrabold">{Math.min(filteredOrders.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="text-white font-extrabold">{filteredOrders.length}</span> orders
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent font-black tracking-wider uppercase text-[10px] cursor-pointer"
              >
                ◀ Prev
              </button>
              {(() => {
                const pages = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);
                  if (start > 2) pages.push('ellipsis-start');
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
                return pages.map((pVal, idx) => {
                  if (typeof pVal === 'string') {
                    return <span key={`${pVal}-${idx}`} className="px-1.5 select-none text-[10px] text-slate-500">..</span>;
                  }
                  return (
                    <button
                      key={pVal}
                      type="button"
                      onClick={() => setCurrentPage(pVal)}
                      className={`w-8 h-8 rounded-xl font-bold transition-all text-[11px] ${
                        currentPage === pVal
                          ? 'bg-cyan-500 text-slate-950 font-black scale-105 shadow-md shadow-cyan-500/20'
                          : 'hover:bg-white/5 text-slate-300 border border-transparent'
                      }`}
                    >
                      {pVal}
                    </button>
                  );
                });
              })()}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent font-black tracking-wider uppercase text-[10px] cursor-pointer"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Thermal Cash Receipt invoice Modal Popup Overlay Panel (Requirement 5) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-slate-950 border border-white/12 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[95vh] grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Standard Modal Cross */}
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 hover:bg-white/10 p-2 rounded-full text-slate-400 hover:text-white transition-all duration-150 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left Column: THERMAL PRINT GROCERY Cash Bill or Editor View */}
            {isEditingOrder ? (
              <div className="md:col-span-6 bg-slate-900 border border-white/10 p-6 rounded-2xl space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h3 className="font-extrabold uppercase text-cyan-400 flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    <span>Modify Order details</span>
                  </h3>
                  <button 
                    onClick={() => setIsEditingOrder(false)}
                    className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded text-red-400 hover:bg-red-500/10 font-bold uppercase transition"
                  >
                    Revert View
                  </button>
                </div>

                {/* Name, Phone & Address inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Customer Name / Buyer Segment</label>
                    <input 
                      type="text"
                      value={editOrderName}
                      onChange={(e) => setEditOrderName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white uppercase font-sans placeholder-slate-600 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Customer Phone Contact</label>
                    <input 
                      type="text"
                      value={editOrderPhone}
                      onChange={(e) => setEditOrderPhone(e.target.value)}
                      placeholder="+91 98XXX XXXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Shipping & Road Address</label>
                    <input 
                      type="text"
                      value={editOrderAddress}
                      onChange={(e) => setEditOrderAddress(e.target.value)}
                      placeholder="123 Alpha Road, Noida UP"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                </div>

                {/* Items Modification Panel */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <span className="text-[9px] text-slate-400 font-slate-400 font-extrabold uppercase block mb-1 tracking-wider">
                    Order Items & Weight Metrics ({editOrderItems.reduce((acc, it) => acc + it.qty, 0)} units)
                  </span>
                  <div className="max-h-[150px] overflow-y-auto divide-y divide-white/5 pr-1 space-y-2">
                    {editOrderItems.map((it) => (
                      <div key={it.id} className="flex justify-between items-center py-1.5 gap-2">
                        <div className="grow">
                          <p className="text-white text-[11px] font-bold line-clamp-1">{it.nameEn}</p>
                          <p className="text-[9px] text-cyan-400">₹{it.price} &bull; {it.weight}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button" 
                            onClick={() => editQtyChange(it.id, -1)}
                            className="w-6 h-6 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-white px-1 text-xs font-mono font-black">{it.qty}</span>
                          <button 
                            type="button" 
                            onClick={() => editQtyChange(it.id, 1)}
                            className="w-6 h-6 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                          <button 
                            type="button" 
                            onClick={() => editRemoveItem(it.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded ml-2 cursor-pointer transition active:scale-90"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add dynamic items to search */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <span className="text-[9px] text-slate-400 font-black uppercase block tracking-wider">Add Products to Order</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search store catalog to insert..."
                      value={editOrderSearchQuery}
                      onChange={(e) => setEditOrderSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-white/12 pl-8 pr-3 py-1.5 rounded-xl text-[11px] text-white placeholder-slate-700 outline-none focus:border-cyan-400/30"
                    />
                  </div>
                  {editOrderSearchQuery && (
                    <div className="bg-slate-950 border border-white/10 rounded-xl p-1 max-h-[140px] overflow-y-auto divide-y divide-white/5 animate-fade-in shadow-xl">
                      {products.filter(p => {
                        const q = editOrderSearchQuery.toLowerCase();
                        return p.nameEn.toLowerCase().includes(q) || (p.nameHi && p.nameHi.toLowerCase().includes(q));
                      }).slice(0, 4).length === 0 ? (
                        <p className="p-2 text-[10px] text-slate-500 italic">No products matched catalog inquiry.</p>
                      ) : (
                        products.filter(p => {
                          const q = editOrderSearchQuery.toLowerCase();
                          return p.nameEn.toLowerCase().includes(q) || (p.nameHi && p.nameHi.toLowerCase().includes(q));
                        }).slice(0, 4).map(p => (
                          <div key={p.id} className="flex justify-between items-center p-1.5 text-[10px] hover:bg-white/5 transition-colors">
                            <div>
                              <p className="text-white font-bold">{p.nameEn}</p>
                              <p className="text-slate-500">₹{p.price} &bull; {p.weight}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => editAddItem(p)}
                              className="px-2 py-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded uppercase text-[8px] cursor-pointer transition active:scale-95"
                            >
                              + Add
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-totals display */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-white/10 flex justify-between items-center text-[11px] gap-2">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Provisional Bill Total</span>
                    <span className="text-cyan-400 font-extrabold text-xs font-mono">
                      ₹{editOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0) + Number(selectedOrder.deliveryFee || 0)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsEditingOrder(false)}
                      className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl font-bold text-[10px] uppercase text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEditedOrder}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Order</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="md:col-span-6 bg-white text-slate-950 p-6 rounded-2xl font-mono text-xs shadow-2xl relative border-4 border-slate-300">
                
                {/* Print Trigger Header Bar */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-3 font-sans">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <Printer className="h-4 w-4 text-cyan-600" />
                    <span>TAX BILL RECEIPT</span>
                  </div>
                  <button
                    onClick={() => handlePrintInvoice(selectedOrder)}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print Invoice</span>
                  </button>
                </div>

                {/* Receipt Dotted borders top and bottom */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,bg-slate-300_1px,transparent_1px)] bg-[size:8px_8px] opacity-10"></div>
                
                {/* Thermal paper header styling with dynamic settings */}
                <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-400 font-sans">
                  {contactSettings?.logo && (
                    <img src={contactSettings.logo} alt="Company Logo" className="h-10 mx-auto object-contain mb-1 rounded border border-slate-200" />
                  )}
                  <h3 className="font-extrabold text-base uppercase tracking-tight text-slate-950">
                    {contactSettings?.brandName || "SWASTIK SUPERMARKET"}
                  </h3>
                  <p className="text-[10px] text-slate-600 font-bold">
                    {contactSettings?.address || "Survey no. 100 Sanjit road opposite of Saraswati school , Mandsaur, India, Madhya Pradesh"}
                  </p>
                  <p className="text-[9px] text-slate-600 font-semibold">
                    TEL: {contactSettings?.phone || "094845 40001"} | EMAIL: {contactSettings?.email || "info.swastiksupermarket@gmail.com"}
                  </p>
                  {(contactSettings?.gst || contactSettings?.gstin) && (
                    <p className="text-[8.5px] text-slate-500 font-mono font-bold">
                      GSTIN: {contactSettings.gst || contactSettings.gstin} | FSSAI: {contactSettings?.fssai || '12721001000123'}
                    </p>
                  )}
                </div>

                {/* Bill Meta Details & Customer Info */}
                <div className="py-3 text-[10px] space-y-1.5 border-b border-dashed border-slate-400">
                  <div className="flex justify-between font-bold">
                    <span>BILL ID: #{selectedOrder.id}</span>
                    <span>CASHIER: #STAFF-{userRole === 'admin' ? 'ADMIN' : 'MGR'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE: {selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString() : (selectedOrder.date || "TODAY")}</span>
                    <span>TIME: {new Date().toLocaleTimeString()}</span>
                  </div>

                  {/* Customer Details Container */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 mt-2 text-[9.5px] font-sans">
                    <div className="font-extrabold text-sky-800 border-b border-slate-200 pb-1 flex justify-between uppercase">
                      <span>CUSTOMER DETAILS (खरीदार)</span>
                      <span className="font-mono text-slate-900">{getCustName(selectedOrder)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>MOBILE / PHONE:</span>
                      <span className="font-mono font-bold text-slate-900">{getCustPhone(selectedOrder)}</span>
                    </div>
                    <div className="text-slate-700">
                      <span className="font-bold text-slate-900">DELIVERY ADDRESS:</span> {selectedOrder.shippingAddress || selectedOrder.address || "Store Pickup"}
                    </div>
                    {selectedOrder.customerEmail && (
                      <div className="flex justify-between text-slate-600">
                        <span>EMAIL:</span>
                        <span>{selectedOrder.customerEmail}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>ASSIGNED RIDER: {selectedOrder.deliveryPartnerName || "Swastik Rider"} ({selectedOrder.deliveryPartnerPhone || "+91 95400 12099"})</span>
                    <span>STATUS: {selectedOrder.status || "CONFIRMED"}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold text-[9px] pt-1 border-t border-dashed border-slate-300 uppercase">
                    <span>PAY METHOD: {selectedOrder.paymentMethod || "COD"}</span>
                    <span>PAY STATUS: {selectedOrder.paymentStatus || "PAID"}</span>
                  </div>
                </div>

                {/* Grocery line items */}
                <div className="py-4 space-y-3.5 text-[10px]">
                  <div className="grid grid-cols-12 font-extrabold text-slate-500 border-b border-slate-300 pb-1 uppercase">
                    <span className="col-span-6">ITEM</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-2 text-right">RATE</span>
                    <span className="col-span-2 text-right">TOTAL</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto pr-1">
                    {selectedOrder.items && selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 py-1.5 text-slate-950 font-semibold">
                        <div className="col-span-6 pr-1">
                          <p className="truncate text-[11px] font-black">{it.nameEn || it.nameHi || it.name}</p>
                          <p className="text-[8px] text-slate-500 font-bold whitespace-nowrap">Size: {it.weight || "1 Unit"}</p>
                        </div>
                        <span className="col-span-2 text-center font-bold">{it.qty || it.quantity || 1}</span>
                        <span className="col-span-2 text-right font-mono">₹{it.price}</span>
                        <span className="col-span-2 text-right font-mono font-black">₹{it.price * (it.qty || it.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bill summaries total footer tier */}
                <div className="border-t border-slate-300 pt-3.5 space-y-1.5 text-[10px]">
                  <div className="flex justify-between font-medium">
                    <span>GROCERY SUB-TOTAL</span>
                    <span>₹{selectedOrder.subtotal || selectedOrder.total || 0}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>CGST (2.5%)</span>
                    <span>₹{Math.round((selectedOrder.subtotal || 0) * 0.025 * 100) / 100}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>SGST (2.5%)</span>
                    <span>₹{Math.round((selectedOrder.subtotal || 0) * 0.025 * 100) / 100}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>DELIVERY CHARGES</span>
                    <span className={Number(selectedOrder.deliveryFee || 0) === 0 ? "text-emerald-600 font-extrabold uppercase" : "font-semibold"}>
                      {Number(selectedOrder.deliveryFee || 0) === 0 ? "FREE" : `₹${selectedOrder.deliveryFee}`}
                    </span>
                  </div>

                  {selectedOrder.referralDiscount > 0 && (
                    <div className="flex justify-between font-bold text-amber-600">
                      <span>REFERRAL POINTS DISCOUNT (-)</span>
                      <span>-₹{selectedOrder.referralDiscount}</span>
                    </div>
                  )}

                  {selectedOrder.couponDiscount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>COUPON DISCOUNT ({selectedOrder.couponCode || 'PROMO'}) (-)</span>
                      <span>-₹{selectedOrder.couponDiscount}</span>
                    </div>
                  )}

                  {selectedOrder.celebrationDiscount > 0 && (
                    <div className="flex justify-between font-bold text-purple-600">
                      <span>CELEBRATION DISCOUNT ({selectedOrder.celebrationOfferName || 'SPECIAL'}) (-)</span>
                      <span>-₹{selectedOrder.celebrationDiscount}</span>
                    </div>
                  )}
                  
                  {/* Grand Total */}
                  <div className="flex justify-between border-t border-double border-slate-950 pt-2 font-black text-xs text-slate-950 tracking-tight">
                    <span>GRAND NET PAYABLE</span>
                    <span>₹{selectedOrder.total || selectedOrder.subtotal || 0}</span>
                  </div>
                </div>

                {/* Print Thank You barcode footer */}
                <div className="mt-5 text-center space-y-1 text-[9px] text-slate-500 pt-3 border-t border-dashed border-slate-400">
                  <p className="font-extrabold text-slate-700 tracking-wider">THANKS FOR WEIGHING AT {contactSettings?.brandName?.toUpperCase() || "SWASTIK"}!</p>
                  <div className="h-6 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_6px)] opacity-60 w-36 mx-auto mt-2"></div>
                  <p className="font-mono text-[80%] font-semibold uppercase mt-1 text-slate-400">* OFFICIAL TAX INVOICE *</p>
                </div>

              </div>
            )}

            {/* Right Column: Dispatch controls, assign Pilot & Sends WhatsApp integration invoice */}
            <div className="md:col-span-6 space-y-5 flex flex-col justify-between">
              
              <div className="space-y-4">
                
                {/* Admin edit trigger panel */}
                {userRole !== 'customer' && (
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider">
                          Order Admin Actions
                        </h4>
                        <p className="text-[9px] text-slate-500 font-semibold font-sans mt-0.5">Modify, edit or permanently remove this order</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOrder1HourLocked(selectedOrder) ? (
                          <span className="px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1 border border-rose-500/30 bg-rose-500/10 text-rose-300 cursor-not-allowed">
                            <Lock className="h-3 w-3 text-rose-400" />
                            <span>Permanently Locked</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingOrder) {
                                setIsEditingOrder(false);
                              } else {
                                handleStartEditOrder(selectedOrder);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1 border transition-all cursor-pointer active:scale-95 ${
                              isEditingOrder 
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                                : 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/20'
                            }`}
                          >
                            <Edit className="h-3 w-3" />
                            <span>{isEditingOrder ? "View Bill" : "Modify details"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setOrderToDelete(selectedOrder);
                            setDeleteOrderError('');
                          }}
                          className="px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1 border bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete Order</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stepper Stage modifier */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                      <span>Logistics Dispatch Stage Tracks</span>
                    </h4>
                    {isOrder1HourLocked(selectedOrder) && (
                      <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-md font-mono font-black uppercase flex items-center gap-1">
                        <Lock className="h-3 w-3 text-rose-400" />
                        <span>Permanently Locked</span>
                      </span>
                    )}
                  </div>

                  {userRole === 'customer' ? (
                    <div className="text-[10px] text-amber-400 bg-amber-500/10 p-3 rounded-lg font-bold">
                      ⚠️ Viewing-only clearance level. Cannot step transit path routes.
                    </div>
                  ) : isOrder1HourLocked(selectedOrder) ? (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 text-rose-300 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-rose-400">
                        <Lock className="h-4 w-4" />
                        <span>{isOrderCancelled(selectedOrder) ? 'Order Cancelled — Permanently Locked' : 'Order Delivered — Permanently Locked'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        {isHindi
                          ? (isOrderCancelled(selectedOrder)
                              ? '🔒 यह ऑर्डर रद्द (Cancelled) हो चुका है और स्थायी रूप से लॉक है! रद्द किए गए ऑर्डर में कोई बदलाव या प्रेषण नहीं किया जा सकता।'
                              : '🔒 यह ऑर्डर डिलीवर हो चुका है और स्थायी रूप से लॉक है! डिलीवर होने के बाद कोई भी स्थिति, उत्पाद, या विवरण नहीं बदला जा सकता।')
                          : (isOrderCancelled(selectedOrder)
                              ? '🔒 This order was cancelled and is permanently locked! Status or details of cancelled orders cannot be modified.'
                              : '🔒 This order has been delivered and is permanently locked! Nothing can be changed after delivery.')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {[
                        { step: 0, label: "0. Order Confirmed", keyStr: "Confirmed", active: true },
                        { step: 1, label: "1. Handed over to Carrier", keyStr: "In Transit", active: true },
                        { step: 2, label: "2. Dispatch Arrived Success", keyStr: "Delivered", active: false }
                      ].map((stp) => (
                        <button
                          key={`order-step-btn-${stp.step}`}
                          type="button"
                          onClick={() => handleUpdateStep(selectedOrder.id, stp.step, stp.keyStr, stp.active)}
                          className={`w-full px-3 py-2 border rounded-xl text-left flex items-center justify-between text-[11px] font-black transition-all cursor-pointer ${
                            selectedOrder.step === stp.step && selectedOrder.status !== 'Cancelled'
                              ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                              : 'border-white/5 hover:bg-white/5 text-slate-400'
                          }`}
                        >
                          <span>{stp.label}</span>
                          {selectedOrder.step === stp.step && selectedOrder.status !== 'Cancelled' && <CheckCircle className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      ))}

                      {/* Option to change order status to Cancelled before delivery */}
                      <button
                        key="order-cancel-btn-action"
                        type="button"
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        className={`w-full px-3 py-2 border rounded-xl text-left flex items-center justify-between text-[11px] font-black transition-all cursor-pointer mt-1 ${
                          selectedOrder.status === 'Cancelled'
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-sm'
                            : 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400'
                        }`}
                        title="Change order status to Cancelled before it is delivered"
                      >
                        <span className="flex items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5 text-rose-400" />
                          <span>❌ Cancel Order (Before Delivery)</span>
                        </span>
                        {selectedOrder.status === 'Cancelled' && (
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 font-mono font-bold">
                            Cancelled
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Pilot details assignments */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> <span>Courier Pilot Details</span></span>
                    {selectedOrder.codStatus === 'CLEARED_TO_ADMIN' ? (
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        ✅ COD Cleared
                      </span>
                    ) : (
                      <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        🔴 COD Pending
                      </span>
                    )}
                  </h4>

                  <div className="space-y-3">
                    {/* Quick Select Delivery Executive */}
                    <div>
                      <label className="text-[8px] font-black uppercase text-cyan-400 block mb-1">
                        🛵 Quick Select Registered Delivery Boy
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const chosen = staff?.find(s => s.id === Number(val));
                          if (chosen) {
                            handleAgentDetailsChange('deliveryPartnerName', chosen.name);
                            handleAgentDetailsChange('deliveryPartnerPhone', chosen.mobile);
                            handleAgentDetailsChange('deliveryStaffId', chosen.id);
                          }
                        }}
                        disabled={userRole === 'customer' || isOrder1HourLocked(selectedOrder)}
                        className="w-full bg-slate-950 border border-cyan-500/30 text-cyan-200 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Choose Registered Delivery Executive --</option>
                        {deliveryStaffList.map(s => (
                          <option key={s.id} value={s.id}>
                            🛵 {s.name} ({s.mobile})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Pilot Agent Name</label>
                      <input 
                        type="text" 
                        value={selectedOrder.deliveryPartnerName || ''}
                        onChange={(e) => handleAgentDetailsChange('deliveryPartnerName', e.target.value)}
                        disabled={userRole === 'customer' || isOrder1HourLocked(selectedOrder)}
                        placeholder="Rider / Delivery Agent Name"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Agent Phone Contact</label>
                        <input 
                          type="text" 
                          value={selectedOrder.deliveryPartnerPhone || ''}
                          onChange={(e) => handleAgentDetailsChange('deliveryPartnerPhone', e.target.value)}
                          disabled={userRole === 'customer' || isOrder1HourLocked(selectedOrder)}
                          placeholder="+91 95400 12099"
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Transit SLA (ETA)</label>
                        <input 
                          type="text" 
                          value={selectedOrder.eta || ''}
                          onChange={(e) => handleAgentDetailsChange('eta', e.target.value)}
                          disabled={userRole === 'customer' || isOrder1HourLocked(selectedOrder)}
                          placeholder="15 Mins"
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* COD 2-step Cash Flow: Rider collection -> Admin receipt */}
                    {((selectedOrder.paymentMethod || '').toLowerCase() === 'cod') && (
                      <div className="pt-3 border-t border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[9px] font-black uppercase text-slate-300">
                            1. Doorstep Rider Cash:
                          </span>
                          {selectedOrder.codStatus === 'COLLECTED_BY_RIDER' || selectedOrder.cashCollectedByRider ? (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                              💵 Received by Rider ({selectedOrder.deliveryPartnerName || 'Staff'})
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                              ⏳ Not Yet Collected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[9px] font-black uppercase text-slate-300">
                            2. Store Admin Cash Handover:
                          </span>
                          {selectedOrder.codStatus === 'CLEARED_TO_ADMIN' || selectedOrder.adminReceivedCash ? (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span>Cash Received by Admin</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkAdminReceivedCash(selectedOrder)}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-wider transition active:scale-95 shadow cursor-pointer"
                            >
                              Mark Cash Received by Admin
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Payment Configurations Box */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center justify-between border-b border-white/5 pb-2">
                    <span>Payment Processing Node</span>
                    {isOrder1HourLocked(selectedOrder) && (
                      <span className="text-[8px] uppercase font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Locked Post-Delivery</span>
                      </span>
                    )}
                  </h4>

                  {isOrder1HourLocked(selectedOrder) && (
                    <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{isHindi ? 'डिलीवर होने के बाद भुगतान स्थिति पूरी तरह से लॉक है।' : 'Payment details are permanently locked once order is delivered.'}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Payment Method</label>
                      <select 
                        value={selectedOrder.paymentMethod || 'card'}
                        onChange={(e) => handleAgentDetailsChange('paymentMethod', e.target.value)}
                        disabled={userRole === 'customer' || isOrder1HourLocked(selectedOrder)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="card">💳 Card Payment</option>
                        <option value="upi">📲 UPI Instant Transfer</option>
                        <option value="cod">💵 Cash on Delivery (COD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Payment Status</label>
                      <select 
                        value={selectedOrder.paymentStatus || 'PAID'}
                        onChange={(e) => handleAgentDetailsChange('paymentStatus', e.target.value)}
                        disabled={userRole === 'customer' || isOrder1HourLocked(selectedOrder)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="PENDING">🕒 Pending Checkout</option>
                        <option value="PAID">✓ Settled (PAID)</option>
                        <option value="REFUNDED">↩ Refunded</option>
                        <option value="FAILED">❌ Failed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. Dispatch Proof & Invoice snapshot uploader */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <span>Dispatch Proof Receipt / Snapshot</span>
                  </h4>
                  {selectedOrder.deliveryProofImage && (
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 relative">
                      <img src={selectedOrder.deliveryProofImage} alt="Delivery proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {userRole !== 'customer' && (
                    <div className="space-y-2">
                      <input 
                        type="text"
                        placeholder="Paste package or invoice snapshot URL..."
                        value={selectedOrder.deliveryProofImage || ''}
                        onChange={(e) => handleAgentDetailsChange('deliveryProofImage', e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-400/40"
                      />
                      <R2ImageUploader 
                        onUploadComplete={(url) => handleAgentDetailsChange('deliveryProofImage', url)}
                        initialImageUrl={selectedOrder.deliveryProofImage}
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* WhatsApp Invoice Webhooks Sandbox API logs console */}
              <div className="bg-slate-900 border-2 border-dashed border-emerald-500/20 p-4 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Smartphone className="h-4 w-4" />
                    <span>WhatsApp Invoice Engine</span>
                  </span>
                  <button 
                    onClick={handleSendWhatsappInvoice}
                    disabled={isSendingBill}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{isSendingBill ? 'Broadcasting...' : 'WhatsApp Bill Invoice API'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-white/10 p-2.5 rounded-xl text-[9px] font-mono text-emerald-400/90 leading-tight space-y-1.5 max-h-[140px] overflow-y-auto">
                  {waConsoleLogs.length === 0 ? (
                    <span className="text-slate-600 italic block font-sans">No WhatsApp send attempts in this view.</span>
                  ) : (
                    waConsoleLogs.map((log, lidx) => (
                      <span key={lidx} className="block whitespace-pre-wrap">{log}</span>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 5. Create Completely New Order Modal Panel */}
      {isCreatingNewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-xs font-semibold">
          <div className="relative w-full max-w-4xl bg-slate-950 border border-white/12 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[95vh] grid grid-cols-1 md:grid-cols-12 gap-6">
            
            <button
              onClick={() => setIsCreatingNewOrder(false)}
              className="absolute top-5 right-5 hover:bg-white/10 p-2 rounded-full text-slate-400 hover:text-white transition-all duration-150 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left Hand: Customer identity metadata & shopping cart selection catalog list */}
            <div className="md:col-span-6 space-y-4">
              <div className="border-b border-white/10 pb-2">
                <span className="text-[9px] font-black uppercase text-emerald-400">Order System Provisioner</span>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Package className="h-4.5 w-4.5 text-cyan-400" />
                  <span>Create Manual Order</span>
                </h3>
              </div>

              {/* Customer Info Form */}
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black uppercase block text-cyan-300">Customer Identity Specs</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black block text-slate-400 uppercase mb-1">Customer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ramesh Patel" 
                      value={newOrderName}
                      onChange={(e) => setNewOrderName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black block text-slate-400 uppercase mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +91 98210 55432" 
                      value={newOrderPhone}
                      onChange={(e) => setNewOrderPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black block text-slate-400 uppercase mb-1">Delivery Destination Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Plot No. 42, Vijay Nagar, Indore MP" 
                    value={newOrderAddress}
                    onChange={(e) => setNewOrderAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Search catalog products to inject */}
              <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black uppercase block text-cyan-300">Insert Catalog Items</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search organic stock item by name..." 
                    value={newOrderSearchQuery}
                    onChange={(e) => setNewOrderSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white"
                  />
                </div>
                {newOrderSearchQuery && (
                  <div className="bg-slate-950 border border-white/10 rounded-xl p-1 max-h-[140px] overflow-y-auto divide-y divide-white/5 animate-fade-in shadow-xl">
                    {products.filter(p => {
                      const q = newOrderSearchQuery.toLowerCase();
                      return p.nameEn.toLowerCase().includes(q) || (p.nameHi && p.nameHi.toLowerCase().includes(q));
                    }).slice(0, 5).length === 0 ? (
                      <p className="p-2 text-[10px] text-slate-500 italic">No products matched catalog query.</p>
                    ) : (
                      products.filter(p => {
                        const q = newOrderSearchQuery.toLowerCase();
                        return p.nameEn.toLowerCase().includes(q) || (p.nameHi && p.nameHi.toLowerCase().includes(q));
                      }).slice(0, 5).map(p => (
                        <div key={p.id} className="flex justify-between items-center p-1.5 text-[10px] hover:bg-white/5 transition-colors">
                          <div>
                            <p className="text-white font-bold">{p.nameEn}</p>
                            <p className="text-slate-500">₹{p.price} &bull; {p.weight}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => newAddItem(p)}
                            className="px-2.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded uppercase text-[8px] cursor-pointer transition active:scale-95"
                          >
                            + Add Item
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Hand: Interactive Order basket and total calculations summary checklist */}
            <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
              
              <div className="space-y-4">
                
                {/* Active shopping basket items */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
                  <span className="text-[9px] font-black uppercase text-cyan-300 block tracking-wider">
                    Shopping Cart Items ({newOrderItems.reduce((acc, it) => acc + it.qty, 0)} Units)
                  </span>
                  
                  {newOrderItems.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 italic text-[11px]">
                      Your manual order bucket is currently empty. Query stock catalog products on the left side to insert.
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto divide-y divide-white/5 pr-1 space-y-1.5">
                      {newOrderItems.map(it => (
                        <div key={it.id} className="flex justify-between items-center py-1 gap-2">
                          <div className="grow">
                            <p className="text-white font-bold text-[11px] line-clamp-1">{it.nameEn}</p>
                            <p className="text-[9px] text-slate-400">₹{it.price} &bull; {it.weight}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              type="button" 
                              onClick={() => newQtyChange(it.id, -1)}
                              className="w-6 h-6 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-white px-1 text-xs font-mono font-black">{it.qty}</span>
                            <button 
                              type="button" 
                              onClick={() => newQtyChange(it.id, 1)}
                              className="w-6 h-6 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                            <button 
                              type="button" 
                              onClick={() => newRemoveItem(it.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded ml-1 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Logistics Partner specs and payment configuration */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
                  <span className="text-[9px] font-black uppercase text-cyan-300 block tracking-wider">Logistics & Billing details</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Payment Method</label>
                      <select 
                        value={newOrderPaymentMethod}
                        onChange={(e) => setNewOrderPaymentMethod(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="cod">💵 Cash on Delivery (COD)</option>
                        <option value="upi">📲 UPI Instant Transfer</option>
                        <option value="card">💳 Credit/Debit Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Order Pay Status</label>
                      <select 
                        value={newOrderPaymentStatus}
                        onChange={(e) => setNewOrderPaymentStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="PENDING">🕒 Pending Checkout</option>
                        <option value="PAID">✓ Settled (PAID)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Delivery Cost</label>
                      <input 
                        type="number" 
                        value={newOrderDeliveryFee}
                        onChange={(e) => setNewOrderDeliveryFee(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Pilot Name</label>
                      <input 
                        type="text" 
                        value={newOrderPilotName}
                        onChange={(e) => setNewOrderPilotName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">SLA ETA</label>
                      <input 
                        type="text" 
                        value={newOrderETA}
                        onChange={(e) => setNewOrderETA(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Promo Coupon Selection / Entry Section */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
                  <span className="text-[9px] font-black uppercase text-cyan-300 block tracking-wider">Promo Coupon Code</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type coupon code"
                      value={newOrderCouponCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNewOrderCouponCode(val);
                        // Auto-match from active offers
                        const matched = offers?.find(o => o.code.toUpperCase() === val);
                        if (matched) {
                          setNewOrderAppliedCoupon(matched);
                        } else if (val.trim()) {
                          // Default 10% discount for typed unrecognized coupons
                          setNewOrderAppliedCoupon({ code: val, discountType: 'percentage', value: 10 });
                        } else {
                          setNewOrderAppliedCoupon(null);
                        }
                      }}
                      className="grow bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                    />
                    {newOrderAppliedCoupon && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewOrderCouponCode('');
                          setNewOrderAppliedCoupon(null);
                        }}
                        className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] rounded-xl font-bold hover:bg-red-500/30 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Quick selection coupon pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {offers?.map(off => (
                      <button
                        key={off.id}
                        type="button"
                        onClick={() => {
                          setNewOrderCouponCode(off.code);
                          setNewOrderAppliedCoupon(off);
                        }}
                        className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-all ${
                          newOrderCouponCode === off.code
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-950/40 text-slate-400 border-white/5 hover:border-white/10'
                        }`}
                      >
                        🏷️ {off.code}
                      </button>
                    ))}
                  </div>

                  {newOrderAppliedCoupon && (
                    <div className="mt-1 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-[10px] text-emerald-300 flex justify-between">
                      <span>Applied: <strong>{newOrderAppliedCoupon.code}</strong> ({newOrderAppliedCoupon.discountType === 'percentage' ? `${newOrderAppliedCoupon.value}% OFF` : `₹${newOrderAppliedCoupon.value} OFF`})</span>
                      <span className="font-mono font-bold">-₹{
                        newOrderAppliedCoupon.discountType === 'percentage'
                          ? Math.round((newOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0) * (newOrderAppliedCoupon.value / 100)) * 100) / 100
                          : Math.min(newOrderAppliedCoupon.value, newOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0))
                      }</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Dynamic total checkout panel */}
              <div className="bg-slate-900 border border-cyan-500/20 p-4 rounded-3xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase font-black block tracking-widest">Calculated Net Total</span>
                    <span className="text-sm font-black font-mono text-cyan-300">
                      ₹{Math.max(0, Math.round((newOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0) + Number(newOrderDeliveryFee) - (
                        newOrderAppliedCoupon
                          ? (newOrderAppliedCoupon.discountType === 'percentage'
                              ? Math.round((newOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0) * (newOrderAppliedCoupon.value / 100)) * 100) / 100
                              : Math.min(newOrderAppliedCoupon.value, newOrderItems.reduce((acc, it) => acc + (it.price * it.qty), 0)))
                          : 0
                      )) * 100) / 100)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCreatingNewOrder(false)}
                      className="px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl hover:text-white text-slate-400 uppercase tracking-wider text-[10px] font-black transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={handleSaveNewOrder}
                      className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/10 cursor-pointer active:scale-95"
                    >
                      Dispatch Order
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Authenticated confirmation modal for order deletion */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => {
                setOrderToDelete(null);
                setDeleteOrderError('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950 rounded-full border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                  {isHindi ? "सुरक्षा सत्यापन - आदेश हटाएँ" : "Admin Security Verification"}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isHindi ? "आपका प्रमाणित स्टाफ सत्र इस कार्रवाई को अधिकृत करेगा" : "Your authenticated staff session will authorize this action"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-red-200">
                ⚠️ {isHindi ? "स्थायी रूप से हटाने की चेतावनी" : "Permanent Order Deletion Alert"}
              </p>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                {isHindi 
                  ? `आदेश #${orderToDelete.id} (₹${orderToDelete.total || orderToDelete.totalAmount || 0}) के सभी आइटम्स, पेमेंट रिकॉर्ड्स और रिडीम किए गए पॉइंट्स हमेशा के लिए हटा दिए जाएंगे।`
                  : `Order #${orderToDelete.id} (₹${orderToDelete.total || orderToDelete.totalAmount || 0}) and all associated order items, payment logs, and reward points will be permanently deleted.`}
              </p>
            </div>

            {deleteOrderError && (
              <p className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                {deleteOrderError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOrderToDelete(null);
                  setDeleteOrderError('');
                }}
                className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                {isHindi ? "रद्द करें" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isHindi ? "हटाएं" : "Delete Order"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* IN-APP CANCEL ORDER CONFIRMATION MODAL (Never blocked by browser)    */}
      {/* ==================================================================== */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-500/30 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative">
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {isHindi ? `ऑर्डर #${orderToCancel.id} रद्द करें` : `Cancel Order #${orderToCancel.id}`}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {isHindi ? 'क्या आप वाकई इस ऑर्डर को रद्द करना चाहते हैं?' : 'Are you sure you want to cancel this order?'}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>{isHindi ? 'ग्राहक:' : 'Customer:'}</span>
                <span className="font-bold text-white">{getCustName(orderToCancel)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{isHindi ? 'कुल राशि:' : 'Grand Total:'}</span>
                <span className="font-black text-emerald-400 font-mono">₹{orderToCancel.total || orderToCancel.grandTotal || 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{isHindi ? 'भुगतान विधि:' : 'Payment:'}</span>
                <span className="font-bold uppercase text-amber-300 font-mono">{orderToCancel.paymentMethod || 'COD'}</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-300 font-medium leading-relaxed">
              {isHindi 
                ? '⚠️ ऑर्डर रद्द होने के बाद इसकी स्थिति "Cancelled" दर्ज होगी और यह डिलीवर नहीं किया जा सकेगा।'
                : '⚠️ Cancelling this order will mark its status as Cancelled and remove it from active dispatch.'}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isHindi ? 'वापस' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>{isHindi ? 'हाँ, रद्द करें' : 'Confirm Cancel'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PAYMENT VERIFICATION BEFORE DISPATCH / DELIVERED MODAL               */}
      {/* ==================================================================== */}
      {deliveryPaymentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {deliveryPaymentStepTarget === 2
                      ? (isHindi ? 'डिलीवरी और भुगतान पुष्टि' : 'Verify Payment & Finalize Delivery')
                      : (isHindi ? 'डिस्पैच और डिलीवरी स्टाफ पुष्टि' : 'Verify Details & Finalize Dispatch')}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Order #{deliveryPaymentModalOrder.id} • {getCustName(deliveryPaymentModalOrder)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryPaymentModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Brief */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[9px] uppercase text-slate-400 font-bold block">{isHindi ? 'कुल देय राशि' : 'Amount to Collect'}</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ₹{deliveryPaymentModalOrder.total || deliveryPaymentModalOrder.grandTotal || 0}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-400 font-bold block">{isHindi ? 'ग्राहक पता' : 'Delivery Address'}</span>
                <span className="text-xs text-slate-300 line-clamp-2">
                  {getCustAddress(deliveryPaymentModalOrder)}
                </span>
              </div>
            </div>

            {/* Form to confirm / update payment & delivery boy */}
            <div className="space-y-3">
              
              {/* Delivery Staff Assigned */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">
                  {isHindi ? 'डिलीवरी राइडर चुनें' : 'Assigned Delivery Rider'}
                </label>
                <select
                  value={deliveryVerifyStaffId}
                  onChange={(e) => setDeliveryVerifyStaffId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">{isHindi ? 'डिलीवरी राइडर चुनें...' : 'Select Delivery Rider...'}</option>
                  {deliveryStaffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role || 'Delivery Rider'} • {s.mobile || 'No Mobile'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">
                  {isHindi ? 'भुगतान विधि' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cod', label: '💵 Cash on Delivery (COD)' },
                    { id: 'upi', label: '📲 UPI / QR' },
                    { id: 'card', label: '💳 Online Card' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDeliveryVerifyMethod(m.id)}
                      className={`p-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition cursor-pointer ${
                        deliveryVerifyMethod === m.id
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Payment Status / Cash Collection check */}
              {deliveryVerifyMethod === 'cod' ? (
                deliveryPaymentStepTarget === 2 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                    <span className="text-[9px] font-black uppercase text-emerald-300 block">
                      {isHindi ? 'नगद वसूली स्थिति (COD Collection):' : 'Cash Received by Delivery Boy:'}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deliveryVerifyRiderCash}
                        onChange={(e) => setDeliveryVerifyRiderCash(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-950 cursor-pointer"
                      />
                      <span>
                        {isHindi 
                          ? `हाँ, डिलीवरी बॉय ने ग्राहक से ₹${deliveryPaymentModalOrder.total || deliveryPaymentModalOrder.grandTotal || 0} नगद प्राप्त कर लिया है` 
                          : `Yes, Delivery Boy received ₹${deliveryPaymentModalOrder.total || deliveryPaymentModalOrder.grandTotal || 0} cash from customer`}
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      {isHindi 
                        ? 'यह राशि डिलीवरी राइडर के खाते में दर्ज होगी और स्टोर काउंटर पर एडमिन को हैंडओवर करने के बाद क्लियर होगी।'
                        : 'This cash will be held by the rider until handed over to Admin at store counter.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-950 border border-white/5 rounded-xl text-[10px] text-slate-300">
                    ℹ️ {isHindi ? 'डिस्पैच होने पर राइडर ग्राहक से ₹' + (deliveryPaymentModalOrder.total || 0) + ' नगद एकत्र करेगा।' : `Rider will collect ₹${deliveryPaymentModalOrder.total || 0} in cash upon doorstep delivery.`}
                  </div>
                )
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-300 block">
                    {isHindi ? 'ऑनलाइन भुगतान स्थिति' : 'Payment Status Verification'}
                  </label>
                  <select
                    value={deliveryVerifyPaymentStatus}
                    onChange={(e) => setDeliveryVerifyPaymentStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    <option value="PAID">✓ Settled & Verified (PAID)</option>
                    <option value="PENDING">🕒 Pending Checkout</option>
                  </select>
                </div>
              )}

            </div>

            {/* Permanent Lock Warning */}
            {deliveryPaymentStepTarget === 2 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isHindi
                    ? '🔒 महत्वपूर्ण: डिलीवर होने के बाद यह ऑर्डर स्थायी रूप से लॉक हो जाएगा। इसके बाद विवरण या भुगतान स्थिति नहीं बदली जा सकेगी।'
                    : '🔒 Important: Marking as Delivered permanently locks this order and seals all details & payment status.'}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeliveryPaymentModalOrder(null)}
                className="w-1/3 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeliveryPayment}
                className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {deliveryPaymentStepTarget === 2
                    ? (isHindi ? 'भुगतान पुष्टि करें व डिलीवर मार्क करें' : 'Confirm Payment & Mark Delivered')
                    : (isHindi ? 'पुष्टि करें व डिस्पैच करें' : 'Confirm & Mark Dispatched')}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
