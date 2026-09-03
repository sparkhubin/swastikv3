import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Trash2, 
  ShieldAlert, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Phone, 
  Mail, 
  User, 
  HelpCircle 
} from 'lucide-react';

export default function DataDeletionModal({ isOpen, onClose, userProfile = null, onSuccess }) {
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const { addDataDeletionRequest, dataDeletionRequests } = useData();

  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [reason, setReason] = useState('Privacy and data concerns');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone && !email) {
      setError(isHindi ? 'कृपया मोबाइल नंबर या ईमेल दर्ज करें।' : 'Please provide either a phone number or email.');
      return;
    }

    if (!confirmed) {
      setError(isHindi ? 'कृपया पुष्टि चेकबॉक्स को चिह्नित करें।' : 'Please check the confirmation box before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await addDataDeletionRequest({
        customerId: userProfile?.id || null,
        name: name || userProfile?.name || 'Customer',
        phone: phone || userProfile?.phone || '',
        email: email || userProfile?.email || '',
        reason,
        notes
      });

      setSubmittedRequest(created);
      if (onSuccess) onSuccess(created);
    } catch (err) {
      setError(err.message || (isHindi ? 'अनुरोध सबमिट करने में विफल।' : 'Failed to submit deletion request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmittedRequest(null);
    setError('');
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 block">
                {isHindi ? 'डेटा गोपनीयता एवं सुरक्षा' : 'Data Privacy & GDPR / IT Act'}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {isHindi ? 'डेटा डिलीट करने का अनुरोध' : 'Request Data Deletion'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submittedRequest ? (
          /* Success Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h4 className="text-lg font-extrabold text-slate-900">
                {isHindi ? 'अनुरोध सफलतापूर्वक प्राप्त हुआ!' : 'Request Submitted Successfully!'}
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                {isHindi 
                  ? 'आपका डेटा डिलीट करने का अनुरोध सुरक्षित रूप से दर्ज कर लिया गया है। व्यवस्थापक द्वारा सत्यापन के बाद आपका डेटा स्थायी रूप से हटा दिया जाएगा।'
                  : 'Your request for account and data deletion has been received. Our admin team will process and permanently remove your data within 24-48 hours.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{isHindi ? 'अनुरोध संख्या' : 'Request Reference ID'}:</span>
                <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{submittedRequest.id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{isHindi ? 'स्थिति' : 'Status'}:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="h-3 w-3" />
                  {isHindi ? 'समीक्षा में (Pending Review)' : 'Pending Admin Review'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">{isHindi ? 'अनुरोधित दिनांक' : 'Requested Date'}:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(submittedRequest.requestedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isHindi ? 'ठीक है, बंद करें' : 'Done & Close'}
            </button>
          </div>
        ) : (
          /* Request Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Warning Banner */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-rose-900 leading-relaxed">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isHindi ? 'यह कार्रवाई अपरिवर्तनीय है' : 'Important: Permanent Deletion'}
                </p>
                <p className="text-[11px] text-rose-800/90 mt-0.5">
                  {isHindi 
                    ? 'व्यवस्थापक द्वारा स्वीकृति के बाद आपका व्यक्तिगत विवरण, डिलीवरी पते, रिवॉर्ड पॉइंट्स, और लॉगिन जानकारी हमेशा के लिए मिटा दिए जाएंगे।'
                    : 'Once approved by our admin, your personal profile, addresses, reward points balance, and account access will be permanently erased.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'पूरा नाम' : 'Full Name'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'पंजीकृत मोबाइल नंबर' : 'Registered Mobile'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'हटाने का प्राथमिक कारण' : 'Primary Reason for Deletion'}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 focus:outline-hidden transition-colors"
                >
                  <option value="Privacy and data concerns">
                    {isHindi ? 'गोपनीयता और डेटा सुरक्षा चिंताएं' : 'Privacy and data protection concerns'}
                  </option>
                  <option value="No longer shopping here">
                    {isHindi ? 'अब खरीदारी नहीं करनी है' : 'No longer shopping at this store'}
                  </option>
                  <option value="Relocated outside delivery area">
                    {isHindi ? 'डिलीवरी क्षेत्र से बाहर स्थानांतरित' : 'Relocated outside delivery area'}
                  </option>
                  <option value="Duplicate or unused account">
                    {isHindi ? 'डुप्लिकेट या अप्रयुक्त खाता' : 'Duplicate or unused account'}
                  </option>
                  <option value="Switching to a new phone number">
                    {isHindi ? 'नया फोन नंबर बदल रहे हैं' : 'Switching to a new phone number'}
                  </option>
                  <option value="Other">
                    {isHindi ? 'अन्य कारण' : 'Other'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'अतिरिक्त टिप्पणी / नोट्स (वैकल्पिक)' : 'Additional Notes / Feedback (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isHindi ? 'डेटा हटाने के संबंध में कोई विशेष निर्देश...' : 'Any specific instructions or details...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 focus:outline-hidden transition-colors resize-none"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 h-4 w-4 shrink-0"
                  />
                  <span className="text-[11px] text-slate-700 font-medium leading-relaxed">
                    {isHindi 
                      ? 'मैं पुष्टि करता/करती हूँ कि मैं अपने खाते एवं डेटा को हटाने का अनुरोध कर रहा/रही हूँ और समझता/समझती हूँ कि यह स्थायी है।'
                      : 'I confirm that I want my account and personal data permanently erased, and I understand this action cannot be undone.'}
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting || !confirmed}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {submitting 
                    ? (isHindi ? 'सबमिट हो रहा है...' : 'Submitting...') 
                    : (isHindi ? 'अनुरोध सबमिट करें' : 'Submit Deletion Request')}
                </span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
