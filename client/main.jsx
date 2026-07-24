import {StrictMode, Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';

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

// Intercept fetch requests in local / Capacitor environments to route API calls to a live backend URL
const rawApiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;
if (rawApiUrl && (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://'))) {
  const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
  const originalFetch = window.fetch;
  const customFetch = function (input, init) {
    let url = input;
    if (typeof url === 'string' && url.startsWith('/api/')) {
      url = `${apiUrl}${url}`;
    } else if (url instanceof URL && url.pathname.startsWith('/api/')) {
      url = new URL(`${apiUrl}${url.pathname}${url.search}`);
    } else if (url && typeof url === 'object' && 'url' in url && typeof url.url === 'string' && url.url.startsWith('/api/')) {
      const newUrl = `${apiUrl}${url.url}`;
      url = new Request(newUrl, url);
    }
    return originalFetch(url, init);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
    });
  } catch (e) {
    try {
      window.fetch = customFetch;
    } catch (err) {
      console.warn("Could not intercept window.fetch globally:", err);
    }
  }
}

console.log("🚀 [Client main.jsx]: Top-level file execution started. If you see this, the Javascript bundle is downloading and parsing successfully!");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {(() => {
        console.log("✨ [Client main.jsx]: React tree is rendering inside StrictMode and ErrorBoundary");
        return <App />;
      })()}
    </ErrorBoundary>
  </StrictMode>,
);
