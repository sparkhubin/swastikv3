/**
 * Utility functions to check whether an order is permanently locked.
 * Rules:
 * 1. Once delivered/completed: permanently locked.
 * 2. Once cancelled: permanently locked (cannot be modified or re-dispatched).
 * The ONLY permitted action post-delivery is Admin marking cash received from delivery staff for COD.
 */

export const isOrderCancelled = (order) => {
  if (!order) return false;
  const st = (order.status || '').toLowerCase();
  return st === 'cancelled' || order.step === -1;
};

export const isOrder1HourLocked = (order) => {
  if (!order) return false;
  const st = (order.status || '').toLowerCase();
  const isDelivered = st === 'delivered' || st === 'completed';
  const isCancelled = st === 'cancelled' || order.step === -1;
  return isDelivered || isCancelled;
};

export const isOrderLocked = isOrder1HourLocked;

export const getLockTimeRemainingFormatted = (order) => {
  if (!order) return null;
  const st = (order.status || '').toLowerCase();
  if (st === 'cancelled' || order.step === -1) {
    return '🔒 Cancelled & Locked';
  }
  const isDelivered = st === 'delivered' || st === 'completed';
  if (!isDelivered) return null;

  return '🔒 Delivered & Locked';
};

