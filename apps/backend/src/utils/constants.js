export const USER_ROLES = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  ADMIN: 'admin',
  DELIVERY_PARTNER: 'delivery_partner',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  ON_WAY: 'on_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = {
  COD: 'cod',
  RAZORPAY: 'razorpay',
  WALLET: 'wallet',
};

export const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_PREPARING: 'order_preparing',
  ORDER_READY: 'order_ready',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PROMO_OFFER: 'promo_offer',
  GENERAL: 'general',
};

export const RESTAURANT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

export const PRODUCT_CATEGORIES = {
  MAIN_COURSE: 'main_course',
  STARTER: 'starter',
  DESSERT: 'dessert',
  BEVERAGE: 'beverage',
  SNACK: 'snack',
};

export const SLOTS = {
  BREAKFAST: { start: '08:00', end: '11:00' },
  LUNCH: { start: '12:00', end: '15:00' },
  DINNER: { start: '19:00', end: '22:00' },
};

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
