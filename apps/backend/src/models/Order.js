/**
 * Order Model
 * Represents orders in the Okados food delivery platform
 * @module models/Order
 */

const mongoose = require('mongoose');

const orderItemCustomizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  options: [{
    type: String,
  }],
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [50, 'Quantity cannot exceed 50'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  customizations: [orderItemCustomizationSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: true });

const deliveryAddressSchema = new mongoose.Schema({
  label: {
    type: String,
    default: 'Home',
  },
  addressLine1: {
    type: String,
    required: true,
  },
  addressLine2: {
    type: String,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
    },
  },
}, { _id: false });

const contactSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
  },
  alternatePhone: {
    type: String,
  },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['online', 'cod'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'processing'],
    default: 'pending',
    index: true,
  },
  transactionId: {
    type: String,
  },
  gatewayOrderId: {
    type: String,
  },
  gatewayPaymentId: {
    type: String,
  },
  gatewaySignature: {
    type: String,
  },
  paidAt: {
    type: Date,
  },
  failureReason: {
    type: String,
  },
}, { _id: false });

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const commissionSchema = new mongoose.Schema({
  rate: {
    type: Number,
    default: 15,
    min: 0,
    max: 100,
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const ratingSchema = new mongoose.Schema({
  food: {
    type: Number,
    min: 1,
    max: 5,
  },
  delivery: {
    type: Number,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    maxlength: 500,
  },
  ratedAt: {
    type: Date,
  },
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  itemsTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  packagingFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxes: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 5,
    min: 0,
    max: 28,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required'],
    index: true,
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: 'Order must contain at least one item',
    },
  },
  pricing: {
    type: pricingSchema,
    required: true,
  },
  deliveryAddress: {
    type: deliveryAddressSchema,
    required: true,
  },
  contact: {
    type: contactSchema,
    required: true,
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'],
    default: 'placed',
    index: true,
  },
  statusHistory: [statusHistorySchema],
  payment: {
    type: paymentSchema,
    required: true,
  },
  coupon: couponSchema,
  estimatedDeliveryTime: {
    type: Date,
  },
  actualDeliveryTime: {
    type: Date,
  },
  cancelReason: {
    type: String,
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'restaurant', 'admin', 'system'],
  },
  cancelledAt: {
    type: Date,
  },
  rating: ratingSchema,
  commission: commissionSchema,
  instructions: {
    type: String,
    maxlength: 500,
  },
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deliveredAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

/**
 * Compound indexes for efficient queries
 */
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'deliveryAddress.coordinates': '2dsphere' });

/**
 * Generate unique order number
 * Format: ORD + YYYYMMDD + sequence
 */
orderSchema.statics.generateOrderNumber = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  const lastOrder = await this.findOne({
    orderNumber: { $regex: `^ORD${datePrefix}` },
  }).sort({ orderNumber: -1 });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `ORD${datePrefix}${String(sequence).padStart(4, '0')}`;
};

/**
 * Pre-save hook to generate order number and calculate totals
 */
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    this.orderNumber = await this.constructor.generateOrderNumber();
  }

  if (!this.statusHistory || this.statusHistory.length === 0) {
    this.statusHistory = [{
      status: this.status,
      timestamp: new Date(),
      note: 'Order placed',
    }];
  }

  this.pricing.itemsTotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);

  const subtotal = this.pricing.itemsTotal - this.pricing.discount - this.pricing.couponDiscount;
  this.pricing.taxes = Math.round(subtotal * (this.pricing.taxRate / 100));
  this.pricing.grandTotal = (
    this.pricing.itemsTotal +
    this.pricing.deliveryFee +
    this.pricing.packagingFee +
    this.pricing.platformFee +
    this.pricing.taxes -
    this.pricing.discount -
    this.pricing.couponDiscount
  );

  if (this.pricing.grandTotal < 0) {
    this.pricing.grandTotal = 0;
  }

  const commissionRate = this.commission?.rate || 15;
  this.commission = {
    rate: commissionRate,
    amount: Math.round((this.pricing.itemsTotal * commissionRate) / 100),
  };

  next();
});

/**
 * Check if order can be cancelled
 * @returns {boolean}
 */
orderSchema.methods.canBeCancelled = function () {
  const cancellableStatuses = ['placed', 'confirmed'];
  return cancellableStatuses.includes(this.status);
};

/**
 * Check if order can be rated
 * @returns {boolean}
 */
orderSchema.methods.canBeRated = function () {
  return this.status === 'delivered' && !this.rating?.ratedAt;
};

/**
 * Method to cancel order
 * @param {string} reason - Cancellation reason
 * @param {string} cancelledBy - Who cancelled (user/restaurant/admin)
 */
orderSchema.methods.cancel = async function (reason, cancelledBy) {
  if (!this.canBeCancelled()) {
    throw new Error('Order cannot be cancelled at this stage');
  }

  this.status = 'cancelled';
  this.cancelReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();

  this.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: reason || 'Order cancelled',
  });

  if (this.payment.status === 'completed') {
    this.payment.status = 'refunded';
  }

  await this.save();
  return this;
};

/**
 * Method to update status
 * @param {string} newStatus - New order status
 * @param {string} note - Optional note
 * @param {string} updatedBy - Who updated
 */
orderSchema.methods.updateStatus = async function (newStatus, note, updatedBy) {
  const validTransitions = {
    placed: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['dispatched', 'cancelled'],
    dispatched: ['delivered'],
  };

  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note || `Status updated to ${newStatus}`,
    updatedBy,
  });

  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
    this.actualDeliveryTime = new Date();
    this.payment.status = 'completed';
    this.payment.paidAt = new Date();
  }

  await this.save();
  return this;
};

/**
 * Method to rate order
 * @param {number} foodRating - Food rating (1-5)
 * @param {number} deliveryRating - Delivery rating (1-5)
 * @param {string} comment - Optional comment
 */
orderSchema.methods.rate = async function (foodRating, deliveryRating, comment) {
  if (!this.canBeRated()) {
    throw new Error('Order cannot be rated');
  }

  this.rating = {
    food: foodRating,
    delivery: deliveryRating,
    comment,
    ratedAt: new Date(),
  };

  await this.save();
  return this;
};

/**
 * Static method to find active orders by user
 * @param {string} userId - User ID
 * @returns {Promise<Order[]>}
 */
orderSchema.statics.findActiveByUser = function (userId) {
  return this.find({
    userId,
    status: { $nin: ['delivered', 'cancelled'] },
  })
    .populate('restaurantId', 'name logo')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find orders by restaurant
 * @param {string} restaurantId - Restaurant ID
 * @param {object} filters - Additional filters
 * @returns {Promise<Order[]>}
 */
orderSchema.statics.findByRestaurant = function (restaurantId, filters = {}) {
  return this.find({
    restaurantId,
    ...filters,
  })
    .populate('userId', 'name phone')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find today's orders
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Order[]>}
 */
orderSchema.statics.findTodayOrders = function (restaurantId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    restaurantId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ createdAt: -1 });
};

/**
 * Static method to get order statistics
 * @param {string} restaurantId - Restaurant ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<object>}
 */
orderSchema.statics.getStats = async function (restaurantId, startDate, endDate) {
  const matchStage = {
    restaurantId: mongoose.Types.ObjectId(restaurantId),
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: { $sum: '$pricing.grandTotal' },
        totalDiscount: { $sum: { $add: ['$pricing.discount', '$pricing.couponDiscount'] } },
        averageOrderValue: { $avg: '$pricing.grandTotal' },
      },
    },
  ]);

  return result[0] || {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    totalDiscount: 0,
    averageOrderValue: 0,
  };
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
