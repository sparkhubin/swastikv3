/**
 * Utility functions to check whether an order is 1-hour locked post delivery.
 * Rule: Once delivered, after 1 hour (60 minutes / 3,600,000 ms), order details,
 * items, status, customer info, and staff assignment become PERMANENTLY LOCKED 
 * from both Admin and Staff sides.
 * ONLY payment details (COD clearance, cash settlement, payment status) can be updated.
 */

export const isOrder1HourLocked = (order) => {
  if (!order) return false;
  
  const st = (order.status || '').toLowerCase();
  const isDelivered = st === 'delivered' || st === 'completed';
  if (!isDelivered) return false;

  // Retrieve timestamp when order was marked delivered
  const deliveryTimestamp = order.deliveryDate || order.deliveredAt || order.completedAt;
  if (!deliveryTimestamp) {
    // If order is marked delivered without timestamp, default to locked for safety
    return true;
  }

  const deliveredMs = new Date(deliveryTimestamp).getTime();
  if (isNaN(deliveredMs)) return true;

  const ONE_HOUR_MS = 60 * 60 * 1000; // 3,600,000 milliseconds
  return (Date.now() - deliveredMs) >= ONE_HOUR_MS;
};

export const getLockTimeRemainingFormatted = (order) => {
  if (!order) return null;
  const st = (order.status || '').toLowerCase();
  const isDelivered = st === 'delivered' || st === 'completed';
  if (!isDelivered) return null;

  const deliveryTimestamp = order.deliveryDate || order.deliveredAt || order.completedAt;
  if (!deliveryTimestamp) return 'Locked';

  const deliveredMs = new Date(deliveryTimestamp).getTime();
  if (isNaN(deliveredMs)) return 'Locked';

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const elapsed = Date.now() - deliveredMs;
  const remainingMs = ONE_HOUR_MS - elapsed;

  if (remainingMs <= 0) return 'Locked';

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  return `${mins}m ${secs}s remaining`;
};
