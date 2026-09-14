import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AuthContext = createContext(null);

async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status})`);
  return data;
}

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [staffStatus, setStaffStatus] = useState('checking');
  const [customerStatus, setCustomerStatus] = useState('checking');
  const authRevision = useRef(0);

  const refreshStaff = useCallback(async () => {
    const revision = ++authRevision.current;
    try {
      const data = await jsonRequest('/api/auth/staff/session');
      if (revision !== authRevision.current) return data.user || null;
      setStaff(data.user || null);
      setStaffStatus(data.user ? 'authenticated' : 'unauthenticated');
      return data.user || null;
    } catch {
      if (revision !== authRevision.current) return null;
      setStaff(null);
      setStaffStatus('unauthenticated');
      return null;
    }
  }, []);

  const refreshCustomer = useCallback(async () => {
    const revision = ++authRevision.current;
    try {
      const data = await jsonRequest('/api/auth/customer/session');
      if (revision !== authRevision.current) return data.customer || null;
      setCustomer(data.customer || null);
      setCustomerStatus(data.customer ? 'authenticated' : 'unauthenticated');
      return data.customer || null;
    } catch {
      if (revision !== authRevision.current) return null;
      setCustomer(null);
      setCustomerStatus('unauthenticated');
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const revision = ++authRevision.current;
    try {
      const data = await jsonRequest('/api/auth/session');
      if (revision !== authRevision.current) return { staff: data.user || null, customer: data.customer || null };
      setStaff(data.user || null);
      setCustomer(data.customer || null);
      setStaffStatus(data.user ? 'authenticated' : 'unauthenticated');
      setCustomerStatus(data.customer ? 'authenticated' : 'unauthenticated');
      return { staff: data.user || null, customer: data.customer || null };
    } catch {
      if (revision !== authRevision.current) return { staff: null, customer: null };
      setStaff(null);
      setCustomer(null);
      setStaffStatus('unauthenticated');
      setCustomerStatus('unauthenticated');
      return { staff: null, customer: null };
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const onUnauthorized = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('swastik:auth-refresh', onUnauthorized);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(refresh, 60_000);
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('swastik-auth') : null;
    if (channel) channel.onmessage = () => refresh();
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('swastik:auth-refresh', onUnauthorized);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
      channel?.close();
    };
  }, [refresh]);

  const broadcast = useCallback(() => {
    if (typeof BroadcastChannel !== 'function') return;
    const channel = new BroadcastChannel('swastik-auth');
    channel.postMessage({ changed: true });
    channel.close();
  }, []);

  const loginStaff = useCallback(async (mobile, password) => {
    const data = await jsonRequest('/api/auth/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, password }) });
    if (!data.user) throw new Error('The server did not return an authenticated staff identity.');
    authRevision.current += 1;
    setStaff(data.user);
    setStaffStatus('authenticated');
    setCustomer(null);
    setCustomerStatus('unauthenticated');
    broadcast();
    return data.user;
  }, [broadcast]);

  const loginCustomer = useCallback(async (phoneNumber, password) => {
    const data = await jsonRequest('/api/auth/customer/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber, password }) });
    if (!data.customer) throw new Error('The server did not return an authenticated customer identity.');
    authRevision.current += 1;
    setCustomer(data.customer);
    setCustomerStatus('authenticated');
    setStaff(null);
    setStaffStatus('unauthenticated');
    broadcast();
    return data.customer;
  }, [broadcast]);

  const acceptCustomerSession = useCallback(customerIdentity => {
    authRevision.current += 1;
    setCustomer(customerIdentity || null);
    setCustomerStatus(customerIdentity ? 'authenticated' : 'unauthenticated');
    if (customerIdentity) { setStaff(null); setStaffStatus('unauthenticated'); }
    broadcast();
  }, [broadcast]);

  const logoutStaff = useCallback(async () => {
    try { await jsonRequest('/api/auth/staff/logout', { method: 'POST' }); } finally {
      authRevision.current += 1;
      setStaff(null);
      setStaffStatus('unauthenticated');
      broadcast();
    }
  }, [broadcast]);

  const logoutCustomer = useCallback(async () => {
    try { await jsonRequest('/api/auth/customer/logout', { method: 'POST' }); } finally {
      authRevision.current += 1;
      setCustomer(null);
      setCustomerStatus('unauthenticated');
      broadcast();
    }
  }, [broadcast]);

  const value = useMemo(() => ({
    staff, customer, staffStatus, customerStatus, refresh, refreshStaff, refreshCustomer,
    loginStaff, loginCustomer, acceptCustomerSession, logoutStaff, logoutCustomer
  }), [staff, customer, staffStatus, customerStatus, refresh, refreshStaff, refreshCustomer, loginStaff, loginCustomer, acceptCustomerSession, logoutStaff, logoutCustomer]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
