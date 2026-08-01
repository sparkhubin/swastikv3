import React, { useState } from 'react';
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
  Lock
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';
import NotificationCenter from '../../components/NotificationCenter';
import { isOrder1HourLocked, getLockTimeRemainingFormatted } from '../../utils/orderLock';

export default function OrdersManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { orders, updateOrder, deleteOrder, addOrder, products, offers, staff, contactSettings } = useData();

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

    const custName = order.customerName || order.name || "Valued Customer";
    const custPhone = order.customerPhone || order.customerMobile || order.phone || "N/A";
    const custAddress = order.shippingAddress || order.address || "Store Pickup";
    const custEmail = order.customerEmail || order.email || "N/A";

    const items = order.items || [];
    const subtotal = Number(order.subtotal || order.total || 0);
    const gst = Number(order.gst || Math.round(subtotal * 0.05));
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
          <title>Tax Invoice - #${order.id} - ${storeName}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; line-height: 1.4; }
            .invoice-box { max-width: 800px; margin: 0 auto; border: 2px solid #cbd5e1; padding: 28px; border-radius: 16px; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 18px; margin-bottom: 18px; }
            .brand-logo-title { display: flex; align-items: center; gap: 14px; }
            .brand-logo-title img { max-height: 55px; max-width: 120px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; }
            .brand-name { font-size: 22px; font-weight: 900; color: #0284c7; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
            .store-contact { font-size: 11px; color: #475569; margin-top: 4px; font-weight: 500; }
            .invoice-heading { text-align: right; }
            .tax-badge { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .inv-no { font-size: 12px; font-weight: 800; color: #0284c7; margin-top: 4px; font-family: monospace; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
            .meta-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; }
            .card-head { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; letter-spacing: 0.5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
            .row-label { color: #64748b; font-weight: 600; }
            .row-val { color: #0f172a; font-weight: 700; word-break: break-word; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 10px; font-weight: 800; padding: 10px 12px; text-align: left; letter-spacing: 0.5px; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; }
            .summary-container { display: flex; justify-content: flex-end; }
            .summary-box { width: 320px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
            .total-row { border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; font-size: 15px; font-weight: 900; color: #0284c7; }
            .footer { margin-top: 26px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 16px; font-size: 10px; color: #64748b; }
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
                <div class="tax-badge">TAX INVOICE</div>
                <div class="inv-no">ORDER #${order.id}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                  Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-card">
                <div class="card-head">CUSTOMER DETAILS (ग्राहक जानकारी)</div>
                <div class="row"><span class="row-label">Customer Name:</span> <span class="row-val">${custName}</span></div>
                <div class="row"><span class="row-label">Mobile Number:</span> <span class="row-val">${custPhone}</span></div>
                <div class="row"><span class="row-label">Delivery Address:</span> <span class="row-val">${custAddress}</span></div>
                <div class="row"><span class="row-label">Email ID:</span> <span class="row-val">${custEmail}</span></div>
              </div>

              <div class="meta-card">
                <div class="card-head">ORDER & PAYMENT SUMMARY</div>
                <div class="row"><span class="row-label">Payment Method:</span> <span class="row-val">${order.paymentMethod || 'COD'}</span></div>
                <div class="row"><span class="row-label">Payment Status:</span> <span class="row-val" style="color:${(order.paymentStatus||'').toUpperCase()==='PAID' ? '#16a34a' : '#d97706'}">${order.paymentStatus || 'PENDING'}</span></div>
                <div class="row"><span class="row-label">Order Status:</span> <span class="row-val">${order.status || 'CONFIRMED'}</span></div>
                <div class="row"><span class="row-label">Assigned Rider:</span> <span class="row-val">${order.deliveryPartnerName || 'Swastik Rider'} (${order.deliveryPartnerPhone || '+91 95400 12099'})</span></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Name</th>
                  <th>Weight/Size</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Unit Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((it, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><b>${it.nameEn || it.nameHi || it.name || 'Grocery Item'}</b></td>
                    <td>${it.weight || it.unit || '1 Unit'}</td>
                    <td style="text-align:center;"><b>${it.qty || it.quantity || 1}</b></td>
                    <td style="text-align:right;">₹${it.price || 0}</td>
                    <td style="text-align:right; font-weight:800;">₹${(it.price || 0) * (it.qty || it.quantity || 1)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-container">
              <div class="summary-box">
                <div class="summary-row"><span class="row-label">Subtotal:</span> <span class="row-val">₹${subtotal}</span></div>
                <div class="summary-row"><span class="row-label">GST Tax:</span> <span class="row-val">₹${gst}</span></div>
                <div class="summary-row"><span class="row-label">Delivery Fee:</span> <span class="row-val">${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
                ${referralDiscount > 0 ? `<div class="summary-row" style="color:#d97706;"><span class="row-label">Referral Discount:</span> <span class="row-val">-₹${referralDiscount}</span></div>` : ''}
                ${couponDiscount > 0 ? `<div class="summary-row" style="color:#16a34a;"><span class="row-label">Coupon Discount:</span> <span class="row-val">-₹${couponDiscount}</span></div>` : ''}
                ${celebrationDiscount > 0 ? `<div class="summary-row" style="color:#9333ea;"><span class="row-label">Celebration Discount:</span> <span class="row-val">-₹${celebrationDiscount}</span></div>` : ''}
                
                <div class="summary-row total-row">
                  <span>Grand Total:</span>
                  <span>₹${grandTotal}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p style="font-weight: 800; color: #0284c7; margin-bottom: 4px;">THANK YOU FOR SHOPPING AT ${storeName.toUpperCase()}!</p>
              <p>This is an official computer-generated tax invoice. Goods once sold are backed by our 100% Quality & Freshness Guarantee.</p>
              <p style="font-size: 9px; font-family: monospace; color: #94a3b8; margin-top: 6px;">STORE HELPLINE: ${storePhone} | WEBSITE: SWASTIKSUPERMARKET.COM</p>
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

  // Security Password Modal State for Order Deletion
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');

  const handleConfirmDeleteOrder = () => {
    if (!orderToDelete) return;

    if (isOrder1HourLocked(orderToDelete)) {
      setDeletePasswordError(isHindi 
        ? "🔒 यह ऑर्डर डिलीवर होने के 1 घंटे बाद पूरी तरह लॉक है! इसे डिलीट नहीं किया जा सकता।" 
        : "🔒 This order was delivered over 1 hour ago and is permanently locked! Deletion is disabled.");
      return;
    }

    const pwd = deleteAdminPassword.trim();
    if (!pwd) {
      setDeletePasswordError(isHindi ? "कृपया एडमिन पासवर्ड दर्ज करें!" : "Please enter admin password!");
      return;
    }

    const isMasterAdmin = pwd === 'admin123';
    const isStaffValid = (staff || []).some(s => s.password === pwd);

    if (!isMasterAdmin && !isStaffValid) {
      setDeletePasswordError(isHindi ? "❌ अमान्य एडमिन पासवर्ड! आदेश नहीं हटाया जा सका।" : "❌ Incorrect Admin Password! Access Denied.");
      return;
    }

    deleteOrder(orderToDelete.id);

    if (selectedOrder && (selectedOrder.id === orderToDelete.id || String(selectedOrder.id) === String(orderToDelete.id))) {
      setSelectedOrder(null);
    }

    setOrderToDelete(null);
    setDeleteAdminPassword('');
    setDeletePasswordError('');
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
          "Customer Name": o.customerName || 'Swastik Customer',
          "Customer Phone": o.customerPhone || 'N/A',
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
    const matchesStatus = filterStatus === 'All' || (o.status || "Confirmed") === filterStatus;

    // 3. Date range match
    const matchesDate = isWithinDateRange(o.orderDate || o.date || new Date().toISOString());

    // 4. Payment Mode Match
    const matchesPaymentMode = filterPaymentMode === 'All' ||
      (filterPaymentMode === 'COD' && o.paymentMethod === 'COD') ||
      (filterPaymentMode === 'CASHFREE_ONLINE' && (o.paymentMethod === 'CASHFREE_ONLINE' || o.paymentMethod === 'ONLINE'));

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
    setEditOrderName(order.customerName || order.name || '');
    setEditOrderPhone(order.customerPhone || order.customerMobile || order.phone || '');
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

    const orderPayload = {
      id: newId,
      customerName: newOrderName,
      customerPhone: newOrderPhone,
      deliveryPartnerName: newOrderPilotName || "Pradeep Kumar",
      deliveryPartnerPhone: newOrderPilotPhone || "+91 98101 20299",
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
      if (isOrder1HourLocked(existingOrder)) {
        alert(isHindi 
          ? '🔒 यह ऑर्डर डिलीवर होने के 1 घंटे बाद पूरी तरह लॉक हो चुका है! एडमिन व स्टाफ दोनों के लिए स्थिति या विवरण बदलना बंद है। केवल भुगतान विवरण ही अपडेट हो सकते हैं।' 
          : '🔒 This order was delivered over 1 hour ago and is permanently locked! Status or order details cannot be changed for both Admin & Staff. Only payment details can be updated.');
        return;
      }
      const targetSt = (existingOrder.status || '').toLowerCase();
      const isCurrentlyDelivered = targetSt === 'delivered' || targetSt === 'completed';
      if (isCurrentlyDelivered && userRole !== 'admin') {
        alert(isHindi ? 'डिलीवरी के बाद केवल एडमिन स्थिति बदल सकता है!' : 'Only Admin can change the status after an order is marked Delivered!');
        return;
      }
    }

    const isNowDelivered = statusKey === "Delivered" || step === 2;
    const payload = {
      step,
      status: statusKey,
      isActive,
      deliveryDate: isNowDelivered ? (existingOrder?.deliveryDate || new Date().toISOString()) : existingOrder?.deliveryDate
    };

    updateOrder(id, payload);

    const updatedOrder = existingOrder 
      ? { ...existingOrder, ...payload }
      : { id, ...payload };

    if (selectedOrder && String(selectedOrder.id) === String(id)) {
      setSelectedOrder(updatedOrder);
    }

    if (statusKey === "Delivered" || step === 2) {
      setTimeout(() => {
        handleSendWhatsappInvoice(updatedOrder);
        alert(`Status updated to DELIVERED successfully!\nSimulated WhatsApp Notification & signed PDF Bill invoice auto-dispatched to the customer!`);
      }, 300);
    } else if (step === 1 || statusKey === "Dispatched" || statusKey === "Out for Delivery") {
      setTimeout(() => {
        handleSendWhatsappDispatchAlert(updatedOrder);
        alert(`Status updated to DISPATCHED!\nAutomated 'order_dispatch_alert' WhatsApp notification sent to ${updatedOrder.customerName || 'customer'}!`);
      }, 300);
    }
  };

  const handleSendWhatsappDispatchAlert = async (specificOrder = null) => {
    const targetOrder = specificOrder || selectedOrder;
    if (!targetOrder) return;
    const orderId = targetOrder.id;
    const phoneNum = targetOrder.customerPhone || targetOrder.customerMobile || targetOrder.phone || "+91 95400 12099";
    const clientName = targetOrder.customerName || targetOrder.name || "Valued Customer";

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
    // Default fallback phone values if not provided
    const phoneNum = targetOrder.customerPhone || targetOrder.customerMobile || targetOrder.phone || "+91 98450 12099";
    const clientName = targetOrder.customerName || targetOrder.name || "Valued Customer";

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

    const itemsLabel = targetOrder.items && targetOrder.items.length > 0 
      ? targetOrder.items.map(it => `${it.qty}x ${it.nameEn || it.nameHi || it.name}`).join(', ') 
      : 'Organic dairy & fresh farm essentials';

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
      console.warn("Falling back to local simulation:", err);
      const log3 = `[Meta-WA-Gateway] Simulated fallback payload rendered successfully:
[Message preview]: "${bodyMsg}"`;
      setWaConsoleLogs(prev => [...prev, log3]);
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
            <div className="flex bg-slate-950 border border-white/10 p-0.5 rounded-lg w-full">
              {['All', 'Confirmed', 'In Transit', 'Delivered'].map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setFilterStatus(statusKey)}
                  className={`w-full py-1 rounded text-[9px] font-extrabold uppercase transition-all ${
                    filterStatus === statusKey 
                      ? 'bg-cyan-500 text-slate-950 font-black' 
                      : 'text-slate-400 hover:text-white'
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
                  { key: 'CASHFREE_ONLINE', label: 'Cashfree Sandbox PG' }
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
                const clientName = o.customerName || o.name || "Valued Customer";
                const clientPhone = o.customerPhone || o.customerMobile || o.phone || "N/A";
                
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
                          (o.paymentMethod || 'COD').toUpperCase() === 'CASHFREE_ONLINE' || (o.paymentMethod || 'COD').toUpperCase() === 'CARD' || (o.paymentMethod || 'COD').toUpperCase() === 'UPI' || (o.paymentMethod || 'COD').toUpperCase() === 'NETBANKING'
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
                        <button
                          onClick={() => {
                            setOrderToDelete(o);
                            setDeleteAdminPassword('');
                            setDeletePasswordError('');
                          }}
                          className="p-1.5 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Delete Order (Admin Password Required)"
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNo => {
                if (totalPages > 6 && pageNo !== 1 && pageNo !== totalPages && Math.abs(pageNo - currentPage) > 1) {
                  if (pageNo === 2 || pageNo === totalPages - 1) {
                    return <span key={pageNo} className="px-1.5 select-none text-[10px]" style={{ color: '#64748b' }}>..</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNo}
                    type="button"
                    onClick={() => setCurrentPage(pageNo)}
                    className={`w-8 h-8 rounded-xl font-bold transition-all text-[11px] ${
                      currentPage === pageNo
                        ? 'bg-cyan-500 text-slate-950 font-black scale-105'
                        : 'hover:bg-white/5 text-slate-300 border border-transparent'
                    }`}
                  >
                    {pageNo}
                  </button>
                );
              })}
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
                      <span className="font-mono text-slate-900">{selectedOrder.customerName || selectedOrder.name || "Valued Customer"}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>MOBILE / PHONE:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedOrder.customerPhone || selectedOrder.customerMobile || selectedOrder.phone || "N/A"}</span>
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

                        <button
                          type="button"
                          onClick={() => {
                            setOrderToDelete(selectedOrder);
                            setDeleteAdminPassword('');
                            setDeletePasswordError('');
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
                  <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <span>Logistics Dispatch Stage Tracks</span>
                  </h4>

                  {userRole === 'customer' ? (
                    <div className="text-[10px] text-amber-400 bg-amber-500/10 p-3 rounded-lg font-bold">
                      ⚠️ Viewing-only clearance level. Cannot step transit path routes.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {[
                        { step: 0, label: "0. Order Confirmed", keyStr: "Confirmed", active: true },
                        { step: 1, label: "1. Handed over to Carrier", keyStr: "In Transit", active: true },
                        { step: 2, label: "2. Dispatch Arrived Success", keyStr: "Delivered", active: false }
                      ].map((stp) => (
                        <button
                          key={stp.step}
                          type="button"
                          onClick={() => handleUpdateStep(selectedOrder.id, stp.step, stp.keyStr, stp.active)}
                          className={`w-full px-3 py-2 border rounded-xl text-left flex items-center justify-between text-[11px] font-black transition-all cursor-pointer ${
                            selectedOrder.step === stp.step
                              ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                              : 'border-white/5 hover:bg-white/5 text-slate-400'
                          }`}
                        >
                          <span>{stp.label}</span>
                          {selectedOrder.step === stp.step && <CheckCircle className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
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
                        disabled={userRole === 'customer'}
                        className="w-full bg-slate-950 border border-cyan-500/30 text-cyan-200 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer font-bold"
                      >
                        <option value="">-- Choose Registered Delivery Executive --</option>
                        {staff?.filter(s => s.permissions?.includes('delivery') || s.name.toLowerCase().includes('delivery') || s.name.toLowerCase().includes('pilot') || s.name.toLowerCase().includes('rider')).map(s => (
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
                        disabled={userRole === 'customer'}
                        placeholder="Pradeep Kumar"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Agent Phone Contact</label>
                        <input 
                          type="text" 
                          value={selectedOrder.deliveryPartnerPhone || ''}
                          onChange={(e) => handleAgentDetailsChange('deliveryPartnerPhone', e.target.value)}
                          disabled={userRole === 'customer'}
                          placeholder="+91 95400 12099"
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Transit SLA (ETA)</label>
                        <input 
                          type="text" 
                          value={selectedOrder.eta || ''}
                          onChange={(e) => handleAgentDetailsChange('eta', e.target.value)}
                          disabled={userRole === 'customer'}
                          placeholder="15 Mins"
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Admin COD Cash Clearance Toggle */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[9px] font-bold text-slate-300">
                        COD Cash Settlement with Admin:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = selectedOrder.codStatus === 'CLEARED_TO_ADMIN' ? 'PENDING_CLEARANCE' : 'CLEARED_TO_ADMIN';
                          handleAgentDetailsChange('codStatus', nextStatus);
                          if (nextStatus === 'CLEARED_TO_ADMIN') {
                            handleAgentDetailsChange('codClearedAt', new Date().toISOString());
                          }
                        }}
                        disabled={userRole === 'customer'}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                          selectedOrder.codStatus === 'CLEARED_TO_ADMIN'
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                        }`}
                      >
                        {selectedOrder.codStatus === 'CLEARED_TO_ADMIN' ? 'Mark Pending' : 'Mark Cash Received'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Payment Configurations Box (Requirement 5) */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <span>Payment Processing Node</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Payment Method</label>
                      <select 
                        value={selectedOrder.paymentMethod || 'card'}
                        onChange={(e) => handleAgentDetailsChange('paymentMethod', e.target.value)}
                        disabled={userRole === 'customer'}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
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
                        disabled={userRole === 'customer'}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
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
                    <span className="text-slate-600 italic block font-sans">Click "WhatsApp Bill Invoice API" above to simulate Meta verified sandbox invoice outbox streams...</span>
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
                      placeholder="Type Code (e.g. SWASTIK50, FREESHIP)"
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

      {/* Admin Password Verification Modal for Order Deletion */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => {
                setOrderToDelete(null);
                setDeleteAdminPassword('');
                setDeletePasswordError('');
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
                  {isHindi ? "आदेश हटाने के लिए एडमिन पासवर्ड दर्ज करें" : "Enter admin password to permanently delete this order"}
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                {isHindi ? "एडमिन लॉगिन पासवर्ड *" : "Admin Password *"}
              </label>
              <input
                type="password"
                placeholder={isHindi ? "पासवर्ड दर्ज करें (उदा. admin123)..." : "Enter admin password (e.g. admin123)..."}
                value={deleteAdminPassword}
                onChange={(e) => {
                  setDeleteAdminPassword(e.target.value);
                  setDeletePasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmDeleteOrder();
                  }
                }}
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-red-400 transition-all font-mono"
              />
              {deletePasswordError && (
                <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1">
                  {deletePasswordError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOrderToDelete(null);
                  setDeleteAdminPassword('');
                  setDeletePasswordError('');
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

    </div>
  );
}
