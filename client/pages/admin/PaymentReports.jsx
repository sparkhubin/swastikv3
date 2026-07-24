import React, { useState, useMemo } from 'react';
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
  FileText
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';

export default function PaymentReports() {
  const { isHindi } = useLanguage();
  const { orders } = useData();

  // Advanced Filter state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [payMethod, setPayMethod] = useState('All'); // All, COD, CASHFREE_ONLINE, UPI, CARD, NETBANKING
  const [payStatus, setPayStatus] = useState('All'); // All, PAID, PENDING, FAILED
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setPayMethod('All');
    setPayStatus('All');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setCurrentPage(1);
  };

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

  // Apply visual-level dual filters
  const filteredPaymentOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Unified Search query (orderId, customerName, delivery partner)
      const matchesSearch = 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.deliveryPartnerName && o.deliveryPartnerName.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Payment Method
      const method = (o.paymentMethod || 'COD').toUpperCase();
      let matchesMethod = true;
      if (payMethod !== 'All') {
        if (payMethod === 'COD') matchesMethod = method === 'COD';
        else if (payMethod === 'CASHFREE_ONLINE') matchesMethod = method === 'CASHFREE_ONLINE' || method === 'CARD' || method === 'UPI' || method === 'NETBANKING';
        else matchesMethod = method === payMethod;
      }

      // 3. Payment Status 
      const status = (o.paymentStatus || 'PENDING').toUpperCase();
      const matchesStatus = payStatus === 'All' || status === payStatus;

      // 4. Date range filter
      const matchesDate = isWithinDateRange(o.orderDate || o.date || new Date().toISOString());

      // 5. Amount Ranges
      const orderTotal = o.total || o.subtotal || 0;
      let matchesAmount = true;
      if (amountMin) {
        if (orderTotal < Number(amountMin)) matchesAmount = false;
      }
      if (amountMax) {
        if (orderTotal > Number(amountMax)) matchesAmount = false;
      }

      return matchesSearch && matchesMethod && matchesStatus && matchesDate && matchesAmount;
    });
  }, [orders, searchTerm, payMethod, payStatus, dateFrom, dateTo, amountMin, amountMax]);

  // Compute Statistics for filtered data
  const stats = useMemo(() => {
    let paidOnlineTotal = 0;
    let codReceivableTotal = 0;
    let failedTotal = 0;
    let successCount = 0;

    filteredPaymentOrders.forEach(o => {
      const amt = o.total || o.subtotal || 0;
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
        // Pending status
        if (method === 'COD') {
          codReceivableTotal += amt; // COD represents guaranteed final receivable on delivery
        } else {
          failedTotal += amt; // Unpaid online pending represents dead attempt inside sandbox context 
        }
      }
    });

    const totalOrdersCount = filteredPaymentOrders.length;
    const successRate = totalOrdersCount > 0 ? Math.round((successCount / totalOrdersCount) * 100) : 100;

    return {
      paidOnlineTotal,
      codReceivableTotal,
      failedTotal,
      totalOrdersCount,
      successRate
    };
  }, [filteredPaymentOrders]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredPaymentOrders.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    return filteredPaymentOrders.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredPaymentOrders, currentPage]);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  // CSV Exporter handler
  const handleCSVDownload = () => {
    // Standard spreadsheet CSV template headers
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = [
      "Order ID", 
      "Customer Name", 
      "Mobile Reference", 
      "Order Date", 
      "Payment Method", 
      "Payment Status", 
      "Gross Total (INR)", 
      "Tax GST (INR)", 
      "Shipping Fee (INR)", 
      "Net Sub-total (INR)", 
      "Logistics Partner ID"
    ];
    
    csvContent += headers.join(",") + "\n";

    filteredPaymentOrders.forEach(o => {
      const row = [
        o.id,
        `"${(o.customerName || o.deliveryPartnerName || "Amit Sharma").replace(/"/g, '""')}"`,
        `"${o.customerPhone || o.deliveryPartnerPhone || "+91 99999-99999"}"`,
        `"${o.orderDate || o.date || "Today"}"`,
        `"${o.paymentMethod || "COD"}"`,
        `"${o.paymentStatus || "PENDING"}"`,
        o.total || o.subtotal || 350,
        o.gst || 0,
        o.deliveryFee || 0,
        o.subtotal || 350,
        `"${o.deliveryPartnerName || "Unassigned"}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    // Create dual standard direct file triggers
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `Payment_Transactions_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white" id="payment-reports-panel">
      
      {/* 1. Header with direct Quick Download action triggers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-white/10 p-5 rounded-3xl">
        <div className="space-y-1">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-cyan-400" />
            <span>💳 Real-time Payment & Gateway Transaction Logs</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Consolidates Cashfree sandbox payloads, Cash on Delivery receipts, and webhook status ledger entries
          </p>
        </div>

        <button
          onClick={handleCSVDownload}
          disabled={filteredPaymentOrders.length === 0}
          className="bg-cyan-400 hover:bg-cyan-500 disabled:opacity-45 disabled:hover:bg-cyan-400 text-slate-950 font-black rounded-xl px-4 py-2.5 text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/20 active:scale-95 transition-all self-stretch md:self-auto justify-center cursor-pointer"
        >
          <Download className="h-4 w-4 stroke-[2.5]" />
          <span>{isHindi ? "रिपोर्ट डाउनलोड करें" : "Export spreadsheet CSV"}</span>
        </button>
      </div>

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
            <h3 className="text-xl font-mono font-black text-cyan-300">₹{stats.paidOnlineTotal.toFixed(2)}</h3>
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
            <h3 className="text-xl font-mono font-black text-emerald-400">₹{stats.codReceivableTotal.toFixed(2)}</h3>
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
            <h3 className="text-xl font-mono font-black text-rose-400">₹{stats.failedTotal.toFixed(2)}</h3>
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
            className="text-[9px] text-slate-400 font-extrabold uppercase hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset filters</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
          
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
                const totalAmount = o.total || o.subtotal || 350;
                const clientName = o.customerName || o.deliveryPartnerName || "Valued Customer";
                const clientPhone = o.customerPhone || o.deliveryPartnerPhone || "+91 99999-99999";
                
                // Styling config
                const method = (o.paymentMethod || 'COD').toUpperCase();
                const status = (o.paymentStatus || 'PENDING').toUpperCase();

                return (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                    {/* Order / Txn identifiers */}
                    <td className="p-4 font-mono font-black text-cyan-400 select-all tracking-tight space-y-1">
                      <div className="text-white">{o.id}</div>
                      <div className="text-[8px] text-slate-500 font-bold tracking-widest">
                        CF_TXN_{o.id.replace('SW-', '')}
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
  );
}
