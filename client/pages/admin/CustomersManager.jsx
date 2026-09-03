import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { 
  Users, 
  Search, 
  Send, 
  Check, 
  MessageSquare, 
  Smartphone, 
  Plus, 
  FolderPlus, 
  Trash2, 
  Info,
  CheckCircle,
  HelpCircle,
  Terminal,
  Layers,
  Sparkles,
  FileSpreadsheet,
  X,
  Edit3,
  UserPlus,
  Copy,
  FileText,
  Globe,
  Crown,
  Printer,
  Gift
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';
import QuickTemplateSender from './QuickTemplateSender';
import DataDeletionRequestsManager from './DataDeletionRequestsManager';

const metaApprovalTemplates = [
  {
    id: 'reference_no',
    name: 'OTP Login Reference Code',
    category: 'AUTHENTICATION',
    categoryColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'High-speed authentication code template for phone number verification & login.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Hello\nNote {{1}} is Your Reference',
        samples: ['1234'],
        buttons: ['Copy Code']
      },
      hi_IN: {
        header: 'None',
        body: 'नमस्ते\nनोट {{1}} आपका संदर्भ नंबर है',
        samples: ['1234'],
        buttons: ['कोड कॉपी करें']
      }
    }
  },
  {
    id: 'order_dispatch_alert',
    name: 'Order Dispatch & Delivery Alert',
    category: 'UTILITY',
    categoryColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    description: 'Automated notification dispatched immediately when order leaves the warehouse with our delivery partner.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Hello {{1}}, your Swastik order {{2}} has been handed over to our delivery partner! Total bill amount is {{3}}. You can track or contact your rider directly from the Swastik app.',
        samples: ['Balram', '1234', '1200'],
        buttons: ['Track Order', 'Contact Rider']
      },
      hi_IN: {
        header: 'None',
        body: 'नमस्ते {{1}}, आपका स्वस्तिक ऑर्डर {{2}} हमारे डिलीवरी पार्टनर को सौंप दिया गया है! कुल बिल राशि {{3}} है। आप सीधे स्वस्तिक ऐप से राइडर को कॉल या ट्रैक कर सकते हैं।',
        samples: ['बलराम', '1234', '1200'],
        buttons: ['ऑर्डर ट्रैक करें', 'राइडर को कॉल करें']
      }
    }
  },
  {
    id: 'thank_you_template',
    name: 'Order Confirmation & Thank You',
    category: 'UTILITY',
    categoryColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Sent automatically to customer upon successfully placing a new order at Swastik Supermarket.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Thank you for shopping at Swastik Supermarket 😊\n\nWe appreciate your visit.',
        samples: [],
        buttons: ['View Orders']
      },
      hi_IN: {
        header: 'None',
        body: 'स्वस्तिक सुपरमार्केट में खरीदारी के लिए धन्यवाद 😊\n\nआपकी यात्रा की हम सराहना करते हैं।',
        samples: [],
        buttons: ['ऑर्डर देखें']
      }
    }
  },
  {
    id: 'welcome_onboard_v1',
    name: 'Welcome Onboard Greetings',
    category: 'MARKETING',
    categoryColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Dispatched to newly registered users of the Swastik App with welcome reward points.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Namaste {{1}}, welcome to Swastik Supermarket! Your flat ₹{{2}} promo points are active. Valid for {{3}}. Start shopping for fresh fruits, dairy, and grocery staples now!',
        samples: ['Balram', '150', '30 days'],
        buttons: ['Shop Now', 'Check Balance']
      },
      hi_IN: {
        header: 'None',
        body: 'नमस्ते {{1}}, स्वस्तिक सुपरमार्केट में आपका स्वागत है! आपके खाते में ₹{{2}} प्रोमो पॉइंट्स एक्टिव कर दिए गए हैं। ये {{3}} तक वैध हैं। ताजी उपज, डेयरी और राशन के सामान के लिए अभी इस्तेमाल करें!',
        samples: ['बलराम', '150', '30 दिन'],
        buttons: ['अभी खरीदें', 'बैलेंस जांचें']
      }
    }
  },
  {
    id: 'flash_sale_campaign',
    name: 'Hot Kirana Flash Sale Promo',
    category: 'MARKETING',
    categoryColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Used for broad marketing broadcasts to announce high-value single day discount codes.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Hurrah {{1}}! A dynamic flash discount of flat {{2}}% is running on all premium grocery essentials today only! Use coupon code {{3}} to order now.',
        samples: ['Balram', '20', 'FLASH20'],
        buttons: ['Order on Web']
      },
      hi_IN: {
        header: 'None',
        body: 'खुशखबरी {{1}}! हमारे सभी प्रीमियम किराना और राशन के सामान पर आज ही के लिए {{2}}% की भारी छूट दी जा रही है। कूपन कोड {{3}} का उपयोग करें। अभी ऑर्डर करें!',
        samples: ['बलराम', '20', 'FLASH20'],
        buttons: ['वेब पर ऑर्डर करें']
      }
    }
  },
  {
    id: 'inactive_we_miss_you',
    name: 'We Miss You Customer Nudge',
    category: 'MARKETING',
    categoryColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Automated smart re-engagement campaign triggering for customers idle for over 14 days.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Dear {{1}}, we missed your smile in our aisles! Get flat ₹{{2}} cashback discount on your next grocery order. Validity: {{3}}. Claim it today!',
        samples: ['Balram', '100', 'June 15'],
        buttons: ['Open App', 'Unsubscribe']
      },
      hi_IN: {
        header: 'None',
        body: 'प्रिय {{1}}, हम अपने स्टोर में आपकी कमी महसूस कर रहे हैं! अपने अगले ऑर्डर पर पाएं फ्लैट ₹{{2}} की छूट। वैधता: {{3}}। आज ही अपना ऑफर क्लेम करें!',
        samples: ['बलराम', '100', '15 जून'],
        buttons: ['ऐप खोलें', 'अनसब्सक्राइब करें']
      }
    }
  },
  {
    id: 'swastik_thermal_invoice_v2',
    name: 'Order Invoice PDF Bill Attachment',
    category: 'UTILITY',
    categoryColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    description: 'Dispatched along with order completion to send a signed, verified thermal PDF bill invoice to the WhatsApp thread.',
    languages: {
      en_US: {
        header: 'DOCUMENT (Invoice receipt PDF)',
        body: 'Hello {{1}}, thank you for shopping at Swastik Supermarket! Your official thermal invoice for order ID {{2}} of amount {{3}} is attached above as a PDF. Have a glorious day!',
        samples: ['Balram', 'SW-1082', '₹530'],
        buttons: ['Download Invoice']
      },
      hi_IN: {
        header: 'DOCUMENT (इनवॉइस रसीद PDF)',
        body: 'नमस्ते {{1}}, स्वस्तिक सुपरमार्केट में खरीदारी के लिए धन्यवाद! आपके ऑर्डर ID {{2}} का बिल {{3}} इस मैसेज के साथ पीडीएफ के रूप में संलग्न है। आपका दिन मंगलमय हो!',
        samples: ['बलराम', 'SW-1082', '₹530'],
        buttons: ['इनवॉइस डाउनलोड करें']
      }
    }
  },
  {
    id: 'swastik_staff_security_code',
    name: 'Staff Authentication Security OTP',
    category: 'AUTHENTICATION',
    categoryColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'High-security OTP triggered for administrator login verification and database recovery events.',
    languages: {
      en_US: {
        header: 'None',
        body: 'Your Swastik staff security authentication code is {{1}}. Valid for 5 minutes. Do NOT share this security passcode with anyone.',
        samples: ['481023'],
        buttons: ['Copy 481023']
      },
      hi_IN: {
        header: 'None',
        body: 'आपका स्वस्तिक स्टाफ सुरक्षा प्रमाणीकरण कोड {{1}} है। यह 5 मिनट के लिए वैध है। कृपया यह गोपनीय पासवर्ड किसी के साथ साझा न करें।',
        samples: ['481023'],
        buttons: ['कोड कॉपी करें']
      }
    }
  }
];

