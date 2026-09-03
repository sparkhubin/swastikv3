import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Trash2, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  AlertTriangle, 
  Check, 
  X, 
  MessageSquare, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  Gift,
  ExternalLink
} from 'lucide-react';

export default function DataDeletionRequestsManager() {
  const { isHindi } = useLanguage();
  const { 
    dataDeletionRequests = [], 
    approveDataDeletionRequest, 
    rejectDataDeletionRequest, 
    deleteDataDeletionRequest,
    customers = [],
    orders = []
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | Pending | Approved & Deleted | Rejected
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: dataDeletionRequests.length,
      pending: dataDeletionRequests.filter(r => r.status === 'Pending').length,
      approved: dataDeletionRequests.filter(r => r.status === 'Approved & Deleted').length,
      rejected: dataDeletionRequests.filter(r => r.status === 'Rejected').length,
    };
  }, [dataDeletionRequests]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return dataDeletionRequests.filter(r => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const idMatch = (r.id || '').toLowerCase().includes(q);
        const nameMatch = (r.name || '').toLowerCase().includes(q);
        const phoneMatch = (r.phone || '').includes(q);
        const emailMatch = (r.email || '').toLowerCase().includes(q);
        const reasonMatch = (r.reason || '').toLowerCase().includes(q);
        return idMatch || nameMatch || phoneMatch || emailMatch || reasonMatch;
      }

      return true;
    });
  }, [dataDeletionRequests, statusFilter, searchTerm]);

  // Helper to match customer record from database
  const getCustomerStats = (req) => {
    const phoneDigits = (req.phone || '').replace(/\D/g, '').slice(-10);
    const matchedCust = customers.find(c => {
      if (req.customerId && Number(c.id) === Number(req.customerId)) return true;
      if (phoneDigits && (c.phone || '').replace(/\D/g, '').endsWith(phoneDigits)) return true;
      if (req.email && c.email && c.email.toLowerCase().trim() === req.email.toLowerCase().trim()) return true;
      return false;
    });

    const custOrders = orders.filter(o => {
      const oPhoneDigits = (o.customer_phone || '').replace(/\D/g, '').slice(-10);
      return phoneDigits && oPhoneDigits && oPhoneDigits.endsWith(phoneDigits);
    });

    return {
      customer: matchedCust,
      orderCount: custOrders.length || matchedCust?.orderCount || 0,
      totalSpent: custOrders.reduce((acc, o) => acc + (Number(o.grand_total) || 0), 0) || matchedCust?.totalSpent || 0,
      points: matchedCust?.points || 0
    };
  };

  const openActionModal = (req, type) => {
    setSelectedRequest(req);
    setActionType(type);
    if (type === 'approve') {
      setAdminNoteInput(isHindi ? 'अनुरोध स्वीकृत। ग्राहक का व्यक्तिगत डेटा स्थायी रूप से हटाया गया।' : 'Approved: Customer profile and personal records permanently deleted as requested.');
    } else {
      setAdminNoteInput(isHindi ? 'सक्रिय ऑर्डर या बकाया भुगतान के कारण अनुरोध वर्तमान में अस्वीकृत है।' : 'Request declined due to active pending order or account verification requirement.');
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;
    setProcessingId(selectedRequest.id);

    try {
      if (actionType === 'approve') {
        await approveDataDeletionRequest(selectedRequest.id, adminNoteInput);
        showToast(isHindi 
          ? `अनुरोध ${selectedRequest.id} स्वीकृत! ग्राहक डेटा स्थायी रूप से हटा दिया गया।` 
          : `Request ${selectedRequest.id} approved! Customer personal data erased.`
        );
      } else {
        await rejectDataDeletionRequest(selectedRequest.id, adminNoteInput);
        showToast(isHindi 
          ? `अनुरोध ${selectedRequest.id} अस्वीकृत कर दिया गया।` 
          : `Request ${selectedRequest.id} was rejected.`
        );
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
      setSelectedRequest(null);
      setActionType(null);
      setAdminNoteInput('');
    }
  };

  const handleDeleteEntry = async (reqId) => {
    if (confirm(isHindi ? 'क्या आप इस अनुरोध रिकॉर्ड को सूची से हटाना चाहते हैं?' : 'Are you sure you want to permanently delete this request log record?')) {
      await deleteDataDeletionRequest(reqId);
      showToast(isHindi ? 'अनुरोध रिकॉर्ड हटाया गया।' : 'Request log entry removed.');
    }
  };

  return (
    <div className="space-y-6" id="data-deletion-requests-manager">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-400 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">
                {isHindi ? 'डेटा गोपनीयता एवं विलोपन अनुपालन' : 'GDPR & Privacy Compliance'}
              </span>
              {counts.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black animate-pulse">
                  {counts.pending} {isHindi ? 'लंबित' : 'Pending'}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {isHindi ? 'डेटा विलोपन अनुरोध प्रबंधन' : 'Data Deletion Requests'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              {isHindi 
                ? 'उपयोगकर्ताओं द्वारा अपने खाते और व्यक्तिगत जानकारी को हटाने के लिए भेजे गए अनुरोधों की समीक्षा करें और डेटा डिलीट करें।'
                : 'Review user-submitted requests for account and personal data erasure. Approve to permanently purge customer records.'}
            </p>
          </div>
        </div>

        {/* Quick Help Card */}
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 max-w-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{isHindi ? 'एडमिन सुरक्षा नियम' : 'Admin Notice'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isHindi 
              ? 'स्वीकृति पर ग्राहक का रिकॉर्ड हटा दिया जाएगा और ऑर्डर डेटा को पहचान रहित (Anonymized) कर दिया जाएगा।'
              : 'Approving will erase the customer profile and anonymize linked order records to satisfy privacy standards.'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL' 
              ? 'bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            {isHindi ? 'कुल अनुरोध' : 'Total Requests'}
          </span>
          <p className="text-2xl font-black text-white mt-1 font-mono">{counts.all}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Pending' 
              ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
              {isHindi ? 'लंबित समीक्षा' : 'Pending Review'}
            </span>
            {counts.pending > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{counts.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Approved & Deleted')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Approved & Deleted' 
              ? 'bg-emerald-950/40 border-emerald-400 shadow-md ring-1 ring-emerald-400' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
            {isHindi ? 'स्वीकृत एवं हटाया गया' : 'Approved & Deleted'}
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{counts.approved}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Rejected')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Rejected' 
              ? 'bg-rose-950/40 border-rose-400 shadow-md ring-1 ring-rose-400' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider block">
            {isHindi ? 'अस्वीकृत' : 'Rejected'}
          </span>
          <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{counts.rejected}</p>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isHindi ? 'नाम, फोन, ईमेल या Ref ID से खोजें...' : 'Search by name, phone, email, or Ref ID...'}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs placeholder:text-slate-500 focus:border-cyan-400 focus:outline-hidden transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {['ALL', 'Pending', 'Approved & Deleted', 'Rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' 
                ? (isHindi ? 'सभी' : 'All') 
                : st === 'Pending' 
                ? (isHindi ? 'लंबित' : 'Pending') 
                : st === 'Approved & Deleted' 
                ? (isHindi ? 'हटाया गया' : 'Approved') 
                : (isHindi ? 'अस्वीकृत' : 'Rejected')}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <ShieldCheck className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">
            {isHindi ? 'कोई डेटा डिलीट अनुरोध नहीं मिला' : 'No Data Deletion Requests Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm 
              ? (isHindi ? 'दिए गए खोज मानदंड से कोई रिकॉर्ड मेल नहीं खाता।' : 'No records match your search criteria.')
              : (isHindi ? 'वर्तमान में कोई लंबित या संसाधित डेटा डिलीट अनुरोध नहीं है।' : 'There are currently no deletion requests matching this filter.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const stats = getCustomerStats(req);
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved & Deleted';
            const isRejected = req.status === 'Rejected';

            return (
              <div 
                key={req.id} 
                className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all ${
                  isPending 
                    ? 'border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5' 
                    : isApproved
                    ? 'border-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isPending 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                        : isApproved 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {isPending ? (
                        <Clock className="h-6 w-6 animate-pulse" />
                      ) : isApproved ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <XCircle className="h-6 w-6" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                          {req.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isPending 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                            : isApproved 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {req.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(req.requestedAt).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
                        <span>{req.name}</span>
                        {stats.customer?.isPrimeActive && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded font-mono font-bold">
                            PRIME VIP
                          </span>
                        )}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap font-medium">
                        {req.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <strong className="text-slate-300 font-mono">{req.phone}</strong>
                          </span>
                        )}
                        {req.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span className="text-slate-300">{req.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CRM Record Snapshot */}
                  <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-2xl shrink-0 w-full lg:w-auto justify-between lg:justify-start">
                    <div className="text-center px-3 border-r border-slate-800">
                      <span className="text-[10px] uppercase font-black text-slate-500 block">Orders</span>
                      <span className="text-sm font-black text-white font-mono">{stats.orderCount}</span>
                    </div>
                    <div className="text-center px-3 border-r border-slate-800">
                      <span className="text-[10px] uppercase font-black text-slate-500 block">Spent</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">₹{stats.totalSpent}</span>
                    </div>
                    <div className="text-center px-3">
                      <span className="text-[10px] uppercase font-black text-slate-500 block">Points</span>
                      <span className="text-sm font-black text-amber-400 font-mono">{stats.points}</span>
                    </div>
                  </div>
                </div>

                {/* Reason & Notes */}
                <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {isHindi ? 'हटाने का कारण' : 'Reason for Deletion'}
                    </span>
                    <p className="text-slate-200 font-medium">{req.reason || 'Not specified'}</p>
                    {req.notes && (
                      <p className="text-slate-400 text-[11px] mt-1 italic">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  {/* Admin notes if resolved */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {isHindi ? 'व्यवस्थापक टिप्पणी / कार्रवाई' : 'Admin Notes & Audit Log'}
                    </span>
                    {req.adminNotes ? (
                      <div>
                        <p className="text-slate-200">{req.adminNotes}</p>
                        {req.processedAt && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-1">
                            {isHindi ? 'संसाधित समय' : 'Processed at'}: {new Date(req.processedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">
                        {isHindi ? 'कार्रवाई की प्रतीक्षा है...' : 'Pending admin review and action...'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    {stats.customer ? (
                      <span className="text-cyan-400 font-medium">
                        ✓ {isHindi ? 'ग्राहक CRM डेटाबेस में मौजूद है (ID #' + stats.customer.id + ')' : 'Customer record linked in CRM (ID #' + stats.customer.id + ')'}
                      </span>
                    ) : isApproved ? (
                      <span className="text-emerald-400 font-medium">
                        ✓ {isHindi ? 'ग्राहक डेटाबेस से मिटा दिया गया है।' : 'Customer data successfully deleted.'}
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {isHindi ? 'कोई सक्रिय CRM प्रोफ़ाइल लिंक नहीं मिला' : 'No active CRM record found with this phone'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openActionModal(req, 'reject')}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>{isHindi ? 'अस्वीकार करें' : 'Reject Request'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openActionModal(req, 'approve')}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{isHindi ? 'स्वीकृत करें और डेटा हटाएं' : 'Approve & Delete Data'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(req.id)}
                        className="px-3 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>{isHindi ? 'लॉग हटाएं' : 'Delete Log'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Action Confirmation Modal */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-white">
            <div className={`p-5 flex items-center justify-between border-b ${
              actionType === 'approve' 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {actionType === 'approve' ? (
                  <Trash2 className="h-5 w-5 text-rose-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-400" />
                )}
                <h3 className="font-extrabold text-base text-white">
                  {actionType === 'approve'
                    ? (isHindi ? 'डेटा हटाने की पुष्टि करें' : 'Confirm Data Erasure')
                    : (isHindi ? 'अनुरोध अस्वीकार करें' : 'Decline Deletion Request')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-white text-sm">{selectedRequest.name}</p>
                <p className="text-slate-400 font-mono">{selectedRequest.phone || selectedRequest.email}</p>
                <p className="text-slate-400 text-[11px] pt-1">
                  <strong>Ref ID:</strong> {selectedRequest.id}
                </p>
              </div>

              {actionType === 'approve' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-200 leading-relaxed">
                  <p className="font-bold text-rose-400">
                    {isHindi ? 'स्थायी विलोपन प्रभाव:' : 'Permanent Purge Effects:'}
                  </p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-rose-300/90">
                    <li>{isHindi ? 'ग्राहक CRM रिकॉर्ड हटा दिया जाएगा' : 'Customer profile removed from CRM'}</li>
                    <li>{isHindi ? 'SQL user खाता और क्रेडेंशियल्स डिलीट होंगे' : 'SQL user login access revoked'}</li>
                    <li>{isHindi ? 'लॉयल्टी रिवॉर्ड पॉइंट्स और वीआईपी स्थिति शून्य' : 'Reward points and VIP membership wiped'}</li>
                    <li>{isHindi ? 'ऐतिहासिक ऑर्डर विवरण पहचान रहित (Anonymized) होंगे' : 'Order records anonymized under GDPR'}</li>
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  {isHindi ? 'व्यवस्थापक टिप्पणी / कारण' : 'Admin Notes & Reason'}
                </label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={handleConfirmAction}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${
                  actionType === 'approve'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {processingId 
                  ? (isHindi ? 'संसाधित हो रहा है...' : 'Processing...') 
                  : actionType === 'approve' 
                  ? (isHindi ? 'हाँ, स्थायी रूप से हटाएं' : 'Confirm & Delete Data') 
                  : (isHindi ? 'अस्वीकार करें' : 'Reject Request')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
