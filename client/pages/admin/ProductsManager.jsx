import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import R2ImageUploader from './R2ImageUploader';
import { 
  resolveProductImage, 
  getNextCandidateImage,
  markImageFailed, 
  hasCustomProductImage, 
  DEFAULT_PRODUCT_FALLBACK 
} from '../../utils/imageHelper';
import { 
  Package, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  Image as ImageIcon,
  FileSpreadsheet,
  ChevronsUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Check,
  RefreshCw,
  X,
  ShieldCheck,
  Sparkles,
  FileText,
  HelpCircle,
  Eye
} from 'lucide-react';
import BulkStockManager from './BulkStockManager';

const ListProductImage = ({ p, r2PublicUrl }) => {
  const [imgSrc, setImgSrc] = useState(() => resolveProductImage(p, r2PublicUrl, 120));

  React.useEffect(() => {
    setImgSrc(resolveProductImage(p, r2PublicUrl, 120));
  }, [p, r2PublicUrl]);

  const handleImageError = () => {
    if (imgSrc && imgSrc !== DEFAULT_PRODUCT_FALLBACK) {
      const next = getNextCandidateImage(p, imgSrc, r2PublicUrl);
      setImgSrc(next || DEFAULT_PRODUCT_FALLBACK);
    }
  };

  const hasImage = hasCustomProductImage(p);

  return (
    <div className="relative group shrink-0">
      <img 
        src={imgSrc} 
        onError={handleImageError} 
        loading="lazy"
        decoding="async"
        className="w-12 h-12 rounded-lg object-cover border border-white/10 shadow bg-slate-950 shrink-0" 
        alt="SKU"
        referrerPolicy="no-referrer"
      />
      {hasImage ? (
        <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full ring-2 ring-slate-900 shadow" title="Has custom image">
          <CheckCircle2 className="w-2.5 h-2.5" />
        </span>
      ) : (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full ring-2 ring-slate-900 shadow" title="No custom image assigned">
          <AlertTriangle className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
};

export default function ProductsManager({ searchQuery, setSearchQuery, userRole, initialView = 'catalog' }) {
  const { isHindi } = useLanguage();
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    clearAllProducts, 
    bulkUploadProducts,
    bulkUpdateStock,
    categories, 
    r2PublicUrl, 
    contactSettings, 
    setContactSettings, 
    fetchProducts 
  } = useData();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Subview state: 'catalog' | 'bulk-stock' | 'bulk-import'
  const [activeSubView, setActiveSubView] = useState(initialView || 'catalog');

  useEffect(() => {
    if (initialView) {
      setActiveSubView(initialView);
    }
  }, [initialView]);

  // Bulk Upload & Validation states
  const [importMode, setImportMode] = useState('update_existing'); // 'update_existing' | 'skip_existing'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // View & Quick Edit Modal states (Responsive & Scrollable)
  const [viewingProduct, setViewingProduct] = useState(null);
  const [quickEditProduct, setQuickEditProduct] = useState(null);
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  // Selected edit ID state
  const [editingProdId, setEditingProdId] = useState(null);

  // Form state
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'vegetables',
    brandTag: '',
    price: '',
    originalPrice: '',
    discount: '',
    unit: '1 Unit', // Single unit default
    unitPrices: '',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
    stockCount: '100',
    code: '',
    gstPercent: '5'
  });

  // Filters state
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPromoStatus, setFilterPromoStatus] = useState('all'); // all | promo | normal
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterImageStatus, setFilterImageStatus] = useState('all'); // all | with-image | no-image
  const [filterStockStatus, setFilterStockStatus] = useState('all'); // all | low-stock | out-of-stock | in-stock

  // Image statistics
  const { withImageCount, noImageCount } = React.useMemo(() => {
    let withImg = 0;
    let noImg = 0;
    products.forEach(p => {
      if (hasCustomProductImage(p)) withImg++;
      else noImg++;
    });
    return { withImageCount: withImg, noImageCount: noImg };
  }, [products]);

  // Stock statistics
  const getStockCount = (p) => {
    if (!p) return 0;
    if (p.stockCount !== undefined && p.stockCount !== null && p.stockCount !== '') return Number(p.stockCount);
    if (p.stock_count !== undefined && p.stock_count !== null && p.stock_count !== '') return Number(p.stock_count);
    if (p.stock !== undefined && p.stock !== null && p.stock !== '') return Number(p.stock);
    if (p.quantity !== undefined && p.quantity !== null && p.quantity !== '') return Number(p.quantity);
    return 100;
  };

  const { lowStockCount, outOfStockCount, inStockCount } = React.useMemo(() => {
    let low = 0;
    let out = 0;
    let inStk = 0;
    products.forEach(p => {
      const count = getStockCount(p);
      if (count <= 0) {
        out++;
        low++;
      } else if (count <= 10) {
        low++;
      } else {
        inStk++;
      }
    });
    return { lowStockCount: low, outOfStockCount: out, inStockCount: inStk };
  }, [products]);

  const availableBrands = React.useMemo(() => {
    const brands = new Set();
    products.forEach(p => {
      const b = p.brand || p.subEn || '';
      if (b && b.trim()) {
        brands.add(b.trim());
      }
    });
    return Array.from(brands).sort();
  }, [products]);

  // Pagination states (default 50 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterPromoStatus, filterBrand, filterImageStatus, filterStockStatus, itemsPerPage]);

  // 11 requested fields standard structure
  const sample11FieldsProducts = [
    {
      "Product Display Name": "Premium Alphonso Mango (Devgad)",
      "Brand / Segment Tag": "Ratnagiri Farms",
      "Product Department Category": "fruits",
      "Available Weight / Product Units": "1 Dozen, 6 Pcs",
      "Base Price / Default rate (₹)": 650,
      "Original Price crossed out (₹)": 800,
      "Discount ribbon label text": "18% OFF",
      "Physical Stock Count (Qty)": 50,
      "Unique Product Code (e.g. SP000001)": "SP000001",
      "GST Rate (%) / जीएसटी दर": 0,
      "Product Illustration Image URL": "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400"
    },
    {
      "Product Display Name": "Daawat Rozana Super Basmati Rice",
      "Brand / Segment Tag": "Daawat",
      "Product Department Category": "grocery",
      "Available Weight / Product Units": "1kg, 5kg",
      "Base Price / Default rate (₹)": 115,
      "Original Price crossed out (₹)": 140,
      "Discount ribbon label text": "₹25 OFF",
      "Physical Stock Count (Qty)": 120,
      "Unique Product Code (e.g. SP000001)": "SP000002",
      "GST Rate (%) / जीएसटी दर": 5,
      "Product Illustration Image URL": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400"
    },
    {
      "Product Display Name": "Fortune Sunlite Refined Sunflower Oil",
      "Brand / Segment Tag": "Fortune",
      "Product Department Category": "grocery",
      "Available Weight / Product Units": "1L, 5L",
      "Base Price / Default rate (₹)": 155,
      "Original Price crossed out (₹)": 180,
      "Discount ribbon label text": "Save ₹25",
      "Physical Stock Count (Qty)": 80,
      "Unique Product Code (e.g. SP000001)": "SP000003",
      "GST Rate (%) / जीएसटी दर": 5,
      "Product Illustration Image URL": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400"
    },
    {
      "Product Display Name": "Cadbury Dairy Milk Silk Hazelnut",
      "Brand / Segment Tag": "Cadbury",
      "Product Department Category": "chocolate",
      "Available Weight / Product Units": "143g Bar",
      "Base Price / Default rate (₹)": 175,
      "Original Price crossed out (₹)": 195,
      "Discount ribbon label text": "10% OFF",
      "Physical Stock Count (Qty)": 45,
      "Unique Product Code (e.g. SP000001)": "SP000004",
      "GST Rate (%) / जीएसटी दर": 18,
      "Product Illustration Image URL": "https://images.unsplash.com/photo-1548907040-4d42b52125ca?auto=format&fit=crop&q=80&w=400"
    },
    {
      "Product Display Name": "Pampers All Round Protection Baby Pants (L)",
      "Brand / Segment Tag": "Pampers",
      "Product Department Category": "babycare",
      "Available Weight / Product Units": "34 Diapers Pack",
      "Base Price / Default rate (₹)": 599,
      "Original Price crossed out (₹)": 749,
      "Discount ribbon label text": "20% OFF",
      "Physical Stock Count (Qty)": 30,
      "Unique Product Code (e.g. SP000001)": "SP000005",
      "GST Rate (%) / जीएसटी दर": 12,
      "Product Illustration Image URL": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400"
    }
  ];

  // Download Sample Excel Template
  const downloadSampleProductsExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sample11FieldsProducts);
    XLSX.utils.book_append_sheet(wb, ws, "Catalog Products (11 Fields)");
    XLSX.writeFile(wb, "swastik_products_sample_11fields.xlsx");
  };

  // Download Sample JSON Template
  const downloadSampleProductsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sample11FieldsProducts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "swastik_products_sample_11fields.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Current Live Catalog to Excel
  const exportCatalogToExcel = () => {
    const exportRows = products.map((p, idx) => ({
      "Product Display Name": p.nameEn || p.name || "",
      "Brand / Segment Tag": p.brand || p.subEn || "General",
      "Product Department Category": p.category || "vegetables",
      "Available Weight / Product Units": p.unit || "1 Unit",
      "Base Price / Default rate (₹)": p.price || 0,
      "Original Price crossed out (₹)": p.originalPrice || "",
      "Discount ribbon label text": p.discount || p.discount_tag || "",
      "Physical Stock Count (Qty)": getStockCount(p),
      "Unique Product Code (e.g. SP000001)": p.code || `SP${String(idx + 1).padStart(6, '0')}`,
      "GST Rate (%) / जीएसटी दर": p.gstPercent !== undefined ? p.gstPercent : (p.gst_percent !== undefined ? p.gst_percent : 5),
      "Product Illustration Image URL": p.image || p.image_url || ""
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, "Catalog Export");
    XLSX.writeFile(wb, `swastik_catalog_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Current Live Catalog to JSON
  const exportCatalogToJson = () => {
    const exportRows = products.map((p, idx) => ({
      "Product Display Name": p.nameEn || p.name || "",
      "Brand / Segment Tag": p.brand || p.subEn || "General",
      "Product Department Category": p.category || "vegetables",
      "Available Weight / Product Units": p.unit || "1 Unit",
      "Base Price / Default rate (₹)": p.price || 0,
      "Original Price crossed out (₹)": p.originalPrice || null,
      "Discount ribbon label text": p.discount || p.discount_tag || "",
      "Physical Stock Count (Qty)": getStockCount(p),
      "Unique Product Code (e.g. SP000001)": p.code || `SP${String(idx + 1).padStart(6, '0')}`,
      "GST Rate (%) / जीएसटी दर": p.gstPercent !== undefined ? p.gstPercent : (p.gst_percent !== undefined ? p.gst_percent : 5),
      "Product Illustration Image URL": p.image || p.image_url || ""
    }));

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportRows, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `swastik_catalog_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Bulk Import Destination Category
  const [bulkCategory, setBulkCategory] = useState('vegetables');

  // Submit Single Product Form (Register or Modify)
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;

    const existing = editingProdId ? products.find(p => p.id === editingProdId) : null;
    const finalCode = (productForm.code && productForm.code.trim()) 
      ? productForm.code.trim() 
      : (existing && existing.code ? existing.code : '');

    const payload = {
      nameEn: productForm.name.trim(),
      nameHi: productForm.name.trim(),
      category: productForm.category,
      brand: productForm.brandTag || 'Fresh',
      subEn: productForm.brandTag || 'Fresh',
      subHi: productForm.brandTag || 'ताजा',
      price: Number(productForm.price),
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : null,
      discount: productForm.discount || null,
      unit: productForm.unit || '1 Unit',
      unitPrices: productForm.unitPrices || '',
      packEn: productForm.unit ? productForm.unit.split(',')[0].trim() : '1 Unit',
      packHi: productForm.unit ? productForm.unit.split(',')[0].trim() : '1 Unit',
      image: productForm.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stockCount: productForm.stockCount !== '' ? Number(productForm.stockCount) : 100,
      code: finalCode,
      gstPercent: productForm.gstPercent !== '' ? Number(productForm.gstPercent) : 5
    };

    if (editingProdId) {
      await updateProduct(editingProdId, payload);
      setEditingProdId(null);
    } else {
      await addProduct(payload);
    }

    // Reset Form
    setProductForm({
      name: '',
      category: 'vegetables',
      brandTag: '',
      price: '',
      originalPrice: '',
      discount: '',
      unit: '1 Unit',
      unitPrices: '',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stockCount: '100',
      code: '',
      gstPercent: '5'
    });
  };

  const startEditProduct = (prod) => {
    setEditingProdId(prod.id);
    setProductForm({
      name: prod.nameEn || prod.nameHi || prod.name || '',
      category: prod.category || 'vegetables',
      brandTag: prod.brand || prod.subEn || prod.subHi || '',
      price: prod.price !== undefined ? prod.price : '',
      originalPrice: prod.originalPrice !== undefined && prod.originalPrice !== null ? prod.originalPrice : '',
      discount: prod.discount || prod.discount_tag || '',
      unit: prod.unit || '1 Unit',
      unitPrices: prod.unitPrices || '',
      image: prod.image || prod.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stockCount: prod.stockCount !== undefined ? String(prod.stockCount) : (prod.stock_count !== undefined ? String(prod.stock_count) : '100'),
      code: prod.code || prod.Code || '',
      gstPercent: prod.gstPercent !== undefined ? String(prod.gstPercent) : (prod.gst_percent !== undefined ? String(prod.gst_percent) : '5')
    });

    // Auto scroll directly to update form
    setTimeout(() => {
      document.getElementById('product-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Open responsive quick edit modal with all 11 fields
  const openQuickEdit = (prod) => {
    setQuickEditProduct({
      id: prod.id,
      name: prod.nameEn || prod.nameHi || prod.name || '',
      category: prod.category || 'vegetables',
      brandTag: prod.brand || prod.subEn || prod.subHi || 'General',
      price: prod.price !== undefined ? prod.price : '',
      originalPrice: prod.originalPrice !== undefined && prod.originalPrice !== null ? prod.originalPrice : '',
      discount: prod.discount || prod.discount_tag || '',
      unit: prod.unit || '1 Unit',
      unitPrices: prod.unitPrices || '',
      image: prod.image || prod.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stockCount: prod.stockCount !== undefined ? String(prod.stockCount) : (prod.stock_count !== undefined ? String(prod.stock_count) : '100'),
      code: prod.code || prod.Code || '',
      gstPercent: prod.gstPercent !== undefined ? String(prod.gstPercent) : (prod.gst_percent !== undefined ? String(prod.gst_percent) : '5')
    });
  };

  const handleQuickEditSubmit = async (e) => {
    e.preventDefault();
    if (!quickEditProduct) return;
    setIsSavingQuickEdit(true);
    try {
      const existing = products.find(p => p.id === quickEditProduct.id);
      const finalCode = (quickEditProduct.code && String(quickEditProduct.code).trim())
        ? String(quickEditProduct.code).trim()
        : (existing && (existing.code || existing.Code) ? (existing.code || existing.Code) : '');

      const payload = {
        nameEn: String(quickEditProduct.name || '').trim(),
        nameHi: String(quickEditProduct.name || '').trim(),
        category: quickEditProduct.category,
        brand: quickEditProduct.brandTag || 'Fresh',
        subEn: quickEditProduct.brandTag || 'Fresh',
        subHi: quickEditProduct.brandTag || 'ताजा',
        price: Number(quickEditProduct.price),
        originalPrice: quickEditProduct.originalPrice ? Number(quickEditProduct.originalPrice) : null,
        discount: quickEditProduct.discount || null,
        unit: quickEditProduct.unit || '1 Unit',
        unitPrices: quickEditProduct.unitPrices || '',
        packEn: quickEditProduct.unit ? quickEditProduct.unit.split(',')[0].trim() : '1 Unit',
        packHi: quickEditProduct.unit ? quickEditProduct.unit.split(',')[0].trim() : '1 Unit',
        image: quickEditProduct.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
        stockCount: quickEditProduct.stockCount !== '' && quickEditProduct.stockCount !== undefined ? Number(quickEditProduct.stockCount) : 100,
        code: finalCode,
        gstPercent: quickEditProduct.gstPercent !== '' && quickEditProduct.gstPercent !== undefined ? Number(quickEditProduct.gstPercent) : 5
      };

      await updateProduct(quickEditProduct.id, payload);
      setQuickEditProduct(null);
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to update product: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this product from catalog?")) {
      deleteProduct(id);
    }
  };

  const handleImageUploaded = (imageUrl) => {
    setProductForm(prev => ({ ...prev, image: imageUrl }));
  };

  // Bulk Excel Upload Parser with 11 Fields Validation & Deduplication
  const handleBulkExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(rows) || rows.length === 0) {
          alert(isHindi ? "अपलोड की गई एक्सेल शीट खाली है।" : "Uploaded spreadsheet is empty.");
          setIsUploading(false);
          return;
        }

        const result = await bulkUploadProducts(rows, {
          mode: importMode,
          defaultCategory: bulkCategory
        });

        setUploadResult(result);
        setShowResultModal(true);
        e.target.value = "";
      } catch (err) {
        console.error("Bulk Excel Upload Error:", err);
        alert(err.message || "Failed to process Excel upload. Please verify file columns.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Bulk JSON Upload Parser with 11 Fields Validation & Deduplication
  const handleBulkJsonUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];

        if (arrayData.length === 0) {
          alert(isHindi ? "JSON फ़ाइल खाली है।" : "JSON file contains no products.");
          setIsUploading(false);
          return;
        }

        const result = await bulkUploadProducts(arrayData, {
          mode: importMode,
          defaultCategory: bulkCategory
        });

        setUploadResult(result);
        setShowResultModal(true);
        e.target.value = "";
      } catch (err) {
        console.error("Bulk JSON Upload Error:", err);
        alert(err.message || "Failed to parse JSON file. Ensure it contains a valid array of product objects.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  // Complex multi-filter evaluation
  const filteredProducts = products.filter(p => {
    const codeVal = (p.code || p.Code || '').toLowerCase();
    const textMatches = (p.nameEn || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (p.nameHi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.subEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        codeVal.includes(searchQuery.toLowerCase());
    
    const categoryMatches = filterCategory === 'all' || p.category === filterCategory;
    
    const promoMatches = filterPromoStatus === 'all' || 
                         (filterPromoStatus === 'promo' && p.discount) ||
                         (filterPromoStatus === 'normal' && !p.discount);

    const brandMatches = filterBrand === 'all' || 
                         (p.brand && p.brand.trim().toLowerCase() === filterBrand.trim().toLowerCase()) ||
                         (p.subEn && p.subEn.trim().toLowerCase() === filterBrand.trim().toLowerCase());

    const hasImg = hasCustomProductImage(p);
    const imageMatches = filterImageStatus === 'all' || 
                         (filterImageStatus === 'with-image' && hasImg) ||
                         (filterImageStatus === 'no-image' && !hasImg);

    const stockCount = getStockCount(p);
    const stockMatches = filterStockStatus === 'all' ||
                         (filterStockStatus === 'low-stock' && stockCount <= 10) ||
                         (filterStockStatus === 'out-of-stock' && stockCount <= 0) ||
                         (filterStockStatus === 'in-stock' && stockCount > 10);

    return textMatches && categoryMatches && promoMatches && brandMatches && imageMatches && stockMatches;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredProducts.length, totalPages, currentPage]);

  return (
    <div className="space-y-8 animate-fade-in text-white/90">
      
      {/* 1. Header & Navigation Sub-Tabs */}
      <div className="space-y-4 border-b border-white/10 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              <span>{isHindi ? "उत्पाद एवं स्टॉक प्रबंधन" : "Product & Inventory Management"}</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              {isHindi 
                ? "कैटलॉग, थोक स्टॉक त्वरित अपडेट, और 11-फील्ड एक्सेल/जेसन बल्क आयात" 
                : "Catalog, bulk stock quick updater, and 11-field Excel/JSON bulk ingestion"}
            </p>
          </div>

          {/* Quick Export & Sample Download Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleProductsExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Download standard 11-field Excel sample (.xlsx)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Excel Sample (11 Fields)</span>
            </button>
            <button
              type="button"
              onClick={downloadSampleProductsJson}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-extrabold uppercase text-[10px] tracking-wider rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Download standard 11-field JSON sample (.json)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>JSON Sample</span>
            </button>
            <button
              type="button"
              onClick={exportCatalogToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-extrabold uppercase text-[10px] tracking-wider rounded-xl border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Export all current catalog products with all 11 fields"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Catalog ({products.length})</span>
            </button>
          </div>
        </div>

        {/* Primary Sub-Tabs Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-white/10 p-2 rounded-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="subview-catalog-tab"
              onClick={() => setActiveSubView('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubView === 'catalog'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>{isHindi ? "उत्पाद कैटलॉग" : "Product Catalog"}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-950/40">
                {products.length}
              </span>
            </button>

            <button
              type="button"
              id="subview-bulk-stock-tab"
              onClick={() => setActiveSubView('bulk-stock')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubView === 'bulk-stock'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>{isHindi ? "थोक स्टॉक अपडेटर" : "Bulk Stock Manager"}</span>
              {(lowStockCount > 0 || outOfStockCount > 0) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500 text-white">
                  {outOfStockCount > 0 ? `${outOfStockCount} Out` : `${lowStockCount} Low`}
                </span>
              )}
            </button>

            <button
              type="button"
              id="subview-bulk-import-tab"
              onClick={() => setActiveSubView('bulk-import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubView === 'bulk-import'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{isHindi ? "थोक एक्सेल व जेसन आयात" : "Bulk Excel & JSON Import"}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-black bg-slate-950/40 text-emerald-200">
                11 Fields
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium px-2">
            {activeSubView === 'catalog' && <span>Viewing & editing live store SKU inventory</span>}
            {activeSubView === 'bulk-stock' && <span className="text-amber-300 font-bold">Quick mass stock adjustment ledger</span>}
            {activeSubView === 'bulk-import' && <span className="text-emerald-300 font-bold">11-field validated deduplicating importer</span>}
          </div>
        </div>
      </div>

      {/* Subview 1: Bulk Stock Manager */}
      {activeSubView === 'bulk-stock' && (
        <BulkStockManager />
      )}

      {/* Subview 2: Bulk Excel & JSON Import Studio */}
      {activeSubView === 'bulk-import' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/20 p-6 rounded-3xl shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Validation & Code Protection Active</span>
                </div>
                <h3 className="text-base font-black text-white">
                  Bulk Product Ingestion Studio (Excel & JSON)
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Upload complete inventory spreadsheets or JSON data arrays conforming to the standardized 11-field specification. The engine validates each row, protects existing product codes (e.g. <span className="font-mono text-cyan-300">SP000001</span>), and prevents duplicate product names.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl space-y-3 shrink-0 md:w-80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Conflict & Duplicate Policy</span>
                </span>
                
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="radio"
                    name="bulkImportMode"
                    value="update_existing"
                    checked={importMode === 'update_existing'}
                    onChange={() => setImportMode('update_existing')}
                    className="mt-0.5 text-cyan-400 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-white block">Smart Update & Protect</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      Update price, original price, stock & details if exists. Code is strictly preserved; no duplicate names created.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="radio"
                    name="bulkImportMode"
                    value="skip_existing"
                    checked={importMode === 'skip_existing'}
                    onChange={() => setImportMode('skip_existing')}
                    className="mt-0.5 text-amber-400 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-white block">Strict Skip (Do Nothing)</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      If code or name already exists, do nothing (skip row completely). Only enter brand new products.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Category Selector */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
              <span className="text-[11px] font-bold text-slate-400">Default Category (for unassigned items):</span>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>📦 {cat.nameEn || cat.id}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Dropzones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Excel Upload Card */}
            <div className="bg-slate-900 border border-amber-500/20 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Excel Spreadsheet Import</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Accepts .xlsx, .xls</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleProductsExcel}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-[9px] uppercase tracking-wider rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                  >
                    📥 Sample Excel
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bulk import or update products using Microsoft Excel. Supports all 11 columns matching the standard Swastik supermarket schema.
                </p>
              </div>

              <div className="border-2 border-dashed border-amber-500/30 rounded-2xl p-6 text-center space-y-3 hover:border-amber-400 transition-all relative bg-slate-950/40">
                <FileSpreadsheet className="h-8 w-8 text-amber-400 mx-auto opacity-70" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white block">Select or drop Excel catalog file</span>
                  <span className="text-[10px] text-slate-500 font-mono block">Columns: Name, Brand, Category, Units, Price, OriginalPrice, Discount, Stock, Code, GST, Image</span>
                </div>
                <div className="relative inline-block w-full max-w-xs">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    disabled={isUploading}
                    onChange={handleBulkExcelUpload}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                  />
                  <div className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all ${
                    isUploading ? 'bg-slate-800 text-slate-500' : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-400/20 cursor-pointer'
                  }`}>
                    {isUploading ? "Processing Spreadsheet..." : "Choose .xlsx File"}
                  </div>
                </div>
              </div>
            </div>

            {/* JSON Upload Card */}
            <div className="bg-slate-900 border border-cyan-500/20 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">JSON Catalog Import</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Accepts .json</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleProductsJson}
                    className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-black text-[9px] uppercase tracking-wider rounded-lg border border-cyan-500/30 transition-all cursor-pointer"
                  >
                    📥 Sample JSON
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Import array of product objects directly via JSON. Ideal for API data dumps, POS migrations, and system backups.
                </p>
              </div>

              <div className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-6 text-center space-y-3 hover:border-cyan-400 transition-all relative bg-slate-950/40">
                <Layers className="h-8 w-8 text-cyan-400 mx-auto opacity-70" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white block">Select or drop JSON array file</span>
                  <span className="text-[10px] text-slate-500 font-mono block">Format: Array of objects with the 11 schema keys</span>
                </div>
                <div className="relative inline-block w-full max-w-xs">
                  <input
                    type="file"
                    accept=".json"
                    disabled={isUploading}
                    onChange={handleBulkJsonUpload}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                  />
                  <div className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all ${
                    isUploading ? 'bg-slate-800 text-slate-500' : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-md shadow-cyan-400/20 cursor-pointer'
                  }`}>
                    {isUploading ? "Processing JSON..." : "Choose .json File"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 11 Fields Standard Table Specification */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span>The 11-Field Standard Specification</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Your Excel sheet columns or JSON object keys must include or map to these 11 exact fields:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSampleProductsExcel}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-black uppercase rounded-xl border border-white/10 cursor-pointer"
                >
                  Download .xlsx Template
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-400 border-b border-white/10 font-mono tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Field / Column Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Sample Value</th>
                    <th className="p-3">Validation Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">1</td>
                    <td className="p-3 font-bold text-white">Product Display Name</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">String (Required)</td>
                    <td className="p-3 font-mono text-emerald-400">Premium Alphonso Mango</td>
                    <td className="p-3 text-[11px] text-slate-400">Primary label; deduplicated against existing names</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">2</td>
                    <td className="p-3 font-bold text-white">Brand / Segment Tag</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">String</td>
                    <td className="p-3 font-mono text-emerald-400">Ratnagiri Farms / Daawat</td>
                    <td className="p-3 text-[11px] text-slate-400">Brand badge shown on product card</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">3</td>
                    <td className="p-3 font-bold text-white">Product Department Category</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">String</td>
                    <td className="p-3 font-mono text-emerald-400">fruits, grocery, vegetables, chocolate</td>
                    <td className="p-3 text-[11px] text-slate-400">Matches category slug or assigns chosen target category</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">4</td>
                    <td className="p-3 font-bold text-white">Available Weight / Product Units</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">String</td>
                    <td className="p-3 font-mono text-emerald-400">1kg, 5kg / 1 Dozen, 6 Pcs</td>
                    <td className="p-3 text-[11px] text-slate-400">Comma-separated pack weights for weight picker pills</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">5</td>
                    <td className="p-3 font-bold text-white">Base Price / Default rate (₹)</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">Number (Required)</td>
                    <td className="p-3 font-mono text-emerald-400">650</td>
                    <td className="p-3 text-[11px] text-slate-400">Selling price in Indian Rupees (₹)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">6</td>
                    <td className="p-3 font-bold text-white">Original Price crossed out (₹)</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">Number (Optional)</td>
                    <td className="p-3 font-mono text-emerald-400">800</td>
                    <td className="p-3 text-[11px] text-slate-400">MRP price struck through to demonstrate customer savings</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">7</td>
                    <td className="p-3 font-bold text-white">Discount ribbon label text</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">String (Optional)</td>
                    <td className="p-3 font-mono text-emerald-400">18% OFF / Save ₹25</td>
                    <td className="p-3 text-[11px] text-slate-400">Highlighted promotional ribbon badge on card</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">8</td>
                    <td className="p-3 font-bold text-white">Physical Stock Count (Qty)</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">Number</td>
                    <td className="p-3 font-mono text-emerald-400">50</td>
                    <td className="p-3 text-[11px] text-slate-400">Remaining stock inventory units in warehouse/store</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">9</td>
                    <td className="p-3 font-bold text-white">Unique Product Code (e.g. SP000001)</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">String (Protected)</td>
                    <td className="p-3 font-mono text-emerald-400">SP000001</td>
                    <td className="p-3 text-[11px] text-slate-400">Strictly preserved upon updates; auto-assigned if blank</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">10</td>
                    <td className="p-3 font-bold text-white">GST Rate (%) / जीएसटी दर</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">Number</td>
                    <td className="p-3 font-mono text-emerald-400">0, 5, 12, 18, 28</td>
                    <td className="p-3 text-[11px] text-slate-400">Tax percentage recorded on invoice & GST reports</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">11</td>
                    <td className="p-3 font-bold text-white">Product Illustration Image URL</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">URL / String</td>
                    <td className="p-3 font-mono text-emerald-400">https://images.unsplash.com/...</td>
                    <td className="p-3 text-[11px] text-slate-400">Direct image link or Cloudflare R2 object URL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subview 3: Standard Product Catalog */}
      {activeSubView === 'catalog' && (
        <>
      {userRole !== 'customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form Container (left side) */}
          <div id="product-form-container" className="lg:col-span-8">
            <form onSubmit={handleProductSubmit} className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Plus className="h-4 w-4" />
                <span>{editingProdId ? `Modify Product Block ID: ${editingProdId}` : "Register New Stock Token"}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Product Display Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Premium Alphonso"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Brand / Segment Tag</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Organic King"
                    value={productForm.brandTag}
                    onChange={(e) => setProductForm({ ...productForm, brandTag: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Product Department Category</label>
                  <select 
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>📦 {cat.nameEn || cat.id}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Available Weight / Product Units</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 1 Unit"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block flex items-center gap-1.5">
                    <span>Unit-Specific prices mapping</span>
                    <span className="text-[8px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-mono lowercase border border-cyan-900">optional</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1 Unit:180"
                    value={productForm.unitPrices}
                    onChange={(e) => setProductForm({ ...productForm, unitPrices: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Base Price / Default rate (₹)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 180"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Original Price crossed out (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 240 (optional)"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Discount ribbon label text</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 15% OFF"
                    value={productForm.discount}
                    onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block">Physical Stock Count (Qty)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 100"
                    value={productForm.stockCount}
                    onChange={(e) => setProductForm({ ...productForm, stockCount: e.target.value })}
                    className="w-full bg-slate-950 border border-cyan-500/20 focus:border-cyan-400/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block">Unique Product Code (e.g. SP000001)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SP000001 (optional)"
                    value={productForm.code || ''}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono placeholder:text-slate-700 uppercase"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span>GST Rate (%) / जीएसटी दर</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Tax Slab</span>
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">Current: <strong className="text-cyan-300 font-bold">{productForm.gstPercent || 0}%</strong></span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      {[
                        { label: '0% (Exempt)', val: '0' },
                        { label: '5% (Food/Ess)', val: '5' },
                        { label: '12% (Packaged)', val: '12' },
                        { label: '18% (Standard)', val: '18' },
                        { label: '28% (Luxury)', val: '28' }
                      ].map((slab) => (
                        <button
                          key={slab.val}
                          type="button"
                          onClick={() => setProductForm({ ...productForm, gstPercent: slab.val })}
                          className={`flex-1 py-1.5 px-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                            String(productForm.gstPercent) === slab.val
                              ? 'bg-amber-400 text-slate-950 shadow-md font-black shadow-amber-400/20'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                          }`}
                        >
                          {slab.val}%
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="Custom GST %"
                        value={productForm.gstPercent}
                        onChange={(e) => setProductForm({ ...productForm, gstPercent: e.target.value })}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono placeholder:text-slate-700"
                      />
                      <span className="text-xs text-amber-400 font-mono font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Product Illustration Image URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Paste Image URL..."
                      value={productForm.image}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-700"
                    />
                    <R2ImageUploader 
                      onUploadComplete={handleImageUploaded} 
                      initialImageUrl={productForm.image}
                    />
                  </div>
                </div>

              </div>

              <div className="border-t border-white/5 pt-4 flex gap-3">
                <button 
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 px-6 py-2.5 rounded-xl font-black text-xs text-slate-950 uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  {editingProdId ? "Apply Modifications" : "Save Stock-Keeping Token"}
                </button>
                {editingProdId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingProdId(null);
                      setProductForm({
                        name: '',
                        category: 'vegetables',
                        brandTag: '',
                        price: '',
                        originalPrice: '',
                        discount: '',
                        unit: '100gm, 200gm, 500gm, 1kg',
                        unitPrices: '',
                        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
                        stockCount: '100'
                      });
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-300 uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Bulk Uploads & Admin Operations Container (right side) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Target Import Destination Selector */}
            <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Layers className="h-4 w-4" />
                <span>Bulk Import Destination</span>
              </h3>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Choose Target Category</label>
                <select 
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {categories.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>📦 {cat.nameEn || cat.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk JSON Upload Box */}
            <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>Bulk JSON Category Import</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Upload a `.json` file of products to register them bulk category-wise into the chosen target.
              </p>

              <div className="border-2 border-dashed border-white/10 p-4 rounded-xl hover:border-cyan-400/30 transition-all text-center space-y-2 relative">
                <span className="text-[10px] block font-semibold text-slate-300">File structure requirement:</span>
                <p className="text-[8px] text-slate-500 font-mono">{"[ { \"name\": \"...\", \"price\": 120, \"code\": \"SP000001\" } ]"}</p>
                
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleBulkJsonUpload}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  />
                  <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-all">
                    Choose JSON File
                  </div>
                </div>
              </div>
            </div>

            {/* Excel Bulk Upload Box */}
            <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Bulk Spreadsheet Import</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Upload `.xlsx` or `.xls` sheets to bulk catalog products directly.
              </p>

              <div className="border-2 border-dashed border-white/10 p-4 rounded-xl hover:border-amber-400/30 transition-all text-center space-y-2 relative">
                <span className="text-[10px] block font-semibold text-slate-300">File columns standard requirement:</span>
                <p className="text-[8px] text-slate-500 font-mono">Name, Price, OriginalPrice, Discount, Unit, UnitPrices, Brand, Image, Code</p>
                
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleBulkExcelUpload}
                      className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                    />
                    <div className="bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg cursor-pointer hover:bg-amber-400/20 transition-all">
                      Choose Excel File
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleProductsExcel}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold uppercase text-[9px] tracking-wider rounded-lg border border-white/10 shrink-0 cursor-pointer transition-all active:scale-95"
                  >
                    📥 Sample
                  </button>
                </div>
              </div>
            </div>


          </div>

        </div>
      )}

      {/* 2. List Filters Block */}
      <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">Filter Catalog Index</span>
          </div>

          {/* Quick live toggle for Website Display: All vs Photo Only */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-cyan-500/30 px-2.5 py-1 rounded-xl">
            <span className="text-[9.5px] font-black uppercase text-cyan-300">
              📸 Website:
            </span>
            <button
              type="button"
              onClick={() => {
                const nextVal = !contactSettings?.showOnlyWithPhoto;
                setContactSettings(prev => ({ ...prev, showOnlyWithPhoto: nextVal }));
              }}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                contactSettings?.showOnlyWithPhoto
                  ? 'bg-cyan-400 text-slate-950 font-black shadow'
                  : 'bg-white/10 text-slate-300 hover:text-white'
              }`}
              title="Click to toggle whether customer website shows only items with photos or all items"
            >
              {contactSettings?.showOnlyWithPhoto
                ? `Only With Photo (${withImageCount})`
                : `All Items (${products.length})`}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">

          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search catalog items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-lg pl-8.5 pr-3 py-1.5 outline-none focus:border-cyan-400/30 text-[11px] font-bold transition-all text-white w-44 placeholder:text-slate-600"
            />
          </div>
          
          {/* Department filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <span>Category:</span>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-white/10 text-white font-extrabold text-[11px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">🏷️ All Categories</option>
              {categories.slice(1).map(c => (
                <option key={c.id} value={c.id}>📦 {c.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Discount status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <span>Promo:</span>
            <select 
              value={filterPromoStatus}
              onChange={(e) => setFilterPromoStatus(e.target.value)}
              className="bg-slate-950 border border-white/10 text-white font-extrabold text-[11px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">✨ All Rates</option>
              <option value="promo">🏷️ Promo Only</option>
              <option value="normal">🌿 Standard Only</option>
            </select>
          </div>

          {/* Brand filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <span>Brand:</span>
            <select 
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="bg-slate-950 border border-white/10 text-white font-extrabold text-[11px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer uppercase tracking-tight"
            >
              <option value="all">🏷️ All Brands</option>
              {availableBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Image status filter (With Image / Missing Image) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <span>Image:</span>
            <select 
              value={filterImageStatus}
              onChange={(e) => setFilterImageStatus(e.target.value)}
              className={`border font-extrabold text-[11px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-all ${
                filterImageStatus === 'no-image'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : filterImageStatus === 'with-image'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-white/10 text-white'
              }`}
            >
              <option value="all">🖼️ All Images ({products.length})</option>
              <option value="with-image">📷 With Image ({withImageCount})</option>
              <option value="no-image">⚠️ Missing Image ({noImageCount})</option>
            </select>
          </div>

          {/* Stock Level Filter (Low Stock / Out of Stock / In Stock) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <span>Stock:</span>
            <select 
              value={filterStockStatus}
              onChange={(e) => setFilterStockStatus(e.target.value)}
              className={`border font-extrabold text-[11px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-all ${
                filterStockStatus === 'low-stock'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-md shadow-amber-900/30'
                  : filterStockStatus === 'out-of-stock'
                  ? 'bg-rose-950/80 border-rose-400 text-rose-300'
                  : filterStockStatus === 'in-stock'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-white/10 text-white'
              }`}
            >
              <option value="all">📦 All Stock ({products.length})</option>
              <option value="low-stock">⚠️ Low Stock Items (≤ 10) ({lowStockCount})</option>
              <option value="out-of-stock">🔴 Out of Stock (0) ({outOfStockCount})</option>
              <option value="in-stock">✅ In Stock (&gt; 10) ({inStockCount})</option>
            </select>
          </div>

          {/* Quick Toggle Button for Low Stock */}
          <button
            type="button"
            onClick={() => setFilterStockStatus(prev => prev === 'low-stock' ? 'all' : 'low-stock')}
            className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStockStatus === 'low-stock'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-105'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Toggle filter for Low Stock items (10 or fewer units remaining)"
          >
            <span>⚠️ Low Stock</span>
            <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${
              filterStockStatus === 'low-stock' ? 'bg-slate-900 text-amber-300' : 'bg-amber-500/20 text-amber-200'
            }`}>
              {lowStockCount}
            </span>
          </button>

        </div>
      </div>

      {/* 3. List Table View layout instead of grid (Requirement 4) */}
      <div className="overflow-x-auto bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-400 border-b border-white/10 tracking-widest">
            <tr>
              <th className="p-4">SKU / Image & Product Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Custom Pack Sizes (Weights)</th>
              <th className="p-4">Mapped Prices map</th>
              <th className="p-4">Base price</th>
              <th className="p-4">Original price</th>
              <th className="p-4 text-center">GST Rate (%)</th>
              <th className="p-4">Stock Qty</th>
              <th className="p-4">Promo Ribbon</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-8 text-center text-slate-500 font-black uppercase text-[10px] tracking-wider font-mono">
                  No matching catalog indexes found on system nodes.
                </td>
              </tr>
            ) : (
              paginatedProducts.map(p => {
                const brandName = (() => {
                  const rawBrand = (p.brand && p.brand.trim()) || '';
                  if (rawBrand && rawBrand.toLowerCase() !== 'general') return rawBrand;
                  const rawSub = (p.subEn && p.subEn.trim()) || '';
                  if (rawSub && rawSub.toLowerCase() !== 'general') return rawSub;
                  return '';
                })();

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <ListProductImage p={p} r2PublicUrl={r2PublicUrl} />
                      <div className="space-y-0.5">
                        {brandName ? (
                          <span className="text-[8px] font-black font-mono text-emerald-400/90 block leading-none uppercase">
                            {brandName}
                          </span>
                        ) : null}
                        <h4 className="text-white font-extrabold uppercase tracking-tight text-xs">{p.nameEn || p.nameHi}</h4>
                        <span className="text-[8px] font-bold text-slate-400 block font-mono">ID: {p.id} {(p.code || p.Code) ? `| CODE: ${p.code || p.Code}` : ''}</span>
                      </div>
                    </td>
                  <td className="p-4">
                    <span className="bg-slate-950 px-2 py-1 border border-white/5 text-slate-400 rounded-lg text-[9px] font-black uppercase font-mono tracking-tight">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-cyan-400 font-mono font-bold">{p.unit || 'Standard'}</span>
                  </td>
                  <td className="p-4">
                    {p.unitPrices ? (
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {p.unitPrices.split(',').map((pricePair, pi) => (
                          <span key={pi} className="bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 font-mono text-[8px] px-1 py-0.5 rounded">
                            {pricePair.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-550 font-mono text-[10px] italic">Not Configured</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-white font-mono font-bold">₹{p.price}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-500 font-mono line-through">{p.originalPrice ? `₹${p.originalPrice}` : '—'}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      {p.gstPercent !== undefined && p.gstPercent !== null && p.gstPercent !== ''
                        ? `${p.gstPercent}%`
                        : (p.gst_percent !== undefined && p.gst_percent !== null && p.gst_percent !== '' ? `${p.gst_percent}%` : '0%')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-mono font-black px-2 py-1 rounded text-xs border ${
                      getStockCount(p) <= 0 
                        ? 'bg-red-500/15 text-red-400 border-red-500/20' 
                        : getStockCount(p) <= 10 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/20 animate-pulse' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                    }`}>
                      {getStockCount(p)}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.discount ? (
                      <span className="bg-pink-500/10 border border-pink-500/20 text-pink-400 font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-tight">
                        {p.discount}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {userRole !== 'customer' ? (
                      <div className="flex justify-end gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setViewingProduct(p)}
                          className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/25 p-1.5 rounded-lg text-cyan-300 transition-all cursor-pointer shadow-sm"
                          title="View 11-Field Product Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => openQuickEdit(p)}
                          className="bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-slate-950 p-1.5 rounded-lg text-slate-300 transition-all cursor-pointer shadow-sm"
                          title="Edit product parameters (Responsive Modal)"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/30 p-1.5 rounded-lg text-red-400 transition-all active:scale-90 cursor-pointer shadow-sm"
                          title="Remove product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => setViewingProduct(p)}
                          className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/25 p-1.5 rounded-lg text-cyan-300 transition-all cursor-pointer shadow-sm"
                          title="View 11-Field Product Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 px-4 py-3 border-t border-white/10 text-xs font-semibold text-slate-400 font-sans">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Showing <span className="text-white font-extrabold">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="text-white font-extrabold">{Math.min(filteredProducts.length, currentPage * itemsPerPage)}</span> of{' '}
                <span className="text-white font-extrabold">{filteredProducts.length}</span> products
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-slate-900 border border-white/10 text-white font-bold text-[11px] rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
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
      </>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL 1: Bulk Ingestion Report Modal (Responsive & Scrollable)         */}
      {/* ========================================================================= */}
      {showResultModal && uploadResult && (
        <div 
          id="bulk-result-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
        >
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] my-auto animate-scale-in">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Bulk Ingestion Validation Report</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Mode: {uploadResult.mode === 'skip_existing' ? 'Strict Skip (Do Nothing If Exists)' : 'Smart Update & Protect'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Parsed</span>
                  <span className="text-xl font-black text-white font-mono">{uploadResult.totalRows || 0}</span>
                </div>
                <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">New Inserted</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">+{uploadResult.insertedCount || 0}</span>
                </div>
                <div className="bg-slate-950/80 border border-amber-500/30 p-3.5 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Updated Existing</span>
                  <span className="text-xl font-black text-amber-400 font-mono">↻ {uploadResult.updatedCount || 0}</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-700 p-3.5 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Skipped Existing</span>
                  <span className="text-xl font-black text-slate-400 font-mono">{uploadResult.skippedCount || 0}</span>
                </div>
                <div className="bg-slate-950/80 border border-cyan-500/30 p-3.5 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">Codes Preserved</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">✓ {uploadResult.preservedCodes || uploadResult.updatedCount || 0}</span>
                </div>
                <div className="bg-slate-950/80 border border-purple-500/30 p-3.5 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">Duplicates Averted</span>
                  <span className="text-xl font-black text-purple-400 font-mono">{uploadResult.preventedDuplicates || uploadResult.updatedCount || 0}</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-300 leading-relaxed">
                  <span className="font-bold block text-white mb-0.5">Validation Rules Verified:</span>
                  All rows have been successfully processed through the 11-field standard. Existing product codes were preserved, duplicate names were merged or skipped according to policy, and inventory levels are live.
                </div>
              </div>

              {/* Detailed Breakdown Table if available */}
              {uploadResult.details && uploadResult.details.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Item-By-Item Verification Audit ({uploadResult.details.length})
                  </span>
                  <div className="max-h-56 overflow-y-auto border border-white/10 rounded-2xl divide-y divide-white/5 bg-slate-950/50">
                    {uploadResult.details.slice(0, 100).map((d, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="truncate flex-1">
                          <span className="font-bold text-white block truncate">{d.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{d.code || 'Auto-Code'} • {d.category}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase font-mono ${
                            d.action === 'INSERT' 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : (d.action === 'UPDATE' 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700')
                          }`}>
                            {d.action || 'OK'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowResultModal(false);
                  setActiveSubView('bulk-stock');
                }}
                className="px-4 py-2 bg-amber-400 text-slate-950 font-black uppercase text-xs rounded-xl tracking-wider hover:bg-amber-300 transition-all cursor-pointer shadow-md shadow-amber-400/20"
              >
                Open Bulk Stock Manager ⚡
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResultModal(false);
                    setActiveSubView('catalog');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                >
                  View in Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL 2: View Product Details Modal (Responsive & Scrollable)          */}
      {/* ========================================================================= */}
      {viewingProduct && (
        <div 
          id="view-product-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
        >
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate max-w-xs sm:max-w-md">
                    {viewingProduct.nameEn || viewingProduct.nameHi || viewingProduct.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Product Code: <span className="text-cyan-300 font-bold">{viewingProduct.code || viewingProduct.Code || 'SP000000'}</span> • ID #{viewingProduct.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body with 11 Fields */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
              
              {/* Image & Main Card */}
              <div className="flex flex-col sm:flex-row gap-4 bg-slate-950/80 border border-white/10 p-4 rounded-2xl items-center sm:items-start">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 relative">
                  <img
                    src={viewingProduct.image || viewingProduct.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'}
                    alt={viewingProduct.nameEn || viewingProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
                    }}
                  />
                  {viewingProduct.discount && (
                    <span className="absolute top-2 left-2 bg-pink-500 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow-md uppercase">
                      {viewingProduct.discount}
                    </span>
                  )}
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] uppercase">
                      Category: {viewingProduct.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-bold text-[10px] uppercase">
                      Brand: {viewingProduct.brand || viewingProduct.subEn || 'General'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-2.5 pt-1">
                    <span className="text-2xl font-black text-emerald-400 font-mono">₹{viewingProduct.price}</span>
                    {viewingProduct.originalPrice && viewingProduct.originalPrice > viewingProduct.price && (
                      <span className="text-sm line-through text-slate-500 font-mono">₹{viewingProduct.originalPrice}</span>
                    )}
                    {viewingProduct.originalPrice && viewingProduct.originalPrice > viewingProduct.price && (
                      <span className="text-[10px] font-black text-pink-400">
                        ({Math.round(((viewingProduct.originalPrice - viewingProduct.price) / viewingProduct.originalPrice) * 100)}% SAVINGS)
                      </span>
                    )}
                  </div>

                  <div className="pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                      (viewingProduct.stockCount !== undefined ? viewingProduct.stockCount : 100) <= 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : ((viewingProduct.stockCount !== undefined ? viewingProduct.stockCount : 100) <= 10
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20')
                    }`}>
                      Stock: {viewingProduct.stockCount !== undefined ? viewingProduct.stockCount : 100} units available
                    </span>
                  </div>
                </div>
              </div>

              {/* 11 Fields Detailed Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Complete 11-Field Specification Ledger
                </span>
                <div className="bg-slate-950/60 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">1. Product Display Name:</span>
                    <span className="font-bold text-white text-right">{viewingProduct.nameEn || viewingProduct.nameHi || viewingProduct.name}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">2. Brand / Segment Tag:</span>
                    <span className="font-bold text-white text-right">{viewingProduct.brand || viewingProduct.subEn || 'General'}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">3. Department Category:</span>
                    <span className="font-mono text-cyan-300 font-bold uppercase">{viewingProduct.category}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">4. Available Weight / Product Units:</span>
                    <span className="font-bold text-white text-right">{viewingProduct.unit || '1 Unit'}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">5. Base Price / Default rate (₹):</span>
                    <span className="font-mono font-bold text-emerald-400">₹{viewingProduct.price}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">6. Original Price crossed out (₹):</span>
                    <span className="font-mono font-bold text-slate-400">{viewingProduct.originalPrice ? `₹${viewingProduct.originalPrice}` : 'None'}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">7. Discount ribbon label text:</span>
                    <span className="font-bold text-pink-400">{viewingProduct.discount || 'None'}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">8. Physical Stock Count (Qty):</span>
                    <span className="font-mono font-bold text-amber-300">{viewingProduct.stockCount !== undefined ? viewingProduct.stockCount : 100}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">9. Unique Product Code:</span>
                    <span className="font-mono font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      {viewingProduct.code || viewingProduct.Code || 'SP000000'} (Protected)
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">10. GST Rate (%) / जीएसटी दर:</span>
                    <span className="font-mono font-bold text-white">{viewingProduct.gstPercent !== undefined ? viewingProduct.gstPercent : 5}%</span>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">11. Image URL:</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-xs">{viewingProduct.image || viewingProduct.image_url}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewingProduct;
                  setViewingProduct(null);
                  openQuickEdit(toEdit);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs rounded-xl tracking-wider transition-all cursor-pointer shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Product Details</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL 3: Quick Edit Product Modal (Responsive & Scrollable)            */}
      {/* ========================================================================= */}
      {quickEditProduct && (
        <div 
          id="quick-edit-product-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
        >
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Edit3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Edit Product (Full CRUD)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Product Code: <span className="text-cyan-300 font-bold">{quickEditProduct.code || 'SP000000'}</span> (Preserved) • ID #{quickEditProduct.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditProduct(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body with All 11 Fields */}
            <form onSubmit={handleQuickEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 1: Name */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      1. Product Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={quickEditProduct.name}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, name: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Field 2: Brand Tag */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      2. Brand / Segment Tag
                    </label>
                    <input
                      type="text"
                      value={quickEditProduct.brandTag}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, brandTag: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Field 3: Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      3. Department Category
                    </label>
                    <select
                      value={quickEditProduct.category}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, category: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      {categories.filter(c => c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id}>📦 {cat.nameEn || cat.id}</option>
                      ))}
                    </select>
                  </div>

                  {/* Field 4: Available Weight / Product Units */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      4. Available Weight / Product Units (e.g. 500g, 1kg, 5kg)
                    </label>
                    <input
                      type="text"
                      value={quickEditProduct.unit}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, unit: e.target.value })}
                      placeholder="e.g. 1kg, 2kg, 5kg"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Field 5: Base Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      5. Base Price / Default rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={quickEditProduct.price}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, price: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-emerald-400"
                    />
                  </div>

                  {/* Field 6: Original Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      6. Original Price crossed out (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 150"
                      value={quickEditProduct.originalPrice}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, originalPrice: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Field 7: Discount ribbon label */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      7. Discount ribbon label text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20% OFF or Save ₹30"
                      value={quickEditProduct.discount}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, discount: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-pink-400 outline-none focus:border-pink-400"
                    />
                  </div>

                  {/* Field 8: Physical Stock Count */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      8. Physical Stock Count (Qty)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quickEditProduct.stockCount}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, stockCount: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Field 9: Unique Product Code (Preserved) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center justify-between">
                      <span>9. Unique Product Code (e.g. SP000001)</span>
                      <span className="text-[9px] text-cyan-400 font-mono">Protected Code</span>
                    </label>
                    <input
                      type="text"
                      value={quickEditProduct.code}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, code: e.target.value })}
                      placeholder="e.g. SP000001"
                      className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono font-bold outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Field 10: GST Rate (%) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      10. GST Rate (%) / जीएसटी दर
                    </label>
                    <select
                      value={quickEditProduct.gstPercent}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, gstPercent: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="0">0% (Exempt / Fresh produce)</option>
                      <option value="5">5% (Essential groceries & staples)</option>
                      <option value="12">12% (Processed foods & items)</option>
                      <option value="18">18% (Confectionery & home care)</option>
                      <option value="28">28% (Luxury & aerated beverages)</option>
                    </select>
                  </div>

                  {/* Field 11: Product Illustration Image URL with R2 Uploader */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      11. Product Illustration Image URL
                    </label>
                    <input
                      type="url"
                      value={quickEditProduct.image}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, image: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono outline-none focus:border-cyan-400"
                    />
                    <div className="pt-1">
                      <ImageUpload
                        onImageUploaded={(url) => setQuickEditProduct(prev => ({ ...prev, image: url }))}
                        currentImage={quickEditProduct.image}
                        folder="products"
                        label="Upload photo to R2 cloud storage"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickEditProduct(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickEdit}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs rounded-xl tracking-wider transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSavingQuickEdit ? "Saving Updates..." : "Save Product Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

