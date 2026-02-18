/**
 * Order Socket Events
 * @module sockets/order.socket
 */

const {
  getIO,
  emitToUser,
  emitToRestaurant,
  emitToOrder,
  emitToAdmin,
  generateRoomName,
  ROOM_TYPES,
} = require('./index');

const logger = {
  info: (message, meta = {}) => console.log(`[ORDER SOCKET] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[ORDER SOCKET ERROR] ${message}`, meta),
};

const Order = require('../models/Order');

const emitNewOrder = async (restaurantId, order) => {
  try {
    const orderData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: order.pricing?.grandTotal || order.total,
      user: {
        name: order.userId?.name,
        phone: order.contact?.phone,
      },
      createdAt: order.createdAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
    };

    emitToRestaurant(restaurantId, 'order:new', orderData);
    
    emitToAdmin('admin:order:new', {
      ...orderData,
      restaurantId,
    });

    logger.info('New order emitted', { 
      orderId: order._id, 
      restaurantId,
      orderNumber: order.orderNumber 
    });
  } catch (error) {
    logger.error('Error emitting new order', { error: error.message });
  }
};

const emitOrderStatusUpdate = async (orderId, userId, restaurantId, status, data = {}) => {
  try {
    const statusData = {
      orderId,
      status,
      timestamp: new Date(),
      ...data,
    };

    if (userId) {
      emitToUser(userId, 'order:status-updated', statusData);
    }

    if (restaurantId) {
      emitToRestaurant(restaurantId, 'order:status-updated', statusData);
    }

    emitToOrder(orderId, 'order:status-updated', statusData);

    emitToAdmin('admin:order:status-updated', statusData);

    logger.info('Order status update emitted', { orderId, status, userId, restaurantId });
  } catch (error) {
    logger.error('Error emitting order status update', { error: error.message });
  }
};

const emitOrderAccepted = (orderId, userId, data) => {
  const acceptedData = {
    orderId,
    status: 'confirmed',
    estimatedTime: data.estimatedTime || 30,
    message: 'Your order has been accepted and is being prepared',
    timestamp: new Date(),
  };

  emitToUser(userId, 'order:accepted', acceptedData);
  emitToOrder(orderId, 'order:accepted', acceptedData);

  logger.info('Order accepted emitted', { orderId, userId });
};

const emitOrderRejected = (orderId, userId, reason) => {
  const rejectedData = {
    orderId,
    status: 'cancelled',
    reason: reason || 'Order was rejected by the restaurant',
    timestamp: new Date(),
  };

  emitToUser(userId, 'order:rejected', rejectedData);
  emitToOrder(orderId, 'order:rejected', rejectedData);

  logger.info('Order rejected emitted', { orderId, userId, reason });
};

const emitOrderPreparing = (orderId, userId, estimatedTime) => {
  const preparingData = {
    orderId,
    status: 'preparing',
    estimatedTime: estimatedTime || 20,
    message: 'Your order is being prepared',
    timestamp: new Date(),
  };

  emitToUser(userId, 'order:preparing', preparingData);
  emitToOrder(orderId, 'order:preparing', preparingData);

  logger.info('Order preparing emitted', { orderId, userId });
};

const emitOrderReady = (orderId, userId) => {
  const readyData = {
    orderId,
    status: 'ready',
    message: 'Your order is ready for pickup',
    timestamp: new Date(),
  };

  emitToUser(userId, 'order:ready', readyData);
  emitToOrder(orderId, 'order:ready', readyData);

  logger.info('Order ready emitted', { orderId, userId });
};

const emitOrderDispatched = (orderId, userId, deliveryPartner = null) => {
  const dispatchedData = {
    orderId,
    status: 'dispatched',
    message: 'Your order is on its way',
    deliveryPartner,
    timestamp: new Date(),
  };

  emitToUser(userId, 'order:dispatched', dispatchedData);
  emitToOrder(orderId, 'order:dispatched', dispatchedData);

  logger.info('Order dispatched emitted', { orderId, userId });
};

