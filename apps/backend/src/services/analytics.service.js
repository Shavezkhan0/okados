/**
 * Analytics Service
 * Handles analytics and reporting for Okados platform
 * @module services/analytics.service
 */

import Analytics from '../models/Analytics.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';

class AnalyticsService {
  async getOrderTrends(startDate, endDate, granularity = 'day') {
    const dateFormat = granularity === 'week' ? '%Y-W%V' : granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';

    return Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getRevenueTrends(startDate, endDate, granularity = 'day') {
    const dateFormat = granularity === 'week' ? '%Y-W%V' : granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';

    return Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$pricing.grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getUserGrowth(startDate, endDate) {
    const dateFormat = '%Y-%m-%d';

    return User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          users: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getRestaurantGrowth(startDate, endDate) {
    const dateFormat = '%Y-%m-%d';

    return Restaurant.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          restaurants: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getPopularCuisines(startDate, endDate) {
    return Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startDate, $lte: endDate } } },
      { $lookup: { from: 'restaurants', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $unwind: '$restaurant.cuisines' },
      {
        $group: {
          _id: '$restaurant.cuisines',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ]);
  }

  async getPeakHours(startDate, endDate) {
    return Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { orders: -1 } },
    ]);
  }

  async getAverageOrderValue(startDate, endDate) {
    const result = await Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, avgOrderValue: { $avg: '$pricing.grandTotal' } } },
    ]);
    return result[0]?.avgOrderValue || 0;
  }

  async getDeliveryTimes(startDate, endDate) {
    const result = await Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startDate, $lte: endDate }, actualDeliveryTime: { $exists: true } } },
      {
        $project: {
          deliveryTimeMinutes: {
            $divide: [{ $subtract: ['$actualDeliveryTime', '$createdAt'] }, 60000],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDeliveryTime: { $avg: '$deliveryTimeMinutes' },
          minDeliveryTime: { $min: '$deliveryTimeMinutes' },
          maxDeliveryTime: { $max: '$deliveryTimeMinutes' },
        },
      },
    ]);
    return result[0] || { avgDeliveryTime: 0, minDeliveryTime: 0, maxDeliveryTime: 0 };
  }

  async getDailyAnalytics(restaurantId, date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const matchStage = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
    if (restaurantId) matchStage.restaurantId = restaurantId;

    const orderStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue: { $sum: '$pricing.grandTotal' },
          averageOrderValue: { $avg: '$pricing.grandTotal' },
        },
      },
    ]);

    const userStats = await User.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, newUsers: { $sum: 1 } } },
    ]);

    return {
      date: startOfDay,
      orders: orderStats[0] || { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      users: userStats[0] || { newUsers: 0 },
    };
  }

  async getRangeAnalytics(restaurantId, startDate, endDate) {
    const matchStage = { createdAt: { $gte: startDate, $lte: endDate } };
    if (restaurantId) matchStage.restaurantId = restaurantId;

    const result = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue: { $sum: '$pricing.grandTotal' },
          averageOrderValue: { $avg: '$pricing.grandTotal' },
          totalDeliveryFee: { $sum: '$pricing.deliveryFee' },
          totalDiscount: { $sum: { $add: ['$pricing.discount', '$pricing.couponDiscount'] } },
        },
      },
    ]);

    return result[0] || { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, totalRevenue: 0, averageOrderValue: 0, totalDeliveryFee: 0, totalDiscount: 0 };
  }

  async getTopProducts(restaurantId, limit = 10) {
    return Order.aggregate([
      { $match: { restaurantId, status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: 1, totalQuantity: 1, totalRevenue: 1, image: '$product.image' } },
    ]);
  }

  async getRevenueByDay(restaurantId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage = { createdAt: { $gte: startDate }, status: 'delivered' };
    if (restaurantId) matchStage.restaurantId = restaurantId;

    return Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getDashboardSummary(restaurantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayStats = await this.getDailyAnalytics(restaurantId, new Date());
    const weekStats = await this.getRangeAnalytics(restaurantId, weekAgo, new Date());
    const allTimeStats = await this.getRangeAnalytics(restaurantId, new Date(0), new Date());

    return { today: todayStats, thisWeek: weekStats, allTime: allTimeStats };
  }

  async saveDailyAnalytics(restaurantId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const analytics = await this.getDailyAnalytics(restaurantId, today);

    return Analytics.findOneAndUpdate(
      { restaurant: restaurantId, date: today },
      { restaurant: restaurantId, date: today, orders: analytics.orders, revenue: { total: analytics.orders.totalRevenue }, users: analytics.users },
      { upsert: true, new: true }
    );
  }
}

export default new AnalyticsService();
