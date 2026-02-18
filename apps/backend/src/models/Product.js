/**
 * Product Model
 * Represents menu items/products in the Okados food delivery platform
 * @module models/Product
 */

const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Option name is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Option price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0,
  },
}, { _id: true });

const customizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customization name is required'],
    trim: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  multiSelect: {
    type: Boolean,
    default: false,
  },
  maxSelections: {
    type: Number,
    default: 1,
    min: 1,
  },
  options: [customizationOptionSchema],
}, { _id: true });

const nutritionSchema = new mongoose.Schema({
  calories: { type: Number, min: 0 },
  protein: { type: Number, min: 0 },
  carbs: { type: Number, min: 0 },
  fat: { type: Number, min: 0 },
}, { _id: false });

const productStatsSchema = new mongoose.Schema({
  totalOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
}, { _id: false });

const productSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    minlength: [2, 'Product name must be at least 2 characters'],
    trim: true,
  },
  slug: {
    type: String,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  image: {
    type: String,
    required: [true, 'Product image is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Fast Food', 'Pizza', 'Burgers', 'Chinese', 'Indian', 'Italian', 'Seafood', 'Salads', 'Soups', 'Breads', 'Rice', 'Other'],
    index: true,
  },
  type: {
    type: String,
    required: [true, 'Food type is required'],
    enum: ['veg', 'non-veg', 'vegan'],
    default: 'veg',
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  discountedPrice: {
    type: Number,
    min: [0, 'Discounted price cannot be negative'],
    validate: {
      validator: function (value) {
        return !value || value <= this.price;
      },
      message: 'Discounted price must be less than or equal to original price',
    },
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  preparationTime: {
    type: Number,
    default: 15,
    min: [1, 'Preparation time must be at least 1 minute'],
    max: [180, 'Preparation time cannot exceed 180 minutes'],
  },
  tags: [{
    type: String,
    enum: ['spicy', 'bestseller', 'new', 'recommended', 'popular', 'trending', 'signature', 'limited'],
  }],
  customizations: [customizationSchema],
  nutrition: nutritionSchema,
  stats: {
    type: productStatsSchema,
    default: () => ({ totalOrders: 0, rating: { average: 0, count: 0 } }),
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

/**
 * Compound indexes for efficient queries
 */
productSchema.index({ restaurantId: 1, isActive: 1, isAvailable: 1 });
productSchema.index({ category: 1 });
productSchema.index({ type: 1 });
productSchema.index({ restaurantId: 1, category: 1 });

/**
 * Text index for search
 */
productSchema.index({ name: 'text', description: 'text' });

/**
 * Auto-generate slug from name before saving
 */
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36);
  }
  next();
});

/**
 * Virtual property for final price (returns discounted price if available)
 * @returns {number} Final price to display
 */
productSchema.virtual('finalPrice').get(function () {
  return this.discountedPrice || this.price;
});

/**
 * Virtual property for discount percentage
 * @returns {number} Discount percentage
 */
productSchema.virtual('discountPercentage').get(function () {
  if (this.discountedPrice && this.discountedPrice < this.price) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

/**
 * Check if product has customizations
 * @returns {boolean}
 */
productSchema.virtual('hasCustomizations').get(function () {
  return this.customizations && this.customizations.length > 0;
});

/**
 * Method to increment order count
 */
productSchema.methods.incrementOrderCount = async function () {
  this.stats.totalOrders += 1;
  await this.save();
};

/**
 * Method to update rating
 * @param {number} newRating - New rating value (1-5)
 */
productSchema.methods.updateRating = async function (newRating) {
  const currentCount = this.stats.rating.count;
  const currentAverage = this.stats.rating.average;

  const newCount = currentCount + 1;
  const newAverage = ((currentAverage * currentCount) + newRating) / newCount;

  this.stats.rating.average = Math.round(newAverage * 10) / 10;
  this.stats.rating.count = newCount;

  await this.save();
};

/**
 * Static method to find available products by restaurant
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Product[]>}
 */
productSchema.statics.findAvailableByRestaurant = function (restaurantId) {
  return this.find({
    restaurantId,
    isActive: true,
    isAvailable: true,
  }).sort({ category: 1, name: 1 });
};

/**
 * Static method to find products by category
 * @param {string} restaurantId - Restaurant ID
 * @param {string} category - Category name
 * @returns {Promise<Product[]>}
 */
productSchema.statics.findByCategory = function (restaurantId, category) {
  return this.find({
    restaurantId,
    category,
    isActive: true,
    isAvailable: true,
  });
};

/**
 * Static method to find popular products
 * @param {string} restaurantId - Restaurant ID
 * @param {number} limit - Number of products
 * @returns {Promise<Product[]>}
 */
productSchema.statics.findPopular = function (restaurantId, limit = 10) {
  return this.find({
    restaurantId,
    isActive: true,
    isAvailable: true,
  })
    .sort({ 'stats.totalOrders': -1, 'stats.rating.average': -1 })
    .limit(limit);
};

/**
 * Static method to search products
 * @param {string} restaurantId - Restaurant ID
 * @param {string} searchQuery - Search query
 * @returns {Promise<Product[]>}
 */
productSchema.statics.search = function (restaurantId, searchQuery) {
  return this.find({
    restaurantId,
    isActive: true,
    isAvailable: true,
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } },
      { category: { $regex: searchQuery, $options: 'i' } },
    ],
  });
};

/**
 * Ensure virtuals are included in JSON
 */
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
