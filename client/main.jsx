import {StrictMode, Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initGlobalInputValidation } from './utils/inputValidator';
import { initCapacitorBridge } from './utils/capacitorHelper';

initGlobalInputValidation();
initCapacitorBridge();

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          backgroundColor: '#1e1e2e',
          color: '#cdd6f4',
          fontFamily: 'monospace',
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ color: '#f38ba8', fontSize: '24px', margin: '0 0 16px 0' }}>
            ⚠️ React Rendering Error
          </h1>
          <p style={{ color: '#a6adc8', fontSize: '14px', lineHeight: '1.5' }}>
            A React component crashed during rendering. This is usually caused by reading property of undefined or null in state/context data.
          </p>
          <div style={{
            backgroundColor: '#11111b',
            border: '1px solid #313244',
            borderRadius: '8px',
            padding: '16px',
            margin: '20px 0',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            <strong>Error:</strong> <span style={{ color: '#f38ba8' }}>{this.state.error?.message}</span>
            {this.state.error?.stack && (
              <>
                <br /><br />
                <strong>Stack Trace:</strong>
                <br />
                <span style={{ color: '#bac2de', fontSize: '12px' }}>{this.state.error.stack}</span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button 
              onClick={() => {
                if (window.confirm('Reset application cache & local storage data to resolve potential state/data corruption?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              style={{
                backgroundColor: '#f38ba8',
                color: '#11111b',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reset Application Data (Clear local storage)
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#89b4fa',
                color: '#11111b',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Route API calls to the configured backend and attach the active staff session.
const rawApiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;
const apiUrl = rawApiUrl && (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://'))
  ? rawApiUrl.replace(/\/$/, '')
  : '';
const originalFetch = window.fetch.bind(window);
const customFetch = async function (input, init = {}) {
  let url = input;
  let isApiRequest = false;

  if (typeof url === 'string' && url.startsWith('/api/')) {
    isApiRequest = true;
    if (apiUrl) url = `${apiUrl}${url}`;
  } else if (url instanceof URL && url.pathname.startsWith('/api/')) {
    isApiRequest = true;
    if (apiUrl) url = new URL(`${apiUrl}${url.pathname}${url.search}`);
  } else if (url instanceof Request && new URL(url.url, window.location.origin).pathname.startsWith('/api/')) {
    isApiRequest = true;
    if (apiUrl && url.url.startsWith(window.location.origin)) {
      url = new Request(`${apiUrl}${new URL(url.url).pathname}${new URL(url.url).search}`, url);
    }
  }

  const headers = new Headers(init.headers || (url instanceof Request ? url.headers : undefined));
  const response = await originalFetch(url, { ...init, headers, credentials: isApiRequest ? 'include' : init.credentials });
  const requestPath = typeof url === 'string'
    ? new URL(url, window.location.origin).pathname
    : url instanceof URL
      ? url.pathname
      : new URL(url.url, window.location.origin).pathname;
  if (isApiRequest && (response.status === 401 || response.status === 403) && !requestPath.includes('/auth/staff/session') && !requestPath.includes('/auth/customer/session')) {
    window.dispatchEvent(new Event('swastik:auth-refresh'));
  }
  return response;
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    configurable: true,
    writable: true,
  });
} catch (e) {
  console.warn("Could not install the authenticated API fetch wrapper:", e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
