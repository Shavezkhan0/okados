/**
 * Order Controller
 * Handles order-related operations
 * @module controllers/order.controller
 */

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import Review from '../models/Review.js';
import ApiResponse from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPaginationMeta, calculateDistance } from '../utils/helpers.js';
import notificationService from '../services/notification.service.js';
import paymentService from '../services/payment.service.js';

const logger = {
  info: (message, meta = {}) => console.log(`[ORDER CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[ORDER CONTROLLER ERROR] ${message}`, meta),
};

const VALID_STATUS_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

const isValidStatusTransition = (currentStatus, newStatus) => {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};

const calculateOrderPricing = (items, restaurant, distance, coupon = null) => {
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  
  let discount = 0;
  let couponDiscount = 0;
  
  if (coupon) {
    if (coupon.discountType === 'percentage') {
      couponDiscount = (itemsTotal * coupon.discountValue) / 100;
      if (coupon.maximumDiscountValue) {
        couponDiscount = Math.min(couponDiscount, coupon.maximumDiscountValue);
      }
    } else {
      couponDiscount = coupon.discountValue;
    }
    discount = couponDiscount;
  }

  const subtotal = itemsTotal - discount;
  const deliveryFee = restaurant.pricing?.deliveryFee || 0;
  const packagingFee = restaurant.pricing?.packagingFee || 0;
  const platformFee = 5;
  const taxRate = 5;
  const taxes = Math.round((subtotal + deliveryFee + packagingFee + platformFee) * (taxRate / 100));
  const grandTotal = Math.max(0, subtotal + deliveryFee + packagingFee + platformFee + taxes - discount);

  return {
    itemsTotal,
    deliveryFee,
    packagingFee,
    platformFee,
    taxes,
    taxRate,
    discount,
    couponDiscount,
    grandTotal,
  };
};

const calculateCommission = (itemsTotal, commissionRate = 15) => {
  return Math.round((itemsTotal * commissionRate) / 100);
};

const emitOrderEvent = (event, data) => {
  if (global.io) {
    global.io.emit(event, data);
  }
};

const sendOrderNotification = async (order, status) => {
  const user = await User.findById(order.userId);
  if (user) {
    await notificationService.notifyOrderStatus({ ...order.toObject(), user }, status);
  }
};

/**
 * @desc Create new order
 * @route POST /api/v1/orders
 * @access Private (Customer)
 */
