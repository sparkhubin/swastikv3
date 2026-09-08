// Fast and resilient Product Image resolution utility with in-memory failure caching and thumbnail optimization

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=75&w=300';
export const GENERIC_PLACEHOLDER_KEY = 'photo-1542838132-92c53300491e';

// Global cache of failed image URLs so we never retry broken/404 links repeatedly
const failedUrlCache = new Set();
import { getBackendBaseUrl } from './capacitorHelper';

// Fast in-memory cache of already resolved product image URLs to avoid repeated URL computation
const resolvedImageCache = new Map();

/**
 * Returns the configured base URL for images from environment variable VITE_IMAGE_BASE_URL.
 * In a native Capacitor app, it prefixes the remote backend server URL so images load smoothly.
 * Defaults to '/uploads' (serving public/uploads on the same server where the project runs).
 */
export function getImageBaseUrl() {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_IMAGE_BASE_URL : '';
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const backend = getBackendBaseUrl();
  if (backend) {
    return `${backend}/uploads`;
  }
  return '/uploads';
}

/**
 * Extracts a clean relative filename or code from any image string
 * (e.g. "https://example.com/uploads/SP000001.jpg" -> "SP000001.jpg")
 */
export function extractCleanImageName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes(GENERIC_PLACEHOLDER_KEY)) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const parts = parsed.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && !last.includes(GENERIC_PLACEHOLDER_KEY)) {
        return decodeURIComponent(last);
      }
      return '';
    } catch {
      // Not a valid URL, treat as filename
    }
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed.replace(/^\/uploads\//, '');
  }

  return trimmed;
}

/**
 * Resolves any image URL (including relative paths and filenames) to a valid URL
 * using VITE_IMAGE_BASE_URL or API base URL.
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // If already absolute http/https
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes(GENERIC_PLACEHOLDER_KEY)) return '';
    return trimmed;
  }

  const base = getImageBaseUrl();
  const cleanName = extractCleanImageName(trimmed);
  if (!cleanName) return '';

  return `${base}/${cleanName}`;
}

/**
 * Checks whether a product has an actual assigned / custom product image
 */
export function hasCustomProductImage(product) {
  if (!product) return false;
  const raw = product.imageUrl || product.image || '';
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (failedUrlCache.has(trimmed)) return false;
  if (trimmed.includes(GENERIC_PLACEHOLDER_KEY)) return false;
  return true;
}

/**
 * Resolves candidate image URLs for a product
 */
export function getCandidateImages(product, r2PublicUrl) {
  if (!product) return [];
  const candidates = [];
  const base = getImageBaseUrl();
  const raw = (product.imageUrl || product.image || '').trim();
  const cleanName = extractCleanImageName(raw);

  // 1. If an exact assigned image path or filename exists, prioritize it directly
  if (cleanName) {
    if (cleanName.startsWith('http://') || cleanName.startsWith('https://')) {
      candidates.push(cleanName);
    } else {
      candidates.push(`${base}/${cleanName}`);
    }
    // If the image already has an extension, don't spam 20 speculative extensions
    if (/\.(webp|jpg|jpeg|png|gif|svg)$/i.test(cleanName)) {
      return candidates;
    }
  }

  // 2. Resolve by product code (e.g. SP000001, SW-SW0001)
  const code = (product.code || product.Code || '').trim();
  if (code) {
    const candidateCodes = [code];
    if (code.toUpperCase().startsWith('SW-')) {
      candidateCodes.push(code.replace(/^SW-/i, ''));
    }

    const basesToCheck = [base];
    if (r2PublicUrl && r2PublicUrl.replace(/\/$/, '') !== base) {
      basesToCheck.push(r2PublicUrl.replace(/\/$/, ''));
    }

    for (const b of basesToCheck) {
      for (const c of candidateCodes) {
        const encoded = encodeURIComponent(c);
        candidates.push(`${b}/${encoded}.webp`);
        candidates.push(`${b}/${encoded}.jpg`);
        candidates.push(`${b}/${encoded}.png`);
      }
    }
  }

  return candidates;
}

export function resolveProductImage(product, r2PublicUrl, size = 300) {
  if (!product) return DEFAULT_PRODUCT_FALLBACK;

  const cacheKey = `${product.id || ''}_${product.code || ''}_${product.imageUrl || product.image || ''}`;
  if (resolvedImageCache.has(cacheKey)) {
    const cached = resolvedImageCache.get(cacheKey);
    if (!failedUrlCache.has(cached)) {
      return cached;
    }
    resolvedImageCache.delete(cacheKey);
  }

  // Check direct raw URL first if absolute
  const raw = (product.imageUrl || product.image || '').trim();
  if (raw && !raw.includes(GENERIC_PLACEHOLDER_KEY) && !failedUrlCache.has(raw)) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      resolvedImageCache.set(cacheKey, raw);
      return raw;
    }
  }

  // Check candidate keys using env base URL and code
  const candidates = getCandidateImages(product, r2PublicUrl);
  for (const candidate of candidates) {
    if (!failedUrlCache.has(candidate)) {
      resolvedImageCache.set(cacheKey, candidate);
      return candidate;
    }
  }

  resolvedImageCache.set(cacheKey, DEFAULT_PRODUCT_FALLBACK);
  return DEFAULT_PRODUCT_FALLBACK;
}

/**
 * Gets the next fallback candidate if the current URL failed
 */
export function getNextCandidateImage(product, currentUrl, r2PublicUrl) {
  if (currentUrl) {
    failedUrlCache.add(currentUrl);
  }
  return resolveProductImage(product, r2PublicUrl);
}

/**
 * Handle image error and return fallback
 */
export function markImageFailed(url) {
  if (url && typeof url === 'string') {
    failedUrlCache.add(url);
  }
}


