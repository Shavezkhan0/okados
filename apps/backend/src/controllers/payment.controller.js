/**
 * Payment Controller
 * Handles payment-related operations
 * @module controllers/payment.controller
 */

const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');

const logger = {
  info: (message, meta = {}) => console.log(`[PAYMENT CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[PAYMENT CONTROLLER ERROR] ${message}`, meta),
  warn: (message, meta = {}) => console.warn(`[PAYMENT CONTROLLER] ${message}`, meta),
};

const emitOrderEvent = (event, data) => {
  if (global.io) {
    global.io.emit(event, data);
  }
};

const sendPaymentNotification = async (order, status) => {
  const user = await User.findById(order.userId);
  if (user) {
    await notificationService.sendAndStore(
      user,
      `payment_${status}`,
      `Payment ${status}`,
      `Your payment for order #${order.orderNumber} has been ${status}`,
      { orderId: order._id.toString() }
    );
  }
};

/**
 * @desc Create payment order for Razorpay
 * @route POST /api/v1/payments/create-order
 * @access Private (Customer)
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.userId;

  logger.info('Creating payment order', { orderId, userId });

  const order = await Order.findById(orderId);
  if (!order) {
    logger.warn('Order not found', { orderId });
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.userId.toString() !== userId) {
    logger.warn('Unauthorized payment attempt', { orderId, userId });
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (order.payment.method !== 'online') {
    logger.warn('Invalid payment method', { orderId, method: order.payment.method });
    return ApiResponse.badRequest(res, 'This order is not configured for online payment');
  }

  if (order.payment.status === 'completed') {
    logger.warn('Payment already completed', { orderId });
    return ApiResponse.badRequest(res, 'Payment already completed for this order');
  }

  if (!['placed', 'pending'].includes(order.status)) {
    logger.warn('Invalid order status for payment', { orderId, status: order.status });
    return ApiResponse.badRequest(res, `Cannot process payment for order with status: ${order.status}`);
  }

  const user = await User.findById(userId);

  const razorpayOrder = await paymentService.createRazorpayOrder(
    order.orderNumber,
    order.pricing.grandTotal,
    'INR',
    {
      orderId: order._id.toString(),
      userId: userId,
    }
  );

  if (!razorpayOrder.success) {
    logger.error('Failed to create Razorpay order', { orderId, error: razorpayOrder.error });
    return ApiResponse.error(res, 'Failed to create payment order. Please try again.');
  }

  order.payment.gatewayOrderId = razorpayOrder.id;
  await order.save();

  logger.info('Payment order created', { orderId, razorpayOrderId: razorpayOrder.id });

  ApiResponse.success(res, {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    name: 'Okados',
    description: `Order #${order.orderNumber}`,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone,
    },
    notes: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    },
  }, 'Payment order created successfully');
});

/**
 * @desc Verify payment
 * @route POST /api/v1/payments/verify
 * @access Private (Customer)
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const userId = req.userId;

  logger.info('Verifying payment', { orderId, razorpayOrderId, razorpayPaymentId });

  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return ApiResponse.badRequest(res, 'All payment details are required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    logger.warn('Order not found for payment verification', { orderId });
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.userId.toString() !== userId) {
    logger.warn('Unauthorized payment verification attempt', { orderId, userId });
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (order.payment.status === 'completed') {
    logger.info('Payment already completed', { orderId });
    return ApiResponse.success(res, { order, alreadyVerified: true }, 'Payment already verified');
  }

  const verificationResult = await paymentService.verifyPayment(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!verificationResult.success) {
    logger.error('Payment verification failed', { orderId, error: verificationResult.error });
    return ApiResponse.error(res, 'Payment verification failed');
  }

  if (!verificationResult.verified) {
    order.payment.status = 'failed';
    order.payment.failureReason = 'Invalid payment signature';
    await order.save();

    logger.warn('Invalid payment signature', { orderId, razorpayPaymentId });
    return ApiResponse.badRequest(res, 'Payment verification failed. Invalid signature.');
  }

  order.payment.status = 'completed';
  order.payment.transactionId = razorpayPaymentId;
  order.payment.gatewayPaymentId = razorpayPaymentId;
  order.payment.gatewaySignature = razorpaySignature;
  order.payment.paidAt = new Date();

  if (order.status === 'placed') {
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment confirmed',
    });
  }

  await order.save();

  logger.info('Payment verified successfully', { orderId, razorpayPaymentId });

  await sendPaymentNotification(order, 'completed');
  emitOrderEvent('order:payment', { orderId: order._id, status: 'completed' });

  ApiResponse.success(res, { order }, 'Payment verified successfully');
});

/**
 * @desc Handle Razorpay webhook
 * @route POST /api/v1/payments/webhook
 * @access Public (Webhook)
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const payload = req.body;

  logger.info('Received webhook', { event: payload.event });

  if (!signature) {
    logger.warn('Webhook received without signature');
    return ApiResponse.badRequest(res, 'Missing webhook signature');
  }

  const isValid = paymentService.verifyWebhookSignature(
    JSON.stringify(payload),
    signature
  );

  if (!isValid) {
    logger.warn('Invalid webhook signature', { payload });
    return ApiResponse.badRequest(res, 'Invalid webhook signature');
  }

  const event = payload.event;
  const payment = payload.payload?.payment?.entity;
  const order = payload.payload?.order?.entity;

  setImmediate(async () => {
    try {
      switch (event) {
        case 'payment.captured':
          await handlePaymentCaptured(payment, order);
          break;

        case 'payment.failed':
          await handlePaymentFailed(payment, order);
          break;

        case 'refund.processed':
          await handleRefundProcessed(payment);
          break;

        default:
          logger.info('Unhandled webhook event', { event });
      }
    } catch (error) {
      logger.error('Webhook processing error', { event, error: error  });

  Api.message });
    }
Response.success(res, { received: true });
});

const handlePaymentCaptured = async (payment, razorpayOrder) => {
  logger.info('Processing payment captured webhook', { paymentId: payment.id });

  const order = await Order.findOne({ 'payment.gatewayOrderId': razorpayOrder.id });
  if (!order) {
    logger.warn('Order not found for payment captured webhook', { gatewayOrderId: razorpayOrder.id });
    return;
  }

  if (order.payment.status === 'completed') {
    logger.info('Payment already completed', { orderId: order._id });
    return;
  }

  order.payment.status = 'completed';
  order.payment.transactionId = payment.id;
  order.payment.gatewayPaymentId = payment.id;
  order.payment.method = payment.method;
  order.payment.paidAt = new Date(payment.created_at * 1000);

  if (order.status === 'placed') {
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment confirmed via webhook',
    });
  }

  await order.save();

  await sendPaymentNotification(order, 'completed');
  emitOrderEvent('order:payment', { orderId: order._id, status: 'completed' });

  logger.info('Payment captured processed', { orderId: order._id });
};

const handlePaymentFailed = async (payment, razorpayOrder) => {
  logger.info('Processing payment failed webhook', { paymentId: payment.id });

  const order = await Order.findOne({ 'payment.gatewayOrderId': razorpayOrder.id });
  if (!order) {
    logger.warn('Order not found for payment failed webhook', { gatewayOrderId: razorpayOrder.id });
    return;
  }

  order.payment.status = 'failed';
  order.payment.failureReason = payment.error_description || 'Payment failed';
  await order.save();

  await sendPaymentNotification(order, 'failed');
  emitOrderEvent('order:payment', { orderId: order._id, status: 'failed' });

  logger.info('Payment failed processed', { orderId: order._id });
};

const handleRefundProcessed = async (refund) => {
  logger.info('Processing refund webhook', { refundId: refund.id, paymentId: refund.payment_id });

  const order = await Order.findOne({ 'payment.transactionId': refund.payment_id });
  if (!order) {
    logger.warn('Order not found for refund webhook', { paymentId: refund.payment_id });
    return;
  }

  order.payment.status = 'refunded';
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelledBy = 'system';
  order.cancelReason = 'Refund processed';

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: 'Refund processed',
  });

  await order.save();

  await sendPaymentNotification(order, 'refunded');
  emitOrderEvent('order:refund', { orderId: order._id, status: 'refunded' });

  logger.info('Refund processed', { orderId: order._id });
};

/**
 * @desc Get available payment methods
 * @route GET /api/v1/payments/methods
 * @access Public
 */
