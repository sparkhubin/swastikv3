import React from 'react';
import { Package, Search, ChevronRight, Eye } from 'lucide-react';

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

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div>
          <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2 text-glow">
            <Package className="h-5 w-5 text-cyan-400" />
            <span>{t('myOrders')}</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-mono font-bold">
              {filteredOrders.length}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
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
              onChange={e => setOrderSearchText(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-all w-full sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/15">
            {[
              { id: 'all', label: isHindi ? 'सभी' : 'All' },
              { id: 'active', label: isHindi ? 'सक्रिय' : 'Transit' },
              { id: 'completed', label: isHindi ? 'पूर्ण' : 'Delivered' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOrderStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderStatusFilter === f.id 
                    ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-900/40 rounded-xl border border-white/5">
          <Package className="w-12 h-12 text-slate-600 animate-pulse" />
          <p className="text-sm font-bold text-slate-300">
            {isHindi ? "कोई भी ऑर्डर नहीं मिला!" : "No orders matching your criteria"}
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            {isHindi ? "यदि आपने हाल ही में नया ऑर्डर दिया है, तो वह सिंक होने में कुछ सेकंड लग सकते हैं।" : "Your placed orders will show up here automatically with live tracking status."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold bg-slate-900/50">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total Price</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">#{o.id}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">{o.date || o.createdAt}</td>
                  <td className="py-3.5 px-4 text-slate-200 max-w-xs truncate">
                    {(o.items || []).map(i => i.nameEn || i.nameHi || i.name).join(', ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      o.status === 'Delivered' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : o.status === 'Dispatched' || o.status === 'In Transit'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono uppercase text-[10px]">
                    {o.paymentMethod || 'UPI'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-white text-sm font-mono">
                    ₹{o.totalAmount || o.grandTotal || o.total}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer shadow-sm active:scale-95"
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
      )}
    </div>
  );
}
