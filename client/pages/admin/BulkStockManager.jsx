import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { resolveProductImage } from '../../utils/imageHelper';
import AdminPageLoader from '../../components/admin/AdminPageLoader';
import { 
  Search, 
  Layers, 
  Save, 
  RotateCcw, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertTriangle, 
  PackageX, 
  PackageCheck, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Plus, 
  Minus,
  Sparkles
} from 'lucide-react';

export default function BulkStockManager() {
  const { isHindi } = useLanguage();
  const { products, categories, bulkUpdateStock, fetchProducts, r2PublicUrl } = useData();

  const [isLoading, setIsLoading] = useState(!products || products.length === 0);

  useEffect(() => {
    let isMounted = true;
    if (!products || products.length === 0) {
      setIsLoading(true);
    }
    fetchProducts(true).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [fetchProducts]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // all | out-of-stock | low-stock | in-stock | modified
  const [modifiedStocks, setModifiedStocks] = useState({}); // { [productId]: number }
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error' | 'info', message: '' }

  // Quick batch mass input
  const [quickBatchAmount, setQuickBatchAmount] = useState(50);

  // Helper to extract numeric stock count
  const getProductStock = (p) => {
    if (!p) return 0;
    if (p.stockCount !== undefined && p.stockCount !== null && p.stockCount !== '') return Number(p.stockCount);
    if (p.stock_count !== undefined && p.stock_count !== null && p.stock_count !== '') return Number(p.stock_count);
    if (p.stock !== undefined && p.stock !== null && p.stock !== '') return Number(p.stock);
    if (p.quantity !== undefined && p.quantity !== null && p.quantity !== '') return Number(p.quantity);
    return 100;
  };

  // Stock statistics
  const stats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach(p => {
      const count = modifiedStocks[p.id] !== undefined ? modifiedStocks[p.id] : getProductStock(p);
      if (count <= 0) {
        outOfStock++;
      } else if (count <= 10) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    const modifiedCount = Object.keys(modifiedStocks).length;

    return {
      total: products.length,
      inStock,
      lowStock,
      outOfStock,
      modifiedCount
    };
  }, [products, modifiedStocks]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter(p => {
      // Search query
      if (query) {
        const nameEn = (p.nameEn || p.name || '').toLowerCase();
        const nameHi = (p.nameHi || '').toLowerCase();
        const brand = (p.brand || p.subEn || '').toLowerCase();
        const code = (p.code || p.Code || '').toLowerCase();
        if (!nameEn.includes(query) && !nameHi.includes(query) && !brand.includes(query) && !code.includes(query)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Stock status filter
      const currentVal = modifiedStocks[p.id] !== undefined ? modifiedStocks[p.id] : getProductStock(p);
      if (stockStatusFilter === 'modified') {
        return modifiedStocks[p.id] !== undefined;
      }
      if (stockStatusFilter === 'out-of-stock') {
        return currentVal <= 0;
      }
      if (stockStatusFilter === 'low-stock') {
        return currentVal > 0 && currentVal <= 10;
      }
      if (stockStatusFilter === 'in-stock') {
        return currentVal > 10;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, stockStatusFilter, modifiedStocks]);

  // Handle single item stock change
  const handleStockChange = (productId, rawValue) => {
    if (rawValue === '') {
      setModifiedStocks(prev => ({
        ...prev,
        [productId]: ''
      }));
      return;
    }

    const num = Math.max(0, parseInt(rawValue, 10));
    if (!isNaN(num)) {
      setModifiedStocks(prev => ({
        ...prev,
        [productId]: num
      }));
    }
  };

  // Quick increment/decrement
  const handleAdjustStock = (productId, delta) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const current = modifiedStocks[productId] !== undefined ? Number(modifiedStocks[productId]) || 0 : getProductStock(prod);
    const updated = Math.max(0, current + delta);
    setModifiedStocks(prev => ({
      ...prev,
      [productId]: updated
    }));
  };

  // Quick set fixed stock value
  const handleSetFixedStock = (productId, value) => {
    setModifiedStocks(prev => ({
      ...prev,
      [productId]: Math.max(0, value)
    }));
  };

  // Reset single item change
  const handleResetSingle = (productId) => {
    setModifiedStocks(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Discard all changes
  const handleDiscardAll = () => {
    if (window.confirm(isHindi ? "क्या आप सभी अनसेव किए गए स्टॉक बदलाव रद्द करना चाहते हैं?" : "Discard all pending stock modifications?")) {
      setModifiedStocks({});
      setNotification({ type: 'info', message: isHindi ? "सभी बदलाव रद्द कर दिए गए हैं।" : "All unsaved changes discarded." });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Save all modified stocks
  const handleSaveAll = async () => {
    const entries = Object.entries(modifiedStocks);
    if (entries.length === 0) return;

    setIsSaving(true);
    try {
      const updates = entries.map(([id, val]) => ({
        id: Number(id),
        stockCount: val === '' ? 0 : Math.max(0, Number(val))
      }));

      const res = await bulkUpdateStock({ updates });
      setModifiedStocks({});
      setNotification({
        type: 'success',
        message: isHindi 
          ? `✓ ${res.updatedCount || updates.length} उत्पादों का स्टॉक सफलतापूर्वक अपडेट किया गया!` 
          : `✓ Successfully updated stock for ${res.updatedCount || updates.length} items!`
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || (isHindi ? "स्टॉक अपडेट करने में त्रुटि हुई।" : "Failed to update stock.")
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Mass action: Apply to all currently filtered items
  const handleApplyToFiltered = (mode) => {
    if (filteredProducts.length === 0) return;

    const newMap = { ...modifiedStocks };
    filteredProducts.forEach(p => {
      const current = newMap[p.id] !== undefined ? Number(newMap[p.id]) || 0 : getProductStock(p);
      if (mode === 'set') {
        newMap[p.id] = Math.max(0, Number(quickBatchAmount) || 0);
      } else if (mode === 'add') {
        newMap[p.id] = Math.max(0, current + (Number(quickBatchAmount) || 0));
      } else if (mode === 'zero') {
        newMap[p.id] = 0;
      } else if (mode === 'restock_zeros') {
        if (current === 0) {
          newMap[p.id] = Math.max(10, Number(quickBatchAmount) || 50);
        }
      }
    });

    setModifiedStocks(newMap);
    setNotification({
      type: 'info',
      message: isHindi
        ? `फिल्टर किए गए ${filteredProducts.length} उत्पादों के स्टॉक में बदलाव लागू किया गया (सेव करने के लिए 'Save All Changes' दबाएं)`
        : `Staged changes for ${filteredProducts.length} filtered items (click 'Save All Changes' to commit)`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Export current stock list as Excel
  const handleExportStockExcel = () => {
    const exportData = products.map(p => ({
      "Product Code": p.code || `SP${String(p.id).padStart(6, '0')}`,
      "Product Name": p.nameEn || p.name || "",
      "Category": p.category || "swastik",
      "Brand": p.brand || p.subEn || "Swastik",
      "Unit": p.unit || "1 Unit",
      "Sales Price": p.price || 0,
      "Stock": modifiedStocks[p.id] !== undefined ? modifiedStocks[p.id] : getProductStock(p)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Stock Inventory");
    XLSX.writeFile(wb, `swastik_stock_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import Stock Counts from Excel
  const handleImportStockExcel = (e) => {
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

        if (!Array.isArray(rows) || rows.length === 0) {
          alert("Excel sheet is empty.");
          return;
        }

        // Match by code or name
        const newMap = { ...modifiedStocks };
        let matchedCount = 0;

        rows.forEach(row => {
          const code = (
            row["Product Code"] ||
            row["Unique Product Code (e.g. SP000001)"] || 
            row["Code"] || 
            row["ProductCode"] || 
            row.code || 
            ""
          ).trim().toLowerCase();

          const name = (
            row["Product Name"] ||
            row["Product Display Name"] || 
            row["Name"] || 
            row.name || 
            row.nameEn || 
            ""
          ).trim().toLowerCase();

          const rawStock = row["Stock"] ?? row["Physical Stock Count (Qty)"] ?? row["StockCount"] ?? row["Qty"] ?? row.stockCount;
          if (rawStock === undefined || rawStock === null || rawStock === '') return;
          const stock = Math.max(0, parseInt(rawStock, 10));
          if (isNaN(stock)) return;

          let targetProd = null;
          if (code) {
            targetProd = products.find(p => (p.code || '').trim().toLowerCase() === code);
          }
          if (!targetProd && name) {
            targetProd = products.find(p => (p.nameEn || p.name || '').trim().toLowerCase() === name);
          }

          if (targetProd) {
            newMap[targetProd.id] = stock;
            matchedCount++;
          }
        });

        setModifiedStocks(newMap);
        alert(`✓ Matched and staged stock updates for ${matchedCount} items! Click "Save Stock Updates" to finalize.`);
        e.target.value = "";
      } catch (err) {
        console.error(err);
        alert("Failed to parse stock spreadsheet. Please ensure it has 'Unique Product Code (e.g. SP000001)' or 'Product Display Name' and 'Physical Stock Count (Qty)' columns.");
      }
    };
    reader.readAsBinaryString(file);
  };

  if (isLoading && (!products || products.length === 0)) {
    return (
      <AdminPageLoader 
        title={isHindi ? "थोक स्टॉक लोड हो रहा है..." : "Loading Bulk Stock Catalog..."} 
        subtitle={isHindi ? "उत्पाद सूची और मौजूदा स्टॉक गिनती प्राप्त की जा रही है..." : "Retrieving inventory records and product quantities..."} 
      />
    );
  }

  return (
    <div id="bulk-stock-manager-container" className="space-y-6">
      {/* 1. Top Header Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>{isHindi ? "थोक स्टॉक प्रबंधन मेनू" : "Bulk Stock Update Menu"}</span>
                <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isHindi 
                  ? "सभी उत्पादों का स्टॉक एक साथ तेजी से अपडेट करें, बिना कोड खोए और बिना नाम डुप्लीकेट किए।"
                  : "Quickly adjust, restock, or mass-update physical inventories across your entire catalog in one click."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Excel Stock Sync */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportStockExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer active:scale-95 shadow"
            title="Download stock sheet for editing in Excel"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>{isHindi ? "स्टॉक शीट एक्सेल" : "Export Stock Sheet"}</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow">
            <Upload className="h-3.5 w-3.5 text-amber-400" />
            <span>{isHindi ? "स्टॉक शीट अपलोड" : "Import Stock Excel"}</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleImportStockExcel} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* 2. Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
            : notification.type === 'error'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-white/10 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isHindi ? "कुल उत्पाद" : "Total Products"}</div>
          <div className="text-xl font-black text-white font-mono mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/20 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <PackageCheck className="h-3 w-3" />
            <span>{isHindi ? "स्टॉक में (>10)" : "In Stock (>10)"}</span>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{stats.inStock}</div>
        </div>
        <div className="bg-slate-900 border border-amber-500/20 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{isHindi ? "कम स्टॉक (1-10)" : "Low Stock (1-10)"}</span>
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{stats.lowStock}</div>
        </div>
        <div className="bg-slate-900 border border-rose-500/20 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <PackageX className="h-3 w-3" />
            <span>{isHindi ? "स्टॉक समाप्त (0)" : "Out of Stock (0)"}</span>
          </div>
          <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{stats.outOfStock}</div>
        </div>
      </div>

      {/* 4. Filter & Mass Adjustments Toolbar */}
      <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-grow max-w-xl">
            {/* Search */}
            <div className="relative flex-grow min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder={isHindi ? "नाम, कोड (SP000001), या ब्रांड से खोजें..." : "Search name, code (SP000001), brand..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-400/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
            >
              <option value="all">📦 All Categories ({products.length})</option>
              {categories.filter(c => c.id !== 'all').map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameEn || cat.id}
                </option>
              ))}
            </select>

            {/* Stock Status Pill Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
              {[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'out-of-stock', label: 'Out of Stock', count: stats.outOfStock, color: 'text-rose-400' },
                { id: 'low-stock', label: 'Low Stock', count: stats.lowStock, color: 'text-amber-400' },
                { id: 'in-stock', label: 'In Stock', count: stats.inStock, color: 'text-emerald-400' },
                { id: 'modified', label: `Pending (${stats.modifiedCount})`, count: stats.modifiedCount, color: 'text-cyan-400' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStockStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    stockStatusFilter === tab.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Showing <strong className="text-white">{filteredProducts.length}</strong> items
          </div>
        </div>

        {/* Mass Quick Action Bar (Applied to current filtered list) */}
        <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>{isHindi ? "फिल्टर किए गए उत्पादों पर त्वरित क्रिया:" : "Mass Action on Filtered Items:"}</span>
            </span>
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                min="0" 
                value={quickBatchAmount} 
                onChange={(e) => setQuickBatchAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 bg-slate-900 border border-amber-500/30 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono text-center"
              />
              <span className="text-[10px] text-slate-500 font-mono">Units</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyToFiltered('set')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-white/10 transition-all cursor-pointer"
            >
              Set All to {quickBatchAmount}
            </button>
            <button
              type="button"
              onClick={() => handleApplyToFiltered('add')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
            >
              + Add {quickBatchAmount} to All
            </button>
            <button
              type="button"
              onClick={() => handleApplyToFiltered('restock_zeros')}
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 transition-all cursor-pointer"
            >
              Restock 0-Stock Items to {quickBatchAmount || 50}
            </button>
            <button
              type="button"
              onClick={() => handleApplyToFiltered('zero')}
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold rounded-lg border border-rose-500/30 transition-all cursor-pointer"
            >
              Mark All as Out-of-Stock (0)
            </button>
          </div>
        </div>
      </div>

      {/* 5. Spreadsheet Inventory Table */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-black tracking-wider sticky top-0 z-20 border-b border-white/10">
              <tr>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 w-16 text-center">Photo</th>
                <th className="py-3 px-3 w-32">Unique Code</th>
                <th className="py-3 px-3 min-w-[200px]">Product Display Name</th>
                <th className="py-3 px-3 w-28">Department</th>
                <th className="py-3 px-3 w-24">Base Price</th>
                <th className="py-3 px-3 w-32 text-center">Status</th>
                <th className="py-3 px-3 min-w-[240px] text-center">Stock Count (Qty) Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    {isHindi ? "कोई उत्पाद नहीं मिला।" : "No products found matching your query."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const originalStock = getProductStock(p);
                  const isModified = modifiedStocks[p.id] !== undefined;
                  const currentStock = isModified ? modifiedStocks[p.id] : originalStock;
                  const numStock = currentStock === '' ? 0 : Number(currentStock);
                  const imgSrc = resolveProductImage(p, r2PublicUrl, 80);

                  return (
                    <tr 
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isModified ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <img 
                          src={imgSrc} 
                          alt={p.nameEn || "Product"}
                          className="w-10 h-10 object-cover rounded-lg border border-white/10 mx-auto bg-slate-950"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                          {p.code || `SP${String(p.id).padStart(6, '0')}`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white text-xs">{p.nameEn || p.name || 'Unnamed'}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{p.brand || p.subEn || 'General'}</span>
                          <span>•</span>
                          <span className="font-mono text-cyan-400">{p.unit || '1 Unit'}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {p.category || 'general'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                        ₹{p.price}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {numStock <= 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                            Out of Stock
                          </span>
                        ) : numStock <= 10 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Low ({numStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            In Stock ({numStock})
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Decrement Buttons */}
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(p.id, -10)}
                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold rounded cursor-pointer transition-all"
                            title="Subtract 10"
                          >
                            -10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(p.id, -1)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded cursor-pointer transition-all"
                            title="Subtract 1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>

                          {/* Direct Numeric Input */}
                          <input 
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={(e) => handleStockChange(p.id, e.target.value)}
                            className={`w-20 text-center font-mono font-bold text-xs py-1 rounded-lg border transition-all ${
                              isModified 
                                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow' 
                                : 'bg-slate-950 text-white border-white/15 focus:border-amber-400'
                            }`}
                          />

                          {/* Quick Increment Buttons */}
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(p.id, 1)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded cursor-pointer transition-all"
                            title="Add 1"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(p.id, 10)}
                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold rounded cursor-pointer transition-all"
                            title="Add 10"
                          >
                            +10
                          </button>

                          {/* Quick Set to 0 (Out of stock) */}
                          <button
                            type="button"
                            onClick={() => handleSetFixedStock(p.id, 0)}
                            className="px-1.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-[9px] font-bold rounded cursor-pointer transition-all"
                            title="Set to 0 (Out of stock)"
                          >
                            0
                          </button>

                          {/* Quick Set to 100 */}
                          <button
                            type="button"
                            onClick={() => handleSetFixedStock(p.id, 100)}
                            className="px-1.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[9px] font-bold rounded cursor-pointer transition-all"
                            title="Set to 100"
                          >
                            100
                          </button>

                          {/* Reset Single */}
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleResetSingle(p.id)}
                              className="p-1 text-slate-400 hover:text-white text-xs cursor-pointer ml-1"
                              title="Revert this item to original stock"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
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
      </div>

      {/* 6. Sticky Floating Bottom Action Bar (Appears when any item is modified) */}
      {stats.modifiedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 p-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-black text-amber-300 uppercase tracking-wider">
              {stats.modifiedCount} {stats.modifiedCount === 1 ? 'Product Modified' : 'Products Modified'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardAll}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {isHindi ? "रद्द करें" : "Discard"}
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all shadow-lg shadow-amber-400/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? (isHindi ? "सहेज रहा है..." : "Saving...") : (isHindi ? `स्टॉक सहेजें (${stats.modifiedCount})` : `Save Stock Updates (${stats.modifiedCount})`)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
