import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Checks if running inside native Capacitor (Android/iOS)
 */
export function isNativePlatform() {
  if (typeof window === 'undefined') return false;
  return (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  );
}

/**
 * Resolves the backend base URL for API & media calls.
 * In a native app, relative paths like '/api/products' fail because origin is 'https://localhost'.
 * This returns the configured live server domain.
 */
export function getBackendBaseUrl() {
  if (typeof window === 'undefined') return '';

  // 1. Explicit environment variable (e.g. VITE_API_URL or VITE_BACKEND_URL)
  const envUrl = 
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)) || '';
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Backend routing is build-time configuration; browser storage must never redirect credentials.
  return '';
}

/**
 * Initializes native Capacitor bridge, Android hardware back-button, status bar, and fetch interceptor
 */
export function initCapacitorBridge() {
  if (typeof window === 'undefined') return;

  const backendUrl = getBackendBaseUrl();

  // 1. Global Fetch Interceptor for Native App requests
  // Automatically transforms relative '/api/*' or '/uploads/*' calls to point to the live server
  if (backendUrl) {
    const originalFetch = window.fetch;
    window.fetch = function (resource, init) {
      let finalUrl = resource;
      if (typeof resource === 'string') {
        if (resource.startsWith('/api/') || resource.startsWith('/uploads/')) {
          finalUrl = `${backendUrl}${resource}`;
        }
      } else if (resource instanceof Request) {
        const url = resource.url;
        if (url.startsWith('/') && (url.startsWith('/api/') || url.startsWith('/uploads/'))) {
          finalUrl = new Request(`${backendUrl}${url}`, resource);
        }
      }
      return originalFetch.call(this, finalUrl, init);
    };
  }

  // 2. Android Hardware Back Button Handling
  if (Capacitor.isNativePlatform()) {
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        // Close open modals / dialogs first if any are active
        const openModalCloseBtn = document.querySelector('[data-modal-close="true"], .modal-close-btn');
        if (openModalCloseBtn) {
          openModalCloseBtn.click();
          return;
        }

        // Navigate back in history if possible
        if (window.location.pathname !== '/' && window.location.hash !== '' && window.location.hash !== '#/') {
          window.history.back();
        } else if (canGoBack) {
          window.history.back();
        } else {
          // At root page, prompt or exit app
          App.exitApp();
        }
      });
    } catch (err) {
      console.warn('Capacitor backButton listener notice:', err.message);
    }

    // 3. Status Bar Styling (Theme: Emerald green)
    try {
      StatusBar.setBackgroundColor({ color: '#059669' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Native GPS Geolocation with auto fallback to Web navigator.geolocation
 */
export async function getCurrentGpsPosition() {
  // If native Capacitor app, prefer native plugin for reliable Android GPS permissions
  if (isNativePlatform()) {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') {
          throw new Error('Location permission denied by user');
        }
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
    } catch (err) {
      console.warn('Native GPS fetch notice, trying web fallback:', err.message);
    }
  }

  // Web Browser Fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation not supported on this device'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}