const getPaymentMethods = asyncHandler(async (req, res) => {
  const { orderId } = req.query;
  let codAvailable = true;
  let codMessage = '';

  if (orderId) {
    const order = await Order.findById(orderId).populate('restaurantId');
    if (order) {
      const restaurant = order.restaurantId;
      
      if (restaurant?.pricing?.cod === false) {
        codAvailable = false;
        codMessage = 'Restaurant does not accept Cash on Delivery';
      } else if (order.pricing.grandTotal > 1000) {
        codAvailable = false;
        codMessage = 'COD not available for orders above ₹1000';
      }

      const user = await User.findById(order.userId);
      if (user) {
        const recentCodOrders = await Order.countDocuments({
          userId: order.userId,
          'payment.method': 'cod',
          status: { $in: ['delivered'] },
        });

        if (recentCodOrders === 0) {
        }
      }
    }
  }

  const methods = {
    online: {
      available: true,
      methods: [
        { id: 'upi', name: 'UPI', icon: 'upi' },
        { id: 'card', name: 'Credit/Debit Card', icon: 'card' },
        { id: 'netbanking', name: 'Net Banking', icon: 'netbanking' },
        { id: 'wallet', name: 'Wallet', icon: 'wallet' },
      ],
    },
    cod: {
      available: codAvailable,
      message: codMessage || 'Pay with cash upon delivery',
    },
  };

  logger.info('Payment methods retrieved', { codAvailable });

  ApiResponse.success(res, { methods });
});

