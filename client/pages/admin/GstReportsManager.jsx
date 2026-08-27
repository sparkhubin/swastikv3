import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  FileText, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Search, 
  CheckCircle, 
  Clock, 
  Layers, 
  Share2, 
  Copy, 
  Check, 
  RefreshCw, 
  Percent, 
  ShieldCheck, 
  ArrowUpDown,
  Eye,
  X
} from 'lucide-react';

export default function GstReportsManager({ userRole }) {
  const { isHindi } = useLanguage();
  const { orders, contactSettings } = useData();

  // Store information
  const storeName = contactSettings?.brandName || "Swastik Supermarket";
  const storeGstin = contactSettings?.gst || contactSettings?.gstin || "23AAAAA0000A1Z5";
  const storeAddress = contactSettings?.address || "Survey no. 100 Sanjit road opposite of Saraswati school, Mandsaur, MP";
  const storePhone = contactSettings?.phone || "094845 40001";
  const storeFssai = contactSettings?.fssai || "12721001000123";

  // Filter States
  const [datePreset, setDatePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [slabFilter, setSlabFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI States
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Handle Preset Date changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (preset === 'this-week') {
      const day = now.getDay() || 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'q1') { // Apr - Jun
      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(curYear, 3, 1);
      end = new Date(curYear, 5, 30);
    } else if (preset === 'q2') { // Jul - Sep
      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(curYear, 6, 1);
      end = new Date(curYear, 8, 30);
    } else if (preset === 'q3') { // Oct - Dec
      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(curYear, 9, 1);
      end = new Date(curYear, 11, 31);
    } else if (preset === 'q4') { // Jan - Mar
      const curYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
      start = new Date(curYear, 0, 1);
      end = new Date(curYear, 2, 31);
    } else if (preset === 'fy-current') { // Apr 1 to Mar 31
      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(curYear, 3, 1);
      end = new Date(curYear + 1, 2, 31);
    } else if (preset === 'all-time') {
      start = new Date(2023, 0, 1);
      end = new Date(now.getFullYear() + 1, 11, 31);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Process and compute itemized GST details for every order
  const processedOrders = useMemo(() => {
    return (orders || []).map(order => {
      const items = order.items || [];
      const orderDateStr = order.orderDate || order.date || order.createdAt || new Date().toISOString();
      const orderDate = new Date(orderDateStr);

      let orderTaxable = 0;
      let orderGst = 0;
      const orderSlabs = {};

      const processedItems = items.map(item => {
        const rate = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
        const qty = Number(item.qty || item.quantity || 1);
        const unitPrice = Number(item.price || 0);
        const itemTaxable = Math.round(unitPrice * qty * 100) / 100;
        const itemTax = Math.round(((itemTaxable * rate) / 100) * 100) / 100;
        const itemCgst = Math.round((itemTax / 2) * 100) / 100;
        const itemSgst = Math.round((itemTax - itemCgst) * 100) / 100;
        const itemGross = Math.round((itemTaxable + itemTax) * 100) / 100;

        orderTaxable += itemTaxable;
        orderGst += itemTax;

        if (!orderSlabs[rate]) {
          orderSlabs[rate] = { slab: rate, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 };
        }
        orderSlabs[rate].taxable += itemTaxable;
        orderSlabs[rate].cgst += itemCgst;
        orderSlabs[rate].sgst += itemSgst;
        orderSlabs[rate].totalTax += itemTax;
        orderSlabs[rate].gross += itemGross;
        orderSlabs[rate].count += qty;

        return {
          ...item,
          rate,
          qty,
          unitPrice,
          itemTaxable,
          itemTax,
          itemCgst,
          itemSgst,
          itemGross
        };
      });

      const fallbackSubtotal = Number(order.subtotal || orderTaxable || 0);
      const fallbackGst = Number(order.gst || orderGst || 0);
      const deliveryFee = Number(order.deliveryFee || 0);
      const totalDiscount = Number(order.referralDiscount || 0) + Number(order.couponDiscount || 0) + Number(order.celebrationDiscount || 0);
      const grandTotal = Number(order.total || order.grand_total || (fallbackSubtotal + fallbackGst + deliveryFee - totalDiscount));
      const cgstTotal = Math.round((fallbackGst / 2) * 100) / 100;
      const sgstTotal = Math.round((fallbackGst - cgstTotal) * 100) / 100;

      return {
        ...order,
        parsedDate: orderDate,
        dateFormatted: orderDate.toLocaleDateString('en-GB'),
        timeFormatted: orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        processedItems,
        taxableSubtotal: fallbackSubtotal,
        totalGst: fallbackGst,
        cgstTotal,
        sgstTotal,
        deliveryFee,
        totalDiscount,
        grandTotal,
        slabs: orderSlabs,
        ratesList: Object.keys(orderSlabs).map(Number)
      };
    });
  }, [orders]);

  // Filter orders according to all active criteria
  const filteredOrders = useMemo(() => {
    return processedOrders.filter(order => {
      // 1. Date Range Check
      const orderDateYMD = order.parsedDate.toISOString().split('T')[0];
      if (startDate && orderDateYMD < startDate) return false;
      if (endDate && orderDateYMD > endDate) return false;

      // 2. Payment Status Filter
      if (paymentStatusFilter !== 'all') {
        const pStatus = (order.paymentStatus || 'pending').toLowerCase();
        if (paymentStatusFilter === 'paid' && pStatus !== 'paid') return false;
        if (paymentStatusFilter === 'pending' && pStatus === 'paid') return false;
      }

      // 3. Order Status Filter
      if (orderStatusFilter !== 'all') {
        const oStatus = (order.status || 'confirmed').toLowerCase();
        if (orderStatusFilter === 'delivered' && oStatus !== 'delivered') return false;
        if (orderStatusFilter === 'active' && oStatus === 'delivered') return false;
        if (orderStatusFilter === 'cancelled' && !oStatus.includes('cancel')) return false;
      }

      // 4. Payment Method Filter
      if (paymentMethodFilter !== 'all') {
        const method = (order.paymentMethod || 'cod').toLowerCase();
        if (!method.includes(paymentMethodFilter.toLowerCase())) return false;
      }

      // 5. GST Slab Filter
      if (slabFilter !== 'all') {
        const targetRate = Number(slabFilter);
        if (!order.ratesList.includes(targetRate)) return false;
      }

      // 6. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(order.id || '').toLowerCase().includes(q);
        const nameMatch = String(order.customerName || order.name || '').toLowerCase().includes(q);
        const phoneMatch = String(order.customerPhone || order.phone || '').includes(q);
        const itemMatch = (order.processedItems || []).some(it => 
          String(it.nameEn || it.nameHi || it.name || '').toLowerCase().includes(q)
        );
        if (!idMatch && !nameMatch && !phoneMatch && !itemMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        return sortOrder === 'desc' ? b.parsedDate - a.parsedDate : a.parsedDate - b.parsedDate;
      }
      if (sortField === 'total') {
        return sortOrder === 'desc' ? b.grandTotal - a.grandTotal : a.grandTotal - b.grandTotal;
      }
      if (sortField === 'tax') {
        return sortOrder === 'desc' ? b.totalGst - a.totalGst : a.totalGst - b.totalGst;
      }
      if (sortField === 'id') {
        return sortOrder === 'desc' ? String(b.id).localeCompare(String(a.id)) : String(a.id).localeCompare(String(b.id));
      }
      return 0;
    });
  }, [processedOrders, startDate, endDate, paymentStatusFilter, orderStatusFilter, paymentMethodFilter, slabFilter, searchQuery, sortField, sortOrder]);

  // Aggregate Metrics & Slabs for the filtered dataset
  const metrics = useMemo(() => {
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalGst = 0;
    let totalGross = 0;
    let totalExemptSales = 0;

    const slabAggregates = {
      0: { slab: 0, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 },
      5: { slab: 5, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 },
      12: { slab: 12, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 },
      18: { slab: 18, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 },
      28: { slab: 28, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 }
    };

    filteredOrders.forEach(order => {
      totalTaxable += order.taxableSubtotal;
      totalCgst += order.cgstTotal;
      totalSgst += order.sgstTotal;
      totalGst += order.totalGst;
      totalGross += order.grandTotal;

      Object.entries(order.slabs).forEach(([slabRate, data]) => {
        const rateNum = Number(slabRate);
        if (!slabAggregates[rateNum]) {
          slabAggregates[rateNum] = { slab: rateNum, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, gross: 0, count: 0 };
        }
        slabAggregates[rateNum].taxable += data.taxable;
        slabAggregates[rateNum].cgst += data.cgst;
        slabAggregates[rateNum].sgst += data.sgst;
        slabAggregates[rateNum].totalTax += data.totalTax;
        slabAggregates[rateNum].gross += data.gross;
        slabAggregates[rateNum].count += data.count;

        if (rateNum === 0) {
          totalExemptSales += data.taxable;
        }
      });
    });

    return {
      totalOrders: filteredOrders.length,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      totalGross: Math.round(totalGross * 100) / 100,
      totalExemptSales: Math.round(totalExemptSales * 100) / 100,
      slabAggregates: Object.values(slabAggregates).filter(s => s.taxable > 0 || [0, 5, 12, 18].includes(s.slab))
    };
  }, [filteredOrders]);

  // Export Full B2C Sales Register for CA (CSV/Excel)
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No records found to export for the selected filter criteria.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Invoice Date",
      "Invoice Time",
      "Customer Name",
      "Customer Mobile",
      "Payment Mode",
      "Payment Status",
      "Order Status",
      "Item Count",
      "Taxable Value (INR)",
      "CGST Amount (INR)",
      "SGST Amount (INR)",
      "Total GST Tax (INR)",
      "Delivery Fee (INR)",
      "Discounts (INR)",
      "Invoice Grand Total (INR)"
    ];

    const rows = filteredOrders.map(o => [
      `INV-${o.id}`,
      o.dateFormatted,
      o.timeFormatted,
      `"${(o.customerName || o.name || 'Valued Customer').replace(/"/g, '""')}"`,
      `"${o.customerPhone || o.phone || 'N/A'}"`,
      o.paymentMethod || 'COD',
      o.paymentStatus || 'Pending',
      o.status || 'Confirmed',
      o.processedItems.length,
      o.taxableSubtotal.toFixed(2),
      o.cgstTotal.toFixed(2),
      o.sgstTotal.toFixed(2),
      o.totalGst.toFixed(2),
      o.deliveryFee.toFixed(2),
      o.totalDiscount.toFixed(2),
      o.grandTotal.toFixed(2)
    ]);

    // Append Summary Rows for CA
    rows.push([]);
    rows.push(["--- SUMMARY TOTALS ---"]);
    rows.push([
      "TOTAL INVOICES",
      filteredOrders.length,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      metrics.totalTaxable.toFixed(2),
      metrics.totalCgst.toFixed(2),
      metrics.totalSgst.toFixed(2),
      metrics.totalGst.toFixed(2),
      "",
      "",
      metrics.totalGross.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_Sales_Report_${startDate}_to_${endDate}_${storeGstin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Rate-Wise GST Summary for GSTR-3B Filing
  const handleExportSlabSummaryCSV = () => {
    const headers = [
      "GST Rate Slab (%)",
      "Total Items / Quantity Sold",
      "Total Taxable Turnover (INR)",
      "Central Tax CGST (INR)",
      "State Tax SGST (INR)",
      "Total Tax Liability (INR)",
      "Gross Invoice Value (INR)"
    ];

    const rows = metrics.slabAggregates.map(s => [
      `${s.slab}%`,
      s.count,
      s.taxable.toFixed(2),
      s.cgst.toFixed(2),
      s.sgst.toFixed(2),
      s.totalTax.toFixed(2),
      s.gross.toFixed(2)
    ]);

    rows.push([]);
    rows.push([
      "GRAND TOTAL",
      "-",
      metrics.totalTaxable.toFixed(2),
      metrics.totalCgst.toFixed(2),
      metrics.totalSgst.toFixed(2),
      metrics.totalGst.toFixed(2),
      metrics.totalGross.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GSTR3B_Slab_Summary_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Quick Summary to Clipboard for WhatsApp/Email to CA
  const handleCopySummaryForCA = () => {
    const summaryText = `*GST SALES & TAX REPORT FOR CHARTERED ACCOUNTANT (CA)*
🏢 *Store:* ${storeName}
📝 *GSTIN:* ${storeGstin}
📅 *Filing Period:* ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}
🔢 *Total Invoices Filed:* ${metrics.totalOrders}

📊 *TURNOVER & TAX SUMMARY:*
• *Taxable Sales:* ₹${metrics.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *CGST (Central Tax):* ₹${metrics.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *SGST (State Tax):* ₹${metrics.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *Total GST Collected:* ₹${metrics.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *Gross Turnover:* ₹${metrics.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

📋 *RATE-WISE GST SLAB BREAKDOWN:*
${metrics.slabAggregates.map(s => `• *${s.slab}% Slab:* Taxable ₹${s.taxable.toFixed(2)} | CGST ₹${s.cgst.toFixed(2)} | SGST ₹${s.sgst.toFixed(2)} | Total ₹${s.totalTax.toFixed(2)}`).join('\n')}

_Generated via Swastik Supermarket Billing Management System_`;

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    });
  };

  // Print Official CA Tax Filing Statement
  const handlePrintGstStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>GST Return Filing Statement - ${storeGstin} - ${startDate} to ${endDate}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 28px; font-size: 11px; line-height: 1.4; }
            .statement-box { max-width: 900px; margin: 0 auto; border: 2px solid #cbd5e1; padding: 24px; border-radius: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 16px; }
            .brand-name { font-size: 22px; font-weight: 900; color: #0284c7; margin: 0; text-transform: uppercase; }
            .store-meta { font-size: 10.5px; color: #475569; margin-top: 4px; }
            .doc-title { text-align: right; }
            .title-badge { font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .period-badge { font-size: 11px; font-weight: 700; color: #0284c7; margin-top: 4px; }
            
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; text-align: center; }
            .kpi-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .kpi-val { font-size: 15px; font-weight: 900; color: #0f172a; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 9px; font-weight: 800; padding: 8px 10px; text-align: left; }
            td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; }
            .total-row td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a; }

            .cert-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
            .cert-text { font-size: 9.5px; color: #64748b; max-width: 450px; }
            .sig-box { text-align: center; border-top: 1px solid #0f172a; width: 200px; padding-top: 6px; font-weight: 800; font-size: 10px; }

            @media print {
              body { padding: 0; }
              .statement-box { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="statement-box">
            <div class="header">
              <div>
                <h1 class="brand-name">${storeName}</h1>
                <div class="store-meta">
                  <div><b>Address:</b> ${storeAddress}</div>
                  <div><b>GSTIN:</b> ${storeGstin} | <b>FSSAI Lic:</b> ${storeFssai}</div>
                  <div><b>Contact:</b> ${storePhone}</div>
                </div>
              </div>
              <div class="doc-title">
                <div class="title-badge">GST RETURN STATEMENT (CA SUMMARY)</div>
                <div class="period-badge">PERIOD: ${new Date(startDate).toLocaleDateString('en-GB')} TO ${new Date(endDate).toLocaleDateString('en-GB')}</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Generated on: ${new Date().toLocaleString('en-IN')}</div>
              </div>
            </div>

            <!-- KPI Totals -->
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Total Invoices</div>
                <div class="kpi-val">${metrics.totalOrders}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Taxable Turnover</div>
                <div class="kpi-val">₹${metrics.totalTaxable.toFixed(2)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total GST Collected</div>
                <div class="kpi-val" style="color:#0284c7;">₹${metrics.totalGst.toFixed(2)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Gross Sales Total</div>
                <div class="kpi-val">₹${metrics.totalGross.toFixed(2)}</div>
              </div>
            </div>

            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0284c7; margin-bottom: 8px;">1. RATE-WISE GST TAX LIABILITY BREAKDOWN (GSTR-3B TABLE 3.1)</h3>
            <table>
              <thead>
                <tr>
                  <th>GST Rate</th>
                  <th style="text-align:right;">Taxable Value (₹)</th>
                  <th style="text-align:right;">Central Tax CGST (₹)</th>
                  <th style="text-align:right;">State Tax SGST (₹)</th>
                  <th style="text-align:right;">Total GST (₹)</th>
                  <th style="text-align:right;">Gross Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.slabAggregates.map(s => `
                  <tr>
                    <td><b>${s.slab}% Slab</b></td>
                    <td style="text-align:right;">₹${s.taxable.toFixed(2)}</td>
                    <td style="text-align:right;">₹${s.cgst.toFixed(2)}</td>
                    <td style="text-align:right;">₹${s.sgst.toFixed(2)}</td>
                    <td style="text-align:right; font-weight:700; color:#0284c7;">₹${s.totalTax.toFixed(2)}</td>
                    <td style="text-align:right;">₹${s.gross.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>GRAND TOTAL</td>
                  <td style="text-align:right;">₹${metrics.totalTaxable.toFixed(2)}</td>
                  <td style="text-align:right;">₹${metrics.totalCgst.toFixed(2)}</td>
                  <td style="text-align:right;">₹${metrics.totalSgst.toFixed(2)}</td>
                  <td style="text-align:right; color:#0284c7;">₹${metrics.totalGst.toFixed(2)}</td>
                  <td style="text-align:right;">₹${metrics.totalGross.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0284c7; margin-bottom: 8px; margin-top: 24px;">2. INVOICE REGISTER TRANSACTIONS SUMMARY (FIRST 100 RECORDS)</h3>
            <table>
              <thead>
                <tr>
                  <th>Inv #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style="text-align:right;">Taxable</th>
                  <th style="text-align:right;">CGST</th>
                  <th style="text-align:right;">SGST</th>
                  <th style="text-align:right;">Total GST</th>
                  <th style="text-align:right;">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                ${filteredOrders.slice(0, 100).map(o => `
                  <tr>
                    <td><b>#${o.id}</b></td>
                    <td>${o.dateFormatted}</td>
                    <td>${(o.customerName || o.name || 'Valued Customer').substring(0, 20)}</td>
                    <td>${o.paymentMethod || 'COD'}</td>
                    <td>${o.paymentStatus || 'Pending'}</td>
                    <td style="text-align:right;">₹${o.taxableSubtotal.toFixed(2)}</td>
                    <td style="text-align:right;">₹${o.cgstTotal.toFixed(2)}</td>
                    <td style="text-align:right;">₹${o.sgstTotal.toFixed(2)}</td>
                    <td style="text-align:right; font-weight:700;">₹${o.totalGst.toFixed(2)}</td>
                    <td style="text-align:right; font-weight:800;">₹${o.grandTotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="cert-block">
              <div class="cert-text">
                <b>DECLARATION & CERTIFICATION:</b><br/>
                We hereby certify that the particulars furnished in this statement are true and correct as extracted from our electronic sales register under Section 31 of the CGST Act, 2017.
              </div>
              <div class="sig-box">
                Authorized Signatory / Accountant<br/>
                <span style="font-size:8px; font-weight:normal; color:#64748b;">${storeName}</span>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner & CA Action Controls */}
      <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{isHindi ? "जीएसटी एवं टैक्स रिटर्न रिपोर्ट (CA रिपोर्ट)" : "GST Tax Filing & Sales Report (CA Portal)"}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono font-bold">
                    GSTR-1 / GSTR-3B
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  GSTIN: <span className="font-mono text-cyan-400 font-black">{storeGstin}</span> • {storeName}
                </p>
              </div>
            </div>
          </div>

          {/* Quick CA Export & Print Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleCopySummaryForCA}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold flex items-center gap-1.5 transition-all active:scale-95 text-[11px]"
              title="Copy formatted summary to send on WhatsApp or Email to your CA"
            >
              {copiedNotification ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-black">Copied for CA!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Copy Summary (WhatsApp)</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportSlabSummaryCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold flex items-center gap-1.5 transition-all active:scale-95 text-[11px]"
              title="Export GSTR-3B Slab-wise Summary CSV"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>GSTR-3B Slabs CSV</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1.5 transition-all active:scale-95 text-[11px]"
              title="Export full transaction register for Tally, Marg or CA software"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export Full B2C CSV</span>
            </button>

            <button
              onClick={handlePrintGstStatement}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black flex items-center gap-1.5 border border-cyan-300 transition-all active:scale-95 text-[11px]"
              title="Print official certified GST statement for CA"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Official Statement</span>
            </button>
          </div>

        </div>
      </div>

      {/* Filter Control Matrix */}
      <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
        
        {/* Preset Period Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-cyan-400" />
              <span>Select Tax Filing Period (फाइलिंग अवधि)</span>
            </span>
            <span className="text-[9px] text-slate-500 font-bold font-mono">
              Active: {startDate} to {endDate}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this-week', label: 'This Week' },
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'q1', label: 'Q1 (Apr-Jun)' },
              { id: 'q2', label: 'Q2 (Jul-Sep)' },
              { id: 'q3', label: 'Q3 (Oct-Dec)' },
              { id: 'q4', label: 'Q4 (Jan-Mar)' },
              { id: 'fy-current', label: 'FY 2025-26' },
              { id: 'all-time', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' }
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wide transition-all border ${
                  datePreset === preset.id
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black shadow-sm'
                    : 'bg-slate-950 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-white/5">
          
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-cyan-400/40"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-cyan-400/40"
            />
          </div>

          {/* GST Slab Filter */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">GST Slab Rate</label>
            <select
              value={slabFilter}
              onChange={(e) => setSlabFilter(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-400/40"
            >
              <option value="all">All GST Slabs (सभी)</option>
              <option value="0">0% (Nil / Exempted)</option>
              <option value="5">5% GST Rate</option>
              <option value="12">12% GST Rate</option>
              <option value="18">18% GST Rate</option>
              <option value="28">28% GST Rate</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-400/40"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid (सफल भुगतान)</option>
              <option value="pending">Pending / Unpaid</option>
            </select>
          </div>

          {/* Payment Mode */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Payment Mode</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-400/40"
            >
              <option value="all">All Modes</option>
              <option value="cod">Cash On Delivery (COD)</option>
              <option value="upi">UPI / Online</option>
              <option value="card">Debit / Credit Card</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Search Order / Phone</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Inv #, Customer, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 pl-8 pr-3 py-2 rounded-xl text-xs font-medium text-white placeholder-slate-600 outline-none focus:border-cyan-400/40"
              />
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

        </div>

      </div>

      {/* KPI Financial Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Invoices */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">B2C Invoices Count</span>
          <div className="text-xl font-black font-mono text-white">{metrics.totalOrders}</div>
          <span className="text-[9px] text-slate-500 font-bold block">Filed Transactions</span>
        </div>

        {/* Net Taxable Turnover */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider block">Taxable Turnover (कर योग्य)</span>
          <div className="text-xl font-black font-mono text-cyan-300">₹{metrics.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-slate-500 font-bold block">Base Goods Value</span>
        </div>

        {/* Total CGST */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Central CGST (50%)</span>
          <div className="text-xl font-black font-mono text-emerald-300">₹{metrics.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-slate-500 font-bold block">Central Tax Share</span>
        </div>

        {/* Total SGST */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">State SGST (50%)</span>
          <div className="text-xl font-black font-mono text-emerald-300">₹{metrics.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-slate-500 font-bold block">State Tax Share</span>
        </div>

        {/* Total GST Liability */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-1 bg-gradient-to-br from-slate-900 to-indigo-950/40">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block">Total GST Collected</span>
          <div className="text-xl font-black font-mono text-amber-300">₹{metrics.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-slate-500 font-bold block">Total Tax Liability</span>
        </div>

        {/* Gross Sales Turnover */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Gross Total Sales</span>
          <div className="text-xl font-black font-mono text-white">₹{metrics.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-slate-500 font-bold block">Gross Revenue</span>
        </div>

      </div>

      {/* Section 1: GSTR-3B Rate-Wise Slab Summary Breakdown Table */}
      <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>GSTR-3B Table 3.1: Rate-Wise Tax Liability Computation (कर दरवार विवरण)</span>
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Direct rate-wise aggregation ready for your Chartered Accountant's GST Portal filing
            </p>
          </div>
          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full font-bold font-mono uppercase">
            Auto-Balanced CGST & SGST
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">GST Rate Slab</th>
                <th className="py-2.5 px-3 text-center">Items Sold</th>
                <th className="py-2.5 px-3 text-right">Taxable Turnover (₹)</th>
                <th className="py-2.5 px-3 text-right">Central Tax CGST (₹)</th>
                <th className="py-2.5 px-3 text-right">State Tax SGST (₹)</th>
                <th className="py-2.5 px-3 text-right">Total GST Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Gross Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {metrics.slabAggregates.map((slabRow) => (
                <tr key={slabRow.slab} className="hover:bg-white/5 transition-colors font-mono">
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                      slabRow.slab === 0 ? 'bg-slate-800 text-slate-300' :
                      slabRow.slab === 5 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      slabRow.slab === 12 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      slabRow.slab === 18 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    }`}>
                      {slabRow.slab}% GST Rate {slabRow.slab === 0 ? '(Exempt)' : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300 font-bold">{slabRow.count}</td>
                  <td className="py-3 px-3 text-right font-bold text-white">₹{slabRow.taxable.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">₹{slabRow.cgst.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">₹{slabRow.sgst.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-amber-400 font-black">₹{slabRow.totalTax.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-slate-300 font-bold">₹{slabRow.gross.toFixed(2)}</td>
                </tr>
              ))}
              
              {/* Grand Total Row */}
              <tr className="bg-slate-950 font-mono font-black border-t-2 border-white/20 text-white">
                <td className="py-3 px-3 uppercase text-[10px] tracking-wider text-cyan-400">Total Filing Liability</td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-3 text-right text-cyan-300">₹{metrics.totalTaxable.toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-emerald-400">₹{metrics.totalCgst.toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-emerald-400">₹{metrics.totalSgst.toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-amber-400 text-sm">₹{metrics.totalGst.toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-white text-sm">₹{metrics.totalGross.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* Section 2: Detailed B2C Invoices Sales Register */}
      <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>B2C Invoices Register ({filteredOrders.length} Records)</span>
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Itemized customer sales transactions with tax breakdown
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400 font-bold">Sort By:</span>
            <button
              onClick={() => {
                if (sortField === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortField('date'); setSortOrder('desc'); }
              }}
              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                sortField === 'date' ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black' : 'bg-slate-950 border-white/10 text-slate-400'
              }`}
            >
              <span>Date</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                if (sortField === 'total') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortField('total'); setSortOrder('desc'); }
              }}
              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                sortField === 'total' ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black' : 'bg-slate-950 border-white/10 text-slate-400'
              }`}
            >
              <span>Amount</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShieldCheck className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-bold">No sales orders found matching your selected date or status filters.</p>
            <button
              onClick={() => handlePresetChange('all-time')}
              className="text-[11px] text-cyan-400 font-bold hover:underline"
            >
              Reset Filters to All Time
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total GST (₹)</th>
                  <th className="py-2.5 px-3 text-right">Invoice Total (₹)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    
                    {/* Invoice ID */}
                    <td className="py-2.5 px-3">
                      <span className="font-black text-cyan-400">#{order.id}</span>
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <div>{order.dateFormatted}</div>
                      <div className="text-[9px] text-slate-500">{order.timeFormatted}</div>
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-bold text-white leading-tight">
                        {order.customerName || order.name || 'Valued Customer'}
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-mono">
                        {order.customerPhone || order.phone || 'N/A'}
                      </div>
                    </td>

                    {/* Payment Info */}
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        (order.paymentStatus || '').toLowerCase() === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {order.paymentMethod || 'COD'} • {order.paymentStatus || 'Pending'}
                      </span>
                    </td>

                    {/* Taxable */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                      ₹{order.taxableSubtotal.toFixed(2)}
                    </td>

                    {/* CGST */}
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      ₹{order.cgstTotal.toFixed(2)}
                    </td>

                    {/* SGST */}
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      ₹{order.sgstTotal.toFixed(2)}
                    </td>

                    {/* Total GST */}
                    <td className="py-2.5 px-3 text-right text-amber-400 font-black">
                      ₹{order.totalGst.toFixed(2)}
                    </td>

                    {/* Grand Total */}
                    <td className="py-2.5 px-3 text-right font-black text-white">
                      ₹{order.grandTotal.toFixed(2)}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedOrderForModal(order)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all"
                        title="View detailed GST breakdown for this order"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Item-Level GST Breakdown Modal */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 relative shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Order #{selectedOrderForModal.id} - Tax Breakdown</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {selectedOrderForModal.dateFormatted} • Customer: {selectedOrderForModal.customerName || selectedOrderForModal.name || 'Valued Customer'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400">
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Unit Price</th>
                    <th className="py-2 px-2 text-center">GST %</th>
                    <th className="py-2 px-2 text-right">Taxable</th>
                    <th className="py-2 px-2 text-right">Tax (CGST+SGST)</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {selectedOrderForModal.processedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-sans text-white font-bold">
                        {item.nameEn || item.nameHi || item.name || 'Grocery Product'}
                        <span className="text-[9px] block text-slate-400 font-mono">{item.weight || item.unit || ''}</span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold">{item.qty}</td>
                      <td className="py-2 px-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-[10px] font-black">
                          {item.rate}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">₹{item.itemTaxable.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-amber-400 font-bold">₹{item.itemTax.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-white font-black">₹{item.itemGross.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Summary Footer */}
            <div className="bg-slate-950 border border-white/5 p-3.5 rounded-2xl flex justify-between items-center text-xs font-mono">
              <div className="space-y-0.5 text-[10px]">
                <div className="text-slate-400">Taxable Subtotal: <b className="text-white">₹{selectedOrderForModal.taxableSubtotal.toFixed(2)}</b></div>
                <div className="text-slate-400">Total GST (CGST+SGST): <b className="text-amber-400">₹{selectedOrderForModal.totalGst.toFixed(2)}</b></div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase font-black text-slate-400">Grand Total Amount</div>
                <div className="text-base font-black text-cyan-400">₹{selectedOrderForModal.grandTotal.toFixed(2)}</div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
