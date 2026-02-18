const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');

const logger = {
  info: (msg, m = {}) => console.log(`[PAYMENT] ${msg}`, m),
  error: (msg, m = {}) => console.error(`[PAYMENT ERR] ${msg}`, m),
};

const emitOrderEvent = (event, data) => {
  if (global.io) global.io.emit(event, data);
};

const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.userId;

  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.notFound(res, 'Order not found');
  if (order.userId.toString() !== userId) return ApiResponse.forbidden(res, 'Not authorized');
  if (order.payment.method !== 'online') return ApiResponse.badRequest(res, 'Not configured for online payment');
  if (order.payment.status === 'completed') return ApiResponse.badRequest(res, 'Payment already completed');

  const user = await User.findById(userId);
  const razorpayOrder = await paymentService.createRazorpayOrder(
    order.orderNumber,
    order.pricing.grandTotal,
    'INR',
    { orderId: order._id.toString(), userId }
  );

  if (!razorpayOrder.success) {
    return ApiResponse.error(res, 'Failed to create payment order');
  }

  order.payment.gatewayOrderId = razorpayOrder.id;
  await order.save();

  return ApiResponse.success(res, {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    name: 'Okados',
    description: `Order #${order.orderNumber}`,
    prefill: { name: user.name, email: user.email, contact: user.phone },
    notes: { orderId: order._id.toString(), orderNumber: order.orderNumber },
  }, 'Payment order created');
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const userId = req.userId;

  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.notFound(res, 'Order not found');
  if (order.userId.toString() !== userId) return ApiResponse.forbidden(res, 'Not authorized');
  if (order.payment.status === 'completed') return ApiResponse.badRequest(res, 'Payment already completed');

  const isValid = await paymentService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) return ApiResponse.badRequest(res, 'Invalid payment signature');

  order.payment.status = 'completed';
  order.payment.gatewayPaymentId = razorpayPaymentId;
  order.payment.paidAt = new Date();
  await order.save();

  emitOrderEvent(`order:${orderId}:payment`, { status: 'completed' });
  return ApiResponse.success(res, { order }, 'Payment verified');
});

const handleWebhook = asyncHandler(async (req, res) => {
  const { event, payload } = req.body;
  logger.info('Webhook received', { event });

  const payment = payload?.payment?.entity;
  const order = await Order.findOne({ 'payment.gatewayOrderId': payment?.order_id });

  try {
    if (event === 'payment.captured' && order) {
      order.payment.status = 'completed';
      order.payment.gatewayPaymentId = payment.id;
      order.payment.paidAt = new Date();
      await order.save();
    } else if (event === 'payment.failed' && order) {
      order.payment.status = 'failed';
      order.payment.failureReason = payment?.error_description;
      await order.save();
    }
  } catch (error) {
    logger.error('Webhook error', { event, error: error.message });
    return ApiResponse.error(res, 'Webhook processing failed', 500);
  }

  return ApiResponse.success(res, { received: true });
});

const getPaymentMethods = asyncHandler(async (req, res) => {
  const methods = await paymentService.getPaymentMethods();
  return ApiResponse.success(res, { methods });
});

const initiateRefund = asyncHandler(async (req, res) => {
  const { orderId, amount, reason } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.notFound(res, 'Order not found');
  if (order.payment.status !== 'completed') return ApiResponse.badRequest(res, 'Payment not completed');

  const refundAmount = amount || order.pricing.grandTotal;
  const refund = await paymentService.initiateRefund(order, refundAmount, reason);

  if (!refund.success) return ApiResponse.error(res, 'Refund failed');

  order.payment.status = 'refunded';
  await order.save();

  return ApiResponse.success(res, { refund }, 'Refund initiated');
});

const getPaymentDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId).populate('userId', 'name email phone').populate('restaurantId', 'name');
  if (!order) return ApiResponse.notFound(res, 'Order not found');

  const paymentDetails = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: order.pricing.grandTotal,
    status: order.payment.status,
    method: order.payment.method,
    transactionId: order.payment.transactionId,
    paidAt: order.payment.paidAt,
  };

  return ApiResponse.success(res, { payment: paymentDetails });
});

const checkCodAvailability = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.notFound(res, 'Order not found');

  if (order.payment.method !== 'cod') {
    return ApiResponse.badRequest(res, 'Not a COD order');
  }

  const restaurant = await Restaurant.findById(order.restaurantId);
  const codAvailable = restaurant?.isActive && restaurant?.isApproved;

  return ApiResponse.success(res, { codAvailable, message: codAvailable ? 'COD available' : 'COD not available' });
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
