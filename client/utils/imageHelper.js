// Fast and resilient Product Image resolution utility with in-memory failure caching and thumbnail optimization

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=75&w=300';
export const GENERIC_PLACEHOLDER_KEY = 'photo-1542838132-92c53300491e';

// Global cache of failed image URLs so we never retry broken/404 links repeatedly
const failedUrlCache = new Set();

/**
 * Resolves any image URL (including relative /uploads/ paths) to a valid absolute URL
 * when frontend and backend run on different domains or ports.
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/uploads/')) {
    const rawApiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : '';
    if (rawApiUrl && (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://'))) {
      const cleanBase = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
      return `${cleanBase}${trimmed}`;
    }
  }
  return trimmed;
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
  // If it is the default generic unsplash fallback image, consider it as no custom image
  if (trimmed.includes(GENERIC_PLACEHOLDER_KEY)) return false;
  return true;
}

/**
 * Resolves the fastest, optimized image URL for a product
 */
export function resolveProductImage(product, r2PublicUrl, size = 300) {
  if (!product) return DEFAULT_PRODUCT_FALLBACK;

  let raw = (product.imageUrl || product.image || '').trim();

  // If a valid custom image URL is present and not failed
  // If raw is the generic Unsplash placeholder, we first attempt to resolve from R2 using product code
  const isGenericPlaceholder = !raw || raw.includes(GENERIC_PLACEHOLDER_KEY);

  if (raw && !isGenericPlaceholder && !failedUrlCache.has(raw)) {
    // Automatically resolve relative /uploads/ path if frontend is on a separate server
    if (raw.startsWith('/uploads/')) {
      raw = resolveImageUrl(raw);
    }
    if (raw.includes('images.unsplash.com') && !raw.includes('w=')) {
      return `${raw}&auto=format&fit=crop&q=75&w=${size}`;
    }
    return raw;
  }

  // If code and R2 public URL exist, check if R2 URL hasn't failed yet
  const code = (product.code || product.Code || '').trim();
  if (code && r2PublicUrl) {
    const cleanR2Base = r2PublicUrl.replace(/\/$/, '');
    
    // Check candidate keys: direct code, code without SW- prefix, etc.
    const candidateCodes = [code];
    if (code.startsWith('SW-')) {
      candidateCodes.push(code.replace(/^SW-/, '')); // e.g. SW-SW0038 -> SW0038
    }

    for (const c of candidateCodes) {
      const r2Png = `${cleanR2Base}/${c}.png`;
      if (!failedUrlCache.has(r2Png)) {
        return r2Png;
      }
      const r2Jpg = `${cleanR2Base}/${c}.jpg`;
      if (!failedUrlCache.has(r2Jpg)) {
        return r2Jpg;
      }
      const r2Webp = `${cleanR2Base}/${c}.webp`;
      if (!failedUrlCache.has(r2Webp)) {
        return r2Webp;
      }
    }
  }

  // If raw was a valid non-failed URL (even fallback unsplash), return it before DEFAULT
  if (raw && !failedUrlCache.has(raw)) {
    return raw;
  }

  return DEFAULT_PRODUCT_FALLBACK;
}

/**
 * Handle image error and return fallback
 */
export function markImageFailed(url) {
  if (url && typeof url === 'string') {
    failedUrlCache.add(url);
  }
}

