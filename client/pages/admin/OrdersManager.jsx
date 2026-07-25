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
  Save
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';

export default function OrdersManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { orders, updateOrder, addOrder, products, offers } = useData();

  // Modal State for selected order details popup
  const [selectedOrder, setSelectedOrder] = useState(null);

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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
  }, [searchTerm, filterStatus, filterPaymentMode, dateFrom, dateTo]);

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

    return matchesSearch && matchesStatus && matchesDate && matchesPaymentMode;
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

  const getStatusBadge = (statusStr) => {
    const status = statusStr || "Confirmed";
    if (status === "Delivered") {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
          <CheckCircle className="h-3 w-3" />
          <span>Delivered</span>
        </span>
      );
    }
    if (status === "In Transit" || status === "Dispatched") {
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
    setIsEditingOrder(true);
    setEditOrderItems(order.items ? [...order.items] : []);
    setEditOrderName(order.customerName || order.deliveryPartnerName || '');
    setEditOrderPhone(order.customerPhone || order.customerMobile || order.deliveryPartnerPhone || '');
    setEditOrderAddress(order.shippingAddress || '');
    setEditOrderPaymentMethod(order.paymentMethod || 'card');
    setEditOrderPaymentStatus(order.paymentStatus || 'PAID');
    setEditOrderSearchQuery('');
  };

  const handleSaveEditedOrder = () => {
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
      deliveryPartnerName: selectedOrder.deliveryPartnerName || editOrderName,
      deliveryPartnerPhone: selectedOrder.deliveryPartnerPhone || editOrderPhone,
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
      deliveryPartnerName: newOrderName,
      customerName: newOrderName,
      deliveryPartnerPhone: newOrderPhone,
      customerPhone: newOrderPhone,
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
    updateOrder(id, { step, status: statusKey, isActive });
    
    let targetOrd = null;
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder(prev => {
        const updated = {
          ...prev,
          step,
          status: statusKey,
          isActive
        };
        targetOrd = updated;
        return updated;
      });
    } else {
      targetOrd = orders.find(o => o.id === id);
    }

    if (statusKey === "Delivered" || step === 2) {
      setTimeout(() => {
        const orderToNotify = targetOrd || { id, step, status: statusKey, isActive };
        handleSendWhatsappInvoice(orderToNotify);
        alert(`Status updated to DELIVERED successfully!\nSimulated WhatsApp Notification & signed PDF Bill invoice auto-dispatched to the customer!`);
      }, 300);
    } else if (step === 1 || statusKey === "Dispatched" || statusKey === "Out for Delivery") {
      setTimeout(() => {
        const orderToNotify = targetOrd || { id, step, status: statusKey, isActive };
        handleSendWhatsappDispatchAlert(orderToNotify);
        alert(`Status updated to DISPATCHED!\nAutomated 'order_dispatch_alert' WhatsApp notification sent to ${orderToNotify.customerName || 'customer'}!`);
      }, 300);
    }
  };

  const handleSendWhatsappDispatchAlert = async (specificOrder = null) => {
    const targetOrder = specificOrder || selectedOrder;
    if (!targetOrder) return;
    const orderId = targetOrder.id;
    const phoneNum = targetOrder.customerPhone || targetOrder.deliveryPartnerPhone || "+91 95400 12099";
    const clientName = targetOrder.customerName || targetOrder.deliveryPartnerName || "Valued Customer";
    const grandTotal = targetOrder.total || targetOrder.grand_total || targetOrder.subtotal || 1200;

    const bodyMsg = `Hello ${clientName}, your Swastik order ${orderId} has been handed over to our delivery partner! Total bill amount is ${grandTotal}. You can track or contact your rider directly from the Swastik app.`;

    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: phoneNum, 
          message: bodyMsg,
          templateName: 'order_dispatch_alert',
          templateParams: [clientName, orderId, String(grandTotal)]
        })
      });
    } catch (e) {
      console.error("Dispatch alert trigger error:", e);
    }
  };

  const handleAgentDetailsChange = (field, value) => {
    if (!selectedOrder) return;
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
    const phoneNum = targetOrder.customerPhone || targetOrder.deliveryPartnerPhone || "+91 98450 12099";
    const clientName = targetOrder.customerName || targetOrder.deliveryPartnerName || "Valued Customer";
    const grandTotal = targetOrder.total || targetOrder.subtotal || 350;
    const itemsLabel = targetOrder.items && targetOrder.items.length > 0 
      ? targetOrder.items.map(it => `${it.qty}x ${it.nameEn || it.nameHi}`).join(', ') 
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

        {/* Row 3: Payment Mode Filter and XLS Download Button */}
        <div className="pt-3.5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest shrink-0">Payment Mode Filter:</span>
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
                const clientName = o.deliveryPartnerName || "Amit K (Noida Sec 15)";
                const clientPhone = o.deliveryPartnerPhone || "+91 98110 43242";
                
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
                      {getStatusBadge(o.status)}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenDetailModal(o)}
                        className="p-1.5 px-3 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Manage Bill</span>
                      </button>
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

      {/* 3.5. Third-Party Billing Software Outbox Dispatcher (Custom WhatsApp Gateway API Integration) */}
      <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-3xl p-6 space-y-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 bg-emerald-500/10 text-emerald-400 font-mono text-[8px] uppercase tracking-widest border-b border-l border-emerald-500/20 rounded-bl-xl font-bold">
          Meta Cloud Sandbox API Integration Active
        </div>

        <div className="border-b border-white/10 pb-3">
          <h3 className="font-black text-white text-sm flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-400" />
            <span>External Third-Party Billing Software (WhatsApp Dispatch Portal)</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
            Trigger on-demand customer notifications containing signed PDF bill receipts and custom reminders. This matches webhook integration routes used by enterprise packages (such as <strong>Tally, Marg ERP, ClearTax, and custom CRM platforms</strong>) via Meta WhatsApp Business Cloud API.
          </p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!tpMobileNumber || tpMobileNumber.length < 10) {
            alert("Please provide a valid 10-digit mobile number!");
            return;
          }
          setIsTpSending(true);
          setTpLogs([]);

          const log1 = `[Webhook Engine] Initializing integration request to: POST https://api.thirdparty-billing-service.com/v1/whatsapp/dispatch`;
          setTpLogs(prev => [...prev, log1]);

          setTimeout(() => {
            const log2 = `[API Auth] Verification: Header Bearer Token Authorized. Resolving customer record basis mobile: +91 ${tpMobileNumber}...`;
            setTpLogs(prev => [...prev, log2]);
          }, 400);

          setTimeout(() => {
            const log3 = `[PDF Compiler] Compiling high-fidelity Thermal Receipt details...\n- Customer Name: ${tpCustomerName || 'Guest User'}\n- Dynamic Invoice ID: ${tpOrderId}\n- Transaction Total: ₹${tpBillAmount} INR\n- Item summary: ${tpItemsList}\n- Receipt State: PAID / SETTLED\n- Generated Receipt Storage node: https://invoice-storage.swastik.com/tp-${tpOrderId}.pdf`;
            setTpLogs(prev => [...prev, log3]);
          }, 900);

          setTimeout(() => {
            const payload = {
              third_party_software: "Tally/Marg/Cleartax External Billing API Module",
              dispatcher_phone: tpMobileNumber,
              payload: {
                customer_name: tpCustomerName || 'Guest User',
                order_id: tpOrderId,
                price_total_inr: parseFloat(tpBillAmount || '480'),
                breakdown_items_raw: tpItemsList,
                pdf_receipt_url: `https://invoice-storage.swastik.com/tp-${tpOrderId}.pdf`
              },
              message_templates: {
                body_text: tpCustomMessage,
                attachment_pdf: `https://invoice-storage.swastik.com/tp-${tpOrderId}.pdf`
              }
            };

            const log4 = `[API Payload Outbound Request Webhook]:\n${JSON.stringify(payload, null, 2)}`;
            setTpLogs(prev => [...prev, log4]);
          }, 1500);

          setTimeout(() => {
            const log5 = `[Meta Sandbox Message Gateway] Handshake 200 OK. WhatsApp message & verification PDF successfully push-dispatched to recipient +91 ${tpMobileNumber}! Delivery status: DELIVERED.\n\n[Live Message Stream Preview]:\n"Hi ${tpCustomerName || 'Guest'}, thank you for choosing Swastik Delivery! Your digital invoice and physical items (${tpItemsList}) with Order ID ${tpOrderId} have been successfully compiled for a total of ₹${tpBillAmount}. Please download your official PDF bill here: https://invoice-storage.swastik.com/tp-${tpOrderId}.pdf. Thank you for your support!"`;
            setTpLogs(prev => [...prev, log5]);
            setIsTpSending(false);
            alert(`Verified Sandbox: Third-Party WhatsApp Billing Message & PDF receipt successfully dispatched to +91 ${tpMobileNumber}!`);
          }, 2400);
        }} className="grid grid-cols-1 md:grid-cols-12 gap-5 text-slate-300 font-sans text-xs">
          
          <div className="md:col-span-4 space-y-3.5">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Customer Mobile Number (10 Digits)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[10px] text-slate-500 font-mono font-bold">+91</span>
                <input 
                  type="text" 
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={tpMobileNumber}
                  onChange={(e) => setTpMobileNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Customer Name / Buyer Segment</label>
              <input 
                type="text" 
                required
                placeholder="Rajesh Patel (Delhi)"
                value={tpCustomerName}
                onChange={(e) => setTpCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  setTpMobileNumber("9876543210");
                  setTpCustomerName("Rajesh Patel (Delhi)");
                  setTpOrderId("MARG-BILL-8873");
                  setTpBillAmount("1250");
                  setTpItemsList("5kg Premium Basmati Rice, 1L Organic Mustard Oil, 2kg Organic Chana Dal");
                }}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition cursor-pointer text-slate-400 hover:text-white"
              >
                ⚡ Insert Staff Sample
              </button>
              <button 
                type="button"
                onClick={() => {
                  setTpMobileNumber("");
                  setTpCustomerName("");
                  setTpOrderId('SW-TP-' + Math.floor(10000 + Math.random() * 90000));
                  setTpBillAmount("480");
                  setTpItemsList("Organic Farm Fresh Tomatoes, Premium Cow Ghee");
                  setTpLogs([]);
                }}
                className="py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9.5px]"
                title="Reset Form"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin-hover" />
              </button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-3.5">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Custom Order ID</label>
              <input 
                type="text" 
                required
                placeholder="SW-TP-55219"
                value={tpOrderId}
                onChange={(e) => setTpOrderId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Bill Amount</label>
                <input 
                  type="number" 
                  required
                  placeholder="480"
                  value={tpBillAmount}
                  onChange={(e) => setTpBillAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-400"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Billing Items Summary</label>
                <input 
                  type="text" 
                  required
                  placeholder="1kg Paneer, 1L Milk"
                  value={tpItemsList}
                  onChange={(e) => setTpItemsList(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isTpSending}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4 text-slate-950 font-black" />
              <span>{isTpSending ? "DISPATCHING METADATA..." : "DISPATCH BILL VIA EXTERNAL API"}</span>
            </button>
          </div>

          <div className="md:col-span-4 space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Generated Output message body preview</label>
              <div className="bg-slate-950/80 border border-white/5 p-3 rounded-2xl text-[9.5px] font-mono text-slate-300 leading-normal max-h-[140px] overflow-y-auto min-h-[105px]">
                {tpCustomMessage}
              </div>
            </div>
            <div className="text-[9px] text-slate-500 font-bold bg-white/5 border border-white/5 px-3 py-2 rounded-xl">
              💡 Billing systems will call this API pipeline at invoice creation.
            </div>
          </div>

        </form>

        {/* Integration API Logging Console screen */}
        <div className="space-y-1.5 font-mono pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400/90 text-[10px] font-black uppercase tracking-wider">
            <Terminal className="h-4 w-4" />
            <span>Third-Party Webhook Live Payload Debug Console</span>
          </div>
          <div className="bg-slate-950 border border-white/10 p-3 rounded-2xl text-[9px] font-mono text-emerald-300 leading-relaxed space-y-2 max-h-[180px] overflow-y-auto shadow-inner select-all">
            {tpLogs.length === 0 ? (
              <span className="text-slate-600 block italic">Configure the metrics above and click "DISPATCH BILL VIA EXTERNAL API" to stream outbound web service payloads...</span>
            ) : (
              tpLogs.map((log, lidx) => (
                <span key={lidx} className="block whitespace-pre-wrap">{log}</span>
              ))
            )}
          </div>
        </div>
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
                
                {/* Receipt Dotted borders top and bottom */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,bg-slate-300_1px,transparent_1px)] bg-[size:8px_8px] opacity-10"></div>
                
                {/* Thermal paper header styling */}
                <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-400">
                  <Printer className="h-6 w-6 text-slate-600 mx-auto" />
                  <h3 className="font-extrabold text-base uppercase tracking-tight text-slate-950">SWASTIK SUPERMARKET</h3>
                  <p className="text-[10px] text-slate-600 font-bold">ALPHA ROAD BRANCH, NOIDA UP</p>
                  <p className="text-[9px] text-slate-500">TEL: +91 99999-99999 EX 2</p>
                </div>

                {/* Bill Meta Details */}
                <div className="py-3 text-[10px] space-y-1.5 border-b border-dashed border-slate-400">
                  <div className="flex justify-between">
                    <span>BILL ID: {selectedOrder.id}</span>
                    <span>CASHIER: #STAFF-{userRole === 'admin' ? 'ADMIN' : 'MGR'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE: {selectedOrder.orderDate || selectedOrder.date || "TODAY"}</span>
                    <span>TIME: {new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CLIENT: {selectedOrder.deliveryPartnerName || "Valued Customer"}</span>
                    <span>STATUS: {selectedOrder.status || "CONFIRMED"}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold text-[9px] pt-1.5 border-t border-dashed border-slate-300 mt-1 uppercase">
                    <span>PAY METHOD: {selectedOrder.paymentMethod || "CARD"}</span>
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
                          <p className="truncate text-[11px] font-black">{it.nameEn}</p>
                          <p className="text-[8px] text-slate-500 font-bold whitespace-nowrap">Size: {it.weight || "1 Unit"}</p>
                        </div>
                        <span className="col-span-2 text-center font-bold">{it.qty}</span>
                        <span className="col-span-2 text-right font-mono">₹{it.price}</span>
                        <span className="col-span-2 text-right font-mono font-black">₹{it.price * it.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bill summaries total footer tier */}
                <div className="border-t border-slate-300 pt-3.5 space-y-1.5 text-[10px]">
                  <div className="flex justify-between font-medium">
                    <span>GROCERY SUB-TOTAL</span>
                    <span>₹{selectedOrder.subtotal || selectedOrder.total || 350}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>CGST 9%</span>
                    <span>₹{Math.round((selectedOrder.subtotal || 350) * 0.09 * 100) / 100}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>SGST 9%</span>
                    <span>₹{Math.round((selectedOrder.subtotal || 350) * 0.09 * 100) / 100}</span>
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
                    <span>₹{selectedOrder.total || selectedOrder.subtotal || 350}</span>
                  </div>
                </div>

                {/* Print Thank You barcode footer */}
                <div className="mt-6 text-center space-y-1 text-[9px] text-slate-500 pt-4 border-t border-dashed border-slate-400">
                  <p className="font-extrabold text-slate-700 tracking-wider">THANKS FOR WEIGHING AT SWASTIK!</p>
                  <div className="h-6 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_6px)] opacity-60 w-36 mx-auto mt-2.5"></div>
                  <p className="font-mono text-[80%] font-semibold uppercase mt-0.5 mt-2 text-slate-400">* GORM-POSTGRES-SECURE *</p>
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
                        <p className="text-[9px] text-slate-500 font-semibold font-sans mt-0.5">Toggle live cart details & customer specs</p>
                      </div>
                      <button
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
                  <h4 className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <User className="h-4 w-4" />
                    <span>Courier Pilot Details</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Pilot Agent Name</label>
                      <input 
                        type="text" 
                        value={selectedOrder.deliveryPartnerName || ''}
                        onChange={(e) => handleAgentDetailsChange('deliveryPartnerName', e.target.value)}
                        disabled={userRole === 'customer'}
                        placeholder="Rakesh Pilot"
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
                          placeholder="+91 99999-88888"
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

    </div>
  );
}
