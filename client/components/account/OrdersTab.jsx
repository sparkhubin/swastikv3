import React, { useState } from 'react';
import { Package, Search, ChevronRight, Eye, LayoutGrid, List } from 'lucide-react';

export default function OrdersTab({
  orders,
  orderSearchText,
  setOrderSearchText,
  orderStatusFilter,
  setOrderStatusFilter,
  setSelectedOrder,
  isHindi,
  t
}) {
  const [mobileViewMode, setMobileViewMode] = useState('grid'); // 'grid' or 'list'
  const [mobileLimit, setMobileLimit] = useState(6);

  // Filter logic
  const filteredOrders = (orders || []).filter(o => {
    const matchesSearch = !orderSearchText.trim() || 
      (o.id || '').toLowerCase().includes(orderSearchText.toLowerCase()) ||
      (o.items || []).some(i => (i.nameEn || i.nameHi || i.name || '').toLowerCase().includes(orderSearchText.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (orderStatusFilter === 'active') {
      return o.status === 'Processing' || o.status === 'Dispatched' || o.status === 'In Transit' || o.status === 'Pending';
    } else if (orderStatusFilter === 'completed') {
      return o.status === 'Delivered' || o.status === 'Completed';
    }
    return true;
  });

  const displayedMobileOrders = filteredOrders.slice(0, mobileLimit);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            <span>{t('myOrders')}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-extrabold">
              {filteredOrders.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isHindi ? "आपके द्वारा किए गए सभी ऑर्डर्स की रियल-टाइम स्थिति एवं इतिहास" : "Real-time dispatch updates and complete transaction history"}
          </p>
        </div>

        {/* Search & Filter controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder={isHindi ? "ऑर्डर ID या उत्पाद खोजें..." : "Search order ID or item..."}
              value={orderSearchText}
              onChange={e => {
                setOrderSearchText(e.target.value);
                setMobileLimit(6);
              }}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all w-full sm:w-56 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'all', label: isHindi ? 'सभी' : 'All' },
              { id: 'active', label: isHindi ? 'सक्रिय' : 'Transit' },
              { id: 'completed', label: isHindi ? 'पूर्ण' : 'Delivered' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setOrderStatusFilter(f.id);
                  setMobileLimit(6);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderStatusFilter === f.id 
                    ? 'bg-emerald-600 text-white shadow-xs font-extrabold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-400 animate-pulse" />
          <p className="text-sm font-bold text-slate-800">
            {isHindi ? "कोई भी ऑर्डर नहीं मिला!" : "No orders matching your criteria"}
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            {isHindi ? "यदि आपने हाल ही में नया ऑर्डर दिया है, तो वह सिंक होने में कुछ सेकंड लग सकते हैं।" : "Your placed orders will show up here automatically with live tracking status."}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (Grid / Compact List with limit) */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">
                {isHindi 
                  ? `${filteredOrders.length} में से ${displayedMobileOrders.length} ऑर्डर्स प्रदर्शित` 
                  : `Showing ${displayedMobileOrders.length} of ${filteredOrders.length} orders`}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 select-none">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    mobileViewMode === 'grid' 
                      ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    mobileViewMode === 'list' 
                      ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Compact List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {mobileViewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedMobileOrders.map(o => (
                  <div 
                    key={o.id} 
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 hover:border-emerald-300 transition-all shadow-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono font-extrabold text-emerald-800 text-xs block">#{o.id}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">{o.date || o.createdAt}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
                        o.status === 'Delivered' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : o.status === 'Dispatched' || o.status === 'In Transit'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 font-medium line-clamp-1 border-t border-slate-200 pt-2">
                      {(o.items || []).map(i => i.nameEn || i.nameHi || i.name).join(', ')}
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase">{o.paymentMethod || 'UPI'}</span>
                        <span className="font-black text-slate-900 text-sm font-mono">₹{o.totalAmount || o.grandTotal || o.total}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isHindi ? "विवरण" : "Details"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedMobileOrders.map(o => (
                  <div 
                    key={o.id} 
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-emerald-300 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-emerald-800 text-xs truncate">#{o.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                          o.status === 'Delivered' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : o.status === 'Dispatched' || o.status === 'In Transit'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{o.date || o.createdAt}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-black text-slate-900 text-xs font-mono">₹{o.totalAmount || o.grandTotal || o.total}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredOrders.length > mobileLimit && (
              <button
                type="button"
                onClick={() => setMobileLimit(prev => prev + 6)}
                className="mt-4 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-98 text-center cursor-pointer"
              >
                {isHindi ? "और ऑर्डर्स देखें" : "Load More Orders"}
              </button>
            )}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-600 uppercase tracking-wider font-extrabold bg-slate-50">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total Price</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-800">#{o.id}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">{o.date || o.createdAt}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate">
                      {(o.items || []).map(i => i.nameEn || i.nameHi || i.name).join(', ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        o.status === 'Delivered' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : o.status === 'Dispatched' || o.status === 'In Transit'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono uppercase text-[10px] font-bold">
                      {o.paymentMethod || 'UPI'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm font-mono">
                      ₹{o.totalAmount || o.grandTotal || o.total}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 mx-auto cursor-pointer shadow-xs active:scale-95"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isHindi ? "विवरण" : "Details"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