const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { restaurantId, items, deliveryAddressId, paymentMethod, couponCode, instructions } = req.body;
    const userId = req.userId;

    logger.info('Creating order', { userId, restaurantId });

    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) {
      await session.abortTransaction();
      return ApiResponse.notFound(res, 'Restaurant not found');
    }

    if (!restaurant.isOpen || !restaurant.isApproved || !restaurant.isActive) {
      await session.abortTransaction();
      return ApiResponse.badRequest(res, 'Restaurant is not accepting orders');
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return ApiResponse.notFound(res, 'User not found');
    }

    let deliveryAddress = deliveryAddressId;
    if (deliveryAddressId && typeof deliveryAddressId === 'object') {
      deliveryAddress = deliveryAddressId;
    } else if (deliveryAddressId) {
      const address = user.profile?.addresses?.find(a => a._id.toString() === deliveryAddressId);
      if (!address) {
        await session.abortTransaction();
        return ApiResponse.badRequest(res, 'Delivery address not found');
      }
      deliveryAddress = {
        label: address.label,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        coordinates: address.coordinates,
      };
    }

    let distance = 0;
    if (deliveryAddress?.coordinates?.coordinates && restaurant.address?.coordinates?.coordinates) {
      distance = calculateDistance(
        deliveryAddress.coordinates.coordinates[1],
        deliveryAddress.coordinates.coordinates[0],
        restaurant.address.coordinates.coordinates[1],
        restaurant.address.coordinates.coordinates[0]
      );

      if (distance > restaurant.deliveryRadius) {
        await session.abortTransaction();
        return ApiResponse.badRequest(res, `Delivery not available. Maximum radius is ${restaurant.deliveryRadius} km`);
      }
    }

    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        await session.abortTransaction();
        return ApiResponse.badRequest(res, `Product "${item.productId}" not found`);
      }

      if (!product.isAvailable) {
        await session.abortTransaction();
        return ApiResponse.badRequest(res, `Product "${product.name}" is not available`);
      }

      if (product.restaurantId.toString() !== restaurantId) {
        await session.abortTransaction();
        return ApiResponse.badRequest(res, `Product "${product.name}" does not belong to this restaurant`);
      }

      let itemSubtotal = product.price * item.quantity;

      if (item.customizations && item.customizations.length > 0) {
        for (const customization of item.customizations) {
          itemSubtotal += customization.price || 0;
        }
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        image: product.image,
        quantity: item.quantity,
        price: product.price,
        customizations: item.customizations || [],
        subtotal: itemSubtotal,
      });
    }

    let coupon = null;
    let couponDiscount = 0;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
      }).session(session);

      if (coupon) {
        const now = new Date();
        const itemsTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        if (coupon.startsAt <= now && coupon.expiresAt >= now) {
          if (!coupon.minimumOrderValue || itemsTotal >= coupon.minimumOrderValue) {
            if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
              if (coupon.discountType === 'percentage') {
                couponDiscount = (itemsTotal * coupon.discountValue) / 100;
                if (coupon.maximumDiscountValue) {
                  couponDiscount = Math.min(couponDiscount, coupon.maximumDiscountValue);
                }
              } else {
                couponDiscount = coupon.discountValue;
              }
              
              coupon.usedCount += 1;
              await coupon.save({ session });
            }
          }
        }
      }
    }

    const pricing = calculateOrderPricing(orderItems, restaurant, distance, coupon);
    const commissionRate = restaurant.commission?.rate || 15;
    const commissionAmount = calculateCommission(pricing.itemsTotal, commissionRate);

    const orderNumber = await Order.generateOrderNumber();

    const order = await Order.create([{
      orderNumber,
      userId,
      restaurantId,
      items: orderItems,
      pricing,
      deliveryAddress,
      contact: {
        phone: user.phone,
      },
      status: 'placed',
      payment: {
        method: paymentMethod || 'cod',
        status: paymentMethod === 'online' ? 'pending' : 'pending',
      },
      coupon: couponCode ? {
        code: couponCode.toUpperCase(),
        discount: couponDiscount,
      } : undefined,
      commission: {
        rate: commissionRate,
        amount: commissionAmount,
      },
      instructions,
      estimatedDeliveryTime: new Date(Date.now() + (restaurant.deliveryRadius * 5 + 15) * 60 * 1000),
      statusHistory: [{
        status: 'placed',
        timestamp: new Date(),
        note: 'Order placed',
      }],
    }], { session });

    const createdOrder = order[0];

    if (paymentMethod === 'online') {
      const paymentResult = await paymentService.createOrder(
        pricing.grandTotal,
        'INR',
        createdOrder.orderNumber
      );

      if (!paymentResult.success) {
        await session.abortTransaction();
        return ApiResponse.error(res, 'Failed to create payment order');
      }

      createdOrder.payment.gatewayOrderId = paymentResult.id;
      await createdOrder.save({ session });
    }

    restaurant.stats.totalOrders += 1;
    await restaurant.save({ session });

    await session.commitTransaction();
    session.endSession();

    await sendOrderNotification(createdOrder, 'placed');
    emitOrderEvent('order:created', { orderId: createdOrder._id, restaurantId });

    logger.info('Order created successfully', { orderId: createdOrder._id, orderNumber });

    const response = {
      order: createdOrder,
      ...(paymentMethod === 'online' && {
        payment: {
          gatewayOrderId: createdOrder.payment.gatewayOrderId,
          amount: pricing.grandTotal,
          currency: 'INR',
        },
      }),
    };

    ApiResponse.created(res, response, 'Order placed successfully');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Order creation failed', { error: error.message });
    return ApiResponse.error(res, 'Failed to create order: ' + error.message);
  }
});

