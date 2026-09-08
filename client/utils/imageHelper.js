// Fast and resilient Product Image resolution utility with in-memory failure caching and thumbnail optimization

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=75&w=300';
export const GENERIC_PLACEHOLDER_KEY = 'photo-1542838132-92c53300491e';

// Global cache of failed image URLs so we never retry broken/404 links repeatedly
const failedUrlCache = new Set();

/**
 * Returns the configured base URL for images from environment variable VITE_IMAGE_BASE_URL.
 * Defaults to '/uploads' (serving public/uploads on the same server where the project runs).
 */
export function getImageBaseUrl() {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_IMAGE_BASE_URL : '';
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
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
    // If it's a generic placeholder unsplash, ignore
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
 * Resolves all candidate image URLs for a product based on its code, filename, and env base URL
 */
export function getCandidateImages(product, r2PublicUrl) {
  if (!product) return [];
  const candidates = [];
  const base = getImageBaseUrl();
  const raw = (product.imageUrl || product.image || '').trim();
  const cleanName = extractCleanImageName(raw);

  // 1. If a clean custom filename exists (e.g. "SP000001.webp" or "rice.jpg")
  if (cleanName) {
    const directUrl = `${base}/${cleanName}`;
    candidates.push(directUrl);
  }

  // 2. Resolve by product code (e.g. SP000001, SW-SW0001)
  const code = (product.code || product.Code || '').trim();
  if (code) {
    const candidateCodes = [code];
    if (code.toUpperCase().startsWith('SW-')) {
      candidateCodes.push(code.replace(/^SW-/i, ''));
    } else {
      candidateCodes.push(`SW-${code}`);
    }

    const basesToCheck = [base];
    if (r2PublicUrl && r2PublicUrl.replace(/\/$/, '') !== base) {
      basesToCheck.push(r2PublicUrl.replace(/\/$/, ''));
    }

    for (const b of basesToCheck) {
      for (const c of candidateCodes) {
        const variants = [c, `${c} `, `${c}_`];
        for (const v of variants) {
          const encoded = encodeURIComponent(v);
          candidates.push(`${b}/${encoded}.webp`);
          candidates.push(`${b}/${encoded}.jpg`);
          candidates.push(`${b}/${encoded}.jpeg`);
          candidates.push(`${b}/${encoded}.png`);
        }
      }
    }
  }

  return candidates;
}

export function resolveProductImage(product, r2PublicUrl, size = 300) {
  if (!product) return DEFAULT_PRODUCT_FALLBACK;

  // Check candidate keys using env base URL and code
  const candidates = getCandidateImages(product, r2PublicUrl);
  for (const candidate of candidates) {
    if (!failedUrlCache.has(candidate)) {
      return candidate;
    }
  }

  // Fallback if raw was a direct valid URL
  let raw = (product.imageUrl || product.image || '').trim();
  if (raw && !raw.includes(GENERIC_PLACEHOLDER_KEY) && !failedUrlCache.has(raw)) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    const resolved = resolveImageUrl(raw);
    if (resolved && !failedUrlCache.has(resolved)) {
      return resolved;
    }
  }

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


