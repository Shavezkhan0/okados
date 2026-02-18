const { body, param, query } = require('express-validator');

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  body('type')
    .isIn(['veg', 'non-veg', 'vegan'])
    .withMessage('Type must be veg, non-veg, or vegan'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price is required and must be a positive number'),
  body('discountedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discounted price must be a positive number'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('preparationTime')
    .optional()
    .isInt({ min: 1, max: 180 })
    .withMessage('Preparation time must be between 1 and 180 minutes'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isIn(['spicy', 'bestseller', 'new', 'recommended', 'popular', 'trending', 'signature', 'limited'])
    .withMessage('Invalid tag'),
  body('customizations')
    .optional()
    .isArray()
    .withMessage('Customizations must be an array'),
  body('customizations.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customization name is required'),
  body('customizations.*.required')
    .optional()
    .isBoolean()
    .withMessage('Required must be a boolean'),
  body('customizations.*.multiSelect')
    .optional()
    .isBoolean()
    .withMessage('multiSelect must be a boolean'),
  body('customizations.*.maxSelections')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max selections must be at least 1'),
  body('customizations.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  body('customizations.*.options.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Option name is required'),
  body('customizations.*.options.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Option price must be a non-negative number'),
  body('nutrition')
    .optional()
    .isObject()
    .withMessage('Nutrition must be an object'),
  body('nutrition.calories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Calories must be a non-negative number'),
  body('nutrition.protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein must be a non-negative number'),
  body('nutrition.carbs')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbs must be a non-negative number'),
  body('nutrition.fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat must be a non-negative number'),
];

const updateProductValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid product ID is required'),
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
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('type')
    .optional()
    .isIn(['veg', 'non-veg', 'vegan'])
    .withMessage('Type must be veg, non-veg, or vegan'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('discountedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discounted price must be a positive number'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('preparationTime')
    .optional()
    .isInt({ min: 1, max: 180 })
    .withMessage('Preparation time must be between 1 and 180 minutes'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isIn(['spicy', 'bestseller', 'new', 'recommended', 'popular', 'trending', 'signature', 'limited'])
    .withMessage('Invalid tag'),
  body('customizations')
    .optional()
    .isArray()
    .withMessage('Customizations must be an array'),
];

const productIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid product ID is required'),
];

const productListValidator = [
  query('restaurant')
    .optional()
    .isMongoId()
    .withMessage('Valid restaurant ID is required'),
  query('category')
    .optional()
    .trim(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('search')
    .optional()
    .trim(),
  query('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('type')
    .optional()
    .isIn(['veg', 'non-veg', 'vegan'])
    .withMessage('Type must be veg, non-veg, or vegan'),
];

const bulkUpdateValidator = [
  body('products')
    .isArray({ min: 1, max: 50 })
    .withMessage('Products must be an array with 1-50 items'),
  body('products.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('products.*.isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
];

const reorderValidator = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products array is required'),
  body('products.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('products.*.order')
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
];

const searchValidator = [
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

const calculatePriceValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('customizations')
    .optional()
    .isArray()
    .withMessage('Customizations must be an array'),
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  productListValidator,
  bulkUpdateValidator,
  reorderValidator,
  searchValidator,
  calculatePriceValidator,
};