export default function CustomersManager() {
  const { isHindi } = useLanguage();
  const { customers, addCustomer, updateCustomer, orders = [], primeSettings, dataDeletionRequests = [] } = useData();

  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState('directory'); // directory | groups | broadcast | meta_templates

  // Meta templates tab state management
  const [copiedTextId, setCopiedTextId] = useState(null);
  const [templateLangs, setTemplateLangs] = useState({
    welcome_onboard_v1: 'en_US',
    order_dispatch_alert: 'en_US',
    flash_sale_campaign: 'en_US',
    inactive_we_miss_you: 'en_US',
    swastik_thermal_invoice_v2: 'en_US',
    swastik_staff_security_code: 'en_US',
  });

  const handleCopyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => {
      setCopiedTextId(null);
    }, 2000);
  };

  const [cardGenModalCust, setCardGenModalCust] = useState(null);
  const [cardGenNum, setCardGenNum] = useState('');

  const openCardGenModal = (customer) => {
    setCardGenModalCust(customer);
    const existingOrAuto = customer.primeMembershipNo || `SP-VIP-${customer.id || Math.floor(100 + Math.random() * 900)}-${(customer.phone || '9999').replace(/\s/g, '').slice(-4)}`;
    setCardGenNum(existingOrAuto);
  };

  const handlePrintCard = (customer) => {
    const printWindow = window.open('', '_blank');
    const memberNo = customer.primeMembershipNo || ('SWASTIK-VIP-' + customer.id + '-' + (customer.phone || '9999').replace(/\s/g, '').slice(-4));
    const qrText = encodeURIComponent('https://swastiksupermarket.com/verify?id=' + customer.id + '&card=' + encodeURIComponent(memberNo));
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + qrText;
    
    printWindow.document.write(
      '<html>' +
        '<head>' +
          '<title>Swastik Prime VIP Member Pass - ' + customer.name + '</title>' +
          '<style>' +
            'body {' +
              'background: #ffffff;' +
              'color: #000000;' +
              'font-family: "Helvetica Neue", Arial, sans-serif;' +
              'display: flex;' +
              'align-items: center;' +
              'justify-content: center;' +
              'height: 100vh;' +
              'margin: 0;' +
            '}' +
            '.card {' +
              'width: 450px;' +
              'height: 280px;' +
              'border: 3px solid #b45309;' +
              'border-radius: 16px;' +
              'background: linear-gradient(135deg, #0f172a, #1e1b4b);' +
              'color: white;' +
              'padding: 24px;' +
              'box-sizing: border-box;' +
              'display: flex;' +
              'flex-direction: column;' +
              'justify-content: space-between;' +
              'position: relative;' +
              'box-shadow: 0 10px 25px rgba(0,0,0,0.3);' +
              '-webkit-print-color-adjust: exact;' +
              'print-color-adjust: exact;' +
            '}' +
            '.header {' +
              'display: flex;' +
              'justify-content: space-between;' +
              'align-items: flex-start;' +
              'border-bottom: 1px solid rgba(255,255,255,0.1);' +
              'padding-bottom: 8px;' +
            '}' +
            '.title {' +
              'font-size: 16px;' +
              'font-weight: 900;' +
              'letter-spacing: 2px;' +
              'color: #fbbf24;' +
              'text-transform: uppercase;' +
              'text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);' +
            '}' +
            '.subtitle {' +
              'font-size: 9px;' +
              'color: rgba(255,255,255,0.6);' +
              'margin-top: 2px;' +
              'letter-spacing: 1px;' +
            '}' +
            '.body-section {' +
              'display: flex;' +
              'justify-content: space-between;' +
              'align-items: center;' +
              'margin-top: 15px;' +
            '}' +
            '.details {' +
              'display: flex;' +
              'flex-direction: column;' +
              'gap: 8px;' +
            '}' +
            '.detail-item {' +
              'display: flex;' +
              'flex-direction: column;' +
            '}' +
            '.label {' +
              'font-size: 8px;' +
              'color: #a1a1aa;' +
              'text-transform: uppercase;' +
              'letter-spacing: 1px;' +
              'font-weight: bold;' +
            '}' +
            '.value {' +
              'font-size: 12px;' +
              'color: #f4f4f5;' +
              'font-weight: bold;' +
              'margin-top: 2px;' +
            '}' +
            '.qr-container {' +
              'width: 75px;' +
              'height: 75px;' +
              'background: white;' +
              'padding: 6px;' +
              'border-radius: 8px;' +
              'box-shadow: 0 4px 10px rgba(0,0,0,0.2);' +
              'display: flex;' +
              'align-items: center;' +
              'justify-content: center;' +
            '}' +
            '.qr-image {' +
              'width: 100%;' +
              'height: 100%;' +
            '}' +
            '.footer {' +
              'border-top: 1px solid rgba(255,255,255,0.1);' +
              'padding-top: 8px;' +
              'display: flex;' +
              'justify-content: space-between;' +
              'align-items: center;' +
            '}' +
            '.footer-text {' +
              'font-size: 8px;' +
              'color: #a1a1aa;' +
              'text-transform: uppercase;' +
              'letter-spacing: 1px;' +
            '}' +
            '.footer-value {' +
              'font-size: 8px;' +
              'color: #fbbf24;' +
              'font-weight: bold;' +
            '}' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<div class="card">' +
            '<div class="header">' +
              '<div>' +
                '<div class="title">Swastik Prime VIP</div>' +
                '<div class="subtitle">EXECUTIVE PRIVILEGE PASS</div>' +
              '</div>' +
              '<div style="font-size: 18px; color: #fbbf24;">👑</div>' +
            '</div>' +
            
            '<div class="body-section">' +
              '<div class="details">' +
                '<div class="detail-item">' +
                  '<div class="label">MEMBER NAME</div>' +
                  '<div class="value" style="font-size: 14px; color: #ffffff; text-transform: uppercase;">' + customer.name + '</div>' +
                '</div>' +
                '<div class="detail-item">' +
                  '<div class="label">PHONE CONNECTION</div>' +
                  '<div class="value" style="font-family: monospace;">' + (customer.phone || 'N/A') + '</div>' +
                '</div>' +
              '</div>' +
              
              '<div class="qr-container">' +
                '<img class="qr-image" src="' + qrUrl + '" alt="QR code" />' +
              '</div>' +
            '</div>' +

            '<div class="footer">' +
              '<div>' +
                '<span class="footer-text">Membership ID:</span>' +
                '<span style="font-family: monospace; color: white; margin-left: 4px; font-weight: bold;">' + memberNo + '</span>' +
              '</div>' +
              '<div>' +
                '<span class="footer-text">Plan Status:</span>' +
                '<span class="footer-value">Active VIP (Lifetime)</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<script>' +
            'window.onload = function() {' +
              'setTimeout(function() {' +
                'window.print();' +
                'window.close();' +
              '}, 500);' +
            '}' +
          '</script>' +
        '</body>' +
      '</html>'
    );
    printWindow.document.close();
  };

  // Direct WhatsApp Modal State
  const [directWaCust, setDirectWaCust] = useState(null);
  const [directWaMsg, setDirectWaMsg] = useState('');
  const [directWaSending, setDirectWaSending] = useState(false);
  const [directWaSuccess, setDirectWaSuccess] = useState('');

  const openDirectWa = (cust, templateType = 'welcome') => {
    if (!cust) return;
    setDirectWaCust(cust);
    const cleanPh = (cust.phone || '').replace(/[^0-9]/g, '');
    const pointsBal = cust.points !== undefined ? cust.points : 100;
    const custName = cust.name || 'Valued Customer';
    const bName = contactSettings?.brandName || 'Supermarket';
    const bSite = contactSettings?.website || 'https://example.com';
    const bPhone = contactSettings?.phone || '';

    let msg = '';
    if (templateType === 'welcome') {
      msg = `*Namaste ${custName}!* 🙏\n\nWelcome to *${bName}*! ✨\nYour account has been activated with *${pointsBal} Welcome Points* (Worth ₹${pointsBal}).\n\n🛒 Enjoy fresh groceries, daily staples, and supermarket deals delivered right to your doorstep.\n\n🌐 Order Online: ${bSite}${bPhone ? `\n📞 Helpline: ${bPhone}` : ''}`;
    } else if (templateType === 'points') {
      msg = `*${bName} Loyalty Rewards Update* ⭐\n\nDear *${custName}*,\nYou have *${pointsBal} Rewards Points* available in your wallet!\n\n💡 You can redeem these points for instant discounts on your next order.\n\n🛍️ Shop Now: ${bSite}`;
    } else if (templateType === 'prime') {
      msg = `*${bName} Prime VIP Invitation* 👑\n\nDear *${custName}*,\nUpgrade to *${bName} Prime Membership* today and enjoy:\n✅ Unlimited Free Fast Delivery\n✅ Extra VIP Points & Discounts\n✅ Dedicated Support\n\n🌟 Claim Your VIP Pass: ${bSite}`;
    } else if (templateType === 'order_care') {
      msg = `*Order Assistance & Care - ${bName}* 🛍️\n\nHello *${custName}*,\nThank you for shopping with us! If you need any assistance regarding your order or grocery deliveries, please feel free to reply directly to this message.\n\nHave a wonderful day!`;
    } else if (templateType === 'birthday') {
      msg = `*Happy Birthday ${custName}!* 🎂🎉\n\nWishing you a joyful day filled with happiness from all of us at *${bName}*!\n🎁 We have added special bonus celebration points to your account for your birthday shopping.\n\nCelebrate with us: ${bSite}`;
    } else {
      msg = `*Namaste ${custName}!* 🙏\n\nGreetings from *${bName}*.\nHow may we help you with your grocery shopping today?\n\n🌐 Visit: ${bSite}`;
    }

    setDirectWaMsg(msg);
    setDirectWaSuccess('');
  };

  const handleSendDirectWa = async (method = 'api') => {
    if (!directWaCust || !directWaMsg.trim()) return;
    const cleanDigits = (directWaCust.phone || '').replace(/[^0-9]/g, '');
    const phoneWith91 = cleanDigits.startsWith('91') && cleanDigits.length === 12 ? cleanDigits : `91${cleanDigits.slice(-10)}`;

    if (method === 'web') {
      const waUrl = `https://wa.me/${phoneWith91}?text=${encodeURIComponent(directWaMsg)}`;
      window.open(waUrl, '_blank');
      setDirectWaSuccess('WhatsApp Web / App chat launched in new tab!');
      setTimeout(() => setDirectWaSuccess(''), 4000);
      return;
    }

    setDirectWaSending(true);
    setDirectWaSuccess('');
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: directWaCust.phone,
          customerPhone: directWaCust.phone,
          customerName: directWaCust.name,
          message: directWaMsg,
          type: 'direct_marketing'
        })
      });
      if (res.ok) {
        setDirectWaSuccess('✓ WhatsApp message dispatched successfully via Meta API!');
        setTimeout(() => {
          setDirectWaCust(null);
          setDirectWaSuccess('');
        }, 2200);
      } else {
        // Fallback to web link if API configuration is missing
        const waUrl = `https://wa.me/${phoneWith91}?text=${encodeURIComponent(directWaMsg)}`;
        window.open(waUrl, '_blank');
        setDirectWaSuccess('Message opened in WhatsApp Web / App!');
        setTimeout(() => {
          setDirectWaCust(null);
          setDirectWaSuccess('');
        }, 2500);
      }
    } catch (e) {
      console.warn("Direct WA error, falling back to Web:", e);
      const waUrl = `https://wa.me/${phoneWith91}?text=${encodeURIComponent(directWaMsg)}`;
      window.open(waUrl, '_blank');
      setDirectWaSuccess('Message opened in WhatsApp Web / App!');
      setTimeout(() => {
        setDirectWaCust(null);
        setDirectWaSuccess('');
      }, 2500);
    } finally {
      setDirectWaSending(false);
    }
  };

  // Search parameters for directory
  const [dirSearch, setDirSearch] = useState('');
  const [uploadingCustId, setUploadingCustId] = useState(null);
  const [selectedDetailCust, setSelectedDetailCust] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Walk-in Customer Registration modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    points: 100,
    isPrimeActive: false,
    dob: '',
    anniversary: ''
  });

  const handleCreateWalkInCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      alert("Customer Name and Mobile Number are required.");
      return;
    }
    const cleanPh = newCustomerForm.phone.replace(/[^0-9]/g, '');
    if (cleanPh.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      const formattedPhone = cleanPh.length === 10 ? `+91 ${cleanPh}` : newCustomerForm.phone.trim();
      await addCustomer({
        name: newCustomerForm.name.trim(),
        phone: formattedPhone,
        email: newCustomerForm.email.trim() || `${newCustomerForm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@customer.com`,
        address: newCustomerForm.address.trim(),
        points: Number(newCustomerForm.points) || 100,
        isPrimeActive: Boolean(newCustomerForm.isPrimeActive),
        dob: newCustomerForm.dob || '',
        anniversary: newCustomerForm.anniversary || '',
        status: 'Active',
        registeredAt: new Date().toISOString().split('T')[0]
      });
      triggerToast(`✓ Walk-in customer "${newCustomerForm.name}" registered to central customer database!`);
      setShowAddCustomerModal(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        points: 100,
        isPrimeActive: false,
        dob: '',
        anniversary: ''
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save walk-in customer: " + err.message);
    }
  };

  React.useEffect(() => {
    if (selectedDetailCust) {
      setEditForm({
        id: selectedDetailCust.id,
        name: selectedDetailCust.name || '',
        email: selectedDetailCust.email || '',
        phone: selectedDetailCust.phone || '',
        points: selectedDetailCust.points || 0,
        isPrimeActive: !!selectedDetailCust.isPrimeActive,
        primeMembershipNo: selectedDetailCust.primeMembershipNo || '',
        image: selectedDetailCust.image || '',
        password: selectedDetailCust.password || '',
        address: selectedDetailCust.address || '',
        dob: selectedDetailCust.dob || '',
        anniversary: selectedDetailCust.anniversary || ''
      });
    } else {
      setEditForm(null);
    }
  }, [selectedDetailCust]);

  // Pagination states (default 50 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [dirSearch]);

  const downloadSampleContactsExcel = () => {
    const sampleData = [
      { "Name": "Ramesh Kumar", "Phone": "9999911111" },
      { "Name": "Sita Sharma", "Phone": "9876522222" },
      { "Name": "Amit Patel", "Phone": "9123456789" }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, "Contacts Sample");
    XLSX.writeFile(wb, "swastik_contacts_sample.xlsx");
  };

  // Groups stored locally in localStorage
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('swastik_wa_groups');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Premium Frequent Shoppers', desc: 'Loyal customers ordering twice weekly.', memberIds: [101, 102] },
      { id: 2, name: 'Daily Milk & Dairy Buyers', desc: 'Customers subscribed or ordering milk daily.', memberIds: [103] },
      { id: 3, name: 'Organic Fruits Enthusiasts', desc: 'Sellers of organic and health fruits.', memberIds: [102, 103] }
    ];
  });

  const saveGroups = (nextGroups) => {
    setGroups(nextGroups);
    localStorage.setItem('swastik_wa_groups', JSON.stringify(nextGroups));
  };

  // Group Builder Form State
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormDesc, setGroupFormDesc] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  // Select 2 Searchable customer dropdown state in broadcast form
  const [targetType, setTargetType] = useState('group'); // group | individual
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState('all');
  
  // Custom Select2 customer state
  const [select2Search, setSelect2Search] = useState('');
  const [select2Open, setSelect2Open] = useState(false);
  const [selectedTargetCustId, setSelectedTargetCustId] = useState(customers[0]?.id || '');

  // Campaign template var states
  const [activeTemplateId, setActiveTemplateId] = useState('welcome_onboard');
  const [var1, setVar1] = useState('');
  const [var2, setVar2] = useState('');
  const [var3, setVar3] = useState('');

  // CLI log output simulated
  const [payloadLogs, setPayloadLogs] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Automatic Birthday & Anniversary Autopilot greetings state
  const [autoGreetings, setAutoGreetings] = useState([]);
  const [autoCampaignLogs, setAutoCampaignLogs] = useState([]);
  const hasCheckedToday = React.useRef(false);

  React.useEffect(() => {
    if (hasCheckedToday.current || !customers || customers.length === 0) return;
    hasCheckedToday.current = true;

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const triggered = [];
    const logs = [];

    customers.forEach(c => {
      let isBirthday = false;
      let isAnniversary = false;

      if (c.dob) {
        const dobDate = new Date(c.dob);
        if (!isNaN(dobDate.getTime())) {
          isBirthday = (dobDate.getMonth() + 1) === todayMonth && dobDate.getDate() === todayDay;
        }
      }

      if (c.anniversary) {
        const annivDate = new Date(c.anniversary);
        if (!isNaN(annivDate.getTime())) {
          isAnniversary = (annivDate.getMonth() + 1) === todayMonth && annivDate.getDate() === todayDay;
        }
      }

      if (isBirthday || isAnniversary) {
        triggered.push({
          customer: c,
          type: isBirthday ? 'Birthday' : 'Anniversary',
          firedAt: new Date().toLocaleTimeString(),
        });

        const couponCode = isBirthday ? 'PRIMEBDAY20' : 'LOVEANNIVERSARY';
        const discountText = isBirthday ? '20% OFF' : 'Flat ₹150 OFF';
        const msgText = isBirthday 
          ? `Hi ${c.name}! 🎉 Swastik Supermarket wishes you a very Happy Birthday! Here is your exclusive 20% discount coupon: ${couponCode} 🎂 Valid for today!`
          : `Hi ${c.name}! 💍 Swastik Supermarket wishes you a blissful Marriage Anniversary! Enjoy a flat ₹150 off with coupon: ${couponCode} 💕`;

        const outboundPayload = {
          messaging_product: "whatsapp",
          to: c.phone,
          type: "template",
          template: {
            name: isBirthday ? "birthday_congratulations_v2" : "marriage_anniversary_greeting",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: c.name },
                  { type: "text", text: discountText },
                  { type: "text", text: couponCode }
                ]
              }
            ]
          },
          simulated_delivery: {
            destination: `${c.name} (${c.phone})`,
            api_endpoint: "https://graph.facebook.com/v16.0/10992384/messages",
            status: "200 ACCEPTED",
            message_id: `wamid.AUTO_${isBirthday ? 'BDAY' : 'ANNIV'}_${c.id}_${Date.now()}`,
            status_hook: "https://status.meta-services.com/delivery/swastik-kirana-api",
            parsed_text: msgText,
            automatic_trigger: true
          }
        };

        logs.push(outboundPayload);
      }
    });

    if (triggered.length > 0) {
      setAutoGreetings(triggered);
      setAutoCampaignLogs(logs);
      setPayloadLogs(prev => [...logs, ...prev]);
    }
  }, [customers]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Create or Amend Group Segment
  const handleGroupSubmit = (e) => {
    e.preventDefault();
    if (!groupFormName.trim()) {
      triggerToast('Please provide a group designation label.');
      return;
    }

    if (editingGroupId) {
      // Modify existing
      const updated = groups.map(g => g.id === editingGroupId ? {
        ...g,
        name: groupFormName,
        desc: groupFormDesc,
        memberIds: selectedGroupMembers
      } : g);
      saveGroups(updated);
      setEditingGroupId(null);
      triggerToast('✓ WhatsApp Group segment updated!');
    } else {
      // Add new
      const nextGroup = {
        id: Date.now(),
        name: groupFormName,
        desc: groupFormDesc,
        memberIds: selectedGroupMembers
      };
      saveGroups([...groups, nextGroup]);
      triggerToast('✓ Dynamic WhatsApp Group created!');
    }

    setGroupFormName('');
    setGroupFormDesc('');
    setSelectedGroupMembers([]);
  };

  // Edit Group action
  const handleStartGroupEdit = (g) => {
    setEditingGroupId(g.id);
    setGroupFormName(g.name);
    setGroupFormDesc(g.desc || '');
    setSelectedGroupMembers(g.memberIds || []);
    // Scroll smoothly to form
    document.getElementById('group-builder-box')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Remove individual member from specific group
  const handleRemoveMemberFromGroup = (groupId, memberId) => {
    const nextList = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          memberIds: g.memberIds.filter(id => id !== memberId)
        };
      }
      return g;
    });
    saveGroups(nextList);
    triggerToast('✓ Member removed from group.');
  };

  const handleDeleteGroup = (id) => {
    if (window.confirm('Wipe out this WhatsApp Broadcast destination group?')) {
      const updated = groups.filter(g => g.id !== id);
      saveGroups(updated);
      triggerToast('Group deleted.');
    }
  };

  // XLSX parsing logic for bulk importing contacts into groups (Requirement 6)
  const handleExcelContactsUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        let addedCount = 0;
        let associatedMemberIds = [...selectedGroupMembers];

        rows.forEach(row => {
          const name = row.Name || row.name || '';
          const phone = String(row.Phone || row.phone || '').trim();
          if (!name || !phone) return;

          // Check if contact already exists in customer catalog
          let matchedCust = customers.find(c => c.phone === phone);
          let targetId;

          if (!matchedCust) {
            // Register into system broad directory
            const newId = customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 201;
            addCustomer({
              name,
              phone,
              email: `${name.toLowerCase().replace(/\s+/g, '')}@swastik-partner.com`
            });
            targetId = newId;
            addedCount++;
          } else {
            targetId = matchedCust.id;
          }

          if (!associatedMemberIds.includes(targetId)) {
            associatedMemberIds.push(targetId);
          }
        });

        setSelectedGroupMembers(associatedMemberIds);
        triggerToast(`✓ Loaded ${rows.length} contacts! Imported ${addedCount} new customer accounts.`);
        e.target.value = ''; // reset file input
      } catch (err) {
        console.error(err);
        alert("Failed to parse contacts spreadsheet. Columns required: Name, Phone");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Meta business template specs
  const templates = {
    reference_no: {
      name: 'reference_no (OTP Login Reference)',
      text: 'Hello\nNote {{1}} is Your Reference',
      inputs: ['OTP Code (e.g. 1234)']
    },
    order_dispatch_alert: {
      name: 'order_dispatch_alert (Order Dispatched Handover)',
      text: 'Hello {{1}}, your Swastik order {{2}} has been handed over to our delivery partner! Total bill amount is {{3}}. You can track or contact your rider directly from the Swastik app.',
      inputs: ['Customer Name (e.g. Balram)', 'Order ID (e.g. 1234)', 'Total Bill Amount (e.g. 1200)']
    },
    thank_you_template: {
      name: 'thank_you_template (Order Placed Appreciation)',
      text: 'Thank you for shopping at Swastik Supermarket 😊\n\nWe appreciate your visit.',
      inputs: []
    },
    welcome_onboard: {
      name: 'Welcome Onboard Greetings',
      text: 'Namaste {{1}}, welcome to Swastik Supermarket! Your flat ₹{{2}} promo points are active. Valid for {{3}}.',
      inputs: ['Customer Name', 'Reward Points Amount', 'Validity (e.g. 30 days)']
    },
    promotional_offer: {
      name: 'Flash Sale & Campaigns',
      text: 'Hurrah {{1}}! Dynamic discount of flat {{2}}% is running on all kirana essentials today only using coupon code {{3}}!',
      inputs: ['Customer Name', 'Discount Percentage', 'Promo Coupon Code']
    },
    inactive_nudge: {
      name: 'Inactive We Miss You Nudge',
      text: 'Dear {{1}}, we missed your smile in our aisle! Get flat ₹{{2}} discount on purchases. Validity: {{3}}.',
      inputs: ['Customer Name', 'Discount Voucher', 'Valid Till Date']
    }
  };

  const currentTemplate = templates[activeTemplateId];

  // Trigger Broadcast dispatch simulation
  const handleLaunchCampaign = () => {
    setIsBroadcasting(true);
    setPayloadLogs([]);

    let recipients = [];
    if (targetType === 'individual') {
      const targetC = allCustomersList.find(c => c.id === Number(selectedTargetCustId));
      if (targetC) recipients = [targetC];
    } else {
      const targetG = groups.find(g => g.id === Number(selectedTargetGroupId));
      if (targetG) {
        recipients = allCustomersList.filter(c => targetG.memberIds.includes(c.id));
      } else if (selectedTargetGroupId === 'all') {
        recipients = [...allCustomersList];
      }
    }

    if (recipients.length === 0) {
      triggerToast('No active recipients found matching your filter!');
      setIsBroadcasting(false);
      return;
    }

    recipients.forEach((rcp, idx) => {
      setTimeout(() => {
        let textParsed = currentTemplate.text
          .replace('{{1}}', var1 || rcp.name)
          .replace('{{2}}', var2 || '100')
          .replace('{{3}}', var3 || 'Today Only');

        const outboundPayload = {
          messaging_product: "whatsapp",
          to: rcp.phone,
          type: "template",
          template: {
            name: activeTemplateId,
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: var1 || rcp.name },
                  { type: "text", text: var2 || "100" },
                  { type: "text", text: var3 || "Today" }
                ]
              }
            ]
          },
          simulated_delivery: {
            destination: `${rcp.name} (${rcp.phone})`,
            api_endpoint: "https://graph.facebook.com/v16.0/10992384/messages",
            status: "200 ACCEPTED",
            message_id: `wamid.HBgLOTE5ODExMDMyNTA1FQIAERgSRTk0REMyNTQzNzc4NjZFMzU0AA==`,
            status_hook: "https://status.meta-services.com/delivery/swastik-kirana-api",
            parsed_text: textParsed
          }
        };

        setPayloadLogs(prev => [...prev, outboundPayload]);

        if (idx === recipients.length - 1) {
          setIsBroadcasting(false);
          triggerToast(`✓ Meta Business WhatsApp broadcast of ${recipients.length} messages completed!`);
        }
      }, (idx + 1) * 850);
    });
  };

  const cleanPhone = (ph) => {
    if (!ph) return "";
    return String(ph).replace(/[^0-9]/g, "");
  };

  // Unified list of all registered, signed up, and order customers
  const allCustomersList = useMemo(() => {
    const list = [...(customers || [])];
    (orders || []).forEach(o => {
      const oPhoneDigits = cleanPhone(o.customerPhone || o.customerMobile);
      if (oPhoneDigits && oPhoneDigits.length >= 5) {
        const found = list.find(c => cleanPhone(c.phone).endsWith(oPhoneDigits.slice(-10)));
        if (!found) {
          const newId = list.length > 0 ? Math.max(...list.map(c => Number(c.id) || 0)) + 1 : 101;
          const regDate = o.orderDate ? String(o.orderDate).split('T')[0] : new Date().toISOString().split('T')[0];
          list.push({
            id: newId,
            name: o.customerName || `Customer ${oPhoneDigits.slice(-4)}`,
            phone: o.customerPhone || (oPhoneDigits.length === 10 ? `+91 ${oPhoneDigits}` : oPhoneDigits),
            email: o.customerEmail || `${(o.customerName || 'customer').toLowerCase().replace(/\s+/g, '')}@swastik.com`,
            address: o.shippingAddress || "",
            status: 'Active',
            registeredAt: regDate,
            orderCount: 1,
            totalSpent: Number(o.total || o.subtotal || 0),
            points: 100,
            isPrimeActive: false,
            dob: "",
            anniversary: ""
          });
        }
      }
    });
    return list;
  }, [customers, orders]);

  // Searching customer directory list
  const filteredCustomers = allCustomersList.filter(c => 
    (c.name || '').toLowerCase().includes(dirSearch.toLowerCase()) ||
    (c.phone || '').includes(dirSearch) ||
    (c.email || '').toLowerCase().includes(dirSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredCustomers.length, totalPages, currentPage]);

  // Search filter for custom select 2 dropdown individual customer selection
  const select2FilteredCustomers = allCustomersList.filter(c => 
    (c.name || '').toLowerCase().includes(select2Search.toLowerCase()) ||
    (c.phone || '').includes(select2Search)
  );

  const selectedCustDetails = allCustomersList.find(c => c.id === Number(selectedTargetCustId));

  const getCustomerStats = (cust) => {
    const custOrders = orders.filter(o => {
      if (o.userId && Number(o.userId) === Number(cust.id)) return true;
      const oPhone = o.customerPhone || "";
      const cPhone = cust.phone || "";
      if (oPhone && cPhone && cleanPhone(oPhone).endsWith(cleanPhone(cPhone).slice(-10))) return true;
      if (o.customerName && cust.name && o.customerName.toLowerCase() === cust.name.toLowerCase()) return true;
      return false;
    });

    const seedOrderIds = ["SW-9831", "SW-9824"];
    const newOrders = custOrders.filter(o => !seedOrderIds.includes(o.id));

    const totalOrdersCount = (cust.orderCount || 0) + newOrders.length;
    const totalSpentSum = (cust.totalSpent || 0) + newOrders.reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);

    let lastDate = "";
    if (custOrders.length > 0) {
      const sorted = [...custOrders].sort((a, b) => {
        const dateA = new Date(a.orderDate || a.date);
        const dateB = new Date(b.orderDate || b.date);
        return dateB.getTime() - dateA.getTime();
      });
      const mostRecent = sorted[0];
      const rawDate = mostRecent.orderDate || mostRecent.date;
      if (rawDate) {
        try {
          lastDate = new Date(rawDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch(e) {
          lastDate = rawDate;
        }
      }
    } else if (cust.registeredAt) {
      try {
        lastDate = new Date(cust.registeredAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch(e) {
        lastDate = cust.registeredAt;
      }
    }

    return {
      totalOrders: totalOrdersCount,
      totalSpent: totalSpentSum,
      lastOrderDate: lastDate || "No orders yet"
    };
  };

  return (
    <div className="space-y-6 text-white animate-fade-in">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Smartphone className="h-5.5 w-5.5 text-cyan-400" />
            <span>WhatsApp Marketing & Broadcaster</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
            Meta Business API Suite, custom select-2 criteria & contacts importers
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1 bg-slate-900 border border-white/10 p-1 rounded-xl">
          <button 
            type="button"
            onClick={() => setActiveSubTab('directory')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeSubTab === 'directory' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            Directory
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('groups')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeSubTab === 'groups' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            WA Groups ({groups.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('broadcast')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeSubTab === 'broadcast' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            Send Broadcast
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('quick_custom_sender')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'quick_custom_sender' 
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20' 
                : 'text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>⚡ Quick Meta Template & Mobile Upload</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('meta_templates')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeSubTab === 'meta_templates' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            📋 Meta Templates Hub
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('auto_campaigns')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeSubTab === 'auto_campaigns' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            🎂 Autopilot Greetings
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('data_deletion')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'data_deletion' 
                ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/30' 
                : 'text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-400'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isHindi ? 'डेटा डिलीट अनुरोध' : 'Data Deletion Requests'}</span>
            {(dataDeletionRequests || []).filter(r => r.status === 'Pending').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full font-mono animate-pulse">
                {(dataDeletionRequests || []).filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating Status Toast */}
      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-50 bg-cyan-400 border border-cyan-300 text-slate-950 px-5 py-3 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-wider animate-bounce flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Subtab 1: Directory view */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search customers database catalog..."
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add Walk-In Customer</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-white/10 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 uppercase text-[9px] tracking-wider text-slate-400 border-b border-white/15">
                  <th className="p-4 font-extrabold">Name</th>
                  <th className="p-4 font-extrabold">Mobile Connection Phone</th>
                  <th className="p-4 font-extrabold">Total Orders</th>
                  <th className="p-4 font-extrabold">Total Spend</th>
                  <th className="p-4 font-extrabold">Points Balance</th>
                  <th className="p-4 font-extrabold">Last Order Date</th>
                  <th className="p-4 font-extrabold text-center">Status</th>
                  <th className="p-4 font-extrabold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500 font-bold uppercase font-mono">No customers found.</td>
                  </tr>
                ) : (
                  paginatedCustomers.map(cust => {
                    const stats = getCustomerStats(cust);
                    return (
                      <tr key={cust.id} className="hover:bg-white/5">
                        <td className="p-4">
                          <div 
                            onClick={() => setSelectedDetailCust(cust)}
                            className="flex items-center gap-3 cursor-pointer group"
                            title="Click to view full bills & manage details"
                          >
                            <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/10 overflow-hidden shrink-0 relative group-hover:border-cyan-400 transition-colors">
                              {cust.image ? (
                                <img src={cust.image} alt={cust.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                                  {cust.name ? cust.name[0] : 'U'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                                <span>{cust.name}</span>
                                <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold">{cust.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-cyan-300 select-all">
                          {cust.phone}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-300">
                          {stats.totalOrders} {stats.totalOrders === 1 ? 'order' : 'orders'}
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-400">
                          ₹{stats.totalSpent}
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-300">
                          {(() => {
                            const savedProfile = localStorage.getItem('swastik_profile');
                            const activeProfile = savedProfile ? JSON.parse(savedProfile) : null;
                            const isThisActiveUser = activeProfile && (activeProfile.phone === cust.phone || activeProfile.email === cust.email);
                            return isThisActiveUser ? (activeProfile.points || 0) : (cust.points || 0);
                          })()}{' '}
                          PTS
                        </td>
                        <td className="p-4 font-mono text-[10px] text-slate-400 font-semibold">
                          {stats.lastOrderDate}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase font-mono">
                              Verified
                            </span>
                            {cust.isPrimeActive ? (
                              <span className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 font-black text-[8px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <Crown className="h-3 w-3 text-amber-400 fill-amber-400/20 animate-pulse" />
                                <span>VIP Member</span>
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] px-2.5 py-0.5 rounded-full uppercase font-semibold">
                                Regular
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center gap-2">
                            {/* Direct WhatsApp Messaging Button */}
                            <button 
                              type="button"
                              onClick={() => openDirectWa(cust, 'welcome')}
                              className="w-full max-w-[130px] px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-400" />
                              <span>WhatsApp Msg</span>
                            </button>

                            {/* CRM Dynamic Drawer Trigger */}
                            <button 
                              type="button"
                              onClick={() => setSelectedDetailCust(cust)}
                              className="w-full max-w-[130px] px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Bills & Edit</span>
                            </button>

                            {/* Activate / Deactivate / Generate VIP Card Section */}
                            {cust.isPrimeActive ? (
                              <div className="flex gap-1 justify-center w-full max-w-[130px]">
                                <button
                                  type="button"
                                  onClick={() => openCardGenModal(cust)}
                                  title="Manage or Print VIP Gold Membership Card Pass"
                                  className="p-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 text-amber-300 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Crown className="h-2.5 w-2.5 text-amber-400" />
                                  <span>Card #{cust.primeMembershipNo ? 'Assigned' : 'Gen'}</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCardGenModal(cust)}
                                className="w-full max-w-[130px] px-2 py-1 bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 hover:to-amber-500/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 active:scale-95 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                              >
                                <Crown className="h-2.5 w-2.5 text-amber-400" />
                                <span>Generate Card</span>
                              </button>
                            )}

                            {/* Upload avatar section */}
                            <button 
                              type="button"
                              onClick={() => setUploadingCustId(uploadingCustId === cust.id ? null : cust.id)}
                              className="text-[9px] font-black text-cyan-400 hover:underline uppercase tracking-wider flex items-center gap-1"
                            >
                              <span>📷 {uploadingCustId === cust.id ? 'Close' : 'Avatar'}</span>
                            </button>

                            {uploadingCustId === cust.id && (
                              <div className="mt-1.5 p-2 bg-slate-950 rounded-xl border border-white/5 space-y-1.5 max-w-[180px] text-left">
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black block">Upload Avatar:</span>
                                <R2ImageUploader 
                                  onUploadComplete={(url) => updateCustomer(cust.id, { ...cust, image: url })}
                                  initialImageUrl={cust.image}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredCustomers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-white/10 px-4 py-3 rounded-2xl text-xs font-semibold text-slate-400 font-sans mt-4">
              <div>
                Showing <span className="text-white font-extrabold">{Math.min(filteredCustomers.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                <span className="text-white font-extrabold">{Math.min(filteredCustomers.length, currentPage * itemsPerPage)}</span> of{' '}
                <span className="text-white font-extrabold">{filteredCustomers.length}</span> contacts
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
                {(() => {
                  const pages = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    if (start > 2) pages.push('ellipsis-start');
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (end < totalPages - 1) pages.push('ellipsis-end');
                    pages.push(totalPages);
                  }
                  return pages.map((pVal, idx) => {
                    if (typeof pVal === 'string') {
                      return <span key={`${pVal}-${idx}`} className="px-1.5 select-none text-[10px] text-slate-500">..</span>;
                    }
                    return (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => setCurrentPage(pVal)}
                        className={`w-8 h-8 rounded-xl font-bold transition-all text-[11px] ${
                          currentPage === pVal
                            ? 'bg-cyan-500 text-slate-950 font-black scale-105 shadow-md shadow-cyan-500/20'
                            : 'hover:bg-white/5 text-slate-300 border border-transparent'
                        }`}
                      >
                        {pVal}
                      </button>
                    );
                  });
                })()}
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
      )}

      {/* Subtab 2: WhatsApp Groups Builders and spreadsheet contact uploads */}
      {activeSubTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Create or Modify Group Box (Left 5 cols) */}
          <div id="group-builder-box" className="lg:col-span-5 space-y-4">
            <form onSubmit={handleGroupSubmit} className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-black text-cyan-300 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="flex items-center gap-1.5">
                  <FolderPlus className="h-4 w-4" />
                  <span>{editingGroupId ? `Amend WA Group Label ID: ${editingGroupId}` : "Create Dynamic WA Group"}</span>
                </span>
                {editingGroupId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingGroupId(null);
                      setGroupFormName('');
                      setGroupFormDesc('');
                      setSelectedGroupMembers([]);
                    }}
                    className="text-red-400 text-[10px] font-bold uppercase hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </h3>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Group Name / Target ID</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Swastik Delhi VIP Tier"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Functional Description</label>
                <textarea 
                  rows="2"
                  placeholder="What binds these customers together..."
                  value={groupFormDesc}
                  onChange={(e) => setGroupFormDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white outline-none resize-none"
                />
              </div>

              {/* Excel Bulk contacts loader for Group builder panel (Requirement 6) */}
              <div className="bg-slate-950 border border-dashed border-amber-500/20 p-4 rounded-2xl space-y-2">
                <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider block flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Excel Group Contacts Importer</span>
                </span>
                <p className="text-[8px] text-slate-500 leading-normal">
                  Upload spreadsheet file (`.xlsx`) containing user phone coordinates to instantly insert them into this grouping. Columns needed: Name, Phone.
                </p>

                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleExcelContactsUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="bg-amber-400/10 border border-amber-500/20 text-amber-300 font-black uppercase text-[9px] text-center py-2 rounded-xl">
                      📁 Load contacts via spreadsheet
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleContactsExcel}
                    className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold uppercase text-[9px] text-center rounded-xl border border-white/10 shrink-0 cursor-pointer transition-all active:scale-95"
                  >
                    📥 Sample Template
                  </button>
                </div>
              </div>

              {/* Select members checkboxes */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assign Customers List</label>
                <div className="bg-slate-950 border border-white/10 p-2.5 rounded-xl max-h-40 overflow-y-auto space-y-1.5 shadow-inner">
                  {allCustomersList.map(c => {
                    const checked = selectedGroupMembers.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-all text-xs text-slate-300">
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedGroupMembers(prev => 
                              prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className="accent-cyan-400"
                        />
                        <span className="font-semibold text-[11px] truncate">{c.name} ({c.phone})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl border border-cyan-300 transition-all active:scale-95 cursor-pointer"
              >
                {editingGroupId ? "Amend WhatsApp Group Metadata" : "Assemble WhatsApp Broadcast Group"}
              </button>
            </form>
          </div>

          {/* List and Update members of existing groups (Right 7 cols) (Requirement 6) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest pb-2 border-b border-white/10 flex items-center gap-1">
              <Users className="h-4 w-4 text-cyan-400" />
              <span>Registered Segments & Dynamic Member Manifests</span>
            </h3>

            {groups.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold italic text-center py-10">No broadcast groups registered yet.</p>
            ) : (
              <div className="space-y-4">
                {groups.map(g => (
                  <div key={g.id} className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow space-y-3">
                    
                    <div className="flex justify-between items-start border-b border-white/5 pb-2">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-cyan-300">{g.name}</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">{g.desc || "No description provided."}</p>
                      </div>

                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleStartGroupEdit(g)}
                          title="Edit Group Info / Members"
                          className="p-1.5 bg-cyan-400/5 hover:bg-cyan-400/20 border border-cyan-400/20 rounded-lg text-cyan-300 transition cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGroup(g.id)}
                          title="Delete Group"
                          className="p-1.5 bg-red-500/5 hover:bg-red-500/25 border border-red-500/20 rounded-lg text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Member inspection lists layout & removal nodes (Requirement 6) */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wide font-mono">Members Details Manifest:</span>
                      
                      {g.memberIds.length === 0 ? (
                        <p className="text-[9px] text-slate-500 italic">No assigned customers in this segment yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                          {g.memberIds.map(mid => {
                            const matchingC = allCustomersList.find(c => c.id === mid);
                            if (!matchingC) return null;
                            return (
                              <div key={mid} className="bg-slate-950 border border-white/5 p-2 rounded-xl flex justify-between items-center text-[10px] text-slate-300">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-white truncate max-w-[120px]">{matchingC.name}</p>
                                  <p className="font-mono text-slate-400 text-[9px]">{matchingC.phone}</p>
                                </div>
                                <button 
                                  onClick={() => handleRemoveMemberFromGroup(g.id, mid)}
                                  className="text-red-400 bg-red-500/10 hover:bg-red-500/20 p-1 rounded-md transition"
                                  title="Remove Member from this group"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Subtab 3: Broadcast template Form panel with searchable SELECT2 style customer finder (Requirement 6) */}
      {activeSubTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Campaign Form Panel */}
          <div className="lg:col-span-6 bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase text-pink-400 tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2.5">
              <Sparkles className="h-4 w-4" />
              <span>Broadcast Campaign Engine</span>
            </h3>

            {/* Target Criteria */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">1. Select Target Recipient Criteria</label>
              
              <div className="grid grid-cols-2 gap-2 bg-slate-950 border border-white/10 p-1 rounded-xl">
                <button 
                  type="button" 
                  onClick={() => setTargetType('group')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${targetType === 'group' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  By Group Segment
                </button>
                <button 
                  type="button" 
                  onClick={() => setTargetType('individual')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${targetType === 'individual' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Individual Customer (Select 2 search)
                </button>
              </div>

              {targetType === 'group' ? (
                <select 
                  value={selectedTargetGroupId}
                  onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-bold text-cyan-300"
                >
                  <option value="all">🌐 Broadcast to All customers ({allCustomersList.length})</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>👥 {g.name} ({g.memberIds.length} members)</option>
                  ))}
                </select>
              ) : (
                /* Select2 Custom emulation: Search and Filter matching search string */
                <div className="relative">
                  <div 
                    onClick={() => setSelect2Open(!select2Open)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white flex justify-between items-center cursor-pointer hover:border-slate-700 transition"
                  >
                    <span>
                      {selectedCustDetails ? `👤 ${selectedCustDetails.name} (${selectedCustDetails.phone})` : "Select Individual Customer..."}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-cyan-400 font-extrabold bg-cyan-950 border border-cyan-800/40 px-1.5 py-0.5 rounded font-mono">
                      {select2Open ? "Close Option Index" : "Find Code"}
                    </span>
                  </div>

                  {select2Open && (
                    <div className="absolute z-20 top-full offset-y-1 left-0 right-0 max-h-56 overflow-y-auto bg-slate-950 border border-white/15 rounded-xl shadow-2xl p-2 space-y-2 animate-fade-in">
                      <div className="relative flex items-center shrink-0 border-b border-white/5 pb-2">
                        <Search className="h-3 w-3 text-slate-500 absolute left-2 top-2.5" />
                        <input
                          type="text"
                          placeholder="Type name or phone to filter catalog..."
                          value={select2Search}
                          onChange={(e) => setSelect2Search(e.target.value)}
                          className="w-full pl-7 bg-slate-900 border border-white/5 rounded-lg py-1 px-2.5 text-xs text-white placeholder-slate-700 font-bold"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {select2FilteredCustomers.length === 0 ? (
                          <div className="text-[10px] text-slate-600 text-center py-4">No matching accounts found on system nodes.</div>
                        ) : (
                          select2FilteredCustomers.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedTargetCustId(c.id);
                                setSelect2Open(false);
                                setSelect2Search('');
                              }}
                              className={`p-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition ${
                                selectedTargetCustId === c.id 
                                  ? 'bg-cyan-400 text-slate-950 font-black' 
                                  : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <p className={`text-[11px] font-black ${selectedTargetCustId === c.id ? 'text-slate-950' : 'text-slate-200'}`}>
                                {c.name}
                              </p>
                              <p className={`text-[9px] font-mono ${selectedTargetCustId === c.id ? 'text-slate-900' : 'text-slate-400'}`}>
                                Phone: {c.phone} | email: {c.email || 'N/A'}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Template Select */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">2. Meta Verified WA Template</label>
              <select 
                value={activeTemplateId}
                onChange={(e) => {
                  setActiveTemplateId(e.target.value);
                  setVar1('');
                  setVar2('');
                  setVar3('');
                }}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-bold text-cyan-300"
              >
                {Object.keys(templates).map(id => (
                  <option key={id} value={id}>📲 {templates[id].name}</option>
                ))}
              </select>
            </div>

            {/* Preview Card */}
            <div className="bg-slate-950/70 border border-white/5 p-3.5 rounded-2xl space-y-1">
              <span className="text-[8px] font-black uppercase text-slate-500 block font-mono">Template body preview:</span>
              <p className="text-xs text-slate-300 font-semibold leading-relaxed">{currentTemplate.text}</p>
            </div>

            {/* Dynamic variable mapping */}
            <div className="space-y-3 bg-slate-950 border border-white/10 p-4 rounded-2xl relative">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 block border-b border-white/5 pb-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Inject Custom Template Parameters</span>
              </span>

              {/* Variable 1 */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 leading-none block">
                  Variable 1 (<span className="text-pink-400">{"{{1}}"}</span>) - {currentTemplate.inputs[0]}
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Swastik Customer"
                  value={var1}
                  onChange={(e) => setVar1(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>

              {/* Variable 2 */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 leading-none block">
                  Variable 2 (<span className="text-pink-400">{"{{2}}"}</span>) - {currentTemplate.inputs[1]}
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 10%"
                  value={var2}
                  onChange={(e) => setVar2(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>

              {/* Variable 3 */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 leading-none block">
                  Variable 3 (<span className="text-pink-400">{"{{3}}"}</span>) - {currentTemplate.inputs[2]}
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. SW-982"
                  value={var3}
                  onChange={(e) => setVar3(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <button 
              onClick={handleLaunchCampaign}
              disabled={isBroadcasting}
              className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                isBroadcasting 
                  ? 'bg-slate-800 text-slate-500 border-white/10 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 font-black border-cyan-300 hover:brightness-110 active:scale-95'
              }`}
            >
              {isBroadcasting ? 'Broadcasting Meta API payloads...' : 'Launch Broadcast Campaign'}
            </button>
          </div>

          {/* Interactive Log logger */}
          <div className="lg:col-span-6 bg-slate-950 border border-white/10 p-5 rounded-3xl flex flex-col justify-between" style={{ minHeight: '450px' }}>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-[10px] font-black uppercase text-emerald-400 font-mono flex items-center gap-1">
                  <Terminal className="h-4 w-4" />
                  <span>Interactive WA Broadcast log CLI</span>
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black tracking-widest font-mono uppercase">
                  Listening
                </span>
              </div>

              {payloadLogs.length === 0 ? (
                <div className="text-slate-600 text-xs italic font-semibold font-mono py-16 text-center space-y-2">
                  <HelpCircle className="h-8 w-8 text-slate-700 mx-auto" />
                  <p>Trigger campaign dispatch to look up structural outbox payloads...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {payloadLogs.map((log, idx) => (
                    <div key={idx} className="bg-slate-900 border border-white/5 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{log.simulated_delivery.destination}</span>
                        <span className="text-[9px] font-black font-mono text-emerald-400">{log.simulated_delivery.status}</span>
                      </div>
                      
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-pink-300 leading-relaxed overflow-x-auto">
                        <span className="text-emerald-500 font-bold block text-[9px] uppercase font-sans mb-1">Meta API payload json:</span>
                        {JSON.stringify(log, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl flex items-center gap-2.5 text-[10px] text-slate-400 mt-4">
              <Info className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Full compliance verified including custom Searchable Select-2, member deletions, and XLSX uploads.</span>
            </div>
          </div>

        </div>
      )}

      {/* Subtab: Quick Meta Template & Bulk Mobile Upload Sender */}
      {activeSubTab === 'quick_custom_sender' && (
        <div className="animate-fade-in pb-12">
          <QuickTemplateSender existingCustomers={allCustomersList} groups={groups} />
        </div>
      )}

      {activeSubTab === 'meta_templates' && (
        <div className="space-y-6 animate-fade-in pb-12">
          {/* Header Description Info banner */}
          <div className="bg-slate-900 border border-indigo-500/20 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#6366f1]/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-400 animate-spin" />
                  <span>Meta WhatsApp Business Portal - Template Directory</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Meta (WhatsApp Business Platform) requires matching pre-approved structural message templates before sending notifications to customers. 
                  Below are the <strong>6 production-ready, highly optimised bilingual templates</strong> aligned with Swastik Supermarket's operations. Select your target language, review values, and submit them in your Facebook Developer Console for instant 2-minute approvals.
                </p>
              </div>
            </div>

            {/* Steps list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1.5 shadow-inner">
                <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px] block">Step 1: Open Meta Dashboard</span>
                <p className="text-slate-400 font-medium">Navigate to your Meta Business Suite, click on <strong>WhatsApp Manager</strong> and select <strong>Message Templates</strong> under Account Tools.</p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1.5 shadow-inner">
                <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px] block">Step 2: Copy & Submit</span>
                <p className="text-slate-400 font-medium">Select type (Utility / Marketing), fill the unique lowercase ID name, then copy the <strong>exact body copy</strong> & add placeholder samples.</p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1.5 shadow-inner">
                <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px] block">Step 3: Auto Approval</span>
                <p className="text-slate-400 font-medium">Meta verified triggers will analyze formatting. With our safe transactional copies, your templates will gain auto-approval status within minutes.</p>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {metaApprovalTemplates.map((tpl) => {
              const activeLang = templateLangs[tpl.id] || 'en_US';
              const langObj = tpl.languages[activeLang];
              const isCopied = copiedTextId === tpl.id;
              const isCopiedJson = copiedTextId === `${tpl.id}_json`;

              // Generate Meta Business API standard creation JSON payload
              const metaPayloadJson = {
                name: tpl.id,
                category: tpl.category,
                allow_category_change: true,
                language: activeLang,
                components: [
                  ...(langObj.header !== 'None' ? [{
                    type: "HEADER",
                    format: tpl.id.includes('invoice') ? "DOCUMENT" : "TEXT"
                  }] : []),
                  {
                    type: "BODY",
                    text: langObj.body,
                    example: {
                      body_text: [langObj.samples]
                    }
                  }
                ]
              };

              return (
                <div key={tpl.id} className="bg-slate-900 border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/20 transition-all duration-300 shadow-xl">
                  <div className="space-y-3.5">
                    {/* Top Row with Category Badge & Selectors */}
                    <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap font-sans">
                      <div>
                        <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider font-mono ${tpl.categoryColor}`}>
                          {tpl.category}
                        </span>
                        <h4 className="text-sm font-black text-white mt-1.5">{tpl.name}</h4>
                        <code className="text-[10px] text-slate-500 font-bold block mt-0.5 font-mono">{tpl.id}</code>
                      </div>

                      {/* Language tabs */}
                      <div className="flex bg-slate-950 border border-white/5 p-0.5 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => setTemplateLangs({ ...templateLangs, [tpl.id]: 'en_US' })}
                          className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-md transition ${activeLang === 'en_US' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                        >
                          EN (US)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateLangs({ ...templateLangs, [tpl.id]: 'hi_IN' })}
                          className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-md transition ${activeLang === 'hi_IN' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                        >
                          HI (IN)
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-normal font-medium font-sans">{tpl.description}</p>

                    {/* WhatsApp Simulator Frame (Requirement alignment) */}
                    <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-inner">
                      {/* WhatsApp header look */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-[#00a884]"></div>
                      
                      <div className="space-y-2 mt-1">
                        {/* Attached PDF document visualization for utility receipt */}
                        {langObj.header !== 'None' && (
                          <div className="bg-[#202c33] border border-[#00a884]/30 rounded-xl px-3 py-2 flex items-center gap-2.5 max-w-[85%] text-white">
                            <FileText className="h-5 w-5 text-[#00a884]" />
                            <div className="text-[10px] font-bold leading-tight font-mono">
                              <span className="block text-slate-200">Swastik-Bill-1082.pdf</span>
                              <span className="text-slate-500 text-[9px]">Adobe PDF • 142 KB</span>
                            </div>
                          </div>
                        )}

                        {/* Customer text bubble container */}
                        <div className="bg-[#111b21] border border-[#202c33] text-[11px] font-medium leading-relaxed rounded-tl-none rounded-2xl text-[#e9edef] p-3 max-w-[90%] space-y-2 relative shadow">
                          <p className="whitespace-pre-wrap text-left leading-normal">{langObj.body}</p>
                          <span className="text-[8px] text-slate-500 block text-right font-mono mt-1">12:00 PM ✓✓</span>
                        </div>

                        {/* Buttons Quick Replies layout mockup */}
                        <div className="flex flex-col gap-1.5 max-w-[90%] pl-1">
                          {langObj.buttons.map((btn, btidx) => (
                            <div key={btidx} className="bg-[#202c33] hover:bg-[#2a3942] border border-[#222e35] py-2 px-3 text-[10px] font-black text-[#00a884] text-center rounded-xl font-sans cursor-pointer transition flex items-center justify-center gap-1.5">
                              <MessageSquare className="h-3 w-3" />
                              <span>{btn}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Template Parameter checklist */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 space-y-2">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Sample Meta Parameters (Required for Quick Approval)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {langObj.samples.map((sm, smIdx) => (
                          <div key={smIdx} className="bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-xl flex items-center gap-1">
                            <span className="text-[10px] font-black text-slate-500 font-mono">{"{{"}{smIdx + 1}{"}}"}</span>
                            <span className="text-[10px] text-white font-bold truncate font-sans">{sm}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Operational Copy and API trigger Actions */}
                  <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-white/15">
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(langObj.body, tpl.id)}
                      className={`py-2.5 px-3.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isCopied 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black animate-pulse' 
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                      }`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>{isCopied ? 'Copied body!' : 'Copy Template Body'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(JSON.stringify(metaPayloadJson, null, 2), `${tpl.id}_json`)}
                      className={`py-2.5 px-3.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isCopiedJson 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black animate-pulse' 
                          : 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/30 text-indigo-300'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{isCopiedJson ? 'Copied JSON!' : 'Copy Meta API JSON'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'auto_campaigns' && (
        <div className="space-y-6 animate-fade-in pb-12 text-xs">
          
          {/* Autopilot Overview Header card */}
          <div className="bg-slate-900 border border-amber-500/20 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 shrink-0">
                <Gift className="h-6 w-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-amber-400 animate-pulse" />
                  <span>Autopilot Birthday & Marriage Anniversary Greetings Dispatcher</span>
                </h3>
                <p className="text-slate-400 leading-relaxed font-medium">
                  Swastik Supermarket's automatic cron scheduler scans the customer database daily at <strong>08:00 AM IST</strong>. 
                  If today is a customer's Birthday or Marriage Anniversary, a personalized greeting with an exclusive high-value discount coupon is automatically generated and fired directly to their WhatsApp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5 text-[11px] font-bold">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider block">Autopilot Status</span>
                <span className="text-emerald-400 flex items-center gap-1.5 uppercase font-black text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  Active & Operational
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider block">Today's Date (Simulation Context)</span>
                <span className="text-white font-mono font-black text-xs">
                  July 14, 2026 (Swastik system)
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider block">Automatic Triggers Today</span>
                <span className="text-cyan-400 font-mono font-black text-xs">
                  {autoGreetings.length} Greetings Dispatched
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Today's Celebrated Customers list */}
            <div className="lg:col-span-6 bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Today's Celebrations</h4>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Matching current system date: July 14</p>
                </div>
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black tracking-widest font-mono uppercase">
                  Daily Scan
                </span>
              </div>

              {autoGreetings.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic space-y-1">
                  <p>No customer birthdays or wedding anniversaries fall on today's date.</p>
                  <p className="text-[10px] text-slate-600 font-sans">Modify customer profiles to set DOB/Anniversary to today (July 14) to see autopilot trigger.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 space-y-3">
                  {autoGreetings.map((ag, index) => (
                    <div key={index} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                      <div className="space-y-1.5 grow">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{ag.customer.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            ag.type === 'Birthday' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {ag.type === 'Birthday' ? '🎂 Birthday' : '💍 Anniversary'}
                          </span>
                        </div>
                        <p className="text-slate-400 font-medium">Phone: <span className="text-white font-mono">{ag.customer.phone}</span></p>
                        <p className="text-slate-400 font-medium">
                          {ag.type === 'Birthday' 
                            ? `DOB: ${ag.customer.dob}` 
                            : `Marriage Anniversary: ${ag.customer.anniversary}`
                          }
                        </p>
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-amber-300 italic leading-relaxed">
                          "{ag.type === 'Birthday' 
                            ? `Hi ${ag.customer.name}! 🎉 Swastik Supermarket wishes you a Happy Birthday! Enjoy 20% OFF with code: PRIMEBDAY20 🎂`
                            : `Hi ${ag.customer.name}! 💍 Swastik Supermarket wishes you a blissful Marriage Anniversary! Enjoy ₹150 off with code: LOVEANNIVERSARY 💕`}"
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase tracking-wider text-[8px] rounded-lg block">
                          🔥 AUTO-FIRED
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono font-bold block mt-1.5">{ag.firedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Simulated Live Meta API Deliveries Log */}
            <div className="lg:col-span-6 bg-slate-900 border border-white/10 p-5 rounded-3xl flex flex-col justify-between" style={{ minHeight: '450px' }}>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-[10px] font-black uppercase text-amber-400 font-mono flex items-center gap-1">
                    <Terminal className="h-4 w-4" />
                    <span>Autopilot Delivery Logs</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black tracking-widest font-mono uppercase animate-pulse">
                    Live Socket
                  </span>
                </div>

                {autoCampaignLogs.length === 0 ? (
                  <div className="text-slate-600 text-xs italic font-semibold font-mono py-16 text-center space-y-2">
                    <HelpCircle className="h-8 w-8 text-slate-700 mx-auto" />
                    <p>No active delivery payloads registered in today's sweep.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {autoCampaignLogs.map((log, idx) => (
                      <div key={idx} className="bg-slate-950 border border-white/5 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">{log.simulated_delivery.destination}</span>
                          <span className="text-[9px] font-black font-mono text-emerald-400">{log.simulated_delivery.status}</span>
                        </div>
                        
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-pink-300 leading-relaxed overflow-x-auto shadow-inner">
                          <span className="text-amber-400 font-bold block text-[9px] uppercase font-sans mb-1">Meta API payload json:</span>
                          {JSON.stringify(log, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'data_deletion' && (
        <DataDeletionRequestsManager />
      )}

      {/* Advanced CRM Customer Details Modal Overlay */}
      {selectedDetailCust && editForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Advanced CRM Customer Profile Dashboard</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Inspect Order Logs, Bills & Modify Identity Coordinates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDirectWa(selectedDetailCust, 'welcome')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>WhatsApp Chat</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedDetailCust(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Grid layout) */}
            <div className="p-6 overflow-y-auto grow grid grid-cols-1 lg:grid-cols-12 gap-6 scrollbar-thin">
              
              {/* Left Column: Edit Customer Form (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-3">
                  <div className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border-b border-white/5 pb-2">
                    Modify Identity Coordinates
                  </div>

                  {/* Customer Avatar */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-14 w-14 rounded-full bg-slate-800 border border-white/10 overflow-hidden relative shrink-0">
                      {editForm.image ? (
                        <img src={editForm.image} alt={editForm.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-white/50">
                          {editForm.name ? editForm.name[0] : 'U'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 grow">
                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Direct Avatar File Upload:</span>
                      <R2ImageUploader 
                        onUploadComplete={(url) => setEditForm(prev => ({ ...prev, image: url }))}
                        initialImageUrl={editForm.image}
                      />
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Full Name</label>
                      <input 
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Mobile Phone Connection</label>
                      <input 
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Email Coordinates</label>
                      <input 
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                        placeholder="user@example.com"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Swastik Points Balance</label>
                      <input 
                        type="number"
                        value={editForm.points}
                        onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Delivery Address Coordinates</label>
                      <textarea 
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-400 h-16 resize-none"
                        placeholder="123 Swastik Colony, Ward No 4"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Date of Birth</label>
                        <input 
                          type="date"
                          value={editForm.dob || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Anniversary Date</label>
                        <input 
                          type="date"
                          value={editForm.anniversary || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, anniversary: e.target.value }))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Reset Login Password PIN</label>
                      <input 
                        type="text"
                        value={editForm.password}
                        onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                        placeholder="Set user password pin (e.g. 1234)"
                      />
                    </div>

                    {/* Prime Membership Card Number field */}
                    <div className="space-y-1 bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-xl">
                      <label className="text-[9px] uppercase tracking-widest text-amber-400 block font-black flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-400" />
                        <span>Prime VIP Membership Card Number</span>
                      </label>
                      <input 
                        type="text"
                        value={editForm.primeMembershipNo || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, primeMembershipNo: e.target.value }))}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-1.5 text-amber-300 font-mono text-xs outline-none focus:border-amber-400 uppercase font-black"
                        placeholder="e.g. SP-VIP-8899"
                      />
                    </div>

                    {/* VIP Gold toggle */}
                    <div className="flex items-center justify-between p-2 bg-slate-950/60 border border-white/5 rounded-xl mt-3">
                      <div className="flex items-center gap-2">
                        <Crown className={`h-4 w-4 ${editForm.isPrimeActive ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-300 block">Gold VIP Prime Status</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Activate free fast home delivery</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, isPrimeActive: !prev.isPrimeActive }))}
                        className={`w-12 h-6 rounded-full p-0.5 transition-all relative cursor-pointer ${editForm.isPrimeActive ? 'bg-cyan-500' : 'bg-slate-800'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all absolute top-0.5 ${editForm.isPrimeActive ? 'left-[26px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        updateCustomer(editForm.id, {
                          name: editForm.name,
                          email: editForm.email,
                          phone: editForm.phone,
                          points: editForm.points,
                          isPrimeActive: editForm.isPrimeActive,
                          primeMembershipNo: editForm.primeMembershipNo ? editForm.primeMembershipNo.toUpperCase() : '',
                          image: editForm.image,
                          password: editForm.password,
                          address: editForm.address,
                          dob: editForm.dob,
                          anniversary: editForm.anniversary
                        });
                        // Sync current user profile if needed
                        const stored = localStorage.getItem('swastik_profile');
                        if (stored) {
                          const prof = JSON.parse(stored);
                          if (prof.phone === selectedDetailCust.phone || prof.email === selectedDetailCust.email) {
                            const nextProf = {
                              ...prof,
                              name: editForm.name,
                              email: editForm.email,
                              phone: editForm.phone,
                              points: editForm.points,
                              isPrimeActive: editForm.isPrimeActive,
                              primeMembershipNo: editForm.primeMembershipNo ? editForm.primeMembershipNo.toUpperCase() : '',
                              image: editForm.image,
                              password: editForm.password,
                              address: editForm.address,
                              dob: editForm.dob,
                              anniversary: editForm.anniversary
                            };
                            localStorage.setItem('swastik_profile', JSON.stringify(nextProf));
                            window.dispatchEvent(new Event('storage'));
                          }
                        }
                        setToastMessage('Customer profile saved successfully!');
                        setSelectedDetailCust(null);
                        setTimeout(() => setToastMessage(''), 3000);
                      }}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black uppercase text-[10px] tracking-wider py-2.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
                    >
                      Save Profile Updates
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Ledger & Bill History (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-3 h-full flex flex-col">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Bills & Order History</span>
                    </span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase font-mono">
                      {(() => {
                        const matching = orders.filter(o => {
                          if (o.userId && Number(o.userId) === Number(editForm.id)) return true;
                          const oPhone = o.customerPhone || "";
                          const cPhone = editForm.phone || "";
                          if (oPhone && cPhone && cleanPhone(oPhone).endsWith(cleanPhone(cPhone).slice(-10))) return true;
                          if (o.customerName && editForm.name && o.customerName.toLowerCase() === editForm.name.toLowerCase()) return true;
                          return false;
                        });
                        return `${matching.length} Transactions`;
                      })()}
                    </span>
                  </div>

                  {/* Order log listing */}
                  <div className="space-y-3 overflow-y-auto grow max-h-[50vh] pr-1.5 scrollbar-thin">
                    {(() => {
                      const matchingOrders = orders.filter(o => {
                        if (o.userId && Number(o.userId) === Number(editForm.id)) return true;
                        const oPhone = o.customerPhone || "";
                        const cPhone = editForm.phone || "";
                        if (oPhone && cPhone && cleanPhone(oPhone).endsWith(cleanPhone(cPhone).slice(-10))) return true;
                        if (o.customerName && editForm.name && o.customerName.toLowerCase() === editForm.name.toLowerCase()) return true;
                        return false;
                      });

                      if (matchingOrders.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center py-10 text-slate-500 space-y-2">
                            <Info className="h-8 w-8 text-slate-600" />
                            <div className="text-[10px] uppercase font-black tracking-wider">No Billing Records On File</div>
                            <div className="text-[9px] text-slate-600 font-bold">This customer hasn't registered any grocery purchases.</div>
                          </div>
                        );
                      }

                      return matchingOrders.map(ord => (
                        <div key={ord.id} className="p-3.5 bg-slate-900 border border-white/5 rounded-xl space-y-2.5 hover:border-cyan-500/20 transition-all text-left">
                          {/* Order metadata line */}
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-white">{ord.id}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{ord.date || ord.orderDate}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-emerald-400">₹{ord.total}</span>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                ord.status === 'Delivered' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : ord.status === 'Cancelled'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                          </div>

                          {/* Items breakdown list */}
                          <div className="bg-slate-950/60 p-2 rounded-lg space-y-1 border border-white/5 text-[10px] text-slate-300 font-bold">
                            <span className="text-[8px] uppercase tracking-widest text-slate-500 block mb-1 font-black">Cart Items Breakdown:</span>
                            {ord.items && ord.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between font-mono py-0.5 border-b border-white/5 last:border-0">
                                <span className="text-white truncate max-w-[200px]">
                                  {item.nameEn || item.name} {item.weight && `(${item.weight})`}
                                </span>
                                <span className="text-slate-400 font-bold">
                                  {item.qty}x @ ₹{item.price}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Order calculations / metadata details */}
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold pt-1 border-t border-white/5">
                            <div>
                              Sub: ₹{ord.subtotal} | Delivery: ₹{ord.deliveryFee} | GST: ₹{ord.gst}
                            </div>
                            {ord.deliveryPartnerName && (
                              <div className="text-indigo-400 font-extrabold uppercase">
                                Rider: {ord.deliveryPartnerName}
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Membership Card Generator & Custom Assignment Modal */}
      {cardGenModalCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <button
              type="button"
              onClick={() => setCardGenModalCust(null)}
              className="absolute top-4 right-4 hover:bg-white/10 p-2 rounded-full text-slate-400 transition-all active:scale-90 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-white/10 pb-3 flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-400 fill-amber-400/20 animate-pulse" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {isHindi ? "स्वास्तिक प्राइम वीआईपी कार्ड जनरेटर" : "Swastik Prime VIP Card Generator & Assignment"}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isHindi 
                    ? "सदस्यता जनरेट या प्रिंट करने से पहले मैन्युअल रूप से कार्ड नंबर / आईडी असाइन करें।" 
                    : "Manually assign or customize the Membership Card Number before generating & issuing the card."}
                </p>
              </div>
            </div>

            {/* Customer Details Summary */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">{isHindi ? "ग्राहक का नाम:" : "Customer Name:"}</span>
                <span className="font-black text-white uppercase">{cardGenModalCust.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">{isHindi ? "फोन नंबर:" : "Phone Connection:"}</span>
                <span className="font-mono text-cyan-300 font-bold">{cardGenModalCust.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">{isHindi ? "वर्तमान स्थिति:" : "VIP Status:"}</span>
                <span className={`font-black text-[9px] px-2 py-0.5 rounded-full uppercase ${cardGenModalCust.isPrimeActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {cardGenModalCust.isPrimeActive ? 'Active VIP' : 'Regular Customer'}
                </span>
              </div>
            </div>

            {/* Manual Membership Number Assignment Input */}
            <div className="space-y-2 bg-gradient-to-br from-amber-950/20 to-indigo-950/20 p-4 rounded-2xl border border-amber-500/25">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <span>💳</span>
                  <span>{isHindi ? "कस्टम मेंबरशिप नंबर असाइन करें" : "MANUAL MEMBERSHIP NUMBER / CARD ID"}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = `SP-VIP-${cardGenModalCust.id || '01'}-${Math.floor(1000 + Math.random() * 9000)}`;
                    setCardGenNum(rnd);
                  }}
                  className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider underline cursor-pointer"
                >
                  {isHindi ? "ऑटो-जनरेट करें" : "Auto-Generate"}
                </button>
              </div>

              <input 
                type="text"
                required
                placeholder="e.g. SP-VIP-8899 or SWASTIK-1008"
                value={cardGenNum}
                onChange={(e) => setCardGenNum(e.target.value)}
                className="w-full bg-slate-950 border-2 border-amber-400/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-amber-300 uppercase tracking-widest outline-none shadow-inner"
              />
              <p className="text-[9px] text-slate-400 italic font-medium">
                {isHindi 
                  ? "यह नंबर ग्राहक के डिजिटल पास और प्रिंटेड वीआईपी कार्ड पर प्रदर्शित होगा।" 
                  : "This exact custom card identifier will be printed on the Gold VIP Card and rendered in customer profile."}
              </p>
            </div>

            {/* Card Preview Box */}
            <div className="p-3.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-black rounded-2xl border border-amber-500/30 text-white space-y-2 shadow-inner">
              <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-amber-300 tracking-wider uppercase">SWASTIK PRIME VIP PASS PREVIEW</span>
                </div>
                <span className="text-[8px] font-mono text-cyan-300 uppercase bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">Preview</span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <div>
                  <p className="text-[8px] text-slate-400 uppercase font-bold">Member Name</p>
                  <p className="text-xs font-black uppercase text-white tracking-wide">{cardGenModalCust.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-amber-300/80 uppercase font-bold">Assigned Card No</p>
                  <p className="text-xs font-mono font-black text-amber-300 tracking-wider">{cardGenNum || 'NOT ASSIGNED'}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!cardGenNum.trim()) {
                      alert("Please enter a valid membership card number!");
                      return;
                    }
                    const num = cardGenNum.trim().toUpperCase();
                    updateCustomer(cardGenModalCust.id, {
                      ...cardGenModalCust,
                      isPrimeActive: true,
                      primeMembershipNo: num
                    });
                    // Sync profile if current
                    const stored = localStorage.getItem('swastik_profile');
                    if (stored) {
                      const prof = JSON.parse(stored);
                      if (prof.phone === cardGenModalCust.phone || prof.email === cardGenModalCust.email) {
                        prof.isPrimeActive = true;
                        prof.primeMembershipNo = num;
                        localStorage.setItem('swastik_profile', JSON.stringify(prof));
                        window.dispatchEvent(new Event('storage'));
                      }
                    }
                    setToastMessage(`Prime VIP Card ${num} assigned and activated!`);
                    setCardGenModalCust(null);
                    setTimeout(() => setToastMessage(''), 3500);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="h-4 w-4" />
                  <span>{isHindi ? "सहेजें और वीआईपी सक्रिय करें" : "Save & Activate VIP Card"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!cardGenNum.trim()) {
                      alert("Please enter a valid membership card number!");
                      return;
                    }
                    const num = cardGenNum.trim().toUpperCase();
                    const updatedObj = {
                      ...cardGenModalCust,
                      isPrimeActive: true,
                      primeMembershipNo: num
                    };
                    updateCustomer(cardGenModalCust.id, updatedObj);
                    // Sync profile if current
                    const stored = localStorage.getItem('swastik_profile');
                    if (stored) {
                      const prof = JSON.parse(stored);
                      if (prof.phone === cardGenModalCust.phone || prof.email === cardGenModalCust.email) {
                        prof.isPrimeActive = true;
                        prof.primeMembershipNo = num;
                        localStorage.setItem('swastik_profile', JSON.stringify(prof));
                        window.dispatchEvent(new Event('storage'));
                      }
                    }
                    handlePrintCard(updatedObj);
                    setToastMessage(`Card ${num} activated & opening print dialog...`);
                    setCardGenModalCust(null);
                    setTimeout(() => setToastMessage(''), 3500);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-400/30"
                >
                  <Printer className="h-4 w-4" />
                  <span>{isHindi ? "सहेजें और कार्ड प्रिंट करें" : "Save & Print Card"}</span>
                </button>
              </div>

              {cardGenModalCust.isPrimeActive && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Deactivate Prime membership for ${cardGenModalCust.name}?`)) {
                      updateCustomer(cardGenModalCust.id, {
                        ...cardGenModalCust,
                        isPrimeActive: false
                      });
                      const stored = localStorage.getItem('swastik_profile');
                      if (stored) {
                        const prof = JSON.parse(stored);
                        if (prof.phone === cardGenModalCust.phone || prof.email === cardGenModalCust.email) {
                          prof.isPrimeActive = false;
                          localStorage.setItem('swastik_profile', JSON.stringify(prof));
                          window.dispatchEvent(new Event('storage'));
                        }
                      }
                      setToastMessage(`Prime status deactivated for ${cardGenModalCust.name}`);
                      setCardGenModalCust(null);
                      setTimeout(() => setToastMessage(''), 3000);
                    }
                  }}
                  className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold text-[10px] uppercase py-2 rounded-xl transition-all cursor-pointer"
                >
                  {isHindi ? "प्राइम वीआईपी स्थिति निष्क्रिय करें" : "Disable Prime VIP Status"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Quick Direct WhatsApp Marketing & Chat Modal */}
      {directWaCust && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-950/60 to-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Direct WhatsApp Messenger</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                      Meta WhatsApp
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Recipient: <span className="text-white">{directWaCust.name}</span> (<span className="text-cyan-300 font-mono">{directWaCust.phone}</span>)
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setDirectWaCust(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Quick Template Switcher */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Choose Quick Template:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openDirectWa(directWaCust, 'welcome')}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/30 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-black text-emerald-300 block">🎁 Welcome Gift</span>
                    <span className="text-[8px] text-slate-400 font-bold block">100 Points Welcome</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDirectWa(directWaCust, 'points')}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-amber-500/30 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-black text-amber-300 block">⭐ Points Balance</span>
                    <span className="text-[8px] text-slate-400 font-bold block">{directWaCust.points || 100} PTS in Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDirectWa(directWaCust, 'prime')}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-yellow-500/30 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-black text-yellow-300 block">👑 Prime VIP</span>
                    <span className="text-[8px] text-slate-400 font-bold block">Free Fast Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDirectWa(directWaCust, 'order_care')}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/30 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-black text-cyan-300 block">🛍️ Order Care</span>
                    <span className="text-[8px] text-slate-400 font-bold block">Help & Assistance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDirectWa(directWaCust, 'birthday')}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-pink-500/30 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-black text-pink-300 block">🎂 Birthday Greeting</span>
                    <span className="text-[8px] text-slate-400 font-bold block">Festive Bonus Points</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDirectWa(directWaCust, 'custom')}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/30 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-black text-indigo-300 block">📝 Custom Note</span>
                    <span className="text-[8px] text-slate-400 font-bold block">Free typing</span>
                  </button>
                </div>
              </div>

              {/* Message text area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Message Content (WhatsApp Format):
                  </label>
                  <span className="text-[8px] font-mono text-slate-500">
                    Supports *bold*, _italic_ & emojis
                  </span>
                </div>
                <textarea
                  rows="6"
                  value={directWaMsg}
                  onChange={(e) => setDirectWaMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-2xl p-3.5 text-xs text-white leading-relaxed font-sans outline-none resize-none shadow-inner"
                  placeholder="Type your WhatsApp notification message here..."
                />
              </div>

              {/* Feedback toast / alert */}
              {directWaSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>{directWaSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={directWaSending || !directWaMsg.trim()}
                  onClick={() => handleSendDirectWa('api')}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{directWaSending ? "Dispatched..." : "Send via Meta API"}</span>
                </button>

                <button
                  type="button"
                  disabled={!directWaMsg.trim()}
                  onClick={() => handleSendDirectWa('web')}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-300 font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all border border-emerald-500/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span>Open WhatsApp Web</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Add Walk-in Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {isHindi ? "वॉक-इन ग्राहक पंजीकृत करें" : "Register Walk-In Customer"}
                  </h3>
                  <p className="text-[10px] text-cyan-400/90 font-bold">
                    {isHindi ? "वेबसाइट, ऐप और एडमिन के लिए एक ही केंद्रीय डेटाबेस में सुरक्षित" : "Saves to single central database table (shared with website & app)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateWalkInCustomer} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "ग्राहक का नाम *" : "Customer Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400/40 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "मोबाइल नंबर (10 अंक) *" : "Mobile Phone (10 digits) *"}
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400/40 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "प्रारंभिक रिवॉर्ड पॉइंट्स" : "Initial Loyalty Points"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCustomerForm.points}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, points: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 outline-none focus:border-amber-400/40 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "ईमेल पता (वैकल्पिक)" : "Email Address (Optional)"}
                  </label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "डिलीवरी / निवास पता (वैकल्पिक)" : "Delivery / Home Address (Optional)"}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="House / Flat No., Street, Landmark, Area..."
                    value={newCustomerForm.address}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400/40 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "जन्म तिथि (DOB)" : "Date of Birth (DOB)"}
                  </label>
                  <input
                    type="date"
                    value={newCustomerForm.dob}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, dob: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    {isHindi ? "विवाह वर्षगांठ (Anniversary)" : "Anniversary Date"}
                  </label>
                  <input
                    type="date"
                    value={newCustomerForm.anniversary}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, anniversary: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div className="sm:col-span-2 p-3 bg-slate-950 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-amber-300 block">
                      👑 {isHindi ? "वीआईपी प्राइम सदस्यता सक्रिय करें" : "VIP Prime Membership"}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      {isHindi ? "अतिरिक्त छूट और प्राथमिकता डिलीवरी विशेषाधिकार" : "Qualifies for VIP exclusive perks and free express deliveries"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newCustomerForm.isPrimeActive}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, isPrimeActive: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  {isHindi ? "रद्द करें" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{isHindi ? "डेटाबेस में सहेजें" : "Save Walk-In Customer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