/**
 * @desc Initiate refund
 * @route POST /api/v1/payments/refund
 * @access Private (Admin)
 */
const initiateRefund = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;
  const adminId = req.userId;

  logger.info('Initiating refund', { orderId, adminId });

  const order = await Order.findById(orderId);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.payment.status !== 'completed') {
    logger.warn('Order not eligible for refund', { orderId, paymentStatus: order.payment.status });
    return ApiResponse.badRequest(res, 'Order is not eligible for refund');
  }

  if (!order.payment.transactionId) {
    logger.warn('No transaction ID for refund', { orderId });
    return ApiResponse.badRequest(res, 'No payment transaction found');
  }

  const refundAmount = order.pricing.grandTotal;

  const refundResult = await paymentService.initiateRefund(
    order.payment.transactionId,
    refundAmount,
    reason || 'Refund initiated by admin'
  );

  if (!refundResult.success) {
    logger.error('Refund failed', { orderId, error: refundResult.error });
    return ApiResponse.error(res, 'Refund processing failed. Please try again.');
  }

  order.payment.status = 'refunded';
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelledBy = 'admin';
  order.cancelReason = reason || 'Refund processed';

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: `Refund processed: ${refundResult.id}`,
    updatedBy: adminId,
  });

  await order.save();

  const restaurant = await Restaurant.findById(order.restaurantId);
  if (restaurant) {
    restaurant.stats.cancelledOrders += 1;
    await restaurant.save();
  }

  await sendPaymentNotification(order, 'refunded');
  emitOrderEvent('order:refund', { orderId: order._id, status: 'refunded' });

  logger.info('Refund processed', { orderId, refundId: refundResult.id });

  ApiResponse.success(res, {
    refund: {
      id: refundResult.id,
      amount: refundResult.amount / 100,
      status: refundResult.status,
    },
    order,
  }, 'Refund processed successfully');
});

/**
 * @desc Get payment details
 * @route GET /api/v1/payments/:orderId/details
 * @access Private
 */
const getPaymentDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.userId;

  const order = await Order.findById(orderId);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const isOwner = order.userId.toString() === userId;
  const isRestaurantOwner = req.user.role === 'restaurant';
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isRestaurantOwner && !isAdmin) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  const paymentDetails = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: order.pricing.grandTotal,
    status: order.payment.status,
    method: order.payment.method,
    transactionId: order.payment.transactionId,
    gatewayOrderId: order.payment.gatewayOrderId,
    paidAt: order.payment.paidAt,
    failureReason: order.payment.failureReason,
  };

  ApiResponse.success(res, { payment: paymentDetails });
});

/**
 * @desc Check COD availability
 * @route GET /api/v1/payments/cod/check
 * @access Public
 */
const checkCodAvailability = asyncHandler(async (req, res) => {
  const { restaurantId, orderValue } = req.query;

  let codAvailable = true;
  let reasons = [];

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  if (restaurant.pricing?.cod === false) {
    codAvailable = false;
    reasons.push('Restaurant does not accept COD');
  }

  if (orderValue && parseFloat(orderValue) > 1000) {
    codAvailable = false;
    reasons.push('COD not available for orders above ₹1000');
  }

  ApiResponse.success(res, {
    available: codAvailable,
    reasons,
  });
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentMethods,
  initiateRefund,
  getPaymentDetails,
  checkCodAvailability,
};
