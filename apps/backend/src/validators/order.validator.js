const { body, param, query } = require('express-validator');

const createOrderValidator = [
  body('restaurantId')
    .isMongoId()
    .withMessage('Valid restaurant ID is required'),
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('At least one item is required (max 50)'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1 and 50'),
  body('items.*.customizations')
    .optional()
    .isArray()
    .withMessage('Customizations must be an array'),
  body('items.*.customizations.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customization name is required'),
  body('items.*.customizations.*.selectedOptions')
    .optional()
    .isArray()
    .withMessage('Selected options must be an array'),
  body('items.*.customizations.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Customization price must be non-negative'),
  body('deliveryAddressId')
    .optional()
    .custom((value, { req }) => {
      if (typeof value === 'object') {
        if (!value.addressLine1 || !value.city || !value.state || !value.pincode) {
          throw new Error('Delivery address must have addressLine1, city, state, and pincode');
        }
      }
      return true;
    }),
  body('paymentMethod')
    .isIn(['cod', 'online'])
    .withMessage('Payment method must be cod or online'),
  body('couponCode')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Invalid coupon code'),
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Instructions must not exceed 500 characters'),
];

const orderIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
];

const cancelOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must not exceed 500 characters'),
];

const rateOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
  body('food')
    .isInt({ min: 1, max: 5 })
    .withMessage('Food rating must be between 1 and 5'),
  body('delivery')
    .isInt({ min: 1, max: 5 })
    .withMessage('Delivery rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must not exceed 500 characters'),
];

const updateStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
  body('status')
    .isIn(['confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note must not exceed 200 characters'),
];

const orderListValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  query('restaurantId')
    .optional()
    .isMongoId()
    .withMessage('Valid restaurant ID is required'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be 2-50 characters'),
];

const acceptOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
];

const rejectOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
];

const verifyPaymentValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),
  body('razorpayOrderId')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpayPaymentId')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpaySignature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
];

module.exports = {
  createOrderValidator,
  orderIdValidator,
  cancelOrderValidator,
  rateOrderValidator,
  updateStatusValidator,
  orderListValidator,
  acceptOrderValidator,
  rejectOrderValidator,
  verifyPaymentValidator,
};