/**
 * @desc Get order by ID
 * @route GET /api/v1/orders/:id
 * @access Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.user.role;

  logger.info('Getting order', { orderId: id, userId });

  const order = await Order.findById(id)
    .populate('userId', 'name email phone profile')
    .populate('restaurantId', 'name logo contact address timing isOpen')
    .populate('items.productId', 'name image price')
    .populate('deliveryPartnerId', 'name phone');

  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const isOwner = order.userId._id.toString() === userId;
  const isRestaurantOwner = order.restaurantId.ownerId?.toString() === userId;
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isRestaurantOwner && !isAdmin) {
    logger.warn('Unauthorized order access attempt', { orderId: id, userId });
    return ApiResponse.forbidden(res, 'Not authorized to view this order');
  }

  ApiResponse.success(res, { order });
});

/**
 * @desc Get user's orders
 * @route GET /api/v1/users/orders
 * @access Private (Customer)
 */
const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { status, page = 1, limit = 20 } = req.query;

  logger.info('Getting user orders', { userId, status });

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('restaurantId', 'name logo rating')
    .populate('items.productId', 'name image')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { orders, total, pages: pagination.totalPages }, pagination);
});

/**
 * @desc Cancel order
 * @route POST /api/v1/orders/:id/cancel
 * @access Private (Customer)
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.userId;

  logger.info('Cancelling order', { orderId: id, userId });

  const order = await Order.findById(id);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.userId.toString() !== userId) {
    return ApiResponse.forbidden(res, 'Not authorized to cancel this order');
  }

  if (!order.canBeCancelled()) {
    return ApiResponse.badRequest(res, `Cannot cancel order with status: ${order.status}`);
  }

  await order.cancel(reason || 'Cancelled by customer', 'user');

  const restaurant = await Restaurant.findById(order.restaurantId);
  if (restaurant) {
    restaurant.stats.cancelledOrders += 1;
    await restaurant.save();
  }

  if (order.payment.method === 'online' && order.payment.status === 'completed') {
    await paymentService.refund(order.payment.transactionId, order.pricing.grandTotal);
  }

  await sendOrderNotification(order, 'cancelled');
  emitOrderEvent('order:cancelled', { orderId: order._id, restaurantId: order.restaurantId });

  logger.info('Order cancelled', { orderId: order._id });

  ApiResponse.success(res, { order }, 'Order cancelled successfully');
});

/**
 * @desc Track order
 * @route GET /api/v1/orders/:id/track
 * @access Private
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.user.role;

  const order = await Order.findById(id)
    .populate('restaurantId', 'name logo address contact timing isOpen')
    .populate('deliveryPartnerId', 'name phone');

  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const isOwner = order.userId.toString() === userId;
  const isRestaurantOwner = order.restaurantId.ownerId?.toString() === userId;

  if (!isOwner && !isRestaurantOwner && userRole !== 'admin') {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  const trackingInfo = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusHistory: order.statusHistory,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    actualDeliveryTime: order.actualDeliveryTime,
    restaurant: {
      _id: order.restaurantId._id,
      name: order.restaurantId.name,
      logo: order.restaurantId.logo,
      address: order.restaurantId.address,
      isOpen: order.restaurantId.isOpen,
    },
    deliveryPartner: order.deliveryPartnerId ? {
      _id: order.deliveryPartnerId._id,
      name: order.deliveryPartnerId.name,
      phone: order.deliveryPartnerId.phone,
    } : null,
    items: order.items,
    deliveryAddress: order.deliveryAddress,
    pricing: order.pricing,
  };

  ApiResponse.success(res, { order: trackingInfo });
});

/**
 * @desc Rate order
 * @route POST /api/v1/orders/:id/review
 * @access Private (Customer)
 */
const rateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { food, delivery: deliveryRating, comment } = req.body;
  const userId = req.userId;

  logger.info('Rating order', { orderId: id, userId });

  const order = await Order.findById(id);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.userId.toString() !== userId) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (!order.canBeRated()) {
    return ApiResponse.badRequest(res, 'Order cannot be rated. It must be delivered and not previously rated.');
  }

  if (!food || !deliveryRating) {
    return ApiResponse.badRequest(res, 'Food and delivery ratings are required');
  }

  if (food < 1 || food > 5 || deliveryRating < 1 || deliveryRating > 5) {
    return ApiResponse.badRequest(res, 'Ratings must be between 1 and 5');
  }

  await order.rate(food, deliveryRating, comment);

  const existingReview = await Review.findOne({ orderId: order._id });
  if (!existingReview) {
    await Review.create({
      orderId: order._id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      ratings: { food, delivery: deliveryRating },
      comment,
      isApproved: true,
    });

    const restaurant = await Restaurant.findById(order.restaurantId);
    if (restaurant) {
      await restaurant.updateRating(food);
    }

    for (const item of order.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (product) {
          await product.updateRating(food);
        }
      }
    }
  }

  logger.info('Order rated', { orderId: order._id, food, deliveryRating });

  ApiResponse.success(res, { order }, 'Order rated successfully');
});

/**
 * @desc Get restaurant orders
 * @route GET /api/v1/orders/restaurant
 * @access Private (Restaurant Owner)
 */
const getRestaurantOrders = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { status, page = 1, limit = 20, startDate, endDate } = req.query;

  logger.info('Getting restaurant orders', { userId, status });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const query = { restaurantId: restaurant._id };

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('userId', 'name phone profile')
    .populate('items.productId', 'name image')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { orders, total, pages: pagination.totalPages }, pagination);
});

/**
 * @desc Accept order
 * @route PUT /api/v1/orders/:id/accept
 * @access Private (Restaurant Owner)
 */
const acceptOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  logger.info('Accepting order', { orderId: id, userId });

  const order = await Order.findById(id);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const restaurant = await Restaurant.findById(order.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== userId) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (order.status !== 'placed') {
    return ApiResponse.badRequest(res, `Cannot accept order with status: ${order.status}`);
  }

  const preparationTime = restaurant.deliveryRadius * 5 + 15;
  order.estimatedDeliveryTime = new Date(Date.now() + preparationTime * 60 * 1000);

  await order.updateStatus('confirmed', 'Order accepted by restaurant', userId);

  await sendOrderNotification(order, 'confirmed');
  emitOrderEvent('order:status', { orderId: order._id, status: 'confirmed' });

  logger.info('Order accepted', { orderId: order._id });

  ApiResponse.success(res, { order }, 'Order accepted successfully');
});

/**
 * @desc Reject order
 * @route PUT /api/v1/orders/:id/reject
 * @access Private (Restaurant Owner)
 */
const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.userId;

  logger.info('Rejecting order', { orderId: id, userId });

  const order = await Order.findById(id);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const restaurant = await Restaurant.findById(order.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== userId) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (!['placed', 'confirmed'].includes(order.status)) {
    return ApiResponse.badRequest(res, `Cannot reject order with status: ${order.status}`);
  }

  await order.cancel(reason || 'Rejected by restaurant', 'restaurant');

  restaurant.stats.cancelledOrders += 1;
  await restaurant.save();

  if (order.payment.method === 'online' && order.payment.status === 'completed') {
    await paymentService.refund(order.payment.transactionId, order.pricing.grandTotal);
  }

  await sendOrderNotification(order, 'cancelled');
  emitOrderEvent('order:cancelled', { orderId: order._id, status: 'cancelled' });

  logger.info('Order rejected', { orderId: order._id });

  ApiResponse.success(res, { order }, 'Order rejected successfully');
});

