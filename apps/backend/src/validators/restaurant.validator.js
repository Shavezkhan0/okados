const { body, param, query } = require('express-validator');

const restaurantRegistrationValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Restaurant name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('logo')
    .notEmpty()
    .withMessage('Logo is required')
    .isURL()
    .withMessage('Logo must be a valid URL'),
  body('banner')
    .optional()
    .isURL()
    .withMessage('Banner must be a valid URL'),
  body('contact.phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('contact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('contact.whatsapp')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid WhatsApp number is required'),
  body('address.addressLine1')
    .trim()
    .notEmpty()
    .withMessage('Address line 1 is required'),
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required'),
  body('address.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('address.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('cuisines')
    .isArray({ min: 1 })
    .withMessage('At least one cuisine is required'),
  body('cuisines.*')
    .trim()
    .notEmpty()
    .withMessage('Cuisine name cannot be empty'),
  body('deliveryRadius')
    .optional()
    .isFloat({ min: 1, max: 25 })
    .withMessage('Delivery radius must be between 1 and 25 km'),
  body('timing.openTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid opening time format (use HH:MM)'),
  body('timing.closeTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid closing time format (use HH:MM)'),
  body('timing.workingDays')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  body('timing.workingDays.*')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Working days must be 0-6 (Sunday-Saturday)'),
  body('pricing.costForTwo')
    .isFloat({ min: 0 })
    .withMessage('Cost for two is required and must be a positive number'),
  body('pricing.deliveryFee')
    .isFloat({ min: 0 })
    .withMessage('Delivery fee is required and must be a positive number'),
  body('pricing.packagingFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Packaging fee must be a positive number'),
  body('documents.fssai')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('FSSAI number cannot be empty'),
  body('documents.gst')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('GST number cannot be empty'),
  body('documents.pan')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('PAN number cannot be empty'),
];

const restaurantUpdateValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('logo')
    .optional()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  body('banner')
    .optional()
    .isURL()
    .withMessage('Banner must be a valid URL'),
  body('contact.phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('contact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('contact.whatsapp')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid WhatsApp number is required'),
  body('address.addressLine1')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address line 1 cannot be empty'),
  body('address.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty'),
  body('address.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty'),
  body('address.pincode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Pincode cannot be empty'),
  body('address.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('address.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('cuisines')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one cuisine is required'),
  body('cuisines.*')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Cuisine name cannot be empty'),
  body('deliveryRadius')
    .optional()
    .isFloat({ min: 1, max: 25 })
    .withMessage('Delivery radius must be between 1 and 25 km'),
  body('timing.openTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid opening time format (use HH:MM)'),
  body('timing.closeTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid closing time format (use HH:MM)'),
  body('timing.workingDays')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  body('timing.workingDays.*')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Working days must be 0-6 (Sunday-Saturday)'),
  body('pricing.costForTwo')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost for two must be a positive number'),
  body('pricing.deliveryFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Delivery fee must be a positive number'),
  body('pricing.packagingFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Packaging fee must be a positive number'),
];

const restaurantListValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('cuisines')
    .optional()
    .trim(),
  query('sortBy')
    .optional()
    .isIn(['rating', 'distance', 'popularity', 'newest'])
    .withMessage('Invalid sortBy value'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('minRating must be between 0 and 5'),
  query('city')
    .optional()
    .trim(),
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
];

const nearbyRestaurantsValidator = [
  query('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  query('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 50 })
    .withMessage('Radius must be between 1 and 50 km'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

const bankDetailsValidator = [
  body('accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .matches(/^\d{9,18}$/)
    .withMessage('Valid account number is required (9-18 digits)'),
  body('ifscCode')
    .notEmpty()
    .withMessage('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Valid IFSC code is required'),
  body('accountHolderName')
    .trim()
    .notEmpty()
    .withMessage('Account holder name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name must be between 2 and 100 characters'),
  body('upiId')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/)
    .withMessage('Valid UPI ID is required'),
];

const searchRestaurantsValidator = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

module.exports = {
  restaurantRegistrationValidator,
  restaurantUpdateValidator,
  restaurantListValidator,
  nearbyRestaurantsValidator,
  bankDetailsValidator,
  searchRestaurantsValidator,
};
