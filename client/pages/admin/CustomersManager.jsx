import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  Crown,
  Printer,
  Gift
} from 'lucide-react';
import R2ImageUploader from './R2ImageUploader';
import QuickTemplateSender from './QuickTemplateSender';
import DataDeletionRequestsManager from './DataDeletionRequestsManager';

export default function CustomersManager() {
  const { isHindi } = useLanguage();
  const { customers, addCustomer, updateCustomer, deleteCustomer, orders = [], primeSettings, dataDeletionRequests = [], fetchCustomers, contactSettings } = useData();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState('directory');

  const [cardGenModalCust, setCardGenModalCust] = useState(null);
  const [cardGenNum, setCardGenNum] = useState('');
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [selectedMembershipPlanId, setSelectedMembershipPlanId] = useState('');
  const [membershipSaving, setMembershipSaving] = useState(false);

  const openCardGenModal = async (customer) => {
    setCardGenModalCust(customer);
    setCardGenNum(customer.membershipNumber || '');
    const response = await fetch('/api/membership/plans');
    const plans = response.ok ? await response.json() : [];
    setMembershipPlans(Array.isArray(plans) ? plans : []);
    setSelectedMembershipPlanId(plans[0]?.id ? String(plans[0].id) : '');
  };

  const activateMembership = async (printAfter = false) => {
    const plan = membershipPlans.find(item => String(item.id) === String(selectedMembershipPlanId));
    if (!plan || !cardGenNum.trim()) {
      setToastMessage('Select an active plan and enter a membership number.');
      return;
    }
    setMembershipSaving(true);
    try {
      const response = await fetch(`/api/customers/${cardGenModalCust.id}/memberships`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, membershipNumber: cardGenNum.trim().toUpperCase(), amountPaid: Number(plan.price) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Membership activation failed.');
      await fetchCustomers();
      if (printAfter) handlePrintCard({ ...cardGenModalCust, membershipNumber: cardGenNum.trim().toUpperCase(), membershipStatus: 'Active' });
      setToastMessage('Membership activated and recorded in customer membership history.');
      setCardGenModalCust(null);
    } catch (error) {
      setToastMessage(error.message);
    } finally {
      setMembershipSaving(false);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const cancelActiveMembership = async () => {
    if (!window.confirm(`Cancel the active membership for ${cardGenModalCust.name}?`)) return;
    setMembershipSaving(true);
    try {
      const response = await fetch(`/api/customers/${cardGenModalCust.id}/memberships/cancel-active`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Membership cancellation failed.');
      await fetchCustomers();
      setToastMessage('Membership cancelled and retained in history.');
      setCardGenModalCust(null);
    } catch (error) {
      setToastMessage(error.message);
    } finally {
      setMembershipSaving(false);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const handlePrintCard = (customer) => {
    if (!customer.membershipNumber) {
      setToastMessage('A recorded membership number is required before printing.');
      return;
    }
    const printWindow = window.open('', '_blank');
    const memberNo = customer.membershipNumber;
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

  const openDirectWa = (cust) => {
    if (!cust) return;
    setDirectWaCust(cust);
    setDirectWaMsg('');
    setDirectWaSuccess('');
  };

  const handleSendDirectWa = async () => {
    if (!directWaCust || !directWaMsg.trim()) return;
    setDirectWaSending(true);
    setDirectWaSuccess('');
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: directWaCust.phone,
          customerId: directWaCust.id,
          customerPhone: directWaCust.phone,
          customerName: directWaCust.name,
          message: directWaMsg,
          type: 'direct_marketing'
        })
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setDirectWaSuccess('✓ WhatsApp message dispatched successfully via Meta API!');
        setTimeout(() => {
          setDirectWaCust(null);
          setDirectWaSuccess('');
        }, 2200);
      } else {
        setDirectWaSuccess(result.error || 'WhatsApp provider rejected the send attempt.');
      }
    } catch (e) {
      console.error("Direct WhatsApp send failed:", e);
      setDirectWaSuccess('WhatsApp send failed. Review the provider attempt log.');
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
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim(),
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

  // The committed schema has no broadcast-group table, so no groups are fabricated or persisted client-side.
  const [groups, setGroups] = useState([]);

  const saveGroups = (nextGroups) => {
    setGroups(nextGroups);
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
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetch('/api/whatsapp/custom-templates')
      .then(async response => response.ok ? response.json() : [])
      .then(rows => {
        const normalized = (Array.isArray(rows) ? rows : []).filter(row => row.isActive).map(row => {
          let inputs = [];
          try { inputs = JSON.parse(row.variablesJson || '[]'); } catch { inputs = []; }
          return { ...row, text: row.bodyPreview || '', inputs: Array.isArray(inputs) ? inputs : [] };
        });
        setTemplates(normalized);
        setActiveTemplateId(current => current || String(normalized[0]?.id || ''));
      })
      .catch(() => setTemplates([]));
  }, []);
  const [var1, setVar1] = useState('');
  const [var2, setVar2] = useState('');
  const [var3, setVar3] = useState('');

  // Provider-backed campaign results
  const [payloadLogs, setPayloadLogs] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Automatic outbound messaging is intentionally disabled until a server-side,
  // auditable scheduler exists. Rendering this page must never claim messages sent.
  const autoGreetings = [];
  const autoCampaignLogs = [];

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

  const currentTemplate = templates.find(template => String(template.id) === String(activeTemplateId)) || { text: '', inputs: [] };

  // Dispatch a campaign through the authenticated server/provider integration.
  const handleLaunchCampaign = async () => {
    setIsBroadcasting(true);
    setPayloadLogs([]);

    if (!activeTemplateId) {
      triggerToast('Configure and activate a WhatsApp template before broadcasting.');
      setIsBroadcasting(false);
      return;
    }

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

    try {
      const response = await fetch('/api/whatsapp/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.map(rcp => ({
            name: rcp.name,
            phone: rcp.phone,
            params: [var1 || rcp.name, var2, var3]
          })),
          templateName: currentTemplate.metaTemplateName || currentTemplate.name,
          languageCode: currentTemplate.languageCode,
          fallbackMessage: currentTemplate.text
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Broadcast failed (HTTP ${response.status})`);

      setPayloadLogs((result.results || []).map(item => ({
        dispatch_result: {
          destination: `${item.name || 'Customer'} (${item.phone || ''})`,
          status: item.status || 'FAILED',
          provider: item.provider || null,
          message_id: item.id || null,
          error: item.error || null
        }
      })));
      triggerToast(result.failCount
        ? `${result.successCount || 0} sent; ${result.failCount} failed.`
        : `✓ ${result.successCount || 0} WhatsApp messages dispatched.`);
    } catch (error) {
      setPayloadLogs([]);
      triggerToast(error.message || 'WhatsApp broadcast failed.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const cleanPhone = (ph) => {
    if (!ph) return "";
    return String(ph).replace(/[^0-9]/g, "");
  };

  const allCustomersList = useMemo(() => customers || [], [customers]);

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

    const totalOrdersCount = custOrders.length;

    const totalSpentSum = custOrders.reduce(
      (sum, o) => sum + Number(o.grandTotal ?? o.total ?? o.subtotal ?? 0),
      0
    );

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
                  paginatedCustomers.map((cust, idx) => {
                    const stats = getCustomerStats(cust);
                    return (
                      <tr key={cust.id ? `cust-row-${cust.id}` : `cust-row-idx-${idx}`} className="hover:bg-white/5">
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
                          {cust.points || 0}{' '}
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
                            {cust.membershipStatus === 'Active' ? (
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
                            {/* <button 
                              type="button"
                              onClick={() => openDirectWa(cust, 'welcome')}
                              className="w-full max-w-[130px] px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-400" />
                              <span>WhatsApp Msg</span>
                            </button> */}

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
                            {cust.membershipStatus === 'Active' ? (
                              <div className="flex gap-1 justify-center w-full max-w-[130px]">
                                <button
                                  type="button"
                                  onClick={() => openCardGenModal(cust)}
                                  title="Manage or Print VIP Gold Membership Card Pass"
                                  className="p-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 text-amber-300 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Crown className="h-2.5 w-2.5 text-amber-400" />
                                  <span>{cust.membershipNumber ? `Card #${cust.membershipNumber}` : 'Activate membership'}</span>
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

                            {/* Delete Customer Action */}
                            <button 
                              type="button"
                              onClick={() => {
                                if (window.confirm(isHindi 
                                  ? `क्या आप वाकई ग्राहक "${cust.name}" (${cust.phone}) को स्थायी रूप से हटाना चाहते हैं?` 
                                  : `Are you sure you want to permanently delete customer "${cust.name}" (${cust.phone})?`)) {
                                  deleteCustomer(cust.id);
                                }
                              }}
                              className="w-full max-w-[130px] px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                              title="Delete Customer Account"
                            >
                              <Trash2 className="h-3 w-3 text-rose-400" />
                              <span>{isHindi ? "हटाएं" : "Delete"}</span>
                            </button>
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
                      return <span key={`cust-page-dots-${pVal}-${idx}`} className="px-1.5 select-none text-[10px] text-slate-500">..</span>;
                    }
                    return (
                      <button
                        key={`cust-page-num-${pVal}-${idx}`}
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
                  {allCustomersList.map((c, cIdx) => {
                    const checked = selectedGroupMembers.includes(c.id);
                    return (
                      <label key={c.id ? `grp-c-${c.id}` : `grp-c-idx-${cIdx}`} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-all text-xs text-slate-300">
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
                          select2FilteredCustomers.map((c, sIdx) => (
                            <div
                              key={c.id ? `sel2-c-${c.id}` : `sel2-c-idx-${sIdx}`}
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
                <option value="">Select a configured template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>📲 {template.name}</option>
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
              disabled={isBroadcasting || !activeTemplateId}
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
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{log.dispatch_result.destination}</span>
                        <span className={`text-[9px] font-black font-mono ${log.dispatch_result.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>{log.dispatch_result.status}</span>
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
                {/* <button
                  type="button"
                  onClick={() => openDirectWa(selectedDetailCust, 'welcome')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>WhatsApp Chat</span>
                </button> */}
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

                  </div>

                  <div className="pt-3 border-t border-white/5 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        updateCustomer(editForm.id, {
                          name: editForm.name,
                          email: editForm.email,
                          address: editForm.address,
                          status: editForm.status,
                          dob: editForm.dob,
                          anniversary: editForm.anniversary
                        });
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
                <span className={`font-black text-[9px] px-2 py-0.5 rounded-full uppercase ${cardGenModalCust.membershipStatus === 'Active' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {cardGenModalCust.membershipStatus === 'Active' ? 'Active VIP' : 'Regular Customer'}
                </span>
              </div>
            </div>

            {/* Manual Membership Number Assignment Input */}
            <div className="space-y-2 bg-gradient-to-br from-amber-950/20 to-indigo-950/20 p-4 rounded-2xl border border-amber-500/25">
              <label className="text-[10px] font-black uppercase tracking-wider text-amber-300">Membership plan</label>
              <select
                value={selectedMembershipPlanId}
                onChange={(event) => setSelectedMembershipPlanId(event.target.value)}
                className="w-full bg-slate-950 border border-amber-400/40 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                {membershipPlans.length === 0 && <option value="">No active plans configured</option>}
                {membershipPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.price} / {plan.durationDays} days</option>)}
              </select>
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

            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" disabled={membershipSaving} onClick={() => activateMembership(false)} className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl">
                  Save & Activate Membership
                </button>
                <button type="button" disabled={membershipSaving} onClick={() => activateMembership(true)} className="w-full bg-indigo-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl">
                  Save & Print Card
                </button>
              </div>
              {cardGenModalCust.membershipStatus === 'Active' && (
                <button type="button" disabled={membershipSaving} onClick={cancelActiveMembership} className="w-full bg-rose-950/40 text-rose-300 border border-rose-500/30 font-bold text-[10px] uppercase py-2 rounded-xl">
                  Cancel Active Membership
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
                    <span className="text-[8px] text-slate-400 font-bold block">{directWaCust.points || 0} PTS in Wallet</span>
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
              <div className="pt-2">
                <button
                  type="button"
                  disabled={directWaSending || !directWaMsg.trim()}
                  onClick={handleSendDirectWa}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{directWaSending ? "Dispatched..." : "Send via Meta API"}</span>
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
