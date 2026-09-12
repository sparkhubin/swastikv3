import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bike, MapPin, Phone, DollarSign, CheckCircle2, Clock, Navigation, 
  Upload, ShieldCheck, AlertCircle, ChevronDown, Search, Filter, 
  Check, RotateCcw, Camera, UserCheck, Power, X, ExternalLink, Copy, AlertTriangle, Lock
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import R2ImageUploader from './R2ImageUploader';
import { isOrder1HourLocked } from '../../utils/orderLock';

export default function DeliveryDashboard({ userRole, loggedInStaff, onNavigateToReports }) {
  const { isHindi } = useLanguage();
  const { orders = [], updateOrder, staff = [], contactSettings, fetchOrders, fetchStaff } = useData();

  useEffect(() => {
    fetchOrders();
    fetchStaff();
  }, [fetchOrders, fetchStaff]);

  // Rider duty availability toggle
  const [isOnDuty, setIsOnDuty] = useState(true);
  // View mode: 'assigned' (only rider's orders) or 'all' (admin view)
  const [viewScope, setViewScope] = useState('assigned');
  // Order status filter: 'all', 'pending', 'delivered', 'cod_unsettled'
  const [statusFilter, setStatusFilter] = useState('pending');
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Cash Settlement Modal State
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedOrdersToClear, setSelectedOrdersToClear] = useState([]);
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState('');

  // Selected order for proof photo modal / details drawer
  const [photoModalOrder, setPhotoModalOrder] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Active rider identity details
  const currentRiderName = loggedInStaff?.name || '';
  const currentRiderPhone = loggedInStaff?.mobile || '';

  // Filter orders based on assigned rider and view scope
  const riderOrders = useMemo(() => {
    const isDedicatedRider = userRole === 'delivery' || (loggedInStaff && loggedInStaff.permissions?.length === 1 && loggedInStaff.permissions[0] === 'delivery');

    return orders.filter(order => {
      // Clean phone numbers for robust matching
      const rPhoneClean = (currentRiderPhone || '').replace(/\D/g, '').slice(-10);
      const oRiderPhoneClean = (order.deliveryPartnerPhone || '').replace(/\D/g, '').slice(-10);
      const oRiderName = (order.deliveryPartnerName || '').toLowerCase();

      const isStaffIdMatch = loggedInStaff?.id && order.deliveryStaffId === loggedInStaff.id;
      const isPhoneMatch = rPhoneClean && oRiderPhoneClean && rPhoneClean === oRiderPhoneClean;
      const isNameMatch = currentRiderName && oRiderName && (
        oRiderName.includes(currentRiderName.toLowerCase().trim()) ||
        currentRiderName.toLowerCase().includes(oRiderName) ||
        (currentRiderName.toLowerCase().split(' ')[0].length >= 2 && oRiderName.includes(currentRiderName.toLowerCase().split(' ')[0]))
      );

      const isAssignedToMe = isStaffIdMatch || isPhoneMatch || isNameMatch;

      // Restrict viewScope to strictly assigned if dedicated delivery rider
      if (isDedicatedRider) {
        return isAssignedToMe;
      }
      return viewScope === 'assigned' ? isAssignedToMe : true;
    });
  }, [orders, currentRiderName, currentRiderPhone, loggedInStaff, viewScope, userRole]);

  // Apply status & search filters
  const filteredOrders = useMemo(() => {
    return riderOrders.filter(o => {
      // Search filter
      const matchesSearch = 
        !searchQuery.trim() ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.customerPhone && o.customerPhone.includes(searchQuery)) ||
        (o.shippingAddress && o.shippingAddress.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const st = (o.status || '').toLowerCase();
      const isDelivered = st === 'delivered' || st === 'completed';

      if (statusFilter === 'pending') {
        return !isDelivered && st !== 'cancelled';
      }
      if (statusFilter === 'delivered') {
        return isDelivered;
      }
      if (statusFilter === 'cod_unsettled') {
        const isCOD = o.paymentMethod === 'COD' || o.paymentMethod === 'cod';
        const isCleared = o.codStatus === 'CLEARED_TO_ADMIN';
        return isCOD && isDelivered && !isCleared;
      }

      return true;
    });
  }, [riderOrders, statusFilter, searchQuery]);

  // Operational Metrics Calculations with Math.round
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let deliveredCount = 0;
    let totalCodCollected = 0;
    let codPendingClearance = 0;
    let codClearedToAdmin = 0;
    let totalOnlinePayments = 0;

    riderOrders.forEach(o => {
      const st = (o.status || '').toLowerCase();
      const isDelivered = st === 'delivered' || st === 'completed';
      const isCOD = o.paymentMethod === 'COD' || o.paymentMethod === 'cod';
      const orderTotal = Number(o.total || o.grandTotal || 0);

      if (!isDelivered && st !== 'cancelled') {
        pendingCount++;
      } else if (isDelivered) {
        deliveredCount++;
        if (isCOD) {
          totalCodCollected += orderTotal;
          if (o.codStatus === 'CLEARED_TO_ADMIN') {
            codClearedToAdmin += orderTotal;
          } else {
            codPendingClearance += orderTotal;
          }
        } else {
          totalOnlinePayments += orderTotal;
        }
      }
    });

    return {
      totalAssigned: riderOrders.length,
      pendingCount,
      deliveredCount,
      totalCodCollected: Math.round(totalCodCollected),
      codPendingClearance: Math.round(codPendingClearance),
      codClearedToAdmin: Math.round(codClearedToAdmin),
      totalOnlinePayments: Math.round(totalOnlinePayments)
    };
  }, [riderOrders]);

  // Uncleared COD orders list for settlement modal
  const unclearedCodOrders = useMemo(() => {
    return riderOrders.filter(o => {
      const st = (o.status || '').toLowerCase();
      const isDelivered = st === 'delivered' || st === 'completed';
      const isCOD = o.paymentMethod === 'COD' || o.paymentMethod === 'cod';
      return isCOD && isDelivered && o.codStatus !== 'CLEARED_TO_ADMIN';
    });
  }, [riderOrders]);

  // Handlers
  const handleToggleDuty = () => {
    setIsOnDuty(!isOnDuty);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    if (isOrder1HourLocked(target)) {
      alert(isHindi 
        ? '🔒 यह ऑर्डर डिलीवर होने के 1 घंटे बाद पूरी तरह लॉक हो चुका है! एडमिन व स्टाफ दोनों के लिए स्थिति बदलना बंद है। केवल कैश सेटलमेंट ही अपडेट हो सकती है।' 
        : '🔒 This order was delivered over 1 hour ago and is permanently locked! Order status cannot be changed by Admin or Staff. Only payment settlement can be updated.');
      return;
    }

    const targetSt = (target.status || '').toLowerCase();
    const isCurrentlyDelivered = targetSt === 'delivered' || targetSt === 'completed';

    // PERMANENT LOCK: Once marked Delivered, the order is locked permanently!
    if (isCurrentlyDelivered) {
      alert(isHindi 
        ? '🔒 यह ऑर्डर डिलीवर हो चुका है और स्थायी रूप से लॉक है!' 
        : '🔒 This order is delivered and permanently locked!');
      return;
    }

    const isCOD = target.paymentMethod === 'COD' || target.paymentMethod === 'cod';
    const isNowDelivered = newStatus === 'delivered' || newStatus === 'Delivered';

    const updatedPayload = {
      status: newStatus,
      step: isNowDelivered ? 2 : 1,
      deliveryDate: isNowDelivered ? (target.deliveryDate || new Date().toISOString()) : target.deliveryDate
    };

    if (isNowDelivered && isCOD) {
      updatedPayload.codStatus = 'COLLECTED_BY_RIDER';
      updatedPayload.cashCollectedByRider = 1;
      updatedPayload.paymentStatus = 'PAID';
      updatedPayload.codCollectedAt = new Date().toISOString();
    }

    updateOrder(orderId, updatedPayload);
  };

  const handleOpenSettlementModal = () => {
    // Default select all uncleared COD orders
    setSelectedOrdersToClear(unclearedCodOrders.map(o => o.id));
    setSettlementNote('Cash collected at doorstep, handed over to store admin');
    setSettlementSuccessMsg('');
    setShowSettlementModal(true);
  };

  const handleToggleOrderSelectionForClearance = (id) => {
    if (selectedOrdersToClear.includes(id)) {
      setSelectedOrdersToClear(prev => prev.filter(x => x !== id));
    } else {
      setSelectedOrdersToClear(prev => [...prev, id]);
    }
  };

  const handleConfirmCashClearance = () => {
    if (selectedOrdersToClear.length === 0) {
      alert(isHindi ? 'कृपया कम से कम एक ऑर्डर चुनें!' : 'Please select at least one order to clear cash payment!');
      return;
    }

    const clearTime = new Date().toISOString();
    selectedOrdersToClear.forEach(id => {
      updateOrder(id, {
        codStatus: 'CLEARED_TO_ADMIN',
        adminReceivedCash: 1,
        adminCashReceivedAt: clearTime,
        codClearedAt: clearTime,
        codClearedBy: 'Admin',
        codClearanceNote: settlementNote
      });
    });

    const clearedAmount = Math.round(selectedOrdersToClear.reduce((acc, id) => acc + Number(orders.find(o => o.id === id)?.total || 0), 0));
    setSettlementSuccessMsg(
      isHindi 
        ? `✅ ₹${clearedAmount} का नगद भुगतान एडमिन को सफलतापूर्वक क्लियर कर दिया गया!` 
        : `✅ Cash payment of ₹${clearedAmount} cleared to Admin successfully!`
    );

    setTimeout(() => {
      setShowSettlementModal(false);
      setSettlementSuccessMsg('');
    }, 1800);
  };

  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(type);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  // Helper to construct Google Maps direction/navigation URL
  const getNavigationUrl = (order) => {
    if (order.mapLink) return order.mapLink;
    if (order.latitude && order.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`;
    }
    const cleanAddr = (order.shippingAddress || '').replace(/\[.*?\]/g, '').trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddr || 'Indore, Madhya Pradesh')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. Header Banner & Rider Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
                <Bike className="h-7 w-7" />
              </div>
              <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-900 ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                  {isHindi ? `${contactSettings?.brandName || 'स्टोर'} डिलीवरी पार्टनर` : `${contactSettings?.brandName || 'Store'} Delivery Executive`}
                </span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isOnDuty ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {isOnDuty ? (isHindi ? '🟢 ऑन ड्यूटी' : '🟢 ON DUTY') : (isHindi ? '🔴 ऑफ ड्यूटी' : '🔴 OFF DUTY')}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1 tracking-tight">
                {currentRiderName}
              </h2>
              <p className="text-xs text-slate-400 font-mono font-medium flex items-center gap-2 mt-0.5">
                <span>📞 {currentRiderPhone}</span>
                <span>•</span>
                <span>ID: #{loggedInStaff?.id || ''}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
            {/* View scope switcher (Assigned vs All - FOR ADMIN & MANAGERS) */}
            {(userRole === 'admin' || (loggedInStaff && (!loggedInStaff.permissions || loggedInStaff.permissions.length > 1 || loggedInStaff.permissions[0] !== 'delivery'))) && (
              <div className="bg-slate-950/80 p-1 rounded-xl border border-white/10 flex items-center text-[10px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setViewScope('assigned')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewScope === 'assigned' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isHindi ? 'मेरी ऑर्डर्स' : 'My Assigned'} ({orders.filter(o => o.deliveryPartnerName?.toLowerCase().includes(currentRiderName.toLowerCase().split(' ')[0])).length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewScope === 'all' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isHindi ? 'सभी ऑर्डर्स (एडमिन)' : 'All Orders'} ({orders.length})
                </button>
              </div>
            )}

            {/* Shortcut button to Payment Reports & Cash Ledger */}
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isHindi ? 'पेमेंट रिपोर्ट व लेजर' : 'Payment Reports & Ledger'}</span>
              </button>
            )}

            {/* Duty toggle button */}
            <button
              type="button"
              onClick={handleToggleDuty}
              className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                isOnDuty 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30' 
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              <Power className="h-4 w-4" />
              <span>{isOnDuty ? (isHindi ? 'ऑफ ड्यूटी जाएं' : 'Go Off Duty') : (isHindi ? 'ऑन ड्यूटी जाएं' : 'Go On Duty')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key COD Payment & Deliveries Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        
        {/* Card 1: Pending Deliveries */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 relative overflow-hidden space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
              {isHindi ? 'पेंडिंग डिलीवरी' : 'Pending Deliveries'}
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{metrics.pendingCount}</div>
          <p className="text-[9px] text-slate-400 font-semibold">
            {isHindi ? 'तुरंत डिलीवरी हेतु तैयार' : 'Orders awaiting doorstep dispatch'}
          </p>
        </div>

        {/* Card 2: Completed Deliveries */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 relative overflow-hidden space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
              {isHindi ? 'पूर्ण डिलीवरी' : 'Delivered Orders'}
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{metrics.deliveredCount}</div>
          <p className="text-[9px] text-slate-400 font-semibold">
            {isHindi ? 'सफलतापूर्वक पहुँचाए गए' : 'Total completed dispatches'}
          </p>
        </div>

        {/* Card 3: COD Cash Collected */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 relative overflow-hidden space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
              {isHindi ? 'कुल COD नगद' : 'Total COD Collected'}
            </span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">₹{metrics.totalCodCollected}</div>
          <p className="text-[9px] text-slate-400 font-semibold">
            {isHindi ? 'ग्राहकों से प्राप्त नगद' : 'Cash collected from COD customers'}
          </p>
        </div>

        {/* Card 4: Cash Pending Clearance to Admin (CRITICAL) */}
        <div className={`border rounded-2xl p-4 relative overflow-hidden space-y-1 ${
          metrics.codPendingClearance > 0 
            ? 'bg-gradient-to-br from-rose-950/60 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20' 
            : 'bg-slate-900 border-white/10'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
              {metrics.codPendingClearance > 0 && <AlertCircle className="h-3 w-3 animate-pulse text-rose-400" />}
              <span>{isHindi ? 'एडमिन बकाया कैश' : 'Pending Admin Clearance'}</span>
            </span>
            <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-300 font-mono">₹{metrics.codPendingClearance}</div>
          
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-semibold">
              {unclearedCodOrders.length} {isHindi ? 'अनसेटल्ड ऑर्डर्स' : 'unsettled COD order(s)'}
            </span>
            {metrics.codPendingClearance > 0 && (
              <button
                type="button"
                onClick={handleOpenSettlementModal}
                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
              >
                {isHindi ? 'कैश क्लियर करें' : 'Clear Payment'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. COD Cash Handover / Settlement Banner (if pending cash exists) */}
      {metrics.codPendingClearance > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-2xl shrink-0">
              <AlertTriangle className="h-6 w-6 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wide text-amber-300">
                {isHindi ? 'एडमिन को कैश ट्रांसफर / जमा बकाया' : 'COD Cash Collection Settlement Required'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                {isHindi
                  ? `आपके पास डिलीवरी से प्राप्त ₹${metrics.codPendingClearance} का कुल नगद हैंडओवर बकाया है। कृपया यह भौतिक नगद राशि मुख्य स्टोर काउंटर / कैशियर डेस्क पर स्टोर मैनेजर या एडमिन को हैंडओवर करें और यहाँ क्लीयरेंस दर्ज करें।`
                  : `You have ₹${metrics.codPendingClearance} in collected COD cash across ${unclearedCodOrders.length} order(s). Hand over physical cash in person to the Store Manager or Admin at the Store Cash Counter, then click Clear Payment to record settlement.`
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenSettlementModal}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:from-emerald-300 hover:to-teal-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isHindi ? 'एडमिन को भुगतान क्लियर करें' : 'Clear Payment to Admin'}</span>
          </button>
        </div>
      )}

      {/* 4. Filter Tabs & Search Bar */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'pending', label: isHindi ? 'पेंडिंग डिलीवरी' : 'Pending Dispatch', count: metrics.pendingCount, color: 'amber' },
            { id: 'delivered', label: isHindi ? 'डिलीवर हो चुके' : 'Delivered Orders', count: metrics.deliveredCount, color: 'emerald' },
            { id: 'cod_unsettled', label: isHindi ? 'कैश अनसेटल्ड' : 'COD Uncleared', count: unclearedCodOrders.length, color: 'rose' },
            { id: 'all', label: isHindi ? 'सभी ऑर्डर्स' : 'All Orders', count: riderOrders.length, color: 'slate' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive 
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] ${
                  isActive ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isHindi ? "ऑर्डर ID, नाम, फ़ोन या पता खोजें..." : "Search Order ID, Name, Phone..."}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 5. Assigned Orders Grid / List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Bike className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {isHindi ? 'कोई ऑर्डर नहीं मिला' : 'No Assigned Orders Found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              {isHindi 
                ? 'चयनित फ़िल्टर में आपके पास कोई असाइन किया गया ऑर्डर नहीं है।' 
                : 'There are no active orders matching this view filter currently.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map(order => {
              const isCOD = order.paymentMethod === 'COD' || order.paymentMethod === 'cod';
              const isDelivered = (order.status || '').toLowerCase() === 'delivered' || (order.status || '').toLowerCase() === 'completed';
              const isCleared = order.codStatus === 'CLEARED_TO_ADMIN';
              const navUrl = getNavigationUrl(order);

              return (
                <div 
                  key={order.id}
                  className={`bg-slate-900 border rounded-3xl p-5 space-y-4 transition-all duration-200 relative ${
                    isDelivered 
                      ? 'border-emerald-500/30 bg-emerald-950/10' 
                      : 'border-white/10 hover:border-cyan-500/40 shadow-xl'
                  }`}
                >
                  
                  {/* Top Bar: Order ID, Status, Time */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-cyan-300">
                        #{order.id}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        {order.date || order.orderDate ? new Date(order.orderDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOrder1HourLocked(order) ? (
                        <div className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow-sm" title={isHindi ? 'डिलीवर होने के 1 घंटे बाद स्थिति पूरी तरह लॉक हो चुकी है' : 'Order permanently locked 1 hour post-delivery.'}>
                          <Lock className="h-3 w-3 text-rose-400 shrink-0" />
                          <span>{isHindi ? 'ऑर्डर लॉक (>1 घंटा)' : 'Delivered (Locked)'}</span>
                        </div>
                      ) : isDelivered && userRole !== 'admin' ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow-sm" title={isHindi ? 'डिलीवर होने के बाद केवल एडमिन स्थिति बदल सकता है' : 'Status locked after delivery. Only Admin can modify.'}>
                          <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>{isHindi ? 'डिलीवर (एडमिन केवल)' : 'Delivered (Admin Only)'}</span>
                        </div>
                      ) : (
                        <select
                          value={order.status || 'Confirmed'}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl outline-none border cursor-pointer ${
                            isDelivered 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          <option value="Confirmed" className="bg-slate-900 text-white">Confirmed</option>
                          <option value="dispatched" className="bg-slate-900 text-white">Dispatched / En Route</option>
                          <option value="delivered" className="bg-slate-900 text-white">Delivered / Completed</option>
                          <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Customer Info & Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Customer Name & Phone */}
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        {isHindi ? 'ग्राहक विवरण' : 'Customer Info'}
                      </span>
                      <div className="font-bold text-white text-xs">
                        {order.customerName || `${contactSettings?.brandName || 'Store'} Customer`}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${order.customerPhone || contactSettings?.phone || ''}`}
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-black flex items-center gap-1 transition active:scale-95"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{order.customerPhone || contactSettings?.phone || 'Call Customer'}</span>
                        </a>
                      </div>
                    </div>

                    {/* Payment Mode & Amount */}
                    <div className={`p-3 rounded-2xl border space-y-1 ${
                      isCOD 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    }`}>
                      <span className="text-[9px] font-black uppercase tracking-widest block opacity-80">
                        {isCOD ? (isHindi ? '💵 नगद प्राप्त करना है (COD)' : '💵 Cash on Delivery') : (isHindi ? '💳 ऑनलाइन भुगतान (Paid)' : '🟢 Paid Online')}
                      </span>
                      <div className="text-lg font-black font-mono">
                        ₹{Math.round(order.total || order.grandTotal || 0)}
                      </div>
                      <div className="text-[9px] font-bold">
                        {isCOD ? (
                          isDelivered ? (
                            isCleared 
                              ? <span className="text-emerald-300 font-extrabold">✅ {isHindi ? 'एडमिन को कैश जमा' : 'Cash Cleared to Admin'}</span> 
                              : <span className="text-rose-300 font-extrabold">🔴 {isHindi ? 'एडमिन को कैश जमा लंबित' : 'Pending Cash Handover'}</span>
                          ) : (
                            <span>{isHindi ? 'डिलीवरी पर नगद लें' : 'Collect cash at doorstep'}</span>
                          )
                        ) : (
                          <span className="text-emerald-300">₹0 {isHindi ? 'नगद नहीं लेना' : 'cash to collect'}</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Delivery Location & Navigation Button (Requirement 5) */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{isHindi ? 'डिलीवरी पता और जीपीएस लोकेशन' : 'Delivery Address & GPS Pin'}</span>
                        </span>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {order.shippingAddress || order.address || (isHindi ? 'पता उपलब्ध नहीं है' : 'Address unavailable')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyText(order.shippingAddress || '', order.id)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg shrink-0 transition"
                        title="Copy Address"
                      >
                        {copyFeedback === order.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Navigation Map Action Button */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Navigation className="h-4 w-4 text-slate-950 shrink-0 animate-pulse" />
                        <span>{isHindi ? '📍 लोकेशन ट्रैक करें / मैप खोलें' : '📍 Track Location / Open Navigation'}</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    </div>
                  </div>

                  {/* Order Items Summary */}
                  <div className="text-[11px] bg-slate-950/40 p-3 rounded-2xl border border-white/5 space-y-1.5">
                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      {isHindi ? 'ऑर्डर आइटम्स' : 'Order Items'} ({order.items?.length || 0})
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {order.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-300 font-medium">
                          <span>{it.qty}x {isHindi ? (it.nameHi || it.nameEn) : (it.nameEn || it.nameHi)}</span>
                          <span className="font-mono text-slate-400">₹{Math.round(it.price * it.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Proof Photo & Quick Action Footer */}
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Proof image trigger */}
                    <button
                      type="button"
                      onClick={() => setPhotoModalOrder(order)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{order.deliveryProofImage ? (isHindi ? 'फोटो प्रमाण देखें' : 'View Proof Photo') : (isHindi ? '+ फोटो अपलोड' : '+ Add Proof Photo')}</span>
                    </button>

                    {/* Quick status actions */}
                    {!isDelivered ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition active:scale-95 shadow-md cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{isHindi ? 'मार्क डिलीवर्ड' : 'Mark Delivered'}</span>
                      </button>
                    ) : (
                      <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>{isHindi ? 'डिलीवरी पूर्ण' : 'Completed'}</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Cash Settlement with Admin Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {isHindi ? 'एडमिन नगद भुगतान क्लियरेंस' : 'COD Cash Clearance to Admin'}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold">
                  {isHindi ? 'एकत्र किया गया नगद जमा करें और स्थिति क्लियर करें' : 'Select orders and record cash settlement with store admin'}
                </p>
              </div>
            </div>

            {settlementSuccessMsg ? (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-black text-center animate-fade-in">
                {settlementSuccessMsg}
              </div>
            ) : (
              <>
                {/* Orders Checklist */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {isHindi ? 'अनसेटल्ड COD ऑर्डर्स चुनें' : 'Select COD Orders to Hand Over:'}
                  </span>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {unclearedCodOrders.map(o => {
                      const isChecked = selectedOrdersToClear.includes(o.id);
                      return (
                        <div
                          key={o.id}
                          onClick={() => handleToggleOrderSelectionForClearance(o.id)}
                          className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            isChecked ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-slate-950 border-white/5 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded accent-emerald-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-mono text-xs font-bold text-cyan-300">#{o.id}</span>
                              <span className="text-[10px] text-slate-400 block font-medium">{o.customerName}</span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-black text-emerald-300">
                            ₹{Math.round(o.total || o.grandTotal || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Cash to Handover */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    {isHindi ? 'कुल नगद हैंडओवर राशि:' : 'Total Cash Handover Amount:'}
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-300">
                    ₹{Math.round(selectedOrdersToClear.reduce((acc, id) => acc + Number(orders.find(o => o.id === id)?.total || 0), 0))}
                  </span>
                </div>

                {/* Clear Cash Handover Instructions Notice */}
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] space-y-1">
                  <span className="font-black uppercase tracking-wider block text-[10px] text-cyan-400">
                    {isHindi ? '📍 कैश हैंडओवर जमा स्थान:' : '📍 Cash Handover Destination:'}
                  </span>
                  <p className="font-semibold text-slate-200">
                    {isHindi 
                      ? 'एकत्रित किया गया नगद सीधे मुख्य स्टोर कैश काउंटर पर स्टोर मैनेजर या एडमिन को सुपुर्द करें।'
                      : 'Hand over collected physical cash directly to the Store Manager or Admin at the Main Store Cash Counter / Account Desk.'
                    }
                  </p>
                </div>

                {/* Settlement Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isHindi ? 'क्लियरेंस नोट्स / विवरण:' : 'Settlement Notes:'}
                  </label>
                  <input
                    type="text"
                    value={settlementNote}
                    onChange={(e) => setSettlementNote(e.target.value)}
                    placeholder="e.g. Handed over cash at store counter to Admin"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettlementModal(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase transition"
                  >
                    {isHindi ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCashClearance}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer"
                  >
                    {isHindi ? 'कैश ट्रांसफर पुष्ट करें' : 'Confirm Cash Handover'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 7. Proof Image Uploader Modal */}
      {photoModalOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPhotoModalOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Camera className="h-4 w-4 text-cyan-400" />
                <span>{isHindi ? 'डिलीवरी प्रूफ फोटो' : 'Delivery Proof Photo'} - #{photoModalOrder.id}</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                {isHindi ? 'ग्राहक द्वारा प्राप्त सामान की तस्वीर संलग्न करें' : 'Upload or capture photo proof of delivery'}
              </p>
            </div>

            {photoModalOrder.deliveryProofImage && (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-56">
                <img 
                  src={photoModalOrder.deliveryProofImage} 
                  alt="Delivery Proof" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}

            <div className="space-y-2">
              <R2ImageUploader
                initialImageUrl={photoModalOrder.deliveryProofImage}
                onUploadComplete={(url) => {
                  updateOrder(photoModalOrder.id, {
                    ...photoModalOrder,
                    deliveryProofImage: url
                  });
                  setPhotoModalOrder(prev => ({ ...prev, deliveryProofImage: url }));
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setPhotoModalOrder(null)}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition"
            >
              {isHindi ? 'संपन्न' : 'Done'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
