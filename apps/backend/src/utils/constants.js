const USER_ROLES = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  ADMIN: 'admin',
  DELIVERY_PARTNER: 'delivery_partner',
};

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  ON_WAY: 'on_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const PAYMENT_METHODS = {
  COD: 'cod',
  RAZORPAY: 'razorpay',
  WALLET: 'wallet',
};

const NOTIFICATION_TYPES = {
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

const RESTAURANT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

const PRODUCT_CATEGORIES = {
  MAIN_COURSE: 'main_course',
  STARTER: 'starter',
  DESSERT: 'dessert',
  BEVERAGE: 'beverage',
  SNACK: 'snack',
};

const SLOTS = {
  BREAKFAST: { start: '08:00', end: '11:00' },
  LUNCH: { start: '12:00', end: '15:00' },
  DINNER: { start: '19:00', end: '22:00' },
};

const HTTP_STATUS_CODES = {
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

module.exports = {
  USER_ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  NOTIFICATION_TYPES,
  RESTAURANT_STATUS,
  PRODUCT_CATEGORIES,
  SLOTS,
  HTTP_STATUS_CODES,
};
