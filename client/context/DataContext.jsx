import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { isOrder1HourLocked } from '../utils/orderLock';
import { useAuth } from './AuthContext';

const DataContext = createContext();


export function DataProvider({ children }) {
  const { staff: authenticatedStaff, customer: authenticatedCustomer } = useAuth();
  const settingsLoaded = useRef(false);
  const reconcileSettings = useRef(() => {});

  const saveSettingToDb = async (key, value) => {
    if (!settingsLoaded.current) return;
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Unable to save ${key}.`);
      return result.value;
    } catch (err) {
      console.warn(`Failed to save setting ${key} to DB:`, err);
      reconcileSettings.current();
    }
  };

  const [products, setProducts] = useState([]);
  const [r2PublicUrl, setR2PublicUrl] = useState('');
  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [paymentEnvironment, setPaymentEnvironment] = useState("TEST");

  const [reviews, setReviews] = useState([]);
  const [partners, setPartners] = useState([]);
  const [orders, setOrders] = useState([]);

  // Current active admin role configuration: 'customer' | 'admin' | 'manager'
  const [userRole, setUserRole] = useState('customer');

  // Dynamic state blocks for extensive admin dashboard settings
  const [categories, setCategories] = useState([]);

  const [offers, setOffers] = useState([]);

  const [contactMessages, setContactMessages] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);

  // Data Deletion Requests State (User Requests for Account / Data Erasure)
  const [dataDeletionRequests, setDataDeletionRequests] = useState([]);

  const [aboutSettings, setAboutSettings] = useState({});

  const [contactSettings, setContactSettings] = useState({});

  const [referralSettings, setReferralSettings] = useState({});

  const [celebrationSettings, setCelebrationSettings] = useState({});

  const [primeSettings, setPrimeSettings] = useState({});

  const [slides, setSlides] = useState([]);

  const [locationGroups, setLocationGroups] = useState([]);

  // Persist configurable business state only through the authenticated API.
  useEffect(() => {
    saveSettingToDb('swastik_location_groups', locationGroups);
  }, [locationGroups]);

  useEffect(() => {
    saveSettingToDb('swastik_referral_settings', referralSettings);
  }, [referralSettings]);

  useEffect(() => {
    saveSettingToDb('swastik_celebration_settings', celebrationSettings);
  }, [celebrationSettings]);

  useEffect(() => {
    saveSettingToDb('swastik_prime_settings', primeSettings);
  }, [primeSettings]);

  useEffect(() => {
    saveSettingToDb('swastik_slides', slides);
  }, [slides]);

  useEffect(() => {
    saveSettingToDb('swastik_categories', categories);
  }, [categories]);

  useEffect(() => {
    saveSettingToDb('swastik_offers', offers);
  }, [offers]);


  useEffect(() => {
    saveSettingToDb('swastik_about_settings', aboutSettings);
  }, [aboutSettings]);

  useEffect(() => {
    saveSettingToDb('swastik_contact_settings', contactSettings);
  }, [contactSettings]);

  // Request tracking and cache flags to prevent redundant duplicate API calls
  const loadedMap = useRef({
    config: false,
    settings: false,
    products: false,
    orders: false,
    customers: false,
    staff: false,
    partners: false,
    reviews: false,
    deletionRequests: false
  });

  const inFlightMap = useRef({});
  const previousPrincipal = useRef('');

  useEffect(() => {
    const principal = authenticatedStaff
      ? `staff:${authenticatedStaff.id}:${Boolean(authenticatedStaff.isMasterAdmin)}:${[...(authenticatedStaff.permissions || [])].sort().join(',')}`
      : authenticatedCustomer ? `customer:${authenticatedCustomer.id}` : 'public';
    if (previousPrincipal.current && previousPrincipal.current !== principal) {
      setOrders([]);
      setCustomers([]);
      setStaff([]);
      setDataDeletionRequests([]);
      for (const key of ['orders', 'customers', 'staff', 'deletionRequests']) loadedMap.current[key] = false;
      for (const key of ['orders', 'customers', 'staff', 'deletionRequests']) delete inFlightMap.current[key];
    }
    previousPrincipal.current = principal;
  }, [authenticatedStaff?.id, authenticatedStaff?.isMasterAdmin, authenticatedStaff?.permissions, authenticatedCustomer?.id]);

  // Synchronous refs to prevent useCallback dependency invalidation and infinite re-render loops
  const productsRef = useRef(products);
  productsRef.current = products;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const staffRef = useRef(staff);
  staffRef.current = staff;
  const partnersRef = useRef(partners);
  partnersRef.current = partners;
  const reviewsRef = useRef(reviews);
  reviewsRef.current = reviews;
  const deletionRequestsRef = useRef(dataDeletionRequests);
  deletionRequestsRef.current = dataDeletionRequests;

  // 1. App Configuration (Lightweight - R2 base URL & Payment switches)
  const fetchConfig = useCallback(async (force = false) => {
    if (loadedMap.current.config && !force) return;
    if (inFlightMap.current.config) return inFlightMap.current.config;

    inFlightMap.current.config = (async () => {
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const data = await configRes.json();
          if (data && data.r2PublicUrl) {
            setR2PublicUrl(data.r2PublicUrl);
          }
          if (data && data.paymentEnabled !== undefined) {
            setPaymentEnabled(data.paymentEnabled);
          }
          if (data && data.paymentEnvironment) {
            setPaymentEnvironment(data.paymentEnvironment);
          }
          loadedMap.current.config = true;
        }
      } catch (e) {
        console.warn("Failed to fetch R2 config:", e);
      } finally {
        delete inFlightMap.current.config;
      }
    })();
    return inFlightMap.current.config;
  }, []);

  // 2. Visual & Content Settings (Categories, Slides, Banners, Store Info)
  const fetchSettings = useCallback(async (force = false) => {
    if (loadedMap.current.settings && !force) return;
    if (inFlightMap.current.settings) return inFlightMap.current.settings;

    inFlightMap.current.settings = (async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          settingsLoaded.current = false;

          if (settingsData) {
            if (Object.hasOwn(settingsData, 'swastik_location_groups')) setLocationGroups(Array.isArray(settingsData.swastik_location_groups) ? settingsData.swastik_location_groups : []);
            if (Object.hasOwn(settingsData, 'swastik_referral_settings')) setReferralSettings(settingsData.swastik_referral_settings || {});
            if (Object.hasOwn(settingsData, 'swastik_celebration_settings')) setCelebrationSettings(settingsData.swastik_celebration_settings || {});
            if (Object.hasOwn(settingsData, 'swastik_prime_settings')) setPrimeSettings(settingsData.swastik_prime_settings || {});
            if (Object.hasOwn(settingsData, 'swastik_slides')) setSlides(Array.isArray(settingsData.swastik_slides) ? settingsData.swastik_slides : []);
            if (Object.hasOwn(settingsData, 'swastik_categories')) setCategories(Array.isArray(settingsData.swastik_categories) ? settingsData.swastik_categories : []);
            if (Object.hasOwn(settingsData, 'swastik_offers')) setOffers(Array.isArray(settingsData.swastik_offers) ? settingsData.swastik_offers : []);
            if (Object.hasOwn(settingsData, 'swastik_contact_messages')) setContactMessages(Array.isArray(settingsData.swastik_contact_messages) ? settingsData.swastik_contact_messages : []);
            if (Object.hasOwn(settingsData, 'swastik_about_settings')) setAboutSettings(settingsData.swastik_about_settings || {});
            if (Object.hasOwn(settingsData, 'swastik_contact_settings')) setContactSettings(settingsData.swastik_contact_settings || {});
            if (Object.hasOwn(settingsData, 'swastik_refund_sections')) setRefundSections(Array.isArray(settingsData.swastik_refund_sections) ? settingsData.swastik_refund_sections : []);
            if (Object.hasOwn(settingsData, 'swastik_privacy_sections')) setPrivacySections(Array.isArray(settingsData.swastik_privacy_sections) ? settingsData.swastik_privacy_sections : []);
            if (Object.hasOwn(settingsData, 'swastik_terms_sections')) setTermsSections(Array.isArray(settingsData.swastik_terms_sections) ? settingsData.swastik_terms_sections : []);
          }
          loadedMap.current.settings = true;
        }
      } catch (e) {
        console.warn("Failed to fetch settings:", e);
      } finally {
        setTimeout(() => {
          settingsLoaded.current = true;
        }, 500);
        delete inFlightMap.current.settings;
      }
    })();
    return inFlightMap.current.settings;
  }, []);
  reconcileSettings.current = () => { fetchSettings(true).catch(() => {}); };

  // 3. Products Loader (Only fetched on Home, Shop, Cart, or Products Manager)
  const fetchProducts = useCallback(async (force = false, isImage = null) => {
    if (loadedMap.current.products && !force) return productsRef.current;
    if (inFlightMap.current.products) return inFlightMap.current.products;
  
    inFlightMap.current.products = (async () => {
      try {
        const url = isImage !== null
          ? `/api/products?is_image=${isImage ? 1 : 0}`
          : '/api/products';
  
        const prodRes = await fetch(url);
  
        if (prodRes.ok) {
          const data = await prodRes.json();
  
          if (Array.isArray(data)) {
            setProducts(data);
            loadedMap.current.products = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch products:", e);
      } finally {
        delete inFlightMap.current.products;
      }
  
      return productsRef.current || [];
    })();
  
    return inFlightMap.current.products;
  }, []);

  // 4. Orders Loader (Only fetched on Admin Dashboard, Orders Manager, or User Account History)
  const fetchOrders = useCallback(async (force = false) => {
    if (loadedMap.current.orders && !force) return ordersRef.current;
    if (inFlightMap.current.orders) return inFlightMap.current.orders;

    inFlightMap.current.orders = (async () => {
      try {
        const orderRes = await fetch('/api/orders');
        if (orderRes.ok) {
          const data = await orderRes.json();
          if (Array.isArray(data)) {
            setOrders(data);
            loadedMap.current.orders = true;
            return data;
          }
        } else if (orderRes.status === 401 || orderRes.status === 403) {
          setOrders([]);
          loadedMap.current.orders = false;
        }
      } catch (e) {
        console.warn("Failed to fetch orders:", e);
      } finally {
        delete inFlightMap.current.orders;
      }
      return ordersRef.current || [];
    })();
    return inFlightMap.current.orders;
  }, []);

  // 5. Customers Loader (Only fetched on Customers Manager or Checkout Customer lookup)
  const fetchCustomers = useCallback(async (force = false) => {
    if (loadedMap.current.customers && !force) return customersRef.current;
    if (inFlightMap.current.customers) {
      return inFlightMap.current.customers;
    }
  
    inFlightMap.current.customers = (async () => {
      try {
        const custRes = await fetch('/api/customers');
  
        if (custRes.ok) {
          const custData = await custRes.json();
  
          if (Array.isArray(custData)) {
            setCustomers(custData);
            loadedMap.current.customers = true;
            return custData;
          }
        } else if (custRes.status === 401 || custRes.status === 403) {
          setCustomers([]);
          loadedMap.current.customers = false;
        }
      } catch (e) {
        console.warn("Failed to fetch customers:", e);
      } finally {
        delete inFlightMap.current.customers;
      }
  
      return customersRef.current || [];
    })();
  
    return inFlightMap.current.customers;
  }, []);

  // 6. Staff Loader (Only fetched on Staff Manager, Delivery Dashboard, or Role checks)
  const fetchStaff = useCallback(async (force = false) => {
    if (loadedMap.current.staff && !force) return staffRef.current;
    if (inFlightMap.current.staff) return inFlightMap.current.staff;

    inFlightMap.current.staff = (async () => {
      try {
        const res = await fetch('/api/staff');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setStaff(list);
            loadedMap.current.staff = true;
            return list;
          }
        } else if (res.status === 401 || res.status === 403) {
          setStaff([]);
          loadedMap.current.staff = false;
        }
      } catch (e) {
        console.warn("Could not fetch staff from server:", e);
      } finally {
        delete inFlightMap.current.staff;
      }
      return staffRef.current || [];
    })();
    return inFlightMap.current.staff;
  }, []);

  // 7. Partners Loader (Only fetched on Partners page or Partners Admin)
  const fetchPartners = useCallback(async (force = false) => {
    if (loadedMap.current.partners && !force) return partnersRef.current;
    if (inFlightMap.current.partners) return inFlightMap.current.partners;

    inFlightMap.current.partners = (async () => {
      try {
        const partnerRes = await fetch('/api/partners');
        if (partnerRes.ok) {
          const data = await partnerRes.json();
          if (Array.isArray(data)) {
            setPartners(data);
            loadedMap.current.partners = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch partners:", e);
      } finally {
        delete inFlightMap.current.partners;
      }
      return partnersRef.current || [];
    })();
    return inFlightMap.current.partners;
  }, []);

  // 8. Reviews Loader (Only fetched on Reviews page or Reviews Admin)
  const fetchReviews = useCallback(async (force = false) => {
    if (loadedMap.current.reviews && !force) return reviewsRef.current;
    if (inFlightMap.current.reviews) return inFlightMap.current.reviews;

    inFlightMap.current.reviews = (async () => {
      try {
        const reviewRes = await fetch('/api/reviews');
        if (reviewRes.ok) {
          const data = await reviewRes.json();
          if (Array.isArray(data)) {
            setReviews(data);
            loadedMap.current.reviews = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch reviews:", e);
      } finally {
        delete inFlightMap.current.reviews;
      }
      return reviewsRef.current || [];
    })();
    return inFlightMap.current.reviews;
  }, []);

  // 9. Data Deletion Requests Loader (Only fetched on Data Deletion Admin tab)
  const fetchDataDeletionRequests = useCallback(async (force = false) => {
    if (loadedMap.current.deletionRequests && !force) return deletionRequestsRef.current;
    if (inFlightMap.current.deletionRequests) return inFlightMap.current.deletionRequests;

    inFlightMap.current.deletionRequests = (async () => {
      try {
        const delReqRes = await fetch('/api/data-deletion-requests');
        if (delReqRes.ok) {
          const delReqData = await delReqRes.json();
          if (Array.isArray(delReqData)) {
            setDataDeletionRequests(delReqData);
            loadedMap.current.deletionRequests = true;
            return delReqData;
          }
        } else if (delReqRes.status === 401 || delReqRes.status === 403) {
          setDataDeletionRequests([]);
          loadedMap.current.deletionRequests = false;
        }
      } catch (e) {
        console.warn("Failed to fetch data deletion requests:", e);
      } finally {
        delete inFlightMap.current.deletionRequests;
      }
      return deletionRequestsRef.current || [];
    })();
    return inFlightMap.current.deletionRequests;
  }, []);

  // Backward-compatible fetchAll (only fetches core visual settings and products)
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchConfig(true),
      fetchSettings(true),
      fetchProducts(true),
      fetchCustomers(true),
      fetchStaff(true),
      fetchDataDeletionRequests(true)
    ]);
  }, [fetchConfig, fetchSettings, fetchProducts, fetchCustomers, fetchStaff, fetchDataDeletionRequests]);

  // Initial App Mount: load core storefront config and public store settings
  useEffect(() => {
    fetchConfig();
    fetchSettings();
  }, [fetchConfig, fetchSettings]);

  useEffect(() => {
    if (!authenticatedStaff || (!authenticatedStaff.isMasterAdmin && !authenticatedStaff.permissions?.includes('settings'))) {
      setContactMessages([]);
      return;
    }
    fetch('/api/contact/messages').then(async response => {
      const result = await response.json().catch(() => []);
      if (!response.ok) throw new Error(result.error || 'Unable to load contact messages.');
      setContactMessages(Array.isArray(result) ? result : []);
    }).catch(error => console.warn(error.message));
  }, [authenticatedStaff?.id, authenticatedStaff?.isMasterAdmin, authenticatedStaff?.permissions]);

  // CRUD actions for products via GORM REST API
  const addProduct = async (p) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        const created = await res.json();
        setProducts(prev => [...prev, created]);
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Product creation failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateProduct = async (id, updated) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const saved = await res.json();
        setProducts(prev => prev.map(p => p.id === Number(id) ? saved : p));
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Product update failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== Number(id)));
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Product deactivation failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const clearAllProducts = async () => {
    try {
      const res = await fetch('/api/products', { method: 'DELETE' });
      if (res.ok) {
        setProducts([]);
        return true;
      }
    } catch (e) {
      console.error("Failed to clear products:", e);
    }
    return false;
  };

  const bulkUploadProducts = async (items, options = {}) => {
    try {
      const res = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          mode: options.mode || 'update_existing',
          defaultCategory: options.defaultCategory || 'swastik'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          await fetchProducts();
        }
        return data;
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to bulk upload products");
      }
    } catch (e) {
      console.error("bulkUploadProducts error:", e);
      throw e;
    }
  };

  const bulkUpdateStock = async (payload) => {
    try {
      const res = await fetch('/api/products/bulk-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          await fetchProducts();
        }
        return data;
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to update bulk stock");
      }
    } catch (e) {
      console.error("bulkUpdateStock error:", e);
      throw e;
    }
  };

  // CRUD actions for partners via GORM REST API
  const addPartner = async (par) => {
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(par),
      });
      if (res.ok) {
        const created = await res.json();
        setPartners(prev => [...prev, created]);
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Partner creation failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updatePartner = async (id, updated) => {
    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const returned = await res.json();
        setPartners(prev => prev.map(p => p.id === Number(id) ? returned : p));
        return returned;
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Partner update failed.');
      }
    } catch (e) {
      console.error("Failed to update partner:", e);
      throw e;
    }
  };

  const deletePartner = async (id) => {
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPartners(prev => prev.filter(p => p.id !== Number(id)));
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Partner deletion failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // CRUD actions for Google Reviews via GORM REST API
  const addReview = async (rev) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rev),
      });
      if (res.ok) {
        const created = await res.json();
        setReviews(prev => [created, ...prev]);
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Review creation failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateReview = async (id, updated) => {
    try {
      const res = await fetch(`/api/reviews/${id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: updated.response || '' }),
      });
      if (res.ok) {
        const returned = await res.json();
        setReviews(prev => prev.map(r => r.id === Number(id) ? returned : r));
        return returned;
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Review update failed.');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteReview = async (id) => {
    try {
      const response = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Review deletion failed.');
      }
      setReviews(prev => prev.filter(r => r.id !== Number(id) && String(r.id) !== String(id)));
    } catch (e) {
      console.error("Failed to delete review on server:", e);
      throw e;
    }
  };

  // CRUD actions for Orders via GORM REST API
  const addOrder = async (order) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (res.ok) {
        const createdOrder = await res.json();
        setOrders(prev => [createdOrder, ...prev]);

        await fetchProducts(true);

   

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('swastik:refresh-notifications'));
        }

        return { success: true, order: createdOrder };
      } else {
        const errorData = await res.json();
        return { success: false, error: errorData.error, errorHi: errorData.error_hi };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message || 'Order creation failed.' };
    }
  };

  const updateOrder = async (id, updated) => {
    try {
      const existingOrder = orders.find(o => String(o.id) === String(id));
      if (existingOrder && isOrder1HourLocked(existingOrder)) {
        const keys = Object.keys(updated);
        // Once an order is delivered and locked, paymentStatus and paymentMethod are also locked.
        // The ONLY allowed updates are Admin cash clearance / settlement records.
        const allowedSettlementKeys = [
          'codStatus', 'codNotes', 'codClearedAt', 'codClearedBy', 'codClearanceNote',
          'adminReceivedCash', 'adminCashReceivedAt', 'adminReceivedBy',
          'adminCollectedConfirm', 'adminCollectedAt', 'isSettled', 'settledAt',
          'settlementStatus', 'settledAmount', 'id'
        ];
        const hasRestrictedChanges = keys.some(k => !allowedSettlementKeys.includes(k) && JSON.stringify(existingOrder[k]) !== JSON.stringify(updated[k]));
        if (hasRestrictedChanges) {
          console.warn(`Order #${id} is delivered and permanently locked. Status and payment marking are immutable. Only Admin cash receipt from delivery staff can be recorded.`);
          const sanitizedPayload = {};
          allowedSettlementKeys.forEach(k => {
            if (updated[k] !== undefined) sanitizedPayload[k] = updated[k];
          });
          if (Object.keys(sanitizedPayload).length === 0) return;
          updated = sanitizedPayload;
        }
      }

      const res = await fetch(`/api/orders/${id}/transit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saved.error || 'Order update failed.');
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? saved : o));
      await fetchProducts(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('swastik:refresh-notifications'));
      }
    } catch (e) {
      console.error(e);
      await Promise.all([fetchOrders(true), fetchProducts(true)]);
      throw e;
    }
  };

  const deleteOrder = async (id) => {
    try {
      const response = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Order deletion failed (HTTP ${response.status})`);
      }

      setOrders(prev => prev.filter(o => o.id !== id && String(o.id) !== String(id)));
      await Promise.all([fetchProducts(true), fetchCustomers()]);
      return { success: true };
    } catch (e) {
      console.error("Order deletion error:", e);
      return { success: false, error: e.message };
    }
  };

  // Dynamic categories CRUD
  const addCategory = (cat) => {
    setCategories(prev => [...prev, cat]);
  };
  const updateCategory = (id, updated) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };
  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id && String(c.id) !== String(id)));
  };

  // Dynamic offers CRUD
  const addOffer = (off) => {
    const newId = offers.length > 0 ? Math.max(...offers.map(o => o.id)) + 1 : 1;
    setOffers(prev => [...prev, { ...off, id: newId }]);
  };
  const updateOffer = (id, updated) => {
    setOffers(prev => prev.map(o => (o.id === id || String(o.id) === String(id) || o.id === Number(id)) ? { ...o, ...updated } : o));
  };
  const deleteOffer = (id) => {
    setOffers(prev => prev.filter(o => o.id !== id && String(o.id) !== String(id) && o.id !== Number(id)));
  };

  // Dynamic contact messages submission
  const addContactMessage = async (msg) => {
    const response = await fetch('/api/contact/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.message) throw new Error(result.error || 'Unable to submit contact message.');
    return result.message;
  };
  const updateContactMessage = async (id, updated) => {
    const response = await fetch(`/api/contact/messages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.message) throw new Error(result.error || 'Unable to update contact message.');
    setContactMessages(prev => prev.map(message => String(message.id) === String(id) ? result.message : message));
    return result.message;
  };
  const deleteContactMessage = async (id) => {
    const response = await fetch(`/api/contact/messages/${id}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to delete contact message.');
    setContactMessages(prev => prev.filter(message => String(message.id) !== String(id)));
    return true;
  };

  // Dynamic customers register & synchronization with backend
  const upsertCustomer = async (custData) => {
    if (!custData) return null;
    const response = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custData) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.customer) throw new Error(result.error || 'Customer creation failed.');
    await fetchCustomers(true);
    return result.customer;
  };

  const addCustomer = (cust) => {
    return upsertCustomer(cust);
  };

  const updateCustomer = async (id, updated) => {
    const custId = Number(id);
    const response = await fetch(`/api/customers/${custId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.customer) throw new Error(result.error || 'Customer update failed.');
    setCustomers(prev => prev.map(customer => customer.id === custId ? result.customer : customer));
    await fetchOrders(true);
    return result.customer;
  };

  const deleteCustomer = async (id) => {
    const custId = Number(id);
    const response = await fetch(`/api/customers/${custId}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Customer deletion failed.');
    await fetchCustomers(true);
    return true;
  };

  const dataDeletionRequest = async (url, options = {}) => {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Data deletion requests are unavailable.');
    return result;
  };

  const addDataDeletionRequest = async reqData => {
    const result = await dataDeletionRequest('/api/data-deletion-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqData) });
    await fetchDataDeletionRequests(true);
    return result.request;
  };
  const approveDataDeletionRequest = async (requestId, adminNotes = '') => {
    const result = await dataDeletionRequest(`/api/data-deletion-requests/${requestId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes }) });
    await Promise.all([fetchDataDeletionRequests(true), fetchCustomers(true)]);
    return result.request;
  };
  const rejectDataDeletionRequest = async (requestId, adminNotes = '') => {
    const result = await dataDeletionRequest(`/api/data-deletion-requests/${requestId}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes }) });
    await fetchDataDeletionRequests(true);
    return result.request;
  };
  const deleteDataDeletionRequest = async requestId => {
    const result = await dataDeletionRequest(`/api/data-deletion-requests/${requestId}`, { method: 'DELETE' });
    await fetchDataDeletionRequests(true);
    return result;
  };

  // ------------------------------------
  // STAFF & PERMISSIONS SYSTEM
  // ------------------------------------
  const addStaff = async (s) => {
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create staff member');
      setStaff(prev => [...prev.filter(item => item.id !== data.staff.id), data.staff]);
      return { success: true, staff: data.staff };
    } catch (e) {
      console.error('Staff creation failed:', e);
      return { success: false, error: e.message };
    }
  };

  const updateStaff = async (id, updated) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update staff member');
      setStaff(prev => prev.map(item => item.id === Number(id) ? data.staff : item));
      return { success: true, staff: data.staff };
    } catch (e) {
      console.error('Staff update failed:', e);
      return { success: false, error: e.message };
    }
  };

  const deleteStaff = async (id) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete staff member');
      setStaff(prev => prev.map(item => item.id === Number(id) ? data.staff : item));
      return { success: true, staff: data.staff };
    } catch (e) {
      console.error('Staff deletion failed:', e);
      return { success: false, error: e.message };
    }
  };

  const changeStaffPassword = async (mobile, oldPassword, newPassword) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, oldPassword, newPassword })
      });
      if (res.ok) {
        return { success: true };
      } else {
        const text = await res.text();
        let errMsg = 'Rejection from security server';
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.error) errMsg = parsed.error;
        } catch (je) {}
        return { success: false, error: errMsg };
      }
    } catch (e) {
      console.warn("Password update request failed:", e);
      return { success: false, error: 'Could not reach the security server' };
    }
  };

  // Dynamic Privacy, Terms and Refund state
  const [privacySections, setPrivacySections] = useState([]);

  const [termsSections, setTermsSections] = useState([]);

  const [refundSections, setRefundSections] = useState([]);

  useEffect(() => {
    saveSettingToDb('swastik_privacy_sections', privacySections);
  }, [privacySections]);

  useEffect(() => {
    saveSettingToDb('swastik_terms_sections', termsSections);
  }, [termsSections]);

  useEffect(() => {
    saveSettingToDb('swastik_refund_sections', refundSections);
  }, [refundSections]);

  const addPrivacySection = (sect) => {
    const newId = privacySections.length > 0 ? Math.max(...privacySections.map(s => s.id)) + 1 : 1;
    setPrivacySections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updatePrivacySection = (id, updated) => {
    setPrivacySections(prev => prev.map(s => s.id === Number(id) ? { ...s, ...updated } : s));
  };
  const deletePrivacySection = (id) => {
    setPrivacySections(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  const addTermsSection = (sect) => {
    const newId = termsSections.length > 0 ? Math.max(...termsSections.map(s => s.id)) + 1 : 1;
    setTermsSections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updateTermsSection = (id, updated) => {
    setTermsSections(prev => prev.map(s => (s.id === id || String(s.id) === String(id) || s.id === Number(id)) ? { ...s, ...updated } : s));
  };
  const deleteTermsSection = (id) => {
    setTermsSections(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  const addRefundSection = (sect) => {
    const newId = refundSections.length > 0 ? Math.max(...refundSections.map(s => s.id)) + 1 : 1;
    setRefundSections(prev => [...prev, { ...sect, id: newId }]);
  };
  const updateRefundSection = (id, updated) => {
    setRefundSections(prev => prev.map(s => (s.id === id || String(s.id) === String(id) || s.id === Number(id)) ? { ...s, ...updated } : s));
  };
  const deleteRefundSection = (id) => {
    setRefundSections(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  // Dynamic Slider/Banner CRUD Actions
  const addSlide = (slide) => {
    const newId = slides.length > 0 ? Math.max(...slides.map(s => s.id)) + 1 : 1;
    setSlides(prev => [...prev, { ...slide, id: newId }]);
  };
  const updateSlide = (id, updated) => {
    setSlides(prev => prev.map(s => (s.id === id || String(s.id) === String(id) || s.id === Number(id)) ? { ...s, ...updated } : s));
  };
  const deleteSlide = (id) => {
    setSlides(prev => prev.filter(s => s.id !== id && String(s.id) !== String(id) && s.id !== Number(id)));
  };

  return (
    <DataContext.Provider value={{
      slides,
      addSlide,
      updateSlide,
      deleteSlide,
      privacySections,
      setPrivacySections,
      addPrivacySection,
      updatePrivacySection,
      deletePrivacySection,
      termsSections,
      setTermsSections,
      addTermsSection,
      updateTermsSection,
      deleteTermsSection,
      refundSections,
      setRefundSections,
      addRefundSection,
      updateRefundSection,
      deleteRefundSection,
      products,
      setProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      clearAllProducts,
      bulkUploadProducts,
      bulkUpdateStock,
      r2PublicUrl,
      setR2PublicUrl,
      paymentEnabled,
      setPaymentEnabled,
      paymentEnvironment,
      setPaymentEnvironment,
      reviews,
      addReview,
      updateReview,
      deleteReview,
      partners,
      addPartner,
      updatePartner,
      deletePartner,
      orders,
      addOrder,
      updateOrder,
      deleteOrder,
      userRole,
      setUserRole,
      categories,
      setCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      offers,
      setOffers,
      addOffer,
      updateOffer,
      deleteOffer,
      contactMessages,
      addContactMessage,
      updateContactMessage,
      deleteContactMessage,
      customers,
      setCustomers,
      addCustomer,
      upsertCustomer,
      updateCustomer,
      deleteCustomer,
      dataDeletionRequests,
      setDataDeletionRequests,
      addDataDeletionRequest,
      approveDataDeletionRequest,
      rejectDataDeletionRequest,
      deleteDataDeletionRequest,
      aboutSettings,
      setAboutSettings,
      contactSettings,
      setContactSettings,
      referralSettings,
      setReferralSettings,
      celebrationSettings,
      setCelebrationSettings,
      primeSettings,
      setPrimeSettings,
      locationGroups,
      setLocationGroups,
      staff,
      setStaff,
      addStaff,
      updateStaff,
      deleteStaff,
      changeStaffPassword,
      // Granular on-demand data loaders
      fetchConfig,
      fetchSettings,
      fetchProducts,
      fetchOrders,
      fetchCustomers,
      fetchStaff,
      fetchPartners,
      fetchReviews,
      fetchDataDeletionRequests,
      fetchAll
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
