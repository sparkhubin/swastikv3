/**
 * Utility functions to check whether an order is permanently locked post delivery.
 * Rule: Once delivered, order details, items, status, customer info, staff assignment,
 * and payment marking become PERMANENTLY LOCKED.
 * Status cannot be changed once delivered.
 * The ONLY permitted action post-delivery is Admin marking cash received from delivery staff for COD.
 */

export const isOrder1HourLocked = (order) => {
  if (!order) return false;
  const st = (order.status || '').toLowerCase();
  const isDelivered = st === 'delivered' || st === 'completed';
  return isDelivered;
};

export const isOrderLocked = isOrder1HourLocked;

export const getLockTimeRemainingFormatted = (order) => {
  if (!order) return null;
  const st = (order.status || '').toLowerCase();
  const isDelivered = st === 'delivered' || st === 'completed';
  if (!isDelivered) return null;

  return '🔒 Permanently Locked';
};

