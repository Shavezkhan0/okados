/**
 * Coupon Model
 * Represents discount coupons/promocodes in the Okados platform
 * @module models/Coupon
 */

import mongoose from 'mongoose';
import Order from './Order.js';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [4, 'Coupon code must be at least 4 characters'],
    maxlength: [20, 'Coupon code cannot exceed 20 characters'],
  },
  description: {
    type: String,
    required: [true, 'Coupon description is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['percentage', 'flat'],
    required: [true, 'Coupon type is required'],
  },
  value: {
    type: Number,
    required: [true, 'Coupon value is required'],
    min: [0, 'Coupon value cannot be negative'],
  },
  minOrderValue: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order value cannot be negative'],
  },
  maxDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative'],
  },
  applicableOn: {
    type: String,
    enum: ['all', 'restaurant', 'category'],
    default: 'all',
  },
  applicableIds: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
  },
  validTill: {
    type: Date,
    required: [true, 'Valid till date is required'],
  },
  usageLimit: {
    type: Number,
    required: [true, 'Usage limit is required'],
    min: [1, 'Usage limit must be at least 1'],
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  perUserLimit: {
    type: Number,
    default: 1,
    min: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

/**
 * Indexes
 */
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, validFrom: 1, validTill: 1 });

/**
 * Check if coupon is currently valid
 * @returns {boolean}
 */
couponSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validTill &&
    this.usageCount < this.usageLimit
  );
};

/**
 * Check if coupon can be used by a specific user
 * @param {string} userId - User ID
 * @returns {object} Result with valid flag and message
 */
couponSchema.methods.canBeUsed = async function (userId) {
  if (!this.isValid()) {
    return { valid: false, message: 'Coupon is not valid or has expired' };
  }

  const userUsageCount = await Order.countDocuments({
    'coupon.code': this.code,
    userId: userId,
  });

  if (userUsageCount >= this.perUserLimit) {
    return { valid: false, message: `You have already used this coupon ${this.perUserLimit} time(s)` };
  }

  return { valid: true, message: 'Coupon is valid' };
};

/**
 * Calculate discount for given order amount
 * @param {number} orderAmount - Order subtotal
 * @returns {number} Discount amount
 */
couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (!this.isValid()) {
    return 0;
  }

  if (orderAmount < this.minOrderValue) {
    return 0;
  }

  let discount = 0;

  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = this.value;
  }

  return Math.round(discount);
};

/**
 * Increment usage count
 */
couponSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  await this.save();
};

/**
 * Validate coupon for an order
 * @param {number} orderAmount - Order amount
 * @param {string} restaurantId - Restaurant ID
 * @param {string} category - Product category
 * @returns {object} Validation result
 */
couponSchema.methods.validateForOrder = function (orderAmount, restaurantId, category) {
  if (!this.isValid()) {
    return { valid: false, message: 'Coupon is not valid or has expired' };
  }

  if (orderAmount < this.minOrderValue) {
    return { valid: false, message: `Minimum order value of ₹${this.minOrderValue} required` };
  }

  if (this.applicableOn === 'restaurant' && this.applicableIds.length > 0) {
    const isApplicable = this.applicableIds.some(
      id => id.toString() === restaurantId.toString()
    );
    if (!isApplicable) {
      return { valid: false, message: 'Coupon not valid for this restaurant' };
    }
  }

  if (this.applicableOn === 'category' && this.applicableIds.length > 0) {
    const isApplicable = this.applicableIds.includes(category);
    if (!isApplicable) {
      return { valid: false, message: 'Coupon not valid for this category' };
    }
  }

  return { valid: true };
};

/**
 * Static method to find valid coupons
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Coupon[]>}
 */
couponSchema.statics.findValidCoupons = function (restaurantId) {
  const now = new Date();

  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validTill: { $gte: now },
    usageCount: { $lt: this.usageLimit },
    $or: [
      { applicableOn: 'all' },
      { applicableOn: 'restaurant', applicableIds: restaurantId },
    ],
  });
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
