/**
 * Global Input Sanitization & Validation Utility
 * Enforces:
 * 1. Disallows special characters across all inputs (apart from valid email characters in email inputs).
 * 2. Limits word length (max 35 continuous characters without space) to prevent UI overflow/injection.
 * 3. Limits maximum length on text inputs.
 */

// Characters allowed in standard text: Unicode letters (English, Hindi, etc.), numbers, spaces, and safe punctuation (. , - _ ' " & ( ) / : ! ? #)
// Strictly forbids: < > { } [ ] $ ^ ~ \ | ` ; = *
const FORBIDDEN_TEXT_CHARS_REGEX = /[<>{}[\]$^~\\|`;=*]/g;

// Characters allowed in email: alphanumeric, @, ., _, -, +
const FORBIDDEN_EMAIL_CHARS_REGEX = /[^a-zA-Z0-9@._\-+]/g;

// Characters allowed in phone: numbers, spaces, +, -, ( )
const FORBIDDEN_PHONE_CHARS_REGEX = /[^0-9+\-\s()]/g;

export function sanitizeText(val, maxWordLength = 35, maxTotalLength = 200) {
  if (typeof val !== 'string') return val;

  // 1. Remove forbidden characters
  let clean = val.replace(FORBIDDEN_TEXT_CHARS_REGEX, '');

  // 2. Limit individual word lengths (prevent continuous strings longer than maxWordLength)
  const words = clean.split(/(\s+)/);
  const constrainedWords = words.map(w => {
    if (/^\s+$/.test(w)) return w;
    return w.length > maxWordLength ? w.slice(0, maxWordLength) : w;
  });
  clean = constrainedWords.join('');

  // 3. Limit total length
  if (maxTotalLength && clean.length > maxTotalLength) {
    clean = clean.slice(0, maxTotalLength);
  }

  return clean;
}

export function sanitizeEmail(val, maxTotalLength = 80) {
  if (typeof val !== 'string') return val;
  let clean = val.replace(FORBIDDEN_EMAIL_CHARS_REGEX, '');
  if (maxTotalLength && clean.length > maxTotalLength) {
    clean = clean.slice(0, maxTotalLength);
  }
  return clean;
}

export function sanitizePhone(val, maxTotalLength = 20) {
  if (typeof val !== 'string') return val;
  let clean = val.replace(FORBIDDEN_PHONE_CHARS_REGEX, '');
  if (maxTotalLength && clean.length > maxTotalLength) {
    clean = clean.slice(0, maxTotalLength);
  }
  return clean;
}

export function sanitizeInput(value, inputType = 'text', maxLength = null) {
  if (typeof value !== 'string') return value;
  if (inputType === 'email') {
    return sanitizeEmail(value, maxLength || 80);
  }
  if (inputType === 'tel' || inputType === 'phone') {
    return sanitizePhone(value, maxLength || 20);
  }
  return sanitizeText(value, 35, maxLength || 250);
}

/**
 * Initializes global input event listener to automatically sanitize every input
 * field and textarea across the app without manual bindings on every component.
 */
export function initGlobalInputValidation() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const handleInput = (e) => {
    const el = e.target;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;

    // Ignore sensitive or non-text input types
    const type = (el.type || 'text').toLowerCase();
    if (['password', 'file', 'checkbox', 'radio', 'color', 'range', 'hidden'].includes(type)) {
      return;
    }

    const currentVal = el.value;
    if (!currentVal) return;

    const maxLenAttr = el.getAttribute('maxlength');
    const customMax = maxLenAttr ? parseInt(maxLenAttr, 10) : (el.tagName === 'TEXTAREA' ? 500 : 120);

    const sanitized = sanitizeInput(currentVal, type, customMax);

    if (currentVal !== sanitized) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = sanitized;
      // Adjust cursor position if possible
      try {
        const diff = currentVal.length - sanitized.length;
        const newPos = Math.max(0, (start || 0) - diff);
        el.setSelectionRange(newPos, newPos);
      } catch (_) {}
    }
  };

  document.addEventListener('input', handleInput, true);
}
