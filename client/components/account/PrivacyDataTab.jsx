import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  ShieldCheck, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Gift, 
  Crown, 
  Info,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import DataDeletionModal from './DataDeletionModal';

export default function PrivacyDataTab({ profile, myOrders = [], isHindi }) {
  const { dataDeletionRequests, contactSettings } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resolvedName = profile?.fullName || profile?.name || '';
  // The API already returns only records owned by the authenticated customer.
  const userRequest = (dataDeletionRequests || [])[0] || null;

  return (
    <div className="space-y-6" id="privacy-data-tab">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-lg border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
              {isHindi ? 'डेटा नियंत्रण एवं गोपनीयता' : 'Personal Data & Privacy Center'}
            </span>
            <h2 className="text-xl font-black tracking-tight text-white">
              {isHindi ? 'डेटा प्रबंधन एवं विलोपन अनुरोध' : 'Data Management & Deletion'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isHindi 
                ? 'अपने व्यक्तिगत डेटा की समीक्षा करें या डेटा हटाने (Erasure) का अनुरोध भेजें।'
                : 'Review your collected data profile or request permanent account deletion under privacy laws.'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Deletion Request Status Banner (If Any) */}
      {userRequest && (
        <div className={`p-5 rounded-2xl border transition-all ${
          userRequest.status === 'Approved & Deleted'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : userRequest.status === 'Rejected'
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {userRequest.status === 'Approved & Deleted' ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : userRequest.status === 'Rejected' ? (
                <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Clock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm sm:text-base">
                    {userRequest.status === 'Approved & Deleted' 
                      ? (isHindi ? 'डेटा हटाने का अनुरोध स्वीकृत एवं निष्पादित' : 'Data Deletion Request Approved & Purged')
                      : userRequest.status === 'Rejected'
                      ? (isHindi ? 'डेटा हटाने का अनुरोध अस्वीकृत' : 'Data Deletion Request Declined')
                      : (isHindi ? 'डेटा हटाने का अनुरोध लंबित है' : 'Data Deletion Request Pending Review')}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono border ${
                    userRequest.status === 'Approved & Deleted'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : userRequest.status === 'Rejected'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {userRequest.status}
                  </span>
                </div>

                <p className="text-xs mt-1.5 opacity-90 leading-relaxed max-w-2xl">
                  {userRequest.status === 'Approved & Deleted' 
                    ? (isHindi 
                        ? 'व्यवस्थापक ने आपके डेटा डिलीट अनुरोध को स्वीकृत कर दिया है और आपका व्यक्तिगत रिकॉर्ड हमेशा के लिए हटा दिया गया है।'
                        : 'The administrator has approved your request. Your profile details, points, and saved addresses have been permanently removed.')
                    : userRequest.status === 'Rejected'
                    ? (isHindi
                        ? `व्यवस्थापक द्वारा कारण: "${userRequest.adminNotes}"`
                        : `Admin Reason: "${userRequest.adminNotes}"`)
                    : (isHindi 
                        ? 'आपका डेटा डिलीट करने का अनुरोध सफलतापूर्वक सबमिट किया जा चुका है। व्यवस्थापक इसकी समीक्षा कर रहे हैं और जल्द ही आपका डेटा स्थायी रूप से मिटा दिया जाएगा।'
                        : 'Your data deletion request has been safely registered. Our admin team will review and permanently delete your records shortly.')}
                </p>

                <div className="flex items-center gap-4 mt-3 text-[11px] font-mono opacity-80 flex-wrap">
                  <span>{isHindi ? 'संदर्भ संख्या' : 'Ref ID'}: <strong className="font-bold">{userRequest.id}</strong></span>
                  <span>•</span>
                  <span>{isHindi ? 'दिनांक' : 'Submitted'}: {new Date(userRequest.requestedAt).toLocaleDateString()}</span>
                  {userRequest.processedAt && (
                    <>
                      <span>•</span>
                      <span>{isHindi ? 'संसाधित' : 'Processed'}: {new Date(userRequest.processedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {userRequest.status === 'Rejected' && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
              >
                {isHindi ? 'पुनः अनुरोध भेजें' : 'Re-submit Request'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overview of Personal Data held by the platform */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          <span>{isHindi ? 'वर्तमान में संग्रहीत व्यक्तिगत डेटा' : 'Summary of Your Personal Data Stored'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{isHindi ? 'उपयोगकर्ता प्रोफ़ाइल' : 'Account Name'}</span>
            </div>
            <p className="text-sm font-black text-slate-800">{resolvedName || 'Not provided'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{isHindi ? 'पंजीकृत मोबाइल' : 'Registered Phone'}</span>
            </div>
            <p className="text-sm font-black text-slate-800 font-mono">{profile?.phone || 'Not provided'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{isHindi ? 'ईमेल पता' : 'Registered Email'}</span>
            </div>
            <p className="text-sm font-black text-slate-800 truncate">{profile?.email || 'Not provided'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
              <Gift className="h-3.5 w-3.5 text-amber-500" />
              <span>{isHindi ? 'लॉयल्टी रिवॉर्ड्स' : 'Reward Points'}</span>
            </div>
            <p className="text-sm font-black text-amber-700 font-mono">{profile?.points || 0} PTS</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span>{isHindi ? 'सदस्यता स्थिति' : 'Membership Status'}</span>
            </div>
            <p className="text-sm font-black text-slate-800">
              {profile?.membershipStatus === 'Active' ? 'Swastik Prime VIP' : 'Standard Customer'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isHindi ? 'सहेजा गया पता' : 'Saved Address'}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
              {profile?.address || (profile?.addresses && profile.addresses[0]?.address) || 'No saved address'}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Request Data Deletion */}
      <div className="bg-rose-50/50 border-2 border-rose-200 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider border border-rose-300 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{isHindi ? 'अपरिवर्तनीय क्रिया' : 'Irreversible Action'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-rose-950">
              {isHindi ? 'खाता एवं डेटा डिलीट करने का अनुरोध करें' : 'Request Account & Data Deletion'}
            </h3>
            <p className="text-xs text-rose-800/80 leading-relaxed font-medium">
              {isHindi 
                ? 'यदि आप स्वस्तिक सुपरमार्केट से अपना खाता और व्यक्तिगत डेटा पूरी तरह से हटाना चाहते हैं, तो यहाँ अनुरोध भेजें। व्यवस्थापक द्वारा सत्यापन के बाद आपका डेटा स्थायी रूप से नष्ट कर दिया जाएगा।'
                : 'Submit a formal request to erase your personal profile, addresses, credentials, and reward balance from our servers. Once processed by our administrator, this action cannot be reversed.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isHindi ? 'डेटा हटाने का अनुरोध भेजें' : 'Request Data Deletion'}</span>
          </button>
        </div>
      </div>

      {/* Help & Support note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p>
            {isHindi 
              ? (contactSettings?.phone || contactSettings?.email ? `डेटा गोपनीयता सहायता: ${[contactSettings?.email, contactSettings?.phone].filter(Boolean).join(' / ')}` : 'डेटा गोपनीयता सहायता संपर्क कॉन्फ़िगर नहीं है।')
              : (contactSettings?.phone || contactSettings?.email ? `Privacy support: ${[contactSettings?.email, contactSettings?.phone].filter(Boolean).join(' / ')}` : 'Privacy support contact is not configured.')}
          </p>
        </div>
      </div>

      {/* Data Deletion Modal */}
      <DataDeletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userProfile={{ ...profile, name: resolvedName, fullName: resolvedName }}
      />
    </div>
  );
}