/**
 * @desc Update order status
 * @route PUT /api/v1/orders/:id/status
 * @access Private (Restaurant Owner, Delivery Partner)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: newStatus, note } = req.body;
  const userId = req.userId;
  const userRole = req.user.role;

  logger.info('Updating order status', { orderId: id, newStatus, userId });

  const order = await Order.findById(id);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const restaurant = await Restaurant.findById(order.restaurantId);
  const isRestaurantOwner = restaurant?.ownerId?.toString() === userId;
  const isDeliveryPartner = userRole === 'delivery_partner';

  if (!isRestaurantOwner && !isDeliveryPartner && userRole !== 'admin') {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (!isValidStatusTransition(order.status, newStatus)) {
    return ApiResponse.badRequest(res, `Cannot transition from ${order.status} to ${newStatus}`);
  }

  await order.updateStatus(newStatus, note, userId);

  if (newStatus === 'delivered') {
    if (restaurant) {
      restaurant.stats.totalRevenue += order.pricing.grandTotal;
      await restaurant.save();
    }
  }

  if (newStatus === 'cancelled') {
    if (restaurant) {
      restaurant.stats.cancelledOrders += 1;
      await restaurant.save();
    }

    if (order.payment.method === 'online' && order.payment.status === 'completed') {
      await paymentService.refund(order.payment.transactionId, order.pricing.grandTotal);
    }
  }

  await sendOrderNotification(order, newStatus);
  emitOrderEvent('order:status', { orderId: order._id, status: newStatus });

  logger.info('Order status updated', { orderId: order._id, newStatus });

  ApiResponse.success(res, { order }, `Order status updated to ${newStatus}`);
});

/**
 * @desc Get all orders (Admin)
 * @route GET /api/v1/orders
 * @access Private (Admin)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, restaurantId, userId, startDate, endDate, search } = req.query;

  logger.info('Getting all orders (admin)', { filters: req.query });

  const query = {};

  if (status) query.status = status;
  if (restaurantId) query.restaurantId = restaurantId;
  if (userId) query.userId = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('userId', 'name email phone')
    .populate('restaurantId', 'name logo')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { orders, total, pages: pagination.totalPages }, pagination);
});

/**
 * @desc Get order statistics (Admin)
 * @route GET /api/v1/orders/statistics
 * @access Private (Admin)
 */
const getOrderStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate, restaurantId } = req.query;

  logger.info('Getting order statistics', { startDate, endDate, restaurantId });

  const matchQuery = {};

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  if (restaurantId) {
    matchQuery.restaurantId = mongoose.Types.ObjectId(restaurantId);
  }

  const [statusAggregation, revenueAggregation, trends] = await Promise.all([
    Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { ...matchQuery, status: 'delivered' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.grandTotal' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$pricing.grandTotal' },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
  ]);

  const ordersByStatus = {};
  let totalOrders = 0;
  statusAggregation.forEach(s => {
    ordersByStatus[s._id] = { count: s.count, revenue: s.revenue };
    totalOrders += s.count;
  });

  const stats = {
    summary: {
      totalOrders,
      totalRevenue: revenueAggregation[0]?.totalRevenue || 0,
      averageOrderValue: revenueAggregation[0]?.averageOrderValue || 0,
      completedOrders: ordersByStatus.delivered?.count || 0,
      cancelledOrders: ordersByStatus.cancelled?.count || 0,
    },
    ordersByStatus,
    trends,
  };

  ApiResponse.success(res, { statistics: stats });
});

/**
 * @desc Verify payment
 * @route POST /api/v1/orders/:id/verify-payment
 * @access Private
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  logger.info('Verifying payment', { orderId: id, razorpayOrderId });

  const order = await Order.findById(id);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.userId.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  const isValid = await paymentService.verifyPayment(razorpayPaymentId, razorpayOrderId, razorpaySignature);

  if (isValid.success) {
    order.payment.status = 'completed';
    order.payment.transactionId = razorpayPaymentId;
    order.payment.gatewayPaymentId = razorpayPaymentId;
    order.payment.gatewaySignature = razorpaySignature;
    order.payment.paidAt = new Date();
    await order.save();

    logger.info('Payment verified', { orderId: order._id });
    ApiResponse.success(res, { order }, 'Payment verified successfully');
  } else {
    order.payment.status = 'failed';
    order.payment.failureReason = 'Payment verification failed';
    await order.save();

    logger.error('Payment verification failed', { orderId: order._id });
    return ApiResponse.badRequest(res, 'Payment verification failed');
  }
});

export default {
  createOrder,
  getOrderById,
  getUserOrders,
  cancelOrder,
  trackOrder,
  rateOrder,
  getRestaurantOrders,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderStatistics,
  verifyPayment,
};
