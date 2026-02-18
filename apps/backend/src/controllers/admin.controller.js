/**
 * Admin Controller
 * Handles all admin-related operations for the Okados platform
 * @module controllers/admin.controller
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analytics.service');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const { exportToCSV } = require('../utils/helpers');

const logger = {
  info: (message, meta = {}) => console.log(`[ADMIN] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[ADMIN ERROR] ${message}`, meta),
};

const ADMIN_ROLES = ['admin', 'super_admin'];

const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalUsers,
    restaurantCount,
    activeRestaurants,
    pendingRestaurants,
    totalOrders,
    todayOrders,
    todayRevenue,
    totalRevenue,
    ordersByStatus,
    recentOrders,
    topRestaurants,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ isApproved: true, isActive: true }),
    Restaurant.countDocuments({ isApproved: false }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } }
    ]),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } }
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.find()
      .populate('userId', 'name')
      .populate('restaurantId', 'name logo')
      .sort({ createdAt: -1 })
      .limit(10),
    Restaurant.find({ isApproved: true, isActive: true })
      .sort({ 'stats.totalRevenue': -1 })
      .limit(10)
      .select('name logo rating stats'),
  ]);

  const ordersStatusMap = ordersByStatus.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const dashboardData = {
    stats: {
      users: { total: totalUsers, customers: totalUsers },
      restaurants: { total: restaurantCount, active: activeRestaurants, pendingApproval: pendingRestaurants },
      orders: { total: totalOrders, today: todayOrders, byStatus: ordersStatusMap },
      revenue: { today: todayRevenue[0]?.total || 0, total: totalRevenue[0]?.total || 0 },
    },
    recentOrders,
    topRestaurants,
  };

  logger.info('Dashboard fetched', { adminId: req.user.id });
  ApiResponse.success(res, dashboardData);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, granularity = 'day' } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [orderTrends, revenueTrends, userGrowth, restaurantGrowth, popularCuisines, peakHours, averageOrderValue] = await Promise.all([
    analyticsService.getOrderTrends(start, end, granularity),
    analyticsService.getRevenueTrends(start, end, granularity),
    analyticsService.getUserGrowth(start, end),
    analyticsService.getRestaurantGrowth(start, end),
    analyticsService.getPopularCuisines(start, end),
    analyticsService.getPeakHours(start, end),
    analyticsService.getAverageOrderValue(start, end),
  ]);

  ApiResponse.success(res, {
    analytics: { orders: orderTrends, revenue: revenueTrends, users: userGrowth, restaurants: restaurantGrowth, popularCuisines, peakHours, averageOrderValue, period: { start, end, granularity } }
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, isActive, search, sort = '-createdAt' } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: new RegExp(search, 'i') } },
      { email: { $regex: new RegExp(search, 'i') } },
      { phone: { $regex: new RegExp(search, 'i') } },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query).select('-password -resetPasswordToken -resetPasswordExpiry -verification.otp').sort(sort).skip((page - 1) * limit).limit(parseInt(limit)),
  ]);

  ApiResponse.paginated(res, { users }, { page: parseInt(page), limit: parseInt(limit), total });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpiry');
  if (!user) return ApiResponse.notFound(res, 'User not found');

  const orderHistory = await Order.find({ userId: user._id }).populate('restaurantId', 'name logo').sort({ createdAt: -1 }).limit(20);
  ApiResponse.success(res, { user, orderHistory });
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, notificationPreferences, profile } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return ApiResponse.notFound(res, 'User not found');

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role && ADMIN_ROLES.includes(req.user.role)) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (notificationPreferences) user.notificationPreferences = notificationPreferences;
  if (profile) user.profile = { ...user.profile, ...profile };

  await user.save();
  logger.info('User updated', { adminId: req.user.id, userId: user._id });
  ApiResponse.success(res, { user }, 'User updated successfully');
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return ApiResponse.notFound(res, 'User not found');

  user.isActive = !user.isActive;
  await user.save();

  if (!user.isActive) {
    await Order.updateMany(
      { userId: user._id, status: { $in: ['placed', 'confirmed', 'preparing'] } },
      { status: 'cancelled', cancelReason: 'Account deactivated by admin', cancelledBy: 'admin', cancelledAt: new Date() }
    );
    await notificationService.sendToUser(user._id, { type: 'account', title: 'Account Deactivated', body: 'Your account has been deactivated by admin' });
  }

  logger.info('User status toggled', { adminId: req.user.id, userId: user._id, isActive: user.isActive });
  ApiResponse.success(res, { isActive: user.isActive }, `User is now ${user.isActive ? 'active' : 'deactivated'}`);
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return ApiResponse.notFound(res, 'User not found');

  user.email = `deleted_${user._id}@anonymized.local`;
  user.phone = `deleted_${user._id}`;
  user.name = 'Deleted User';
  user.profile = { addresses: [] };
  user.fcmTokens = [];
  user.isActive = false;
  user.isDeleted = true;
  await user.save();

  logger.info('User deleted (anonymized)', { adminId: req.user.id, userId: req.params.id });
  ApiResponse.success(res, {}, 'User deleted successfully');
});

const getAllRestaurants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isApproved, isActive, search, cuisines, sort = '-createdAt' } = req.query;
  const query = {};
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [{ name: { $regex: new RegExp(search, 'i') } }, { 'contact.phone': { $regex: new RegExp(search, 'i') } }];
  }
  if (cuisines) query.cuisines = { $in: cuisines.split(',') };

  const [total, restaurants, pendingCount] = await Promise.all([
    Restaurant.countDocuments(query),
    Restaurant.find(query).populate('ownerId', 'name email phone').sort(sort).skip((page - 1) * limit).limit(parseInt(limit)),
    Restaurant.countDocuments({ isApproved: false }),
  ]);

  ApiResponse.paginated(res, { restaurants, pendingApprovalCount: pendingCount }, { page: parseInt(page), limit: parseInt(limit), total });
});

const getPendingRestaurants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const query = { isApproved: false };
  const [total, restaurants] = await Promise.all([
    Restaurant.countDocuments(query),
    Restaurant.find(query).populate('ownerId', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
  ]);
  ApiResponse.paginated(res, { restaurants }, { page: parseInt(page), limit: parseInt(limit), total });
});

const approveRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id).populate('ownerId');
  if (!restaurant) return ApiResponse.notFound(res, 'Restaurant not found');

  restaurant.isApproved = true;
  restaurant.isActive = true;
  restaurant.isOpen = true;
  await restaurant.save();
  await emailService.sendRestaurantApprovalEmail(restaurant, true);

  logger.info('Restaurant approved', { adminId: req.user.id, restaurantId: restaurant._id });
  ApiResponse.success(res, { restaurant }, 'Restaurant approved successfully');
});

const rejectRestaurant = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) return ApiResponse.badRequest(res, 'Rejection reason is required');

  const restaurant = await Restaurant.findById(req.params.id).populate('ownerId');
  if (!restaurant) return ApiResponse.notFound(res, 'Restaurant not found');

  restaurant.isApproved = false;
  restaurant.isActive = false;
  restaurant.isOpen = false;
  restaurant.rejectionReason = reason;
  await restaurant.save();

  const html = `<h2>Restaurant Application Rejected</h2><p>Your restaurant "${restaurant.name}" application has been rejected.</p><p><strong>Reason:</strong> ${reason}</p>`;
  if (restaurant.ownerId?.email) await emailService.sendEmail(restaurant.ownerId.email, 'Restaurant Application Update', html);

  logger.info('Restaurant rejected', { adminId: req.user.id, restaurantId: restaurant._id, reason });
  ApiResponse.success(res, { restaurant }, 'Restaurant rejected');
});

const updateRestaurantCommission = asyncHandler(async (req, res) => {
  const { rate, type } = req.body;
  if (rate === undefined || !type) return ApiResponse.badRequest(res, 'Rate and type are required');

  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return ApiResponse.notFound(res, 'Restaurant not found');

  restaurant.commission = { rate, type };
  await restaurant.save();

  await notificationService.sendToUser(restaurant.ownerId, { type: 'commission', title: 'Commission Updated', body: `Your restaurant commission has been updated to ${rate}${type === 'percentage' ? '%' : '₹'}` });
  logger.info('Restaurant commission updated', { adminId: req.user.id, restaurantId: restaurant._id, rate, type });
  ApiResponse.success(res, { commission: restaurant.commission }, 'Commission updated successfully');
});

const toggleRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id).populate('ownerId');
  if (!restaurant) return ApiResponse.notFound(res, 'Restaurant not found');

  restaurant.isActive = !restaurant.isActive;
  if (!restaurant.isActive) {
    restaurant.isOpen = false;
    await Order.updateMany(
      { restaurantId: restaurant._id, status: { $in: ['placed', 'confirmed', 'preparing'] } },
      { status: 'cancelled', cancelReason: 'Restaurant deactivated by admin', cancelledBy: 'admin', cancelledAt: new Date() }
    );
  }
  await restaurant.save();

  await notificationService.sendToUser(restaurant.ownerId, { type: 'restaurant', title: restaurant.isActive ? 'Restaurant Activated' : 'Restaurant Deactivated', body: `Your restaurant "${restaurant.name}" has been ${restaurant.isActive ? 'activated' : 'deactivated'} by admin` });

  logger.info('Restaurant status toggled', { adminId: req.user.id, restaurantId: restaurant._id, isActive: restaurant.isActive });
  ApiResponse.success(res, { isActive: restaurant.isActive }, `Restaurant is now ${restaurant.isActive ? 'active' : 'deactivated'}`);
});

const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return ApiResponse.notFound(res, 'Restaurant not found');

  restaurant.isActive = false;
  restaurant.isDeleted = true;
  restaurant.name = `Deleted_${restaurant._id}_${restaurant.name}`;
  await restaurant.save();

  await notificationService.sendToUser(restaurant.ownerId, { type: 'restaurant', title: 'Restaurant Deleted', body: 'Your restaurant has been removed from the platform' });
  logger.info('Restaurant deleted', { adminId: req.user.id, restaurantId: restaurant._id });
  ApiResponse.success(res, {}, 'Restaurant deleted successfully');
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, restaurantId, userId, paymentStatus, startDate, endDate, sort = '-createdAt' } = req.query;
  const query = {};
  if (status) query.status = status;
  if (restaurantId) query.restaurantId = restaurantId;
  if (userId) query.userId = userId;
  if (paymentStatus) query['payment.status'] = paymentStatus;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query).populate('userId', 'name phone').populate('restaurantId', 'name logo').sort(sort).skip((page - 1) * limit).limit(parseInt(limit)),
  ]);

  ApiResponse.paginated(res, { orders }, { page: parseInt(page), limit: parseInt(limit), total });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name phone email profile.addresses')
    .populate('restaurantId', 'name logo contact address')
    .populate('items.productId', 'name image');

  if (!order) return ApiResponse.notFound(res, 'Order not found');
  ApiResponse.success(res, { order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!status) return ApiResponse.badRequest(res, 'Status is required');

  const order = await Order.findById(req.params.id).populate('userId').populate('restaurantId');
  if (!order) return ApiResponse.notFound(res, 'Order not found');

  const validStatuses = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return ApiResponse.badRequest(res, 'Invalid status');

  const oldStatus = order.status;
  order.status = status;
  order.statusHistory.push({ status, timestamp: new Date(), note: note || `Status updated by admin from ${oldStatus} to ${status}`, updatedBy: req.user.id });

  if (status === 'delivered') {
    order.deliveredAt = new Date();
    order.actualDeliveryTime = new Date();
    order.payment.status = 'completed';
    order.payment.paidAt = new Date();
  }
  if (status === 'cancelled' && order.payment.status === 'completed') order.payment.status = 'refunded';

  await order.save();
  await emailService.sendOrderStatusEmail(order, order.userId, status);

  logger.info('Order status updated', { adminId: req.user.id, orderId: order._id, status, oldStatus });
  ApiResponse.success(res, { order }, `Order status updated to ${status}`);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { reason, processRefund = false } = req.body;
  const order = await Order.findById(req.params.id).populate('userId').populate('restaurantId');
  if (!order) return ApiResponse.notFound(res, 'Order not found');
  if (['delivered', 'cancelled'].includes(order.status)) return ApiResponse.badRequest(res, 'Order cannot be cancelled');

  order.status = 'cancelled';
  order.cancelReason = reason || 'Cancelled by admin';
  order.cancelledBy = 'admin';
  order.cancelledAt = new Date();
  order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: reason || 'Order cancelled by admin', updatedBy: req.user.id });
  if (order.payment.status === 'completed') order.payment.status = processRefund ? 'refunded' : 'completed';

  await order.save();
  await emailService.sendOrderStatusEmail(order, order.userId, 'cancelled');

  logger.info('Order cancelled', { adminId: req.user.id, orderId: order._id, reason, processRefund });
  ApiResponse.success(res, { order }, 'Order cancelled successfully');
});

const getOrderStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const [totalStats, byStatus, byRestaurant, byPaymentMethod] = await Promise.all([
    Order.aggregate([{ $match: matchStage }, { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$pricing.grandTotal' }, averageOrderValue: { $avg: '$pricing.grandTotal' } } }]),
    Order.aggregate([{ $match: matchStage }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...matchStage, status: 'delivered' } },
      { $group: { _id: '$restaurantId', orderCount: { $sum: 1 }, revenue: { $sum: '$pricing.grandTotal' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $project: { _id: 1, name: '$restaurant.name', orderCount: 1, revenue: 1 } }
    ]),
    Order.aggregate([{ $match: matchStage }, { $group: { _id: '$payment.method', count: { $sum: 1 }, total: { $sum: '$pricing.grandTotal' } } }]),
  ]);

  const cancellationRate = totalStats[0]?.totalOrders ? ((byStatus.find(s => s._id === 'cancelled')?.count || 0) / totalStats[0].totalOrders * 100).toFixed(2) : 0;

  const statistics = {
    totalOrders: totalStats[0]?.totalOrders || 0,
    totalRevenue: totalStats[0]?.totalRevenue || 0,
    averageOrderValue: totalStats[0]?.averageOrderValue || 0,
    cancellationRate: parseFloat(cancellationRate),
    byStatus: byStatus.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
    topRestaurants: byRestaurant,
    byPaymentMethod: byPaymentMethod.reduce((acc, item) => { acc[item._id] = { count: item.count, total: item.total }; return acc; }, {}),
  };

  ApiResponse.success(res, { statistics });
});

const getAllCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive, type } = req.query;
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (type) query.type = type;

  const [total, coupons] = await Promise.all([
    Coupon.countDocuments(query),
    Coupon.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
  ]);
  ApiResponse.paginated(res, { coupons }, { page: parseInt(page), limit: parseInt(limit), total });
});

const createCoupon = asyncHandler(async (req, res) => {
  const { code, description, type, value, minOrderValue, maxDiscount, applicableOn, applicableIds, validFrom, validTill, usageLimit, perUserLimit } = req.body;

  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (existingCoupon) return ApiResponse.badRequest(res, 'Coupon code already exists');

  const coupon = await Coupon.create({
    code: code.toUpperCase(), description, type, value,
    minOrderValue: minOrderValue || 0, maxDiscount,
    applicableOn: applicableOn || 'all', applicableIds: applicableIds || [],
    validFrom, validTill, usageLimit, perUserLimit: perUserLimit || 1,
    isActive: true, createdBy: req.user.id,
  });

  logger.info('Coupon created', { adminId: req.user.id, couponId: coupon._id });
  ApiResponse.created(res, { coupon }, 'Coupon created successfully');
});

const updateCoupon = asyncHandler(async (req, res) => {
  const allowedUpdates = ['description', 'type', 'value', 'minOrderValue', 'maxDiscount', 'applicableOn', 'applicableIds', 'validFrom', 'validTill', 'usageLimit', 'perUserLimit'];
  const updates = {};
  allowedUpdates.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

  logger.info('Coupon updated', { adminId: req.user.id, couponId: coupon._id });
  ApiResponse.success(res, { coupon }, 'Coupon updated successfully');
});

const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  logger.info('Coupon status toggled', { adminId: req.user.id, couponId: coupon._id, isActive: coupon.isActive });
  ApiResponse.success(res, { isActive: coupon.isActive }, `Coupon is now ${coupon.isActive ? 'active' : 'inactive'}`);
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

  logger.info('Coupon deleted', { adminId: req.user.id, couponId: req.params.id });
  ApiResponse.success(res, {}, 'Coupon deleted successfully');
});

const getCouponUsage = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

  const usageByUser = await Order.aggregate([
    { match: { 'coupon.code': coupon.code } },
    { $group: { _id: '$userId', usageCount: { $sum: 1 }, totalDiscount: { $sum: '$coupon.discount' } } },
    { $sort: { usageCount: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 1, name: '$user.name', email: '$user.email', usageCount: 1, totalDiscount: 1 } }
  ]);

  const stats = {
    coupon: { code: coupon.code, usageLimit: coupon.usageLimit, usageCount: coupon.usageCount, perUserLimit: coupon.perUserLimit },
    usageByUser,
    redemptionRate: ((coupon.usageCount / coupon.usageLimit) * 100).toFixed(2),
  };
  ApiResponse.success(res, { stats });
});

const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
  ApiResponse.success(res, { banners });
});

const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, image, mobileImage, type, targetId, link, description, validFrom, validTill, buttonText, buttonColor, textColor, priority } = req.body;

  const banner = await Banner.create({
    title, subtitle, image, mobileImage,
    type: type || 'general', targetId, link, description, validFrom, validTill,
    buttonText: buttonText || 'Explore', buttonColor: buttonColor || '#ff4800', textColor: textColor || '#ffffff',
    priority: priority || 0, isActive: true, createdBy: req.user.id,
  });

  logger.info('Banner created', { adminId: req.user.id, bannerId: banner._id });
  ApiResponse.created(res, { banner }, 'Banner created successfully');
});

const updateBanner = asyncHandler(async (req, res) => {
  const allowedUpdates = ['title', 'subtitle', 'image', 'mobileImage', 'type', 'targetId', 'link', 'description', 'validFrom', 'validTill', 'buttonText', 'buttonColor', 'textColor', 'priority', 'isActive'];
  const updates = {};
  allowedUpdates.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

  const banner = await Banner.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!banner) return ApiResponse.notFound(res, 'Banner not found');

  logger.info('Banner updated', { adminId: req.user.id, bannerId: banner._id });
  ApiResponse.success(res, { banner }, 'Banner updated successfully');
});

const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return ApiResponse.notFound(res, 'Banner not found');

  if (banner.image) {
    const cloudinaryService = require('../services/cloudinary.service');
    await cloudinaryService.deleteImage(banner.image);
  }

  logger.info('Banner deleted', { adminId: req.user.id, bannerId: req.params.id });
  ApiResponse.success(res, {}, 'Banner deleted successfully');
});

const reorderBanners = asyncHandler(async (req, res) => {
  const { bannerIds } = req.body;
  if (!bannerIds || !Array.isArray(bannerIds)) return ApiResponse.badRequest(res, 'Banner IDs array is required');

  await Banner.reorder(bannerIds);
  logger.info('Banners reordered', { adminId: req.user.id });
  ApiResponse.success(res, {}, 'Banners reordered successfully');
});

const getPendingReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [total, reviews] = await Promise.all([
    Review.countDocuments({ isApproved: false, isActive: true }),
    Review.find({ isApproved: false, isActive: true })
      .populate('userId', 'name avatar')
      .populate('restaurantId', 'name logo')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
  ]);
  ApiResponse.paginated(res, { reviews }, { page: parseInt(page), limit: parseInt(limit), total });
});

const approveReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return ApiResponse.notFound(res, 'Review not found');

  review.isApproved = true;
  await review.save();
  await review.updateRestaurantRating();

  logger.info('Review approved', { adminId: req.user.id, reviewId: review._id });
  ApiResponse.success(res, { review }, 'Review approved successfully');
});

const rejectReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) return ApiResponse.notFound(res, 'Review not found');

  review.isApproved = false;
  review.isActive = false;
  review.rejectionReason = reason;
  await review.save();

  logger.info('Review rejected', { adminId: req.user.id, reviewId: review._id, reason });
  ApiResponse.success(res, { review }, 'Review rejected');
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return ApiResponse.notFound(res, 'Review not found');

  const restaurantId = review.restaurantId;
  await review.deleteOne();
  await Review.updateRestaurantRating.call({ restaurantId });

  logger.info('Review deleted', { adminId: req.user.id, reviewId: req.params.id });
  ApiResponse.success(res, {}, 'Review deleted successfully');
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const [totalRevenue, platformEarnings, byRestaurant, byPaymentMethod] = await Promise.all([
    Order.aggregate([
      { $match: { ...matchStage, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } }
    ]),
    Order.aggregate([
      { $match: { ...matchStage, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$commission.amount' } } }
    ]),
    Order.aggregate([
      { $match: { ...matchStage, status: 'delivered' } },
      { $group: { _id: '$restaurantId', revenue: { $sum: '$pricing.grandTotal' }, platformEarnings: { $sum: '$commission.amount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $project: { _id: 1, name: '$restaurant.name', revenue: 1, platformEarnings: 1 } }
    ]),
    Order.aggregate([
      { $match: { ...matchStage, status: 'delivered' } },
      { $group: { _id: '$payment.method', count: { $sum: 1 }, total: { $sum: '$pricing.grandTotal' } } }
    ]),
  ]);

  const analytics = {
    totalRevenue: totalRevenue[0]?.total || 0,
    platformEarnings: platformEarnings[0]?.total || 0,
    restaurantEarnings: (totalRevenue[0]?.total || 0) - (platformEarnings[0]?.total || 0),
    byRestaurant,
    byPaymentMethod: byPaymentMethod.reduce((acc, item) => { acc[item._id] = { count: item.count, total: item.total }; return acc; }, {}),
  };

  ApiResponse.success(res, { analytics });
});

const getPayoutsPending = asyncHandler(async (req, res) => {
  const pendingPayouts = await Order.aggregate([
    { $match: { status: 'delivered', payment: { $elemMatch: { status: 'completed' } } } },
    { $group: { _id: '$restaurantId', totalEarnings: { $sum: '$pricing.grandTotal' }, platformEarnings: { $sum: '$commission.amount' } } },
    { $project: { _id: 1, totalEarnings: 1, platformEarnings: 1, payoutAmount: { $subtract: ['$totalEarnings', '$platformEarnings'] } } },
    { $sort: { payoutAmount: -1 } },
    { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
    { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, restaurantName: '$restaurant.name', totalEarnings: 1, platformEarnings: 1, payoutAmount: 1, bankDetails: '$restaurant.bankDetails' } }
  ]);

  ApiResponse.success(res, { pendingPayouts });
});

const processPayout = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { orderIds, amount, method, notes } = req.body;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return ApiResponse.notFound(res, 'Restaurant not found');

  if (orderIds && orderIds.length > 0) {
    await Order.updateMany(
      { _id: { $in: orderIds }, restaurantId, status: 'delivered' },
      { $set: { 'payment.payoutStatus': 'paid', 'payment.paidAt': new Date() } }
    );
  }

  const payoutRecord = {
    restaurantId,
    amount,
    method: method || 'bank_transfer',
    status: 'completed',
    processedAt: new Date(),
    processedBy: req.user.id,
    notes,
  };

  logger.info('Payout processed', { adminId: req.user.id, restaurantId, amount, orderIds: orderIds?.length });
  ApiResponse.success(res, { payout: payoutRecord }, 'Payout processed successfully');
});

module.exports = {
  getDashboard,
  getAnalytics,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getAllRestaurants,
  getPendingRestaurants,
  approveRestaurant,
  rejectRestaurant,
  updateRestaurantCommission,
  toggleRestaurantStatus,
  deleteRestaurant,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStatistics,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCouponUsage,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  getPendingReviews,
  approveReview,
  rejectReview,
  deleteReview,
  getRevenueAnalytics,
  getPayoutsPending,
  processPayout,
};
