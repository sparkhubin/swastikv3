import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X, 
  CreditCard, 
  Wallet, 
  Landmark, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Bike,
  Check,
  CheckCircle2,
  Coins,
  UserCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';

export default function PaymentReports({ userRole, loggedInStaff }) {
  const { isHindi } = useLanguage();
  const { orders: rawOrders = [], updateOrder, staff = [], fetchOrders, fetchStaff } = useData();

  useEffect(() => {
    fetchOrders();
    fetchStaff();
  }, [fetchOrders, fetchStaff]);

  // Retrieve logged-in staff from storage if not passed directly
  const activeStaff = useMemo(() => {
    if (loggedInStaff) return loggedInStaff;
    try {
      const saved = localStorage.getItem('swastik_logged_in_staff');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, [loggedInStaff]);

  const isOnlyDeliveryRider = userRole === 'delivery' || (activeStaff && activeStaff.permissions?.length === 1 && activeStaff.permissions[0] === 'delivery');
  const isDeliveryRider = isOnlyDeliveryRider;

  // Filter orders if delivery rider
  const orders = useMemo(() => {
    if (isOnlyDeliveryRider) {
      const riderName = activeStaff?.name || '';
      const riderMobile = (activeStaff?.mobile || '').replace(/\D/g, '').slice(-10);
      const staffId = activeStaff?.id;
      return rawOrders.filter(o => {
        const oRiderPhoneClean = (o.deliveryPartnerPhone || '').replace(/\D/g, '').slice(-10);
        const oRiderName = (o.deliveryPartnerName || '').toLowerCase();

        const isStaffIdMatch = staffId && o.deliveryStaffId === staffId;
        const isPhoneMatch = riderMobile && oRiderPhoneClean && riderMobile === oRiderPhoneClean;
        const isNameMatch = riderName && oRiderName && (
          oRiderName.includes(riderName.toLowerCase().trim()) ||
          riderName.toLowerCase().includes(oRiderName) ||
          (riderName.toLowerCase().split(' ')[0].length >= 2 && oRiderName.includes(riderName.toLowerCase().split(' ')[0]))
        );
        return isStaffIdMatch || isPhoneMatch || isNameMatch;
      });
    }
    return rawOrders;
  }, [rawOrders, userRole, activeStaff, isDeliveryRider]);

  // Top view tab: 'gateway' or 'delivery'
  const [activeReportTab, setActiveReportTab] = useState(() => isDeliveryRider ? 'delivery' : 'gateway');

  // Advanced Filter state variables (Gateway tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [payMethod, setPayMethod] = useState('All'); // All, COD, CASHFREE_ONLINE, UPI, CARD, NETBANKING
  const [payStatus, setPayStatus] = useState('All'); // All, PAID, PENDING, FAILED
  const [gatewayRider, setGatewayRider] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Delivery Staff Report state variables
  const [selectedRider, setSelectedRider] = useState('All');
  const [deliveryCodStatusFilter, setDeliveryCodStatusFilter] = useState('All'); // All, PENDING_CLEARANCE, CLEARED_TO_ADMIN
  const [deliverySearch, setDeliverySearch] = useState('');

  // Pagination states (default 50 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setPayMethod('All');
    setPayStatus('All');
    setGatewayRider('All');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSelectedRider('All');
    setDeliveryCodStatusFilter('All');
    setDeliverySearch('');
    setCurrentPage(1);
  };

  // Extract unique delivery rider names from registered staff directory (single user/staff table)
  const uniqueRiders = useMemo(() => {
    if (isDeliveryRider) {
      return [activeStaff?.name || 'Personal Account'];
    }
    // Pull registered delivery riders directly from staff directory
    const ridersFromStaff = (staff || [])
      .filter(s => 
        s.role_id === 4 || 
        (s.role && String(s.role).toLowerCase().includes('rider')) || 
        (s.role && String(s.role).toLowerCase().includes('delivery')) || 
        (s.permissions && s.permissions.includes('delivery'))
      )
      .map(s => s.name.trim())
      .filter(Boolean);

    if (ridersFromStaff.length > 0) {
      return Array.from(new Set(ridersFromStaff));
    }

    // Fallback if staff not yet loaded: only include valid staff names
    const set = new Set();
    orders.forEach(o => {
      if (o.deliveryPartnerName && !o.deliveryPartnerName.toLowerCase().includes('arun dev')) {
        set.add(o.deliveryPartnerName.trim());
      }
    });
    return Array.from(set);
  }, [orders, staff, isDeliveryRider, activeStaff]);

  // Helper to parse dates securely
  const isWithinDateRange = (orderDateStr) => {
    if (!dateFrom && !dateTo) return true;
    
    let parsedOrderDate;
    try {
      parsedOrderDate = new Date(orderDateStr);
    } catch(e) {
      parsedOrderDate = new Date();
    }

    if (isNaN(parsedOrderDate.getTime())) {
      parsedOrderDate = new Date(); // Fallback
    }

    parsedOrderDate.setHours(0, 0, 0, 0);

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (parsedOrderDate < from) return false;
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(0, 0, 0, 0);
      if (parsedOrderDate > to) return false;
    }

    return true;
  };

  // Apply visual-level dual filters for Gateway tab
  const filteredPaymentOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.deliveryPartnerName && o.deliveryPartnerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const method = (o.paymentMethod || 'COD').toUpperCase();
      let matchesMethod = true;
      if (payMethod !== 'All') {
        if (payMethod === 'COD') matchesMethod = method === 'COD';
        else if (payMethod === 'CASHFREE_ONLINE') matchesMethod = method === 'CASHFREE_ONLINE' || method === 'CARD' || method === 'UPI' || method === 'NETBANKING';
        else matchesMethod = method === payMethod;
      }

      const status = (o.paymentStatus || 'PENDING').toUpperCase();
      const matchesStatus = payStatus === 'All' || status === payStatus;

      let matchesRider = true;
      if (gatewayRider !== 'All') {
        const rName = (o.deliveryPartnerName || '').toLowerCase();
        matchesRider = rName.includes(gatewayRider.toLowerCase());
      }

      const matchesDate = isWithinDateRange(o.orderDate || o.date || new Date().toISOString());

      const orderTotal = Number(o.total || o.subtotal || 0);
      let matchesAmount = true;
      if (amountMin && orderTotal < Number(amountMin)) matchesAmount = false;
      if (amountMax && orderTotal > Number(amountMax)) matchesAmount = false;

      return matchesSearch && matchesMethod && matchesStatus && matchesRider && matchesDate && matchesAmount;
    });
  }, [orders, searchTerm, payMethod, payStatus, gatewayRider, dateFrom, dateTo, amountMin, amountMax]);

  // Apply filters for Delivery Staff tab
  const filteredDeliveryOrders = useMemo(() => {
    return orders.filter(o => {
      const isCOD = o.paymentMethod === 'COD' || o.paymentMethod === 'cod';
      const st = (o.status || '').toLowerCase();
      const isDelivered = st === 'delivered' || st === 'completed';

      // Only consider COD or doorstep orders that are delivered or completed
      if (!isCOD || !isDelivered) return false;

      // Rider filter
      if (selectedRider !== 'All') {
        const rName = (o.deliveryPartnerName || '').toLowerCase();
        if (!rName.includes(selectedRider.toLowerCase())) return false;
      }

      // COD Settlement status filter
      const codSt = o.codStatus === 'CLEARED_TO_ADMIN' ? 'CLEARED_TO_ADMIN' : 'PENDING_CLEARANCE';
      if (deliveryCodStatusFilter !== 'All' && codSt !== deliveryCodStatusFilter) return false;

      // Search filter
      if (deliverySearch.trim()) {
        const q = deliverySearch.toLowerCase();
        const matchesQ = 
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.deliveryPartnerName && o.deliveryPartnerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q));
        if (!matchesQ) return false;
      }

      // Date range filter
      if (!isWithinDateRange(o.orderDate || o.date || new Date().toISOString())) return false;

      return true;
    });
  }, [orders, selectedRider, deliveryCodStatusFilter, deliverySearch, dateFrom, dateTo]);

  // Delivery Staff Rider-wise Aggregates
  const riderAggregates = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const isCOD = o.paymentMethod === 'COD' || o.paymentMethod === 'cod';
      const st = (o.status || '').toLowerCase();
      const isDelivered = st === 'delivered' || st === 'completed';

      if (!isCOD || !isDelivered) return;

      const rName = o.deliveryPartnerName || 'Unassigned Rider';
      const rPhone = o.deliveryPartnerPhone || '';
      const amt = Number(o.total || o.grandTotal || 0);
      const isCleared = o.codStatus === 'CLEARED_TO_ADMIN';

      if (!map[rName]) {
        map[rName] = {
          riderName: rName,
          riderPhone: rPhone,
          totalDeliveredCount: 0,
          pendingCash: 0,
          clearedCash: 0,
          orderIds: [],
          pendingOrderIds: []
        };
      }

      map[rName].totalDeliveredCount++;
      map[rName].orderIds.push(o.id);
      if (isCleared) {
        map[rName].clearedCash += amt;
      } else {
        map[rName].pendingCash += amt;
        map[rName].pendingOrderIds.push(o.id);
      }
    });

    return Object.values(map).map(r => ({
      ...r,
      pendingCash: Math.round(r.pendingCash),
      clearedCash: Math.round(r.clearedCash)
    }));
  }, [orders]);

  // Delivery Overall Metrics
  const deliveryOverallMetrics = useMemo(() => {
    let totalPendingCash = 0;
    let totalClearedCash = 0;
    let totalCodOrders = 0;

    orders.forEach(o => {
      const isCOD = o.paymentMethod === 'COD' || o.paymentMethod === 'cod';
      const st = (o.status || '').toLowerCase();
      const isDelivered = st === 'delivered' || st === 'completed';

      if (!isCOD || !isDelivered) return;

      totalCodOrders++;
      const amt = Number(o.total || o.grandTotal || 0);
      if (o.codStatus === 'CLEARED_TO_ADMIN') {
        totalClearedCash += amt;
      } else {
        totalPendingCash += amt;
      }
    });

    return {
      totalPendingCash: Math.round(totalPendingCash),
      totalClearedCash: Math.round(totalClearedCash),
      totalCodOrders,
      activeRidersCount: riderAggregates.filter(r => r.pendingCash > 0).length
    };
  }, [orders, riderAggregates]);

  // Compute Statistics for filtered data (Gateway)
  const stats = useMemo(() => {
    let paidOnlineTotal = 0;
    let codReceivableTotal = 0;
    let failedTotal = 0;
    let successCount = 0;

    filteredPaymentOrders.forEach(o => {
      const amt = Number(o.total || o.subtotal || 0);
      const method = (o.paymentMethod || 'COD').toUpperCase();
      const status = (o.paymentStatus || 'PENDING').toUpperCase();

      if (status === 'PAID') {
        successCount++;
        if (method === 'COD') {
          codReceivableTotal += amt;
        } else {
          paidOnlineTotal += amt;
        }
      } else if (status === 'FAILED') {
        failedTotal += amt;
      } else {
        if (method === 'COD') {
          codReceivableTotal += amt;
        } else {
          failedTotal += amt;
        }
      }
    });

    const totalOrdersCount = filteredPaymentOrders.length;
    const successRate = totalOrdersCount > 0 ? Math.round((successCount / totalOrdersCount) * 100) : 100;

    return {
      paidOnlineTotal: Math.round(paidOnlineTotal),
      codReceivableTotal: Math.round(codReceivableTotal),
      failedTotal: Math.round(failedTotal),
      totalOrdersCount,
      successRate
    };
  }, [filteredPaymentOrders]);

  // Batch clear cash for a rider from Admin Report (Delivery Staff Cash Handover)
  const handleBatchClearRiderCash = (riderName, orderIdsToClear) => {
    if (!orderIdsToClear || orderIdsToClear.length === 0) return;

    const clearTime = new Date().toISOString();
    orderIdsToClear.forEach(id => {
      updateOrder(id, {
        codStatus: 'CLEARED_TO_ADMIN',
        adminReceivedCash: 1,
        adminCashReceivedAt: clearTime,
        codClearedAt: clearTime,
        codClearedBy: 'Admin',
        codClearanceNote: 'Settled by Admin in Delivery Reports'
      });
    });

    alert(isHindi 
      ? `✅ ${riderName} से प्राप्त नगद राशि स्टोर लेजर में एडमिन द्वारा सफलतापूर्वक दर्ज व क्लियर कर दी गई!` 
      : `✅ Received cash payment from ${riderName} recorded & cleared in store ledger successfully!`);
  };

  // Toggle single order clearance state
  const handleToggleSingleOrderClearance = (orderId, currentStatus) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const isClearing = currentStatus !== 'CLEARED_TO_ADMIN';
    const newCodStatus = isClearing ? 'CLEARED_TO_ADMIN' : 'COLLECTED_BY_RIDER';
    const clearTime = new Date().toISOString();
    updateOrder(orderId, {
      codStatus: newCodStatus,
      adminReceivedCash: isClearing ? 1 : 0,
      adminCashReceivedAt: isClearing ? clearTime : null,
      codClearedAt: isClearing ? clearTime : null,
      codClearedBy: isClearing ? 'Admin' : null,
      codClearanceNote: isClearing ? 'Marked Cleared by Admin' : 'Marked Pending by Admin'
    });
  };

  // Pagination bounds
  const activeList = activeReportTab === 'gateway' ? filteredPaymentOrders : filteredDeliveryOrders;
  const totalPages = Math.ceil(activeList.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    return activeList.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [activeList, currentPage]);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  // CSV Exporter handler
  const handleCSVDownload = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = [
      "Order ID", 
      "Customer Name", 
      "Mobile Reference", 
      "Order Date", 
      "Payment Method", 
      "Payment Status", 
      "COD Clearance Status",
      "Rider Name",
      "Gross Total (INR)"
    ];
    
    csvContent += headers.join(",") + "\n";

    activeList.forEach(o => {
      const row = [
        o.id,
        `"${(o.customerName || "Customer").replace(/"/g, '""')}"`,
        `"${o.customerPhone || ""}"`,
        `"${o.orderDate || o.date || "Today"}"`,
        `"${o.paymentMethod || "COD"}"`,
        `"${o.paymentStatus || "PENDING"}"`,
        `"${o.codStatus || "PENDING_CLEARANCE"}"`,
        `"${o.deliveryPartnerName || "Unassigned"}"`,
        Math.round(o.total || o.subtotal || 0)
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `Swastik_${activeReportTab.toUpperCase()}_Payment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white" id="payment-reports-panel">
      
      {/* 1. Sub-Tab Mode Switcher & Download Header */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-900 border border-white/10 p-5 rounded-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveReportTab('gateway'); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeReportTab === 'gateway'
                ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20 scale-105'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>{isHindi ? "गेटवे और ऑनलाइन रिपोर्ट्स" : "Gateway & Online Payments"}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveReportTab('delivery'); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeReportTab === 'delivery'
                ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20 scale-105'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Bike className="h-4 w-4 text-cyan-950" />
            <span>{isHindi ? "🛵 डिलीवरी बॉय भुगतान रिपोर्ट" : "🛵 Delivery Boy Payment & Settlement"}</span>
            {deliveryOverallMetrics.totalPendingCash > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-black animate-pulse">
                ₹{deliveryOverallMetrics.totalPendingCash}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={handleCSVDownload}
          disabled={activeList.length === 0}
          className="bg-cyan-400 hover:bg-cyan-500 disabled:opacity-45 text-slate-950 font-black rounded-xl px-4 py-2.5 text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg active:scale-95 transition-all justify-center cursor-pointer"
        >
          <Download className="h-4 w-4 stroke-[2.5]" />
          <span>{isHindi ? "रिपोर्ट डाउनलोड करें" : "Export Report (CSV)"}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* DELIVERY BOY PAYMENT & COD CLEARANCE SETTLEMENT REPORT VIEW          */}
      {/* ==================================================================== */}
      {activeReportTab === 'delivery' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Handover Destination Info Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                  {isHindi ? '📍 भौतिक नगद हैंडओवर जमा स्थान' : '📍 In-Hand COD Cash Handover Location'}
                </h4>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  {isHindi
                    ? 'डिलीवरी राइडर द्वारा ग्राहकों से एकत्र की गई सभी भौतिक नगद (COD Cash) राशि मुख्य स्टोर कैश काउंटर / एकाउंट्स डेस्क पर स्टोर मैनेजर या एडमिन को हैंडओवर करनी होगी।'
                    : 'All physical cash collected on COD deliveries must be handed over directly to the Store Manager or Admin at the Main Store Cash Counter / Account Desk.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* A. Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Pending Cash held by riders */}
            <div className="bg-gradient-to-br from-rose-950/60 to-slate-900 border border-rose-500/40 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase text-rose-300 tracking-widest flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" />
                  <span>{isHindi ? 'बकाया कैश (राउडर के पास)' : 'Cash Pending with Riders'}</span>
                </span>
                <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <AlertCircle className="h-4 w-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-black text-rose-300">₹{deliveryOverallMetrics.totalPendingCash}</h3>
                <p className="text-[8.5px] text-slate-400 mt-1 font-semibold">
                  {deliveryOverallMetrics.activeRidersCount} {isHindi ? 'राइडर्स के पास पेंडिंग है' : 'rider(s) holding un-settled COD cash'}
                </p>
              </div>
            </div>

            {/* Total Cleared Cash to Admin */}
            <div className="bg-slate-900/80 border border-emerald-500/30 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isHindi ? 'एडमिन को जमा कैश' : 'Cleared Cash to Admin'}</span>
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-black text-emerald-300">₹{deliveryOverallMetrics.totalClearedCash}</h3>
                <p className="text-[8.5px] text-slate-400 mt-1 font-semibold">
                  {isHindi ? 'एडमिन काउंटर पर प्राप्त नगद' : 'Cash verified and handed over'}
                </p>
              </div>
            </div>

            {/* Active Riders Count */}
            <div className="bg-slate-900/80 border border-white/10 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5" />
                  <span>{isHindi ? 'राइडर्स संख्या' : 'Delivery Staff Members'}</span>
                </span>
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <UserCheck className="h-4 w-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-black text-white">{riderAggregates.length}</h3>
                <p className="text-[8.5px] text-slate-400 mt-1 font-semibold">
                  {isHindi ? 'ऑन-फील्ड डिलीवरी एक्जीक्यूटिव्स' : 'Active on-duty logistics executives'}
                </p>
              </div>
            </div>

            {/* Total COD Orders */}
            <div className="bg-slate-900/80 border border-white/10 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>{isHindi ? 'कुल COD डिलीवरी' : 'Total COD Deliveries'}</span>
                </span>
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <FileText className="h-4 w-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-black text-amber-300">{deliveryOverallMetrics.totalCodOrders}</h3>
                <p className="text-[8.5px] text-slate-400 mt-1 font-semibold">
                  {isHindi ? 'नगद डिलीवरी पूर्ण ऑर्डर्स' : 'Completed doorstep COD deliveries'}
                </p>
              </div>
            </div>

          </div>

          {/* B. Rider-Wise Summary Breakdown Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-cyan-400" />
              <span>{isHindi ? 'राइडर वार पेमेंट जमा स्थिति' : 'Delivery Staff Wise Cash Balance Ledger'}</span>
            </h3>

            {riderAggregates.length === 0 ? (
              <div className="p-8 bg-slate-900 border border-white/10 rounded-2xl text-center text-xs text-slate-400 font-medium">
                No COD delivery records found in the current system.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {riderAggregates.map((r, idx) => (
                  <div key={idx} className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3 relative">
                    <div className="flex items-start justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-black">
                          <Bike className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{r.riderName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono block">{r.riderPhone || 'Mobile N/A'}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                        {r.totalDeliveredCount} {isHindi ? 'ऑर्डर्स' : 'Orders'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black uppercase text-rose-400 block">{isHindi ? 'पेंडिंग कैश' : 'Pending Cash'}</span>
                        <span className="text-base font-black font-mono text-rose-300">₹{r.pendingCash}</span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black uppercase text-emerald-400 block">{isHindi ? 'क्लियर कैश' : 'Cleared Cash'}</span>
                        <span className="text-base font-black font-mono text-emerald-300">₹{r.clearedCash}</span>
                      </div>
                    </div>

                    {r.pendingCash > 0 ? (
                      !isOnlyDeliveryRider ? (
                        <button
                          type="button"
                          onClick={() => handleBatchClearRiderCash(r.riderName, r.pendingOrderIds)}
                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{isHindi ? `₹${r.pendingCash} नगद प्राप्त करें` : `Confirm ₹${r.pendingCash} Cash Received`}</span>
                        </button>
                      ) : (
                        <div className="py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-black text-center uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>{isHindi ? `₹${r.pendingCash} स्टोर काउंटर पर एडमिन को जमा करें` : `Handover ₹${r.pendingCash} Cash at Store Counter to Admin`}</span>
                        </div>
                      )
                    ) : (
                      <div className="py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-[10px] font-extrabold text-center uppercase tracking-wider flex items-center justify-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>{isHindi ? 'सभी भुगतान क्लियर हैं' : 'All Payment Cleared'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* C. Interactive Filters for Delivery Orders */}
          <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
            
            <div className="border-b border-white/5 pb-2.5 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-cyan-400" />
                <span>{isHindi ? 'डिलीवरी भुगतान फ़िल्टर' : 'Filter Delivery Transactions'}</span>
              </span>
              <button 
                onClick={resetFilters}
                className="text-[9px] text-slate-400 font-extrabold uppercase hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
              
              {/* Rider Select Dropdown */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Select Delivery Staff</label>
                {isDeliveryRider ? (
                  <div className="w-full bg-slate-950 border border-cyan-500/30 px-3 py-2.5 rounded-xl text-xs text-cyan-300 font-bold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{activeStaff?.name || 'Personal Account'} (Your Data Only)</span>
                  </div>
                ) : (
                  <select
                    value={selectedRider}
                    onChange={(e) => { setSelectedRider(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white"
                  >
                    <option value="All">All Delivery Staff ({uniqueRiders.length})</option>
                    {uniqueRiders.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Settlement Status */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Clearance Status</label>
                <select
                  value={deliveryCodStatusFilter}
                  onChange={(e) => { setDeliveryCodStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="PENDING_CLEARANCE">🔴 Pending Clearance (Cash held by Rider)</option>
                  <option value="CLEARED_TO_ADMIN">🟢 Cleared to Admin (Handed over)</option>
                </select>
              </div>

              {/* Search text */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Search Order / Customer</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Order ID, Customer Name..."
                    value={deliverySearch}
                    onChange={(e) => { setDeliverySearch(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-950 border border-white/10 pl-8 pr-3 py-2 rounded-xl text-xs placeholder-slate-600 outline-none focus:border-cyan-400/40"
                  />
                </div>
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Order Date From</label>
                <input 
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs text-white uppercase font-mono"
                />
              </div>

            </div>

          </div>

          {/* D. Delivery Orders Table */}
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Delivery Staff</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Order Total</th>
                  <th className="p-4 text-center">Clearance Status</th>
                  <th className="p-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold text-slate-300">
                {filteredDeliveryOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500 font-bold uppercase tracking-wider font-mono italic">
                      No delivery payment records match current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((o) => {
                    const totalAmt = Math.round(Number(o.total || o.grandTotal || 0));
                    const isCleared = o.codStatus === 'CLEARED_TO_ADMIN';

                    return (
                      <tr key={o.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-black text-cyan-400">
                          #{o.id}
                        </td>
                        <td className="p-4 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <Bike className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span>{o.deliveryPartnerName || 'Unassigned Rider'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">{o.deliveryPartnerPhone || ''}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{o.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</div>
                        </td>
                        <td className="p-4 font-mono font-black text-emerald-300 text-sm">
                          ₹{totalAmt}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            isCleared 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            {isCleared ? '✅ Cleared to Admin' : '🔴 Pending Handover'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {!isOnlyDeliveryRider ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSingleOrderClearance(o.id, o.codStatus)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border ${
                                isCleared 
                                  ? 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700' 
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-md'
                              }`}
                            >
                              {isCleared ? (isHindi ? 'अन-क्लियर करें' : 'Revert to Pending') : (isHindi ? 'कैश प्राप्त हुआ' : 'Mark Cash Received')}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                              {isCleared ? '✓ Verified by Admin' : 'Awaiting Counter Clearance'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controllers */}
            {filteredDeliveryOrders.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 px-4 py-3 border-t border-white/10 text-xs font-semibold text-slate-400 font-sans">
                <div>
                  Showing <span className="text-white font-extrabold">{Math.min(filteredDeliveryOrders.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                  <span className="text-white font-extrabold">{Math.min(filteredDeliveryOrders.length, currentPage * itemsPerPage)}</span> of{' '}
                  <span className="text-white font-extrabold">{filteredDeliveryOrders.length}</span> records
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 font-black tracking-wider uppercase text-[10px] cursor-pointer flex items-center gap-1 text-slate-300"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 font-black tracking-wider uppercase text-[10px] cursor-pointer flex items-center gap-1 text-slate-300"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* GATEWAY & ONLINE TRANSACTIONS VIEW                                   */}
      {/* ==================================================================== */}
      {activeReportTab === 'gateway' && (
        <div className="space-y-6 animate-fade-in">

      {/* 2. Visual Metric Cards with real analytics summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card A: Online Payment Approved Swastik Wallet */}
        <div className="bg-slate-900/60 border border-white/10 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 hover:border-cyan-500/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Online Paid Net Gross</span>
            <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Landmark className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-black text-cyan-300">₹{stats.paidOnlineTotal}</h3>
            <p className="text-[8.5px] text-slate-500 mt-1 font-mono">Sandbox API Handshakes Secured</p>
          </div>
        </div>

        {/* Card B: COD Outstanding cash flow */}
        <div className="bg-slate-900/60 border border-white/10 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">COD Receivables (Paid)</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-black text-emerald-400">₹{stats.codReceivableTotal}</h3>
            <p className="text-[8.5px] text-slate-500 mt-1 font-mono">Guaranteed cash collected in fields</p>
          </div>
        </div>

        {/* Card C: Pending Fail transaction cushion */}
        <div className="bg-slate-900/60 border border-white/10 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 hover:border-rose-500/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Void / Pending volume</span>
            <span className="p-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-black text-rose-400">₹{stats.failedTotal}</h3>
            <p className="text-[8.5px] text-slate-500 mt-1 font-mono">Failed checkouts or unpaid entries</p>
          </div>
        </div>

        {/* Card D: Overall Checkout Settlement success rate */}
        <div className="bg-slate-900/60 border border-white/10 p-4.5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Gateway Success rate</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-black text-emerald-300">{stats.successRate}%</h3>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-1.5 overflow-hidden border border-white/5">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Comprehensive Filters Block (Date Range, Gateway, Status, Amount Limit) */}
      <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
        
        <div className="border-b border-white/5 pb-2.5 flex justify-between items-center">
          <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span>Interactive Filter segments</span>
          </span>
          <button 
            onClick={resetFilters}
            className="text-[9px] text-slate-400 font-extrabold uppercase hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset filters</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-semibold">
          
          {/* Query string search */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Search Order/Customer</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input 
                type="text"
                placeholder="Order ID, Customer..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-white/10 pl-8 pr-3 py-2 rounded-xl text-xs placeholder-slate-600 outline-none focus:border-cyan-400/40"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Payment Method Mode</label>
            <select
              value={payMethod}
              onChange={(e) => { setPayMethod(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white"
            >
              <option value="All">All Methods (COD & Online)</option>
              <option value="COD">💵 Cash on Delivery (COD)</option>
              <option value="CASHFREE_ONLINE">📱 Cashfree Sandbox (Online combined)</option>
              <option value="UPI">✨ Unified Payments (UPI QR/ID)</option>
              <option value="CARD">💳 Visa / RuPay (Simulated Card)</option>
              <option value="NETBANKING">🏦 Popular Net banking portals</option>
            </select>
          </div>

          {/* Delivery Staff */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Delivery Staff</label>
            <select
              value={gatewayRider}
              onChange={(e) => { setGatewayRider(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white"
            >
              <option value="All">All Delivery Staff ({uniqueRiders.length})</option>
              {uniqueRiders.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Gateway Status */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Settlement Status</label>
            <select
              value={payStatus}
              onChange={(e) => { setPayStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white"
            >
              <option value="All">All Transactions Status</option>
              <option value="PAID">🟢 PAID (Credit processed)</option>
              <option value="PENDING">🟡 PENDING (Unpaid/Draft)</option>
              <option value="FAILED">🔴 FAILED (Voided/Sandbox refund)</option>
            </select>
          </div>

          {/* Amount range filters */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Bill Amount limits (₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number"
                placeholder="Min ₹"
                value={amountMin}
                onChange={(e) => { setAmountMin(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-white/10 px-2.5 py-2 rounded-xl text-xs placeholder-slate-700 font-mono text-cyan-300"
              />
              <input 
                type="number"
                placeholder="Max ₹"
                value={amountMax}
                onChange={(e) => { setAmountMax(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-white/10 px-2.5 py-2 rounded-xl text-xs placeholder-slate-700 font-mono text-cyan-300"
              />
            </div>
          </div>

        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold pt-1 border-t border-white/5">
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span>Created From Date</span>
            </label>
            <input 
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-white/10 px-3.5 py-2 rounded-xl text-xs text-white uppercase font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span>Created To Date</span>
            </label>
            <input 
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-white/10 px-3.5 py-2 rounded-xl text-xs text-white uppercase font-mono"
            />
          </div>
        </div>

      </div>

      {/* 4. Transactions Ledger Table view */}
      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/30">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
              <th className="p-4">Txn ID / Order ID</th>
              <th className="p-4">Customer Details</th>
              <th className="p-4 hidden sm:table-cell">Timestamp</th>
              <th className="p-4">Payment Method</th>
              <th className="p-4 text-center">Settlement Status</th>
              <th className="p-4 text-right">Sum Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-slate-300">
            {filteredPaymentOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-slate-500 font-bold uppercase tracking-wider font-mono italic">
                  No payment webhook logs matched current filter segments.
                </td>
              </tr>
            ) : (
              paginatedReports.map((o) => {
                const totalAmount = Math.round(Number(o.total || o.subtotal || 350));
                const clientName = o.customerName || o.deliveryPartnerName || "Valued Customer";
                const clientPhone = o.customerPhone || o.deliveryPartnerPhone || "+91 99999-99999";
                
                // Styling config
                const method = (o.paymentMethod || 'COD').toUpperCase();
                const status = (o.paymentStatus || 'PENDING').toUpperCase();

                return (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                    {/* Order / Txn identifiers */}
                    <td className="p-4 font-mono font-black text-cyan-400 select-all tracking-tight space-y-1">
                      <div className="text-white flex items-center gap-1.5">
                        <span>{o.id}</span>
                        {o.id.startsWith('PRIME_') && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[8px] font-black rounded uppercase font-sans">
                            👑 Prime Pass
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] text-slate-500 font-bold tracking-widest">
                        CF_TXN_{o.id.replace('SW-', '').replace('PRIME_', 'PR_')}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-4">
                      <div className="font-extrabold text-white text-[11px] leading-tight">{clientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{clientPhone}</div>
                    </td>

                    {/* Timestamp */}
                    <td className="p-4 text-slate-400 font-mono hidden sm:table-cell">
                      {o.orderDate || o.date || "Today"}
                    </td>

                    {/* Payment Method badge layout */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border ${
                        method === 'COD' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/15'
                      }`}>
                        {method === 'COD' ? (
                          <>💵 COD</>
                        ) : method === 'UPI' ? (
                          <>✨ UPI</>
                        ) : method === 'CARD' ? (
                          <>💳 CARD</>
                        ) : (
                          <>📱 ONLINE</>
                        )}
                      </span>
                    </td>

                    {/* Payment Status badge */}
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {status}
                      </span>
                    </td>

                    {/* Sum Total */}
                    <td className="p-4 text-right font-mono font-black text-cyan-300">
                      ₹{totalAmount}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controllers */}
        {filteredPaymentOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 px-4 py-3 border-t border-white/10 text-xs font-semibold text-slate-400 font-sans">
            <div>
              Showing <span className="text-white font-extrabold">{Math.min(filteredPaymentOrders.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="text-white font-extrabold">{Math.min(filteredPaymentOrders.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="text-white font-extrabold">{filteredPaymentOrders.length}</span> transaction logs
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent font-black tracking-wider uppercase text-[10px] cursor-pointer flex items-center gap-1 text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              
              <div className="flex items-center gap-1 font-mono text-[10px]">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNo => (
                  <button
                    key={pageNo}
                    type="button"
                    onClick={() => handlePageChange(pageNo)}
                    className={`w-7 h-7 rounded-lg font-bold border transition-all ${
                      currentPage === pageNo 
                        ? 'bg-cyan-400 border-cyan-400 text-slate-950 font-black scale-105' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {pageNo}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent font-black tracking-wider uppercase text-[10px] cursor-pointer flex items-center gap-1 text-slate-300"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

        </div>
      )}

    </div>
  );
}
