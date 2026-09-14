import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

  const refreshStaff = useCallback(async () => {
    try {
      const data = await jsonRequest('/api/auth/staff/session');
      setStaff(data.user || null);
      setStaffStatus(data.user ? 'authenticated' : 'unauthenticated');
      return data.user || null;
    } catch {
      setStaff(null);
      setStaffStatus('unauthenticated');
      return null;
    }
  }, []);

  const refreshCustomer = useCallback(async () => {
    try {
      const data = await jsonRequest('/api/auth/customer/session');
      setCustomer(data.customer || null);
      setCustomerStatus(data.customer ? 'authenticated' : 'unauthenticated');
      return data.customer || null;
    } catch {
      setCustomer(null);
      setCustomerStatus('unauthenticated');
      return null;
    }
  }, []);

  const refresh = useCallback(() => Promise.all([refreshStaff(), refreshCustomer()]), [refreshCustomer, refreshStaff]);

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
    setStaff(data.user);
    setStaffStatus('authenticated');
    setCustomer(null);
    setCustomerStatus('unauthenticated');
    broadcast();
    return data.user;
  }, [broadcast]);

  const loginCustomer = useCallback(async (phoneNumber, password) => {
    const data = await jsonRequest('/api/auth/customer/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber, password }) });
    setCustomer(data.customer);
    setCustomerStatus('authenticated');
    setStaff(null);
    setStaffStatus('unauthenticated');
    broadcast();
    return data.customer;
  }, [broadcast]);

  const acceptCustomerSession = useCallback(customerIdentity => {
    setCustomer(customerIdentity || null);
    setCustomerStatus(customerIdentity ? 'authenticated' : 'unauthenticated');
    if (customerIdentity) { setStaff(null); setStaffStatus('unauthenticated'); }
    broadcast();
  }, [broadcast]);

  const logoutStaff = useCallback(async () => {
    try { await jsonRequest('/api/auth/staff/logout', { method: 'POST' }); } finally {
      setStaff(null);
      setStaffStatus('unauthenticated');
      broadcast();
    }
  }, [broadcast]);

  const logoutCustomer = useCallback(async () => {
    try { await jsonRequest('/api/auth/customer/logout', { method: 'POST' }); } finally {
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
