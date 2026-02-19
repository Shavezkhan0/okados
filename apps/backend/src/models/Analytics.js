/**
 * Analytics Model
 * Time-series analytics data for Okados platform
 * @module models/Analytics
 */

import mongoose from 'mongoose';

const ordersMetricsSchema = new mongoose.Schema({
  total: {
    type: Number,
    default: 0,
    min: 0,
  },
  completed: {
    type: Number,
    default: 0,
    min: 0,
  },
  cancelled: {
    type: Number,
    default: 0,
    min: 0,
  },
  value: {
    type: Number,
    default: 0,
    min: 0,
  },
  averageValue: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const revenueMetricsSchema = new mongoose.Schema({
  gross: {
    type: Number,
    default: 0,
    min: 0,
  },
  commission: {
    type: Number,
    default: 0,
    min: 0,
  },
  net: {
    type: Number,
    default: 0,
    min: 0,
  },
  refunds: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const usersMetricsSchema = new mongoose.Schema({
  new: {
    type: Number,
    default: 0,
    min: 0,
  },
  active: {
    type: Number,
    default: 0,
    min: 0,
  },
  returning: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['order', 'revenue', 'user', 'restaurant', 'product', 'delivery'],
    required: [true, 'Analytics type is required'],
    index: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  metrics: {
    orders: {
      type: ordersMetricsSchema,
      default: () => ({}),
    },
    revenue: {
      type: revenueMetricsSchema,
      default: () => ({}),
    },
    users: {
      type: usersMetricsSchema,
      default: () => ({}),
    },
    delivery: {
      averageTime: { type: Number, default: 0 },
      onTimePercentage: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
    },
  },
  breakdown: {
    byHour: [{
      hour: Number,
      orders: Number,
      revenue: Number,
    }],
    byPaymentMethod: [{
      method: String,
      count: Number,
      amount: Number,
    }],
    byCategory: [{
      category: String,
      orders: Number,
      revenue: Number,
    }],
  },
}, {
  timestamps: true,
});

/**
 * Compound indexes
 */
analyticsSchema.index({ type: 1, date: -1 });
analyticsSchema.index({ restaurantId: 1, date: -1 });
analyticsSchema.index({ type: 1, restaurantId: 1, date: -1 });

/**
 * Static method to get analytics for date range
 * @param {string} type - Analytics type
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} restaurantId - Restaurant ID (optional)
 * @returns {Promise<Analytics[]>}
 */
analyticsSchema.statics.getAnalytics = function (type, startDate, endDate, restaurantId) {
  const query = {
    type,
    date: { $gte: startDate, $lte: endDate },
  };

  if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  return this.find(query).sort({ date: 1 });
};

/**
 * Static method to get daily analytics
 * @param {string} type - Analytics type
 * @param {Date} date - Date
 * @param {string} restaurantId - Restaurant ID (optional)
 * @returns {Promise<Analytics>}
 */
analyticsSchema.statics.getDailyAnalytics = function (type, date, restaurantId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    type,
    date: { $gte: startOfDay, $lte: endOfDay },
  };

  if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  return this.findOne(query);
};

/**
 * Static method to create or update daily analytics
 * @param {string} type - Analytics type
 * @param {Date} date - Date
 * @param {string} restaurantId - Restaurant ID (optional)
 * @param {object} metrics - Metrics to update
 * @returns {Promise<Analytics>}
 */
analyticsSchema.statics.updateDailyAnalytics = async function (type, date, restaurantId, metrics) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  return this.findOneAndUpdate(
    {
      type,
      date: startOfDay,
      restaurantId: restaurantId || null,
    },
    {
      $inc: metrics,
    },
    { upsert: true, new: true }
  );
};

/**
 * Static method to aggregate metrics for date range
 * @param {string} type - Analytics type
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} restaurantId - Restaurant ID (optional)
 * @returns {Promise<object>}
 */
analyticsSchema.statics.aggregateMetrics = function (type, startDate, endDate, restaurantId) {
  const matchStage = {
    type,
    date: { $gte: startDate, $lte: endDate },
  };

  if (restaurantId) {
    matchStage.restaurantId = restaurantId;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: '$metrics.orders.total' },
        completedOrders: { $sum: '$metrics.orders.completed' },
        cancelledOrders: { $sum: '$metrics.orders.cancelled' },
        totalRevenue: { $sum: '$metrics.revenue.gross' },
        totalCommission: { $sum: '$metrics.revenue.commission' },
        netRevenue: { $sum: '$metrics.revenue.net' },
        newUsers: { $sum: '$metrics.users.new' },
        activeUsers: { $sum: '$metrics.users.active' },
        averageOrderValue: { $avg: '$metrics.orders.averageValue' },
      },
    },
  ]);
};

/**
 * Static method to get hourly breakdown for a day
 * @param {Date} date - Date
 * @param {string} restaurantId - Restaurant ID (optional)
 * @returns {Promise<object[]>}
 */
analyticsSchema.statics.getHourlyBreakdown = function (date, restaurantId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    date: { $gte: startOfDay, $lte: endOfDay },
  };

  if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  return this.find(query).sort({ date: 1 });
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
