import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import R2ImageUploader from './R2ImageUploader';
import { 
  resolveProductImage, 
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
  AlertTriangle
} from 'lucide-react';

const ListProductImage = ({ p, r2PublicUrl }) => {
  const [imgSrc, setImgSrc] = useState(() => resolveProductImage(p, r2PublicUrl, 120));

  React.useEffect(() => {
    setImgSrc(resolveProductImage(p, r2PublicUrl, 120));
  }, [p, r2PublicUrl]);

  const handleImageError = () => {
    if (imgSrc && imgSrc !== DEFAULT_PRODUCT_FALLBACK) {
      markImageFailed(imgSrc);
      setImgSrc(DEFAULT_PRODUCT_FALLBACK);
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

export default function ProductsManager({ searchQuery, setSearchQuery, userRole }) {
  const { isHindi } = useLanguage();
  const { products, addProduct, updateProduct, deleteProduct, clearAllProducts, categories, r2PublicUrl, contactSettings, setContactSettings } = useData();

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
  }, [searchQuery, filterCategory, filterPromoStatus, filterBrand, filterImageStatus, itemsPerPage]);

  const downloadSampleProductsExcel = () => {
    const sampleData = [
      {
        "Name": "Basmati Premium Rice",
        "Price": "120",
        "OriginalPrice": "150",
        "Discount": "20% OFF",
        "GST (%)": "5",
        "Unit": "1kg, 2kg, 5kg",
        "UnitPrices": "120, 230, 550",
        "Brand": "India Gate",
        "Image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400"
      },
      {
        "Name": "Fresh Mustard Oil",
        "Price": "175",
        "OriginalPrice": "195",
        "Discount": "₹20 OFF",
        "GST (%)": "5",
        "Unit": "1L, 2L, 5L",
        "UnitPrices": "175, 340, 820",
        "Brand": "Fortune",
        "Image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400"
      },
      {
        "Name": "Dark Chocolate Slab",
        "Price": "90",
        "OriginalPrice": "100",
        "Discount": "10% OFF",
        "GST (%)": "18",
        "Unit": "1 Unit",
        "UnitPrices": "1 Unit:90",
        "Brand": "Cadbury",
        "Image": "https://images.unsplash.com/photo-1548907040-4d42b52125ca?auto=format&fit=crop&q=80&w=400"
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, "Products Sample");
    XLSX.writeFile(wb, "swastik_products_sample.xlsx");
  };

  // Bulk Excel State
  const [bulkCategory, setBulkCategory] = useState('vegetables');

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;

    const payload = {
      nameEn: productForm.name,
      nameHi: productForm.name,
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
      code: productForm.code || '',
      gstPercent: productForm.gstPercent !== '' ? Number(productForm.gstPercent) : 5
    };

    if (editingProdId) {
      updateProduct(editingProdId, payload);
      setEditingProdId(null);
    } else {
      addProduct(payload);
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
      name: prod.nameEn || prod.nameHi || '',
      category: prod.category || 'vegetables',
      brandTag: prod.subEn || prod.subHi || '',
      price: prod.price || '',
      originalPrice: prod.originalPrice || '',
      discount: prod.discount || '',
      unit: prod.unit || '1 Unit',
      unitPrices: prod.unitPrices || '',
      image: prod.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stockCount: prod.stockCount !== undefined ? String(prod.stockCount) : '100',
      code: prod.code || prod.Code || '',
      gstPercent: prod.gstPercent !== undefined ? String(prod.gstPercent) : (prod.gst_percent !== undefined ? String(prod.gst_percent) : '5')
    });

    // Auto scroll directly to update form
    setTimeout(() => {
      document.getElementById('product-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this product from catalog?")) {
      deleteProduct(id);
    }
  };

  const handleImageUploaded = (imageUrl) => {
    setProductForm(prev => ({ ...prev, image: imageUrl }));
  };

  // Excel Upload Parser
  const handleBulkExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!bulkCategory) {
      alert("Please select a target category first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        let count = 0;
        rows.forEach(row => {
          const name = row.Name || row.name || '';
          if (!name) return;

          const price = Number(row.Price || row.price || 0);
          const originalPrice = row.OriginalPrice || row.originalPrice ? Number(row.OriginalPrice || row.originalPrice) : null;
          const discount = row.Discount || row.discount || null;
          const gstPercentRaw = row.GST || row.gst || row['GST (%)'] || row['GST%'] || row.GstPercent || row.gst_percent || 5;
          const gstPercent = Number(String(gstPercentRaw).replace(/[^0-9.]/g, '')) || 5;
          const unit = row.Unit || row.unit || '1 Unit';
          const unitPrices = row.UnitPrices || row.unitPrices || '';
          const brand = row.Brand || row.brand || row.BrandTag || row.brandTag || 'Fresh';
          
          let code = row.Code || row.code || row.ProductCode || row.product_code || '';
          if (!code) {
            const prefix = bulkCategory === 'babycare' ? 'SW-BY' : (bulkCategory === 'chocolate' ? 'SW-CF' : (bulkCategory === 'beverage' ? 'SW-BV' : 'SW-GEN'));
            code = `${prefix}${String(Math.floor(1000 + Math.random() * 9000))}`;
          } else if (!code.startsWith('SW-')) {
            const prefix = bulkCategory === 'babycare' ? 'SW-BY' : (bulkCategory === 'chocolate' ? 'SW-CF' : (bulkCategory === 'beverage' ? 'SW-BV' : 'SW-GEN'));
            code = `${prefix}${code}`;
          }

          let image = row.Image || row.image || '';
          if (!image || image.includes('photo-1542838132-92c53300491e') || image === '') {
            const lowerName = name.toLowerCase();
            if (bulkCategory === 'babycare') {
              image = 'https://images.unsplash.com/photo-1519689680058-324335c77ebe?auto=format&fit=crop&q=80&w=400';
              if (lowerName.includes("pants") || lowerName.includes("huggies") || lowerName.includes("diaper")) {
                image = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("powder") || lowerName.includes("lotion") || lowerName.includes("cream") || lowerName.includes("oil") || lowerName.includes("tail")) {
                image = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("soap") || lowerName.includes("shampoo") || lowerName.includes("wipes")) {
                image = "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?auto=format&fit=crop&q=80&w=400";
              }
            } else if (bulkCategory === 'beverage') {
              image = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400";
              if (lowerName.includes("tea") || lowerName.includes("chai") || lowerName.includes("coffee") || lowerName.includes("nescafe")) {
                image = "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("juice") || lowerName.includes("frooti") || lowerName.includes("maaza") || lowerName.includes("real") || lowerName.includes("fizz") || lowerName.includes("appy")) {
                image = "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("coke") || lowerName.includes("cola") || lowerName.includes("limca") || lowerName.includes("sprite") || lowerName.includes("thums") || lowerName.includes("monster") || lowerName.includes("energy")) {
                image = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("water") || lowerName.includes("kinley") || lowerName.includes("coconut")) {
                image = "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("milk") || lowerName.includes("lassi") || lowerName.includes("buttermilk") || lowerName.includes("smoodh")) {
                image = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("bournvita") || lowerName.includes("complan") || lowerName.includes("glucoplus") || lowerName.includes("powder")) {
                image = "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=400";
              }
            } else if (bulkCategory === 'chocolate') {
              image = "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&q=80&w=400";
              if (lowerName.includes("star") || lowerName.includes("barone") || lowerName.includes("kit kat") || lowerName.includes("munch") || lowerName.includes("chocolate") || lowerName.includes("ferrero") || lowerName.includes("cdm") || lowerName.includes("choclairs")) {
                image = "https://images.unsplash.com/photo-1549007994-cb92ca87df67?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("cone") || lowerName.includes("cup") || lowerName.includes("bites") || lowerName.includes("cremy") || lowerName.includes("vanilla") || lowerName.includes("mango double") || lowerName.startsWith("cb ")) {
                image = "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("candy") || lowerName.includes("alpenliebe") || lowerName.includes("chupa") || lowerName.includes("toffee") || lowerName.includes("kopiko") || lowerName.includes("mentos") || lowerName.includes("gum") || lowerName.includes("happydent")) {
                image = "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&q=80&w=400";
              }
            } else {
              image = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
            }
          }

          addProduct({
            nameEn: name,
            nameHi: name,
            category: bulkCategory,
            subEn: brand,
            subHi: brand,
            price,
            originalPrice,
            discount,
            unit,
            unitPrices,
            packEn: unit.split(',')[0].trim(),
            packHi: unit.split(',')[0].trim(),
            image,
            code,
            stockCount: 100,
            gstPercent: gstPercent
          });
          count++;
        });

        alert(`✓ Successfully imported ${count} items into the "${bulkCategory}" category!`);
        e.target.value = ""; // reset file input
      } catch (err) {
        console.error(err);
        alert("Failed to parse spreadsheet file. Please check column headers (Name, Price, OriginalPrice, Discount, Unit, UnitPrices, Brand, Image, GST).");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Bulk JSON Upload Parser
  const handleBulkJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!bulkCategory) {
      alert("Please select a target category first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];

        let count = 0;
        arrayData.forEach(item => {
          const name = item.name || item.nameEn || item.nameHi || item.Name || '';
          if (!name) return;

          const price = Number(item.price || item.Price || 0);
          const originalPrice = item.originalPrice || item.OriginalPrice ? Number(item.originalPrice || item.OriginalPrice) : null;
          const discount = item.discount || item.Discount || null;
          const gstPercentRaw = item.gstPercent || item.gst || item.gst_percent || item.GST || item.GstPercent || 5;
          const gstPercent = Number(String(gstPercentRaw).replace(/[^0-9.]/g, '')) || 5;
          const unit = item.unit || item.Unit || '1 Unit';
          const unitPrices = item.unitPrices || item.UnitPrices || '';
          const brand = item.brand || item.Brand || item.brandTag || 'Fresh';
          
          let code = item.code || item.Code || item.product_code || item.productCode || '';
          if (!code) {
            const prefix = bulkCategory === 'babycare' ? 'SW-BY' : (bulkCategory === 'chocolate' ? 'SW-CF' : (bulkCategory === 'beverage' ? 'SW-BV' : 'SW-GEN'));
            code = `${prefix}${String(Math.floor(1000 + Math.random() * 9000))}`;
          } else if (!code.startsWith('SW-')) {
            const prefix = bulkCategory === 'babycare' ? 'SW-BY' : (bulkCategory === 'chocolate' ? 'SW-CF' : (bulkCategory === 'beverage' ? 'SW-BV' : 'SW-GEN'));
            code = `${prefix}${code}`;
          }

          let image = item.image || item.Image || '';
          if (!image || image.includes('photo-1542838132-92c53300491e') || image === '') {
            const lowerName = name.toLowerCase();
            if (bulkCategory === 'babycare') {
              image = 'https://images.unsplash.com/photo-1519689680058-324335c77ebe?auto=format&fit=crop&q=80&w=400';
              if (lowerName.includes("pants") || lowerName.includes("huggies") || lowerName.includes("diaper")) {
                image = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("powder") || lowerName.includes("lotion") || lowerName.includes("cream") || lowerName.includes("oil") || lowerName.includes("tail")) {
                image = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("soap") || lowerName.includes("shampoo") || lowerName.includes("wipes")) {
                image = "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?auto=format&fit=crop&q=80&w=400";
              }
            } else if (bulkCategory === 'beverage') {
              image = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400";
              if (lowerName.includes("tea") || lowerName.includes("chai") || lowerName.includes("coffee") || lowerName.includes("nescafe")) {
                image = "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("juice") || lowerName.includes("frooti") || lowerName.includes("maaza") || lowerName.includes("real") || lowerName.includes("fizz") || lowerName.includes("appy")) {
                image = "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("coke") || lowerName.includes("cola") || lowerName.includes("limca") || lowerName.includes("sprite") || lowerName.includes("thums") || lowerName.includes("monster") || lowerName.includes("energy")) {
                image = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("water") || lowerName.includes("kinley") || lowerName.includes("coconut")) {
                image = "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("milk") || lowerName.includes("lassi") || lowerName.includes("buttermilk") || lowerName.includes("smoodh")) {
                image = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("bournvita") || lowerName.includes("complan") || lowerName.includes("glucoplus") || lowerName.includes("powder")) {
                image = "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=400";
              }
            } else if (bulkCategory === 'chocolate') {
              image = "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&q=80&w=400";
              if (lowerName.includes("star") || lowerName.includes("barone") || lowerName.includes("kit kat") || lowerName.includes("munch") || lowerName.includes("chocolate") || lowerName.includes("ferrero") || lowerName.includes("cdm") || lowerName.includes("choclairs")) {
                image = "https://images.unsplash.com/photo-1549007994-cb92ca87df67?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("cone") || lowerName.includes("cup") || lowerName.includes("bites") || lowerName.includes("cremy") || lowerName.includes("vanilla") || lowerName.includes("mango double") || lowerName.startsWith("cb ")) {
                image = "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=400";
              } else if (lowerName.includes("candy") || lowerName.includes("alpenliebe") || lowerName.includes("chupa") || lowerName.includes("toffee") || lowerName.includes("kopiko") || lowerName.includes("mentos") || lowerName.includes("gum") || lowerName.includes("happydent")) {
                image = "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&q=80&w=400";
              }
            } else {
              image = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
            }
          }

          const stockCount = item.stockCount !== undefined ? Number(item.stockCount) : 100;

          addProduct({
            nameEn: name,
            nameHi: item.nameHi || name,
            category: bulkCategory,
            subEn: brand,
            subHi: item.brandHi || brand,
            price,
            originalPrice,
            discount,
            unit,
            unitPrices,
            packEn: unit.split(',')[0].trim(),
            packHi: unit.split(',')[0].trim(),
            image,
            code,
            stockCount,
            gstPercent: gstPercent
          });
          count++;
        });

        alert(`✓ Successfully loaded and registered ${count} catalog items from JSON into category "${bulkCategory}"!`);
        e.target.value = ""; // reset file input
      } catch (err) {
        console.error(err);
        alert("❌ Failed to parse JSON file. Ensure it contains a valid array of products.");
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

    return textMatches && categoryMatches && promoMatches && brandMatches && imageMatches;
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
      
      {/* 1. Catalog Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-0.5">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-400" />
            <span>Product Inventory Catalog</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Register and manage supermarket grocery essentials & custom pack weights
          </p>
        </div>
      </div>

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
              <option value="all">🖼️ All Products ({products.length})</option>
              <option value="with-image">📷 With Image ({withImageCount})</option>
              <option value="no-image">⚠️ Missing Image ({noImageCount})</option>
            </select>
          </div>

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
              paginatedProducts.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <ListProductImage p={p} r2PublicUrl={r2PublicUrl} />
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black font-mono text-slate-500 block leading-none uppercase">{p.subEn || (contactSettings?.brandName ? `${contactSettings.brandName} Stock` : 'In Stock')}</span>
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
                      {p.gstPercent !== undefined ? p.gstPercent : (p.gst_percent !== undefined ? p.gst_percent : 5)}%
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-mono font-black px-2 py-1 rounded text-xs border ${
                      (p.stockCount !== undefined ? p.stockCount : 100) <= 0 
                        ? 'bg-red-500/15 text-red-400 border-red-500/20' 
                        : (p.stockCount !== undefined ? p.stockCount : 100) <= 10 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/20 animate-pulse' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                    }`}>
                      {p.stockCount !== undefined ? p.stockCount : 100}
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
                          onClick={() => startEditProduct(p)}
                          className="bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-slate-950 p-1.5 rounded-lg text-slate-300 transition-all cursor-pointer"
                          title="Edit product SKU parameters"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/30 p-1.5 rounded-lg text-red-400 transition-all active:scale-90 cursor-pointer"
                          title="Strike off product item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Locked</span>
                    )}
                  </td>
                </tr>
              ))
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

    </div>
  );
}
