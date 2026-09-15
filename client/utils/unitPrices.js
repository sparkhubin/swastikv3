export function parseUnitPrices(value) {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = Object.fromEntries(
        value.split(',').map(part => {
          const separator = part.lastIndexOf(':');
          return separator < 1
            ? ['', NaN]
            : [part.slice(0, separator).trim(), Number(part.slice(separator + 1))];
        })
      );
    }
  }

  if (!value || Array.isArray(value) || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([unit, price]) => [String(unit).trim(), Number(price)])
      .filter(([unit, price]) => unit && Number.isFinite(price) && price >= 0)
  );
}

export function serializeUnitPrices(value) {
  return JSON.stringify(parseUnitPrices(value));
}

export function getUnitPrice(product, selectedUnit) {
  const price = parseUnitPrices(product?.unitPrices)[String(selectedUnit || '').trim()];
  return Number.isFinite(price) ? price : Number(product?.price) || 0;
}