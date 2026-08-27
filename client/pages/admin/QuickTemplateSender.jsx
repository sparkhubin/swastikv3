import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Send, 
  UploadCloud, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  Layers, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Filter, 
  Users, 
  Search, 
  FileText, 
  HelpCircle,
  Plus,
  Save,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export default function QuickTemplateSender({ existingCustomers = [], groups = [] }) {
  // 1. Template Config State
  const [templateName, setTemplateName] = useState('welcome_onboard_v1');
  const [languageCode, setLanguageCode] = useState('en_US');
  const [category, setCategory] = useState('MARKETING');
  const [headerType, setHeaderType] = useState('NONE'); // NONE, TEXT, DOCUMENT, IMAGE
  const [mediaUrl, setMediaUrl] = useState('');
  const [bodyText, setBodyText] = useState('Namaste {{1}}, welcome to Swastik Supermarket! Your flat ₹{{2}} promo points are active. Valid for {{3}}.');
  const [button1, setButton1] = useState('Shop Now');
  const [button2, setButton2] = useState('');
  
  // Dynamic parameters mapping ({{1}}, {{2}}, {{3}}, {{4}}, {{5}})
  const [params, setParams] = useState([
    { key: '1', label: 'Customer Name (or {{name}})', value: '{{name}}' },
    { key: '2', label: 'Promo Points Amount', value: '150' },
    { key: '3', label: 'Validity Period', value: '30 days' }
  ]);

  // Saved Custom Templates Catalog
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // 2. Recipients / Contact Numbers State
  const [recipientSource, setRecipientSource] = useState('file_paste'); // 'file_paste' | 'store_customers' | 'groups'
  const [rawPastedNumbers, setRawPastedNumbers] = useState('');
  const [uploadedContacts, setUploadedContacts] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedCustIds, setSelectedCustIds] = useState([]);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [testMobileNumber, setTestMobileNumber] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // 3. Execution / Live Broadcast State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState([]);
  const abortControllerRef = useRef(false);

  // Pre-configured popular Meta templates
  const popularPresets = [
    {
      id: 'reference_no',
      name: 'OTP Reference Code (Authentication)',
      category: 'AUTHENTICATION',
      languageCode: 'en_US',
      bodyText: 'Hello\nNote {{1}} is Your Reference',
      params: [{ key: '1', label: 'OTP Code', value: '1234' }],
      headerType: 'NONE'
    },
    {
      id: 'welcome_onboard_v1',
      name: 'Welcome Onboard Greetings',
      category: 'MARKETING',
      languageCode: 'en_US',
      bodyText: 'Namaste {{1}}, welcome to Swastik Supermarket! Your flat ₹{{2}} promo points are active. Valid for {{3}}.',
      params: [
        { key: '1', label: 'Customer Name', value: '{{name}}' },
        { key: '2', label: 'Points Amount', value: '150' },
        { key: '3', label: 'Validity Period', value: '30 days' }
      ],
      headerType: 'NONE'
    },
    {
      id: 'order_dispatch_alert',
      name: 'Order Dispatch & Rider Alert',
      category: 'UTILITY',
      languageCode: 'en_US',
      bodyText: 'Hello {{1}}, your Swastik order {{2}} has been handed over to our delivery partner! Total bill amount is {{3}}. You can track or contact your rider directly from the Swastik app.',
      params: [
        { key: '1', label: 'Customer Name', value: '{{name}}' },
        { key: '2', label: 'Order ID', value: 'SW-1082' },
        { key: '3', label: 'Bill Amount', value: '₹530' }
      ],
      headerType: 'NONE'
    },
    {
      id: 'flash_sale_campaign',
      name: 'Flash Sale & Promo Discount',
      category: 'MARKETING',
      languageCode: 'en_US',
      bodyText: 'Hurrah {{1}}! Dynamic discount of flat {{2}}% is running on all kirana essentials today only using coupon code {{3}}!',
      params: [
        { key: '1', label: 'Customer Name', value: '{{name}}' },
        { key: '2', label: 'Discount %', value: '15%' },
        { key: '3', label: 'Coupon Code', value: 'SWASTIK15' }
      ],
      headerType: 'NONE'
    },
    {
      id: 'swastik_thermal_invoice_v2',
      name: 'Thermal Invoice PDF Bill Attachment',
      category: 'UTILITY',
      languageCode: 'en_US',
      bodyText: 'Hello {{1}}, thank you for shopping at Swastik Supermarket! Your official thermal invoice for order ID {{2}} of amount {{3}} is attached above as a PDF. Have a glorious day!',
      params: [
        { key: '1', label: 'Customer Name', value: '{{name}}' },
        { key: '2', label: 'Order ID', value: 'SW-1082' },
        { key: '3', label: 'Bill Amount', value: '₹530' }
      ],
      headerType: 'DOCUMENT'
    }
  ];

  // Fetch saved custom templates on mount
  useEffect(() => {
    fetchCustomTemplates();
  }, []);

  const fetchCustomTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/whatsapp/custom-templates');
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setSavedTemplates(data.templates);
      }
    } catch (e) {
      console.error('Failed to fetch custom templates:', e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveCurrentTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a Template Name as created in Meta Developer console.');
      return;
    }

    setSavingTemplate(true);
    try {
      const payload = {
        name: templateName.trim().toLowerCase().replace(/\s+/g, '_'),
        displayName: templateName.trim(),
        category,
        languageCode,
        bodyPreview: bodyText,
        paramsCount: params.length,
        paramLabels: params.map(p => p.label)
      };

      const res = await fetch('/api/whatsapp/custom-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSavedTemplates(data.templates || []);
        alert(`Template "${templateName}" successfully saved to catalog!`);
      } else {
        alert(data.error || 'Failed to save template.');
      }
    } catch (e) {
      alert(`Error saving template: ${e.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteCustomTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete saved template "${id}"?`)) return;
    try {
      const res = await fetch(`/api/whatsapp/custom-templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSavedTemplates(data.templates || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyPreset = (preset) => {
    setTemplateName(preset.id || preset.name);
    setCategory(preset.category || 'MARKETING');
    setLanguageCode(preset.languageCode || 'en_US');
    if (preset.bodyText) setBodyText(preset.bodyText);
    if (preset.params && preset.params.length > 0) {
      setParams(preset.params);
    } else if (preset.paramsCount) {
      const gen = [];
      for (let i = 1; i <= preset.paramsCount; i++) {
        gen.push({ key: String(i), label: `Variable {{${i}}}`, value: i === 1 ? '{{name}}' : '' });
      }
      setParams(gen);
    }
    if (preset.headerType) setHeaderType(preset.headerType);
  };

  // Helper to sanitize Indian mobile numbers
  const sanitizePhone = (raw) => {
    if (!raw) return '';
    let digits = String(raw).replace(/[^\d]/g, '');
    if (digits.length === 10) return '91' + digits;
    if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits.length >= 10 ? digits : '';
  };

  // Parse contacts from raw paste and uploaded spreadsheet
  const parsedRecipientsList = useMemo(() => {
    let list = [];

    if (recipientSource === 'file_paste') {
      // 1. From uploaded file
      uploadedContacts.forEach(c => {
        const clean = sanitizePhone(c.phone || c.mobile || c.number);
        if (clean) {
          list.push({
            name: c.name || 'Valued Customer',
            phone: clean,
            rawPhone: c.phone || c.mobile || c.number,
            params: c.params || []
          });
        }
      });

      // 2. From raw text area (comma, space, or newline separated)
      if (rawPastedNumbers.trim()) {
        const lines = rawPastedNumbers.split(/[\n,;]+/);
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;
          // Check if line format is "Name - Phone" or "Name: Phone" or just "Phone"
          let name = 'Valued Customer';
          let phonePart = trimmed;
          if (trimmed.includes('-')) {
            const parts = trimmed.split('-');
            if (parts.length >= 2) {
              name = parts[0].trim() || 'Valued Customer';
              phonePart = parts[1].trim();
            }
          } else if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            if (parts.length >= 2) {
              name = parts[0].trim() || 'Valued Customer';
              phonePart = parts[1].trim();
            }
          }

          const clean = sanitizePhone(phonePart);
          if (clean) {
            list.push({
              name,
              phone: clean,
              rawPhone: phonePart,
              params: []
            });
          }
        });
      }
    } else if (recipientSource === 'store_customers') {
      existingCustomers.forEach(c => {
        const clean = sanitizePhone(c.phone);
        if (clean) {
          list.push({
            name: c.name || 'Valued Customer',
            phone: clean,
            rawPhone: c.phone,
            params: [c.name, c.points || '100', 'Active']
          });
        }
      });
    } else if (recipientSource === 'groups') {
      const grp = groups.find(g => String(g.id) === String(selectedGroupId));
      if (grp) {
        existingCustomers
          .filter(c => grp.memberIds && grp.memberIds.includes(c.id))
          .forEach(c => {
            const clean = sanitizePhone(c.phone);
            if (clean) {
              list.push({
                name: c.name || 'Valued Customer',
                phone: clean,
                rawPhone: c.phone,
                params: [c.name, c.points || '100', 'Active']
              });
            }
          });
      }
    }

    if (removeDuplicates) {
      const seen = new Set();
      const unique = [];
      list.forEach(item => {
        if (!seen.has(item.phone)) {
          seen.add(item.phone);
          unique.push(item);
        }
      });
      return unique;
    }

    return list;
  }, [recipientSource, uploadedContacts, rawPastedNumbers, existingCustomers, groups, selectedGroupId, removeDuplicates]);

  // Excel / CSV file upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!Array.isArray(data) || data.length === 0) {
          alert('Spreadsheet is empty or invalid format.');
          return;
        }

        const formatted = data.map(row => {
          // Detect phone column keys case-insensitively
          const keys = Object.keys(row);
          let phoneKey = keys.find(k => /phone|mobile|contact|number|cell|tel|whatsapp/i.test(k));
          let nameKey = keys.find(k => /name|customer|client|user/i.test(k));
          
          let phoneVal = phoneKey ? row[phoneKey] : (row['Phone'] || row['phone'] || Object.values(row)[0]);
          let nameVal = nameKey ? row[nameKey] : (row['Name'] || row['name'] || 'Customer');

          // Collect any other parameter columns like Param1, Param2, Var1, Amount, etc.
          const paramKeys = keys.filter(k => k !== phoneKey && k !== nameKey);
          const rowParams = paramKeys.map(k => String(row[k]));

          return {
            name: String(nameVal || 'Customer'),
            phone: String(phoneVal || ''),
            params: rowParams
          };
        }).filter(item => sanitizePhone(item.phone));

        setUploadedContacts(prev => [...prev, ...formatted]);
        alert(`Loaded ${formatted.length} valid contacts from spreadsheet!`);
        e.target.value = '';
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Failed to parse spreadsheet. Please upload a standard .xlsx or .csv file with "Phone" and "Name" columns.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleExcel = () => {
    const sample = [
      { "Name": "Ramesh Sharma", "Phone": "9876543210", "Param1": "Ramesh", "Param2": "200", "Param3": "Diwali Offer" },
      { "Name": "Priya Patel", "Phone": "9123456789", "Param1": "Priya", "Param2": "150", "Param3": "Weekend Special" },
      { "Name": "Amit Verma", "Phone": "9988776655", "Param1": "Amit", "Param2": "100", "Param3": "Flash Sale" }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Broadcast_Contacts");
    XLSX.writeFile(wb, "Swastik_Meta_Broadcast_Sample.xlsx");
  };

  // Add / Remove Parameter Fields
  const handleAddParam = () => {
    const nextKey = String(params.length + 1);
    setParams([...params, { key: nextKey, label: `Variable {{${nextKey}}}`, value: '' }]);
  };

  const handleRemoveParam = (index) => {
    const updated = params.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      key: String(i + 1),
      label: p.label.startsWith('Variable {{') ? `Variable {{${i + 1}}}` : p.label
    }));
    setParams(updated);
  };

  // Live parsed preview text
  const previewRenderedText = useMemo(() => {
    let txt = bodyText;
    params.forEach((p, idx) => {
      const val = p.value === '{{name}}' ? 'Balram' : (p.value || `[Param ${idx + 1}]`);
      txt = txt.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
    });
    return txt;
  }, [bodyText, params]);

  // Single Test Dispatch
  const handleSendTest = async () => {
    const clean = sanitizePhone(testMobileNumber);
    if (!clean) {
      alert('Please enter a valid 10-digit mobile number for test send.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    const testParams = params.map(p => {
      if (p.value === '{{name}}') return 'Test User';
      return p.value || 'Test';
    });

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clean,
          message: previewRenderedText,
          templateName: templateName.trim().toLowerCase().replace(/\s+/g, '_'),
          templateParams: testParams,
          languageCode: languageCode || 'en_US',
          mediaUrl: mediaUrl || undefined
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.status === 'dispatched' || data.whatsapp_response?.success) {
        alert(`✅ Test message successfully dispatched to ${clean} via Meta WhatsApp Cloud API!`);
      } else {
        alert(`⚠️ Dispatch response: ${JSON.stringify(data.whatsapp_response?.error || data.error || data.status)}`);
      }
    } catch (e) {
      setTestResult({ error: e.message });
      alert(`Dispatch error: ${e.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Launch Full Campaign Broadcast
  const handleStartBroadcast = async () => {
    if (parsedRecipientsList.length === 0) {
      alert('No valid recipient mobile numbers selected. Please upload an Excel sheet or paste numbers.');
      return;
    }
    if (!templateName.trim()) {
      alert('Please provide a valid Meta Template Name.');
      return;
    }

    const confirmMsg = `Are you sure you want to broadcast Meta Template "${templateName}" to ${parsedRecipientsList.length} customer mobile numbers?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBroadcasting(true);
    abortControllerRef.current = false;
    setLogs([]);
    setBroadcastProgress({
      current: 0,
      total: parsedRecipientsList.length,
      success: 0,
      failed: 0
    });

    const activeTpl = templateName.trim().toLowerCase().replace(/\s+/g, '_');
    let successCounter = 0;
    let failCounter = 0;

    for (let i = 0; i < parsedRecipientsList.length; i++) {
      if (abortControllerRef.current) {
        setLogs(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          phone: 'SYSTEM',
          name: 'ADMIN',
          status: 'ABORTED',
          message: 'Broadcast paused by user.'
        }, ...prev]);
        break;
      }

      const rcp = parsedRecipientsList[i];
      
      // Calculate dynamic parameters
      const rcpParams = params.map((p, pIdx) => {
        if (rcp.params && rcp.params[pIdx]) {
          return rcp.params[pIdx];
        }
        if (p.value === '{{name}}') {
          return rcp.name || 'Valued Customer';
        }
        return p.value || '';
      });

      let parsedMsg = bodyText;
      rcpParams.forEach((val, idx) => {
        parsedMsg = parsedMsg.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
      });

      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: rcp.phone,
            message: parsedMsg,
            templateName: activeTpl,
            templateParams: rcpParams,
            languageCode: languageCode || 'en_US',
            mediaUrl: mediaUrl || undefined
          })
        });

        const data = await res.json();
        const isOk = data.status === 'dispatched' || data.whatsapp_response?.success;

        if (isOk) {
          successCounter++;
          setLogs(prev => [{
            id: i + 1,
            timestamp: new Date().toLocaleTimeString(),
            phone: rcp.phone,
            name: rcp.name,
            status: 'SUCCESS',
            provider: data.whatsapp_response?.provider || 'meta_cloud_api',
            metaId: data.whatsapp_response?.id || `wamid_${Date.now()}_${i}`,
            paramsUsed: rcpParams.join(' | ')
          }, ...prev]);
        } else {
          failCounter++;
          setLogs(prev => [{
            id: i + 1,
            timestamp: new Date().toLocaleTimeString(),
            phone: rcp.phone,
            name: rcp.name,
            status: 'FAILED',
            error: data.whatsapp_response?.error || data.error || 'Failed',
            paramsUsed: rcpParams.join(' | ')
          }, ...prev]);
        }
      } catch (err) {
        failCounter++;
        setLogs(prev => [{
          id: i + 1,
          timestamp: new Date().toLocaleTimeString(),
          phone: rcp.phone,
          name: rcp.name,
          status: 'FAILED',
          error: err.message,
          paramsUsed: rcpParams.join(' | ')
        }, ...prev]);
      }

      setBroadcastProgress({
        current: i + 1,
        total: parsedRecipientsList.length,
        success: successCounter,
        failed: failCounter
      });

      // Small throttling delay between requests to avoid burst rate-limiting
      await new Promise(r => setTimeout(r, 200));
    }

    setIsBroadcasting(false);
  };

  const handleExportLogsExcel = () => {
    if (logs.length === 0) {
      alert('No broadcast logs to export.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(logs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Broadcast_Logs");
    XLSX.writeFile(wb, `WhatsApp_Broadcast_Report_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6 text-slate-200">
      
      {/* Top Banner & Introduction */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <MessageSquare className="w-64 h-64 text-emerald-400" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Meta Cloud API v18.0</span>
            </span>
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono">
              Excel / CSV Upload Engine
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ⚡ Quick Meta WhatsApp Template & Mobile Number Broadcast Engine
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed font-medium">
            Type any new template name created in your <b>Facebook Meta Developer Console</b>, map dynamic variables (<code className="text-pink-400 font-bold">{'{{1}}'}</code>, <code className="text-pink-400 font-bold">{'{{2}}'}</code>), upload an Excel spreadsheet of customer phone numbers, test instantly, and broadcast in real-time.
          </p>
        </div>
      </div>

      {/* Preset Quick Switcher */}
      <div className="space-y-2 bg-slate-900/60 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select From Pre-Verified Templates or Saved Catalog:</span>
          </span>
          <button 
            type="button" 
            onClick={fetchCustomTemplates}
            className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Saved</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {popularPresets.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                templateName === preset.id
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                  : 'bg-slate-950/80 border-white/10 hover:border-cyan-400/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[8px] font-mono uppercase mb-1">
                <span className="text-emerald-400 font-bold">{preset.category}</span>
                {templateName === preset.id && <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <p className="text-[11px] font-black truncate">{preset.name}</p>
              <p className="text-[9px] text-slate-500 font-mono truncate">{preset.id}</p>
            </button>
          ))}

          {/* User's saved custom templates */}
          {savedTemplates.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => handleApplyPreset(tpl)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                templateName === tpl.id
                  ? 'bg-purple-500/20 border-purple-400 text-white shadow-md'
                  : 'bg-slate-950/80 border-purple-500/20 hover:border-purple-400/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[8px] font-mono uppercase mb-1">
                <span className="text-purple-400 font-bold">CUSTOM SAVED</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                  title="Delete from saved"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] font-black truncate text-purple-200">{tpl.name || tpl.id}</p>
              <p className="text-[9px] text-slate-500 font-mono truncate">{tpl.id}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: 2 Columns (Left: Configuration & Audience, Right: Simulator & Dispatch Engine) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Template Config & Audience Input (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Card 1: Meta Template Setup */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">1. Meta Template Configuration</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Specify exact name registered on Meta Business Manager</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCurrentTemplate}
                disabled={savingTemplate}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingTemplate ? 'Saving...' : 'Save To Catalog'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Template Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Meta Template Name (Exact ID) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. festive_flash_sale_v1"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none shadow-inner"
                />
              </div>

              {/* Language Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Language Code <span className="text-red-400">*</span>
                </label>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none cursor-pointer"
                >
                  <option value="en_US">en_US (English - US)</option>
                  <option value="en">en (English - Generic)</option>
                  <option value="hi_IN">hi_IN (Hindi - India)</option>
                  <option value="hi">hi (Hindi - Generic)</option>
                </select>
              </div>
            </div>

            {/* Template Category & Header Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none cursor-pointer"
                >
                  <option value="MARKETING">MARKETING (Offers, Greetings, Promo)</option>
                  <option value="UTILITY">UTILITY (Order Alerts, Invoices, Receipts)</option>
                  <option value="AUTHENTICATION">AUTHENTICATION (OTP, Verification Code)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Media Attachment (Optional PDF / Image URL)
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://.../invoice.pdf"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none shadow-inner"
                />
              </div>
            </div>

            {/* Body Text Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Template Body Text (with {'{{1}}'}, {'{{2}}'})
                </label>
                <span className="text-[9px] font-mono text-slate-500">
                  Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic variables
                </span>
              </div>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-xl p-3 text-xs text-white leading-relaxed font-sans outline-none shadow-inner resize-none"
                placeholder="Namaste {{1}}, welcome to Swastik Supermarket! Your flat ₹{{2}} discount is valid till {{3}}."
              />
            </div>

            {/* Dynamic Variables Mapping */}
            <div className="space-y-3 bg-slate-950/80 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Map Meta Template Variables ({params.length})</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddParam}
                  className="text-[9px] text-cyan-400 hover:text-cyan-300 font-extrabold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Variable</span>
                </button>
              </div>

              {params.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-2">No dynamic variables (static template message).</p>
              ) : (
                <div className="space-y-2.5">
                  {params.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="px-2.5 py-2 bg-pink-500/20 border border-pink-500/30 text-pink-300 text-[10px] font-mono font-black rounded-lg shrink-0">
                        {`{{${idx + 1}}}`}
                      </span>
                      <input
                        type="text"
                        placeholder="Variable description"
                        value={p.label}
                        onChange={(e) => {
                          const next = [...params];
                          next[idx].label = e.target.value;
                          setParams(next);
                        }}
                        className="w-1/3 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. {{name}} or 150 or Today)"
                        value={p.value}
                        onChange={(e) => {
                          const next = [...params];
                          next[idx].value = e.target.value;
                          setParams(next);
                        }}
                        className="grow bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(idx)}
                        className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition"
                        title="Remove variable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-500 italic pt-1">
                    Tip: Type <code className="text-emerald-400 font-bold">{'{{name}}'}</code> to automatically replace with each customer's real name!
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Card 2: Audience & Mobile Number Upload Engine */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">2. Upload & Target Mobile Numbers</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Add numbers via Excel, CSV, text paste, or registered customers</p>
                </div>
              </div>

              {/* Source Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setRecipientSource('file_paste')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                    recipientSource === 'file_paste' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📁 Excel / Paste
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientSource('store_customers')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                    recipientSource === 'store_customers' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👥 All Store ({existingCustomers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientSource('groups')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                    recipientSource === 'groups' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏷️ WA Groups
                </button>
              </div>
            </div>

            {recipientSource === 'file_paste' && (
              <div className="space-y-4">
                {/* Drag and Drop / Upload Excel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-4 text-center bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer group">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-6 h-6 text-cyan-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
                    <p className="text-xs font-black text-white">Upload Excel / CSV File</p>
                    <p className="text-[9px] text-slate-400">Click or drop .xlsx spreadsheet</p>
                  </div>

                  <div className="flex flex-col justify-center gap-2 p-3 bg-slate-950/60 rounded-2xl border border-white/5">
                    <button
                      type="button"
                      onClick={handleDownloadSampleExcel}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Download Sample Excel</span>
                    </button>
                    {uploadedContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUploadedContacts([])}
                        className="w-full py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-[9px] font-bold uppercase transition"
                      >
                        Clear {uploadedContacts.length} Uploaded File Rows
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct Number Paste Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                      Or Direct Paste Mobile Numbers:
                    </label>
                    <span className="text-[9px] font-mono text-slate-500">
                      Comma or newline separated
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={rawPastedNumbers}
                    onChange={(e) => setRawPastedNumbers(e.target.value)}
                    placeholder="9876543210&#10;919876543210&#10;Ramesh - 9988776655"
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl p-3 text-xs text-white leading-relaxed font-mono outline-none shadow-inner resize-none"
                  />
                </div>
              </div>
            )}

            {recipientSource === 'groups' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Select WhatsApp Group Segment:
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl p-3 text-xs text-cyan-300 font-bold outline-none cursor-pointer"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      👥 {g.name} ({g.memberIds?.length || 0} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deduplication & Valid Count Bar */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-white/10">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(e) => setRemoveDuplicates(e.target.checked)}
                  className="accent-cyan-400 rounded w-4 h-4"
                />
                <span className="text-[10px] uppercase font-bold">Auto-deduplicate duplicate phone numbers</span>
              </label>

              <div className="flex items-center gap-2 font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Target:</span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black rounded-lg">
                  {parsedRecipientsList.length} Valid Numbers
                </span>
              </div>
            </div>

            {/* Mini preview list of target recipients */}
            {parsedRecipientsList.length > 0 && (
              <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-black block">Recipient Preview:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {parsedRecipientsList.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1 rounded-lg text-[10px] border border-white/5 font-mono">
                      <span className="text-white font-bold truncate max-w-[100px]">{r.name}</span>
                      <span className="text-cyan-300 font-black">{r.phone}</span>
                    </div>
                  ))}
                </div>
                {parsedRecipientsList.length > 10 && (
                  <p className="text-[9px] text-slate-500 text-center font-bold font-mono pt-1">
                    ... and {parsedRecipientsList.length - 10} more customer mobile numbers
                  </p>
                )}
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Simulator, Test Dispatch, Live Monitor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* WhatsApp Message Preview Mockup */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Live Meta Message Preview</span>
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                {languageCode}
              </span>
            </div>

            {/* Smartphone Simulator */}
            <div className="bg-[#0b141a] border-2 border-[#202c33] rounded-3xl p-4 relative overflow-hidden shadow-2xl space-y-3 min-h-[220px]">
              <div className="flex items-center gap-2 pb-2 border-b border-[#202c33]">
                <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-slate-950 font-black text-xs">
                  S
                </div>
                <div>
                  <p className="text-[11px] font-black text-white">Swastik Supermarket</p>
                  <p className="text-[8px] text-[#00a884] font-mono font-bold">Official WhatsApp Business</p>
                </div>
              </div>

              {/* Document Header preview if mediaUrl */}
              {mediaUrl && (
                <div className="bg-[#202c33] border border-[#00a884]/40 rounded-xl p-2.5 flex items-center gap-2 max-w-[90%] text-white">
                  <FileText className="w-5 h-5 text-[#00a884]" />
                  <div className="text-[9px] font-mono truncate">
                    <span className="block font-bold">Attached Document / Invoice</span>
                    <span className="text-slate-400 text-[8px] truncate">{mediaUrl}</span>
                  </div>
                </div>
              )}

              {/* Message Bubble */}
              <div className="bg-[#111b21] border border-[#202c33] rounded-tl-none rounded-2xl p-3 text-[#e9edef] text-xs font-medium leading-relaxed max-w-[92%] space-y-2 shadow">
                <p className="whitespace-pre-wrap">{previewRenderedText}</p>
                <div className="text-right text-[8px] font-mono text-slate-500">
                  12:00 PM <span className="text-[#53bdeb]">✓✓</span>
                </div>
              </div>

              {/* Quick Reply Button Mockup */}
              {button1 && (
                <div className="bg-[#202c33] hover:bg-[#2a3942] border border-[#222e35] py-2 px-3 text-[10px] font-black text-[#00a884] text-center rounded-xl font-sans cursor-pointer max-w-[92%] flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{button1}</span>
                </div>
              )}
            </div>

            {/* Test Send Box */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-white/10 space-y-2.5">
              <span className="text-[10px] font-black uppercase text-cyan-400 block tracking-wider">
                🧪 Test on My Mobile Number First:
              </span>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={testMobileNumber}
                  onChange={(e) => setTestMobileNumber(e.target.value)}
                  className="grow bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                />
                <button
                  type="button"
                  disabled={isSendingTest || !testMobileNumber}
                  onClick={handleSendTest}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Testing...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

            {/* Main Broadcast Launch Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isBroadcasting || parsedRecipientsList.length === 0}
                onClick={handleStartBroadcast}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                  isBroadcasting
                    ? 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 active:scale-95 shadow-emerald-500/20'
                }`}
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting ({broadcastProgress.current}/{broadcastProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Launch Meta Broadcast to {parsedRecipientsList.length} Numbers</span>
                  </>
                )}
              </button>

              {isBroadcasting && (
                <button
                  type="button"
                  onClick={() => { abortControllerRef.current = true; }}
                  className="w-full mt-2 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                >
                  ⏹ Stop / Pause Broadcast
                </button>
              )}
            </div>

          </div>

          {/* Progress & Live Logs Terminal */}
          <div className="bg-slate-950 border border-white/10 rounded-3xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>Live Meta Outbox Dispatch Feed</span>
              </span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportLogsExcel}
                  className="text-[9px] text-cyan-400 hover:text-cyan-300 font-extrabold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Report</span>
                </button>
              )}
            </div>

            {/* Progress summary stats */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-slate-900 p-2 rounded-xl border border-white/5">
                <span className="text-[8px] text-slate-500 uppercase block font-bold">Total Queue</span>
                <span className="text-xs font-black text-white">{broadcastProgress.total}</span>
              </div>
              <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/30">
                <span className="text-[8px] text-emerald-400 uppercase block font-bold">Dispatched</span>
                <span className="text-xs font-black text-emerald-300">{broadcastProgress.success}</span>
              </div>
              <div className="bg-red-950/40 p-2 rounded-xl border border-red-500/30">
                <span className="text-[8px] text-red-400 uppercase block font-bold">Failed</span>
                <span className="text-xs font-black text-red-300">{broadcastProgress.failed}</span>
              </div>
            </div>

            {/* Progress Bar */}
            {broadcastProgress.total > 0 && (
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%` }}
                />
              </div>
            )}

            {/* Terminal Log Output */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-3 max-h-56 overflow-y-auto space-y-2 font-mono text-[10px] scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-8 italic font-sans space-y-1">
                  <HelpCircle className="w-6 h-6 mx-auto text-slate-700" />
                  <p>Ready. Trigger campaign dispatch to see live Meta API response logs.</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded-xl border text-left space-y-1 ${
                      log.status === 'SUCCESS' 
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                        : 'bg-red-950/20 border-red-500/20 text-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{log.phone} ({log.name})</span>
                      <span className="text-[8px] font-bold uppercase">{log.status} • {log.timestamp}</span>
                    </div>
                    {log.metaId && (
                      <p className="text-[8px] text-slate-400 truncate">Meta ID: {log.metaId}</p>
                    )}
                    {log.error && (
                      <p className="text-[8px] text-red-400">Error: {log.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
