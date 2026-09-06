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
export function getCandidateImages(product, r2PublicUrl) {
  if (!product) return [];
  const candidates = [];
  const raw = (product.imageUrl || product.image || '').trim();
  const isGenericPlaceholder = !raw || raw.includes(GENERIC_PLACEHOLDER_KEY);

  // If a non-placeholder custom URL exists
  if (raw && !isGenericPlaceholder) {
    let resolved = raw;
    if (raw.startsWith('/uploads/')) {
      resolved = resolveImageUrl(raw);
    }
    candidates.push(resolved);
  }

  // If code and R2 public URL exist, add format candidates prioritizing .webp
  const code = (product.code || product.Code || '').trim();
  if (code && r2PublicUrl) {
    const cleanR2Base = r2PublicUrl.replace(/\/$/, '');
    const candidateCodes = [code];
    if (code.toUpperCase().startsWith('SW-')) {
      candidateCodes.push(code.replace(/^SW-/i, ''));
    } else {
      candidateCodes.push(`SW-${code}`);
    }

    for (const c of candidateCodes) {
      // Cloudflare R2 images are overwhelmingly .webp (1000+ files)
      const variants = [c, `${c} `, `${c}_`, `${c} (2)`];
      for (const v of variants) {
        const encoded = encodeURIComponent(v);
        candidates.push(`${cleanR2Base}/${encoded}.webp`);
        candidates.push(`${cleanR2Base}/${encoded}.jpeg`);
        candidates.push(`${cleanR2Base}/${encoded}.jpg`);
        candidates.push(`${cleanR2Base}/${encoded}.png`);
      }
    }
  }

  return candidates;
}

export function resolveProductImage(product, r2PublicUrl, size = 300) {
  if (!product) return DEFAULT_PRODUCT_FALLBACK;

  let raw = (product.imageUrl || product.image || '').trim();

  // If product has a direct custom URL (e.g. Cloudflare R2, uploads, or custom link) and not placeholder
  const isGenericPlaceholder = !raw || raw.includes(GENERIC_PLACEHOLDER_KEY);

  if (raw && !isGenericPlaceholder && !failedUrlCache.has(raw)) {
    if (raw.startsWith('/uploads/')) {
      raw = resolveImageUrl(raw);
    }
    if (raw.includes('images.unsplash.com') && !raw.includes('w=')) {
      return `${raw}&auto=format&fit=crop&q=75&w=${size}`;
    }
    return raw;
  }

  // Check candidate keys from Cloudflare R2
  const candidates = getCandidateImages(product, r2PublicUrl);
  for (const candidate of candidates) {
    if (!failedUrlCache.has(candidate)) {
      return candidate;
    }
  }

  // If raw was a valid non-failed URL (even fallback unsplash), return it before DEFAULT
  if (raw && !failedUrlCache.has(raw)) {
    return raw;
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

