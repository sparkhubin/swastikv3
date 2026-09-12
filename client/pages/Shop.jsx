import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import ProductCard from '../components/ProductCard';
import { resolveProductImage, getNextCandidateImage, markImageFailed, DEFAULT_PRODUCT_FALLBACK, hasCustomProductImage } from '../utils/imageHelper';
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  X,
  Plus,
  Minus,
  LayoutGrid,
  List,
  Check,
  ShoppingCart,
  Mic,
  MicOff
} from 'lucide-react';

// Safe dynamic Capacitor Speech Recognition helper
async function getCapacitorSpeech() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
    if (Capacitor && Capacitor.isNativePlatform()) {
      return { Capacitor, SpeechRecognition };
    }
  } catch (e) {
    // Web environment or package omitted at build time
  }
  return null;
}

export default function Shop({ categoryFilterState, onCategoryFilterChange, searchQueryProp, onSearchQueryChange }) {
  const { t, language } = useLanguage();
  const isHindi = language === 'hi';
  const { products, categories: dynamicCategories, r2PublicUrl, contactSettings, fetchProducts } = useData();
  const [searchQuery, setSearchQuery] = useState(searchQueryProp || '');

  React.useEffect(() => {
    fetchProducts(true,1);
  }, [fetchProducts]);

  React.useEffect(() => {
    if (searchQueryProp !== undefined) {
      setSearchQuery(searchQueryProp);
    }
  }, [searchQueryProp]);

  const [sortBy, setSortBy] = useState('default'); // default, low-high, high-low, name
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Custom interactive subfilters inside the sidebar drawer modal!
  const [priceRange, setPriceRange] = useState(1500);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedWeight, setSelectedWeight] = useState('all');
  const [selectedPricePreset, setSelectedPricePreset] = useState('all'); // all, under-100, 100-300, 300-1000, over-1000
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

  // Dynamic products display limit list (increased to 50 default)
  const [productsLimit, setProductsLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Voice Search states
  const recognitionRef = React.useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [listeningLanguage, setListeningLanguage] = useState(language === 'hi' ? 'hi-IN' : 'en-IN');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showVoiceAssistantHelp, setShowVoiceAssistantHelp] = useState(false);

  // Speech Recognition initializer
  const startSpeechRecognition = async (selectedLang) => {
    const langToUse = selectedLang || (language === "hi" ? "hi-IN" : "en-IN");
    setListeningLanguage(langToUse);

    // ============================
    // ANDROID / IOS CAPACITOR NATIVE
    // ============================
    const capSpeech = await getCapacitorSpeech();
    if (capSpeech) {
      const { SpeechRecognition } = capSpeech;
      try {
        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== "granted") {
          alert("Microphone permission denied");
          return;
        }

        setIsListening(true);
        setInterimTranscript("");

        await SpeechRecognition.start({
          language: langToUse,
          maxResults: 1,
          partialResults: true,
          popup: true
        });

        SpeechRecognition.addListener("partialResults", (data) => {
          if (!data.matches?.length) return;
          const text = data.matches[0];
          setInterimTranscript(text);
          setSearchQuery(text);
          if (onSearchQueryChange) onSearchQueryChange(text);
        });

        SpeechRecognition.addListener("listeningState", ({ status }) => {
          console.log("Capacitor Speech Status:", status);
          if (status === "stopped" || status === "inactive") {
            setIsListening(false);
          }
        });
      } catch (err) {
        console.error("Capacitor Speech error:", err);
        setIsListening(false);
      }
      return;
    }

    // ============================
    // WEB BROWSER FALLBACK
    // ============================
    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("Speech recognition is not available in this browser.");
      setShowVoiceAssistantHelp(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.lang = langToUse;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript(language === 'hi' ? 'बोलिए, मैं सुन रहा हूँ...' : 'Listening, speak now...');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join("");
        setInterimTranscript(transcript);

        if (event.results[0].isFinal) {
          setSearchQuery(transcript);
          if (onSearchQueryChange) onSearchQueryChange(transcript);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.error("Speech error:", e);
        setIsListening(false);
        setShowVoiceAssistantHelp(true);
      };

      recognition.start();
    } catch (err) {
      console.error("Voice search initiation fail:", err);
      setIsListening(false);
      setShowVoiceAssistantHelp(true);
    }
  };

  const stopSpeechRecognition = async () => {
    const capSpeech = await getCapacitorSpeech();
    if (capSpeech) {
      try {
        await capSpeech.SpeechRecognition.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Reset pagination limit on any filter/search change
  React.useEffect(() => {
    setProductsLimit(8);
  }, [categoryFilterState, searchQuery, sortBy, priceRange, selectedBrand, selectedWeight, selectedPricePreset, onlyDiscounted]);

  // Extract dynamically available brands and weights/pack sizes from raw products list
  const availableBrands = useMemo(() => {
    const brands = new Set();
    products.forEach(p => {
      // Use brand or subEn / subHi as brand identifier
      const b = p.brand || (language === 'hi' ? p.subHi : p.subEn) || '';
      if (b && b.trim()) {
        brands.add(b.trim());
      }
    });
    return Array.from(brands).sort();
  }, [products, language]);

  const availableWeights = useMemo(() => {
    const weights = new Set();
    products.forEach(p => {
      const w = (language === 'hi' ? p.packHi : p.packEn) || '';
      if (w && w.trim()) {
        weights.add(w.trim());
      } else {
        const name = p.nameEn || "";
        const match = name.match(/\((\d+(?:kg|g|L|ml|Ltr|gm|kg|kgm|pcs|Pcs))\)/i) || name.match(/(\d+(?:kg|g|L|ml|Ltr|gm|kg|kgm|pcs|Pcs))/i);
        if (match) {
          weights.add(match[1].trim());
        }
      }
    });
    return Array.from(weights).filter(Boolean);
  }, [products, language]);

  // Derive categories from DB context dynamically
  const categories = useMemo(() => {
    if (!dynamicCategories || dynamicCategories.length === 0) {
      return [
        { id: 'all', label: t('all'), icon: "✨" },
        { id: 'vegetables', label: t('vegetables'), icon: "🥦" },
        { id: 'beverages', label: t('beverages'), icon: "🧃" },
        { id: 'dairy', label: t('dairy'), icon: "🥛" },
        { id: 'household', label: t('household'), icon: "🧼" }
      ];
    }
    return dynamicCategories.map(cat => ({
      id: cat.id,
      label: language === 'hi' ? cat.nameHi : cat.nameEn,
      icon: cat.icon || "✨"
    }));
  }, [dynamicCategories, language, t]);

  // Search, filter, and sort products dynamically
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by admin flag: show only products with photos on customer website
    if (contactSettings?.showOnlyWithPhoto) {
      result = result.filter(prod => hasCustomProductImage(prod));
    }

    // Category filter
    if (categoryFilterState !== 'all') {
      result = result.filter(prod => prod.category === categoryFilterState);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(prod => 
        prod.nameEn.toLowerCase().includes(q) || 
        prod.nameHi.toLowerCase().includes(q)
      );
    }

    // Filter by price range (from slider)
    result = result.filter(prod => prod.price <= priceRange);

    // Filter by Price Preset Tiers
    if (selectedPricePreset === 'under-100') {
      result = result.filter(prod => prod.price < 100);
    } else if (selectedPricePreset === '100-300') {
      result = result.filter(prod => prod.price >= 100 && prod.price <= 300);
    } else if (selectedPricePreset === '300-1000') {
      result = result.filter(prod => prod.price >= 300 && prod.price <= 1000);
    } else if (selectedPricePreset === 'over-1000') {
      result = result.filter(prod => prod.price > 1000);
    }

    // Filter by Brand (using brand or subEn / subHi)
    if (selectedBrand !== 'all') {
      result = result.filter(prod => {
        const b = prod.brand || (language === 'hi' ? prod.subHi : prod.subEn) || '';
        return b.trim().toLowerCase() === selectedBrand.trim().toLowerCase();
      });
    }

    // Filter by Weight (using packEn / packHi or parsing nameEn weight)
    if (selectedWeight !== 'all') {
      result = result.filter(prod => {
        const w = (language === 'hi' ? prod.packHi : prod.packEn) || '';
        if (w && w.trim().toLowerCase() === selectedWeight.trim().toLowerCase()) return true;
        
        // Match fallback parsed weight (e.g., "(1kg)" or similar)
        const name = prod.nameEn || "";
        const m = name.match(/\((\d+(?:kg|g|L|ml|Ltr|gm|kg|kgm|pcs|Pcs))\)/i) || name.match(/(\d+(?:kg|g|L|ml|Ltr|gm|kg|kgm|pcs|Pcs))/i);
        if (m && m[1].trim().toLowerCase() === selectedWeight.trim().toLowerCase()) return true;
        
        return false;
      });
    }

    // Filter by discount status
    if (onlyDiscounted) {
      result = result.filter(prod => prod.discount !== null);
    }

    // Sorting block
    if (sortBy === 'default') {
      result.sort((a, b) => {
        const aHas = hasCustomProductImage(a) ? 1 : 0;
        const bHas = hasCustomProductImage(b) ? 1 : 0;
        return bHas - aHas;
      });
    } else if (sortBy === 'low-high') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-low') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      result.sort((a, b) => {
        const nameA = language === 'hi' ? a.nameHi : a.nameEn;
        const nameB = language === 'hi' ? b.nameHi : b.nameEn;
        return nameA.localeCompare(nameB);
      });
    }

    return result;
  }, [categoryFilterState, searchQuery, sortBy, priceRange, selectedPricePreset, selectedBrand, selectedWeight, onlyDiscounted, language, products, contactSettings?.showOnlyWithPhoto]);

  // Handle paginate sub-slice lists
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, productsLimit);
  }, [filteredProducts, productsLimit]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setProductsLimit(prev => prev + 50);
      setIsLoadingMore(false);
    }, 300);
  };

  return (
    <div className="flex flex-col gap-6 pb-12" id="shop-view">
      {/* 1. Search Bar & Filters Quick Controls */}
      <section className="px-4 md:px-8 mt-4 flex flex-col md:flex-row gap-4">
        {/* Rounded Input Field matching Image 2 */}
        <div className="relative flex-grow flex flex-col">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (onSearchQueryChange) onSearchQueryChange(val);
              }}
              className="w-full pl-12 pr-20 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-semibold text-sm transition-all duration-150 shadow-sm"
              id="search-input-field"
            />
            
            {/* Bilingual Voice Search Mic control */}
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  stopSpeechRecognition();
                } else {
                  startSpeechRecognition();
                }
              }}
              className={`absolute ${searchQuery ? 'right-11' : 'right-4'} top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                isListening 
                  ? 'bg-rose-600 text-white animate-pulse shadow-md' 
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-100'
              }`}
              title={language === 'hi' ? 'आवाज़ द्वारा खोजें' : 'Search by Voice'}
              id="voice-search-mic-btn"
            >
              {isListening ? (
                <div className="flex items-center gap-0.5">
                  <span className="w-1 h-2.5 bg-white rounded-full animate-bounce"></span>
                  <span className="w-1 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              ) : (
                <Mic className="h-4.5 w-4.5" />
              )}
            </button>

            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  if (onSearchQueryChange) onSearchQueryChange('');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Glowing speech transcript overlay */}
          {isListening && (
            <div className="mt-2.5 flex flex-col gap-3 p-3.5 bg-white border border-emerald-300 rounded-xl relative shadow-lg animate-fade-in z-20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-emerald-800 flex items-center gap-1.5">
                      <span>{language === 'hi' ? 'आवाज़ सहायक सक्रिय है' : 'Voice Assistant Active'}</span>
                    </p>
                    <p className="text-xs text-slate-800 font-extrabold italic mt-0.5">
                      "{interimTranscript || (language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...')}"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-lg shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeechRecognition();
                      startSpeechRecognition('en-IN');
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      listeningLanguage.startsWith('en') 
                        ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeechRecognition();
                      startSpeechRecognition('hi-IN');
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      listeningLanguage.startsWith('hi') 
                        ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    हिंदी (Hindi)
                  </button>
                </div>
              </div>

              {/* Sandbox instructions trigger */}
              <div className="border-t border-slate-200 pt-2 mt-1 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-600">
                  <span className="font-semibold">{isHindi ? "माइक काम नहीं कर रहा? इन त्वरित आवाज आदेशों को आजमाएं:" : "Mic blocked in iframe? Click a phrase to simulate speaking:"}</span>
                  <button 
                    type="button"
                    onClick={() => setShowVoiceAssistantHelp(!showVoiceAssistantHelp)}
                    className="text-emerald-700 hover:underline font-extrabold"
                  >
                    {showVoiceAssistantHelp ? (isHindi ? "त्वरित छुपाएं" : "Hide Triggers") : (isHindi ? "सारे विकल्प देखें" : "View Triggers")}
                  </button>
                </div>

                {(showVoiceAssistantHelp || true) && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => simulateVoiceInput(language === 'hi' ? "चावल" : "Rice")}
                      className="text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg p-1.5 px-2.5 text-[10.5px] text-slate-800 transition-all font-semibold"
                    >
                      🗣️ {language === 'hi' ? '"बासमती चावल"' : '"Basmati Rice"'}
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceInput(language === 'hi' ? "सेब" : "Apple")}
                      className="text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg p-1.5 px-2.5 text-[10.5px] text-slate-800 transition-all font-semibold"
                    >
                      🗣️ {language === 'hi' ? '"ताजा सेब"' : '"Fresh Apples"'}
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceInput(language === 'hi' ? "दूध" : "Milk")}
                      className="text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg p-1.5 px-2.5 text-[10.5px] text-slate-800 transition-all font-semibold"
                    >
                      🗣️ {language === 'hi' ? '"ताजा दूध और डेयरी"' : '"Fresh Milk"'}
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceInput(language === 'hi' ? "तेल" : "Oil")}
                      className="text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg p-1.5 px-2.5 text-[10.5px] text-slate-800 transition-all font-semibold"
                    >
                      🗣️ {language === 'hi' ? '"सरसों का तेल"' : '"Mustard Oil"'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filters and Sort Button controls */}
        <div className="flex gap-2 shrink-0 items-center">
          <button
            onClick={() => setShowFiltersModal(true)}
            className="flex items-center gap-2 px-3.5 py-3 border border-slate-300 bg-white rounded-xl font-extrabold text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            id="filters-modal-btn"
          >
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">{t('filters')}</span>
          </button>

          <button
            onClick={() => setShowSortModal(true)}
            className="flex items-center gap-2 px-3.5 py-3 border border-slate-300 bg-white rounded-xl font-extrabold text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            id="sort-modal-btn"
          >
            <ArrowUpDown className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">{t('sort')}</span>
          </button>

          {/* List <-> Grid layout selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 select-none shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              type="button"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-emerald-100 text-emerald-800 font-extrabold shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              id="grid-mode-btn"
              title="Grid View"
            >
              <LayoutGrid className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-emerald-100 text-emerald-800 font-extrabold shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              id="list-mode-btn"
              title="List View"
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Interactive scrollable Category sliders matching Image 2 */}
      <section className="px-4 md:px-8 overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 min-w-max pb-1">
          {categories.map((cat) => {
            const isSelected = categoryFilterState === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryFilterChange(cat.id)}
                className="flex flex-col items-center gap-1.5 group shrink-0"
                id={`cat-chip-${cat.id}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-200 active:scale-90 ${
                  isSelected 
                    ? 'bg-emerald-600 text-white border-2 border-emerald-600 font-extrabold shadow-sm' 
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
                }`}>
                  {cat.icon}
                </div>
                <span className={`text-[11px] tracking-wide font-extrabold ${
                  isSelected ? 'text-emerald-800' : 'text-slate-600'
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Filter Badges Display */}
      {(selectedBrand !== 'all' || selectedWeight !== 'all' || selectedPricePreset !== 'all' || onlyDiscounted || categoryFilterState !== 'all') && (
        <section className="px-4 md:px-8 -mt-2 mb-2 flex flex-wrap items-center gap-2 select-none">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 mr-1.5 flex items-center gap-1">
            <span>🔍</span>
            <span>{language === 'hi' ? 'सक्रिय फ़िल्टर' : 'Active Filters'}:</span>
          </span>

          {categoryFilterState !== 'all' && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-sm">
              <span>Category: {categoryFilterState}</span>
              <button onClick={() => onCategoryFilterChange('all')} className="hover:text-rose-600 font-black ml-1.5 transition-colors">×</button>
            </span>
          )}

          {selectedBrand !== 'all' && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-sm">
              <span>Brand: {selectedBrand}</span>
              <button onClick={() => setSelectedBrand('all')} className="hover:text-rose-600 font-black ml-1.5 transition-colors">×</button>
            </span>
          )}

          {selectedWeight !== 'all' && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full uppercase shadow-sm">
              <span>Weight: {selectedWeight}</span>
              <button onClick={() => setSelectedWeight('all')} className="hover:text-rose-600 font-black ml-1.5 transition-colors">×</button>
            </span>
          )}

          {selectedPricePreset !== 'all' && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-sm">
              <span>Price: {selectedPricePreset === 'under-100' ? '< ₹100' : selectedPricePreset === '100-300' ? '₹100-₹300' : selectedPricePreset === '300-1000' ? '₹300-₹1000' : '> ₹1000'}</span>
              <button onClick={() => setSelectedPricePreset('all')} className="hover:text-rose-600 font-black ml-1.5 transition-colors">×</button>
            </span>
          )}

          {onlyDiscounted && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-sm">
              <span>Promo deals</span>
              <button onClick={() => setOnlyDiscounted(false)} className="hover:text-rose-600 font-black ml-1.5 transition-colors">×</button>
            </span>
          )}

          <button
            onClick={() => {
              setSelectedBrand('all');
              setSelectedWeight('all');
              setSelectedPricePreset('all');
              setOnlyDiscounted(false);
              onCategoryFilterChange('all');
              setPriceRange(1500);
            }}
            className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 underline underline-offset-4 ml-1.5 cursor-pointer leading-none"
          >
            {language === 'hi' ? 'सभी साफ़ करें' : 'Clear All'}
          </button>
        </section>
      )}

      {/* 3. Product grid containing matching layout cards */}
      <section className="px-4 md:px-8">
        {filteredProducts.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" id="products-shop-grid">
              {displayedProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5" id="products-shop-list">
              {displayedProducts.map((prod) => {
                const name = language === 'hi' ? prod.nameHi : prod.nameEn;
                const brandName = (() => {
                  const rawBrand = (prod.brand && prod.brand.trim()) || '';
                  if (rawBrand && rawBrand.toLowerCase() !== 'general') return rawBrand;
                  const rawSub = (language === 'hi' ? (prod.subHi || prod.subEn) : prod.subEn) || '';
                  if (rawSub && rawSub.trim() && rawSub.trim().toLowerCase() !== 'general') {
                    return rawSub.trim();
                  }
                  return '';
                })();
                const packSize = language === 'hi' ? (prod.packHi || '') : (prod.packEn || '');
                return (
                  <div 
                    key={prod.id} 
                    className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 gap-4 items-center transition-all duration-300 hover:border-emerald-300 shadow-sm"
                  >
                    {/* Left: Product Image */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                      <img
                        src={resolveProductImage(prod, r2PublicUrl, 200)}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const next = getNextCandidateImage(prod, e.target.src, r2PublicUrl);
                          e.target.src = next || DEFAULT_PRODUCT_FALLBACK;
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {prod.discount && (
                        <div className="absolute top-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-white uppercase shadow-sm">
                          {prod.discount}
                        </div>
                      )}
                    </div>

                    {/* Center details */}
                    <div className="flex-grow text-center sm:text-left text-slate-900 overflow-hidden">
                      {brandName ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700">
                          {brandName}
                        </span>
                      ) : null}
                      <h4 className="font-extrabold text-sm leading-snug text-slate-900 mt-0.5">
                        {name}
                      </h4>
                      
                      <div className="mt-1.5 flex items-baseline justify-center sm:justify-start gap-2">
                        <span className="text-base font-black text-slate-900">
                          ₹{prod.price}
                        </span>
                        {prod.originalPrice && (
                          <span className="text-xs text-slate-400 line-through font-normal">
                            ₹{prod.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right action button */}
                    <div className="shrink-0 w-full sm:w-auto">
                      <ListAddToCartButton product={prod} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <LayoutGrid className="h-12 w-12 text-slate-400 mb-3 stroke-[1.5]" />
            <h4 className="font-extrabold text-sm text-slate-900">No products match your criteria</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs">
              Clear your active filters, reduce search queries, or set a higher price ceiling.
            </p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setPriceRange(1500);
                setSelectedBrand('all');
                setSelectedWeight('all');
                setSelectedPricePreset('all');
                setOnlyDiscounted(false);
                onCategoryFilterChange('all');
              }}
              className="mt-4 px-5 py-2.5 bg-emerald-600 text-white font-extrabold text-xs uppercase rounded-xl transition-all hover:bg-emerald-700 shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Load More Button */}
      {filteredProducts.length > productsLimit && (
        <div className="flex justify-center mt-6">
          <button 
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-8 py-3 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {isLoadingMore ? (
              <>
                <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {language === 'hi' ? 'सामंजस्य कर रहा है...' : 'Syncing Products...'}
              </>
            ) : (
              language === 'hi' ? 'और उत्पाद लोड करें' : 'Load More Products'
            )}
          </button>
        </div>
      )}

      {/* 4. Active Filters Drawer POPUP */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in">
          <div className="bg-white border-l border-slate-200 w-[330px] h-full p-6 flex flex-col justify-between shadow-2xl relative animate-slide-in text-slate-900">
            <div className="flex-1 overflow-y-auto pr-1 select-none hide-scrollbar space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="font-extrabold text-base text-slate-900">
                  {language === 'hi' ? 'फ़िल्टर प्राथमिकताएं' : 'Filter Preferences'}
                </h4>
                <button 
                  onClick={() => setShowFiltersModal(false)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Price Tier Presets */}
              <div>
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-2.5">
                  💵 {language === 'hi' ? 'मूल्य सीमा' : 'Price Ceiling'}
                </label>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? `अधिकतम मूल्य: ₹${priceRange}` : `Max Price Limit: ₹${priceRange}`}
                    </span>
                    <input 
                      type="range" 
                      min="50" 
                      max="1500" 
                      step="50"
                      value={priceRange} 
                      onChange={(e) => setPriceRange(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono font-bold">
                      <span>₹50</span>
                      <span>₹1500</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                      {language === 'hi' ? 'मूल्य खंड' : 'Price Segments'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
                      {[
                        { id: 'all', label: language === 'hi' ? 'सभी मूल्य' : 'All Prices' },
                        { id: 'under-100', label: 'Under ₹100' },
                        { id: '100-300', label: '₹100 - ₹300' },
                        { id: '300-1000', label: '₹300 - ₹1000' },
                        { id: 'over-1000', label: 'Over ₹1000' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPricePreset(preset.id)}
                          className={`text-[9px] font-bold p-1.5 rounded transition-all border text-center ${
                            selectedPricePreset === preset.id
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-2">
                  🏷️ {language === 'hi' ? 'ब्रांड / श्रेणी टैग' : 'Brand / Label Tag'}
                </label>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setSelectedBrand('all')}
                      className={`text-[9px] font-bold px-2 py-1 rounded transition-all border uppercase ${
                        selectedBrand === 'all'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                          : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'hi' ? 'सभी ब्रांड' : 'All Brands'}
                    </button>
                    {availableBrands.map((brandTag) => (
                      <button
                        key={brandTag}
                        type="button"
                        onClick={() => setSelectedBrand(brandTag)}
                        className={`text-[9px] font-bold px-2 py-1 rounded transition-all border uppercase tracking-wider ${
                          selectedBrand.trim().toLowerCase() === brandTag.trim().toLowerCase()
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                            : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {brandTag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weight or Unit Filter */}
              <div>
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-2">
                  ⚖️ {language === 'hi' ? 'वजन / मात्रा' : 'Weight / Package Size'}
                </label>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setSelectedWeight('all')}
                      className={`text-[9px] font-bold px-2 py-1 rounded transition-all border uppercase ${
                        selectedWeight === 'all'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                          : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'hi' ? 'सभी पैक' : 'All Packs'}
                    </button>
                    {availableWeights.map((wtInfo) => (
                      <button
                        key={wtInfo}
                        type="button"
                        onClick={() => setSelectedWeight(wtInfo)}
                        className={`text-[9px] font-mono font-extrabold px-2 py-1 rounded transition-all border uppercase tracking-wider ${
                          selectedWeight.trim().toLowerCase() === wtInfo.trim().toLowerCase()
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                            : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {wtInfo}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Promotion Deals toggle */}
              <div>
                <label className="flex items-center justify-between cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all select-none">
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                    ⚡ {language === 'hi' ? 'केवल छूट वाले डील्स' : 'Only Promo Deals'}
                  </span>
                  <input 
                    type="checkbox"
                    checked={onlyDiscounted}
                    onChange={(e) => setOnlyDiscounted(e.target.checked)}
                    className="h-5 w-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Clear Filter button */}
              <button
                type="button"
                onClick={() => {
                  setPriceRange(1500);
                  setSelectedBrand('all');
                  setSelectedWeight('all');
                  setSelectedPricePreset('all');
                  setOnlyDiscounted(false);
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                {language === 'hi' ? 'सभी फ़िल्टर्स रीसेट करें' : 'Reset All Filters'}
              </button>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200">
              <button 
                onClick={() => setShowFiltersModal(false)}
                className="w-full py-3.5 bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-md cursor-pointer text-center"
              >
                {language === 'hi' ? 'फिल्टर लागू करें' : 'Apply Selected Filters'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sort Dropdown Panel POPUP */}
      {showSortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-opacity animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-slate-900 animate-scale-in">
            <button 
              onClick={() => setShowSortModal(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-slate-100 text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>

            <h4 className="font-extrabold text-base text-slate-900 mb-4">Sort By</h4>
            
            <div className="flex flex-col gap-2">
              {[
                { id: 'default', label: 'Default / Popularity' },
                { id: 'low-high', label: 'Price: Low to High' },
                { id: 'high-low', label: 'Price: High to Low' },
                { id: 'name', label: 'Alphabetical: Name A-Z' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSortBy(opt.id);
                    setShowSortModal(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all border ${
                    sortBy === opt.id 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold' 
                      : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modular helper button component inside Shop.jsx for list mode
function ListAddToCartButton({ product }) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const { t, language } = useLanguage();

  const stockCount = product.stockCount !== undefined ? Number(product.stockCount) : (product.stock !== undefined ? Number(product.stock) : 0);
  const isOutOfStock = stockCount <= 0;

  const cartItem = cartItems?.find(item => item.product.id === product.id);
  const cartQty = cartItem ? cartItem.quantity : 0;
  const unit = cartItem ? cartItem.selectedUnit : undefined;

  if (isOutOfStock) {
    return (
      <button
        disabled
        className="flex w-full sm:w-36 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-extrabold border uppercase bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
      >
        <span>{language === 'hi' ? 'स्टॉक बाहर' : 'OUT OF STOCK'}</span>
      </button>
    );
  }

  if (cartQty > 0) {
    return (
      <div className="flex w-full sm:w-36 items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-1 text-emerald-800 shadow-sm">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (cartQty === 1) {
              removeFromCart(product.id, unit);
            } else {
              updateQuantity(product.id, unit, -1);
            }
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-90 font-bold cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5 stroke-[3]" />
        </button>
        <span className="px-2 py-0.5 rounded bg-white text-emerald-900 font-mono text-xs border border-emerald-300 font-extrabold">
          {cartQty}
        </span>
        <button
          type="button"
          disabled={cartQty >= stockCount}
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(product.id, unit, 1);
          }}
          className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold transition-all ${
            cartQty >= stockCount
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-90 cursor-pointer'
          }`}
          title={cartQty >= stockCount ? (language === 'hi' ? 'अधिकतम स्टॉक सीमा तक पहुंच चुके हैं' : 'Maximum stock limit reached') : ''}
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        addToCart(product);
      }}
      className="flex w-full sm:w-36 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-extrabold transition-all duration-200 active:scale-95 border uppercase bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
    >
      <ShoppingCart className="h-4 w-4 shrink-0" />
      <span>{t('addToCart')}</span>
    </button>
  );
}