const emitOrderDelivered = (orderId, userId, restaurantId) => {
  const deliveredData = {
    orderId,
    status: 'delivered',
    deliveredAt: new Date(),
    message: 'Your order has been delivered. Enjoy your meal!',
  };

  if (userId) {
    emitToUser(userId, 'order:delivered', deliveredData);
  }

  if (restaurantId) {
    emitToRestaurant(restaurantId, 'order:delivered', deliveredData);
  }

  emitToOrder(orderId, 'order:delivered', deliveredData);
  emitToAdmin('admin:order:delivered', deliveredData);

  logger.info('Order delivered emitted', { orderId, userId, restaurantId });
};

const emitOrderCancelled = (orderId, userId, restaurantId, reason, cancelledBy) => {
  const cancelledData = {
    orderId,
    status: 'cancelled',
    reason,
    cancelledBy,
    timestamp: new Date(),
  };

  if (userId) {
    emitToUser(userId, 'order:cancelled', cancelledData);
  }

  if (restaurantId) {
    emitToRestaurant(restaurantId, 'order:cancelled', cancelledData);
  }

  emitToOrder(orderId, 'order:cancelled', cancelledData);
  emitToAdmin('admin:order:cancelled', cancelledData);

  logger.info('Order cancelled emitted', { orderId, userId, restaurantId, cancelledBy });
};

const joinOrderRoom = (socket, orderId) => {
  const room = generateRoomName(ROOM_TYPES.ORDER, orderId);
  socket.join(room);
  logger.info('Socket joined order room', { socketId: socket.id, orderId });
};

const leaveOrderRoom = (socket, orderId) => {
  const room = generateRoomName(ROOM_TYPES.ORDER, orderId);
  socket.leave(room);
  logger.info('Socket left order room', { socketId: socket.id, orderId });
};

const setupOrderSocketHandlers = (socket) => {
  socket.on('order:track', async (orderId, callback) => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return callback?.({ success: false, error: 'Order not found' });
      }

      const hasAccess = 
        order.userId.toString() === socket.userId ||
        (socket.userRole === 'restaurant' && order.restaurantId.toString() === socket.restaurantId) ||
        socket.userRole === 'admin';

      if (!hasAccess) {
        return callback?.({ success: false, error: 'Not authorized to track this order' });
      }

      joinOrderRoom(socket, orderId);

      const trackingData = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        statusHistory: order.statusHistory,
      };

      callback?.({ success: true, data: trackingData });
      
      logger.info('User started tracking order', { userId: socket.userId, orderId });
    } catch (error) {
      logger.error('Error in order:track', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('order:stop-tracking', (orderId) => {
    leaveOrderRoom(socket, orderId);
    logger.info('User stopped tracking order', { userId: socket.userId, orderId });
  });

  socket.on('order:request-update', async (orderId, callback) => {
    try {
      const order = await Order.findById(orderId)
        .populate('userId', 'name phone')
        .populate('restaurantId', 'name logo');

      if (!order) {
        return callback?.({ success: false, error: 'Order not found' });
      }

      callback?.({ 
        success: true, 
        data: {
          status: order.status,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          statusHistory: order.statusHistory,
        }
      });
    } catch (error) {
      logger.error('Error in order:request-update', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });
};

const emitOrderPaymentUpdate = (orderId, userId, paymentStatus, data = {}) => {
  const paymentData = {
    orderId,
    paymentStatus,
    timestamp: new Date(),
    ...data,
  };

  if (userId) {
    emitToUser(userId, 'order:payment-updated', paymentData);
  }

  emitToOrder(orderId, 'order:payment-updated', paymentData);

  logger.info('Order payment update emitted', { orderId, paymentStatus });
};

const emitOrderReminder = (orderId, userId, message) => {
  emitToUser(userId, 'order:reminder', {
    orderId,
    message,
    timestamp: new Date(),
  });
};

module.exports = {
  emitNewOrder,
  emitOrderStatusUpdate,
  emitOrderAccepted,
  emitOrderRejected,
  emitOrderPreparing,
  emitOrderReady,
  emitOrderDispatched,
  emitOrderDelivered,
  emitOrderCancelled,
  emitOrderPaymentUpdate,
  emitOrderReminder,
  joinOrderRoom,
  leaveOrderRoom,
  setupOrderSocketHandlers,
};
