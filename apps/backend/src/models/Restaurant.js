/**
 * Restaurant Model
 * Represents restaurants in the Okados food delivery platform
 * @module models/Restaurant
 */

import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    required: [true, 'Contact phone is required'],
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
  },
  whatsapp: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid WhatsApp number'],
  },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere',
    },
  },
}, { _id: false });

const timingSchema = new mongoose.Schema({
  openTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    default: '09:00',
  },
  closeTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    default: '22:00',
  },
  workingDays: {
    type: [Number],
    validate: {
      validator: function (v) {
        return v.every(day => day >= 0 && day <= 6);
      },
      message: 'Working days must be numbers between 0-6 (Sunday-Saturday)',
    },
    default: [0, 1, 2, 3, 4, 5, 6],
  },
}, { _id: false });

const ratingSchema = new mongoose.Schema({
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
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  costForTwo: {
    type: Number,
    required: [true, 'Cost for two is required'],
    min: [0, 'Cost for two cannot be negative'],
  },
  deliveryFee: {
    type: Number,
    required: [true, 'Delivery fee is required'],
    min: [0, 'Delivery fee cannot be negative'],
  },
  packagingFee: {
    type: Number,
    default: 0,
    min: [0, 'Packaging fee cannot be negative'],
  },
}, { _id: false });

const commissionSchema = new mongoose.Schema({
  rate: {
    type: Number,
    default: 20,
    min: [0, 'Commission rate cannot be negative'],
    max: [50, 'Commission rate cannot exceed 50%'],
  },
  type: {
    type: String,
    enum: ['percentage', 'flat'],
    default: 'percentage',
  },
}, { _id: false });

const bankDetailsSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    trim: true,
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  accountHolderName: {
    type: String,
    trim: true,
  },
  upiId: {
    type: String,
    trim: true,
  },
}, { _id: false });

const documentsSchema = new mongoose.Schema({
  fssai: {
    type: String,
    trim: true,
  },
  gst: {
    type: String,
    trim: true,
  },
  pan: {
    type: String,
    trim: true,
  },
}, { _id: false });

const statsSchema = new mongoose.Schema({
  totalOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0,
  },
  cancelledOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const restaurantSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    minlength: [2, 'Restaurant name must be at least 2 characters'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  logo: {
    type: String,
    required: [true, 'Logo is required'],
  },
  banner: {
    type: String,
  },
  contact: {
    type: contactSchema,
    required: true,
  },
  address: {
    type: addressSchema,
    required: true,
  },
  cuisines: {
    type: [{
      type: String,
      trim: true,
    }],
    validate: [v => v.length > 0, 'At least one cuisine is required'],
    index: true,
  },
  deliveryRadius: {
    type: Number,
    default: 5,
    min: [1, 'Delivery radius must be at least 1 km'],
    max: [25, 'Delivery radius cannot exceed 25 km'],
  },
  timing: {
    type: timingSchema,
    default: () => ({}),
  },
  isOpen: {
    type: Boolean,
    default: false,
    index: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  rating: {
    type: ratingSchema,
    default: () => ({ average: 0, count: 0 }),
  },
  pricing: {
    type: pricingSchema,
    required: true,
  },
  commission: {
    type: commissionSchema,
    default: () => ({ rate: 20, type: 'percentage' }),
  },
  bankDetails: {
    type: bankDetailsSchema,
  },
  documents: {
    type: documentsSchema,
  },
  stats: {
    type: statsSchema,
    default: () => ({ totalOrders: 0, totalRevenue: 0, cancelledOrders: 0 }),
  },
}, {
  timestamps: true,
});

/**
 * Compound indexes for efficient queries
 */
restaurantSchema.index({ isApproved: 1, isActive: 1 });
restaurantSchema.index({ cuisines: 1 });
restaurantSchema.index({ 'rating.average': -1 });
restaurantSchema.index({ name: 'text', description: 'text' });

/**
 * Auto-generate slug from name before saving
 */
restaurantSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

/**
 * Virtual property for estimated delivery time
 * @param {number} distance - Distance in km
 * @returns {number} Estimated time in minutes
 */
restaurantSchema.virtual('estimatedDeliveryTime').get(function () {
  return Math.ceil(this.deliveryRadius * 5 + 15);
});

/**
 * Method to check if restaurant is currently open
 * @returns {boolean}
 */
restaurantSchema.methods.isCurrentlyOpen = function () {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  if (!this.isOpen || !this.isActive || !this.isApproved) {
    return false;
  }
  
  if (!this.timing.workingDays.includes(currentDay)) {
    return false;
  }
  
  const openTime = this.timing.openTime;
  const closeTime = this.timing.closeTime;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

/**
 * Method to update rating
 * @param {number} newRating - New rating value
 */
restaurantSchema.methods.updateRating = async function (newRating) {
  const currentCount = this.rating.count;
  const currentAverage = this.rating.average;
  
  const newCount = currentCount + 1;
  const newAverage = ((currentAverage * currentCount) + newRating) / newCount;
  
  this.rating.average = Math.round(newAverage * 10) / 10;
  this.rating.count = newCount;
  
  await this.save();
};

/**
 * Static method to find approved and active restaurants
 * @param {Object} options - Query options
 * @returns {Promise<Restaurant[]>}
 */
restaurantSchema.statics.findOpenRestaurants = function (options = {}) {
  return this.find({
    isApproved: true,
    isActive: true,
    isOpen: true,
    ...options,
  });
};

/**
 * Static method to find restaurants by cuisine
 * @param {string} cuisine - Cuisine type
 * @returns {Promise<Restaurant[]>}
 */
restaurantSchema.statics.findByCuisine = function (cuisine) {
  return this.find({
    cuisines: { $regex: new RegExp(cuisine, 'i') },
    isApproved: true,
    isActive: true,
  });
};

/**
 * Ensure virtuals are included in JSON
 */
restaurantSchema.set('toJSON', { virtuals: true });
restaurantSchema.set('toObject', { virtuals: true });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
