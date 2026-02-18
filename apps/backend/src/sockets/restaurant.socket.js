/**
 * Restaurant Socket Events
 * @module sockets/restaurant.socket
 */

const {
  getIO,
  emitToUser,
  emitToRestaurant,
  emitToAdmin,
  broadcastToAll,
  generateRoomName,
  ROOM_TYPES,
} = require('./index');

const logger = {
  info: (message, meta = {}) => console.log(`[RESTAURANT SOCKET] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[RESTAURANT SOCKET ERROR] ${message}`, meta),
};

const Restaurant = require('../models/Restaurant');

const emitRestaurantStatusChanged = async (restaurantId, isOpen) => {
  try {
    const statusData = {
      restaurantId,
      isOpen,
      timestamp: new Date(),
      message: isOpen ? 'Restaurant is now open' : 'Restaurant is now closed',
    };

    emitToRestaurant(restaurantId, 'restaurant:status-changed', statusData);
    
    broadcastToAll('restaurant:status-changed', statusData);

    logger.info('Restaurant status changed', { restaurantId, isOpen });
  } catch (error) {
    logger.error('Error emitting restaurant status', { error: error.message });
  }
};

const emitRestaurantUpdated = (restaurantId, updates) => {
  const updateData = {
    restaurantId,
    updates,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'restaurant:updated', updateData);
  
  broadcastToAll('restaurant:updated', updateData);

  logger.info('Restaurant updated', { restaurantId, fields: Object.keys(updates) });
};

const emitProductAvailabilityChanged = (restaurantId, productId, isAvailable) => {
  const productData = {
    restaurantId,
    productId,
    isAvailable,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'product:availability-changed', productData);
  
  broadcastToAll('product:availability-changed', productData);

  logger.info('Product availability changed', { restaurantId, productId, isAvailable });
};

const emitRestaurantNewReview = async (restaurantId, review) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId);
    
    const reviewData = {
      restaurantId,
      rating: review.ratings?.food || review.rating,
      comment: review.comment,
      userName: review.userId?.name || 'Anonymous',
      timestamp: new Date(),
    };

    emitToRestaurant(restaurantId, 'restaurant:new-review', reviewData);
    
    emitToAdmin('admin:restaurant:new-review', reviewData);

    logger.info('New review emitted', { restaurantId });
  } catch (error) {
    logger.error('Error emitting new review', { error: error.message });
  }
};

const emitRestaurantOnline = (restaurantId) => {
  const onlineData = {
    restaurantId,
    isOnline: true,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'restaurant:online', onlineData);
  emitToAdmin('admin:restaurant:online', onlineData);

  logger.info('Restaurant came online', { restaurantId });
};

const emitRestaurantOffline = (restaurantId) => {
  const offlineData = {
    restaurantId,
    isOnline: false,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'restaurant:offline', offlineData);

  logger.info('Restaurant went offline', { restaurantId });
};

const emitRestaurantNewOrder = (restaurantId, orderData) => {
  const data = {
    ...orderData,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'restaurant:new-order', data);

  logger.info('New order for restaurant', { restaurantId, orderNumber: orderData.orderNumber });
};

const emitRestaurantOrderAccepted = (restaurantId, orderId, estimatedTime) => {
  const data = {
    orderId,
    status: 'confirmed',
    estimatedTime,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'restaurant:order-accepted', data);

  logger.info('Order accepted notification for restaurant', { restaurantId, orderId });
};

const emitRestaurantOrderRejected = (restaurantId, orderId, reason) => {
  const data = {
    orderId,
    status: 'rejected',
    reason,
    timestamp: new Date(),
  };

  emitToRestaurant(restaurantId, 'restaurant:order-rejected', data);

  logger.info('Order rejected notification for restaurant', { restaurantId, orderId });
};

const joinRestaurantRoom = (socket, restaurantId) => {
  const room = generateRoomName(ROOM_TYPES.RESTAURANT, restaurantId);
  socket.join(room);
  logger.info('Socket joined restaurant room', { socketId: socket.id, restaurantId });
};

const leaveRestaurantRoom = (socket, restaurantId) => {
  const room = generateRoomName(ROOM_TYPES.RESTAURANT, restaurantId);
  socket.leave(room);
  logger.info('Socket left restaurant room', { socketId: socket.id, restaurantId });
};

const setupRestaurantSocketHandlers = (socket) => {
  socket.on('restaurant:join', async (restaurantId, callback) => {
    try {
      if (socket.userRole !== 'restaurant' && socket.userRole !== 'admin') {
        return callback?.({ success: false, error: 'Not authorized' });
      }

      if (socket.userRole === 'restaurant' && socket.restaurantId !== restaurantId) {
        return callback?.({ success: false, error: 'Cannot join other restaurant room' });
      }

      joinRestaurantRoom(socket, restaurantId);

      const restaurant = await Restaurant.findById(restaurantId)
        .select('name logo isOpen isApproved rating');

      callback?.({ 
        success: true, 
        data: {
          restaurant,
          online: true,
        }
      });

      logger.info('User joined restaurant room', { userId: socket.userId, restaurantId });
    } catch (error) {
      logger.error('Error in restaurant:join', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('restaurant:leave', (restaurantId) => {
    leaveRestaurantRoom(socket, restaurantId);
    logger.info('User left restaurant room', { userId: socket.userId, restaurantId });
  });

  socket.on('restaurant:toggle-status', async (isOpen, callback) => {
    try {
      if (socket.userRole !== 'restaurant') {
        return callback?.({ success: false, error: 'Not authorized' });
      }

      const restaurant = await Restaurant.findOneAndUpdate(
        { ownerId: socket.userId },
        { $set: { isOpen } },
        { new: true }
      );

      if (!restaurant) {
        return callback?.({ success: false, error: 'Restaurant not found' });
      }

      await emitRestaurantStatusChanged(restaurant._id, isOpen);

      callback?.({ 
        success: true, 
        data: { 
          restaurantId: restaurant._id, 
          isOpen: restaurant.isOpen 
        }
      });

      logger.info('Restaurant status toggled', { restaurantId: restaurant._id, isOpen });
    } catch (error) {
      logger.error('Error toggling restaurant status', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('restaurant:get-orders', async (status, callback) => {
    try {
      const Order = require('../models/Order');
      
      if (socket.userRole !== 'restaurant') {
        return callback?.({ success: false, error: 'Not authorized' });
      }

      const query = { restaurant: socket.restaurantId };
      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate('userId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(50);

      callback?.({ success: true, data: orders });
    } catch (error) {
      logger.error('Error getting restaurant orders', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('restaurant:get-stats', async (callback) => {
    try {
      const Order = require('../models/Order');
      
      if (socket.userRole !== 'restaurant') {
        return callback?.({ success: false, error: 'Not authorized' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayOrders, pendingOrders, totalRevenue] = await Promise.all([
        Order.countDocuments({
          restaurant: socket.restaurantId,
          createdAt: { $gte: today },
        }),
        Order.countDocuments({
          restaurant: socket.restaurantId,
          status: { $in: ['placed', 'confirmed', 'preparing'] },
        }),
        Order.aggregate([
          {
            $match: {
              restaurant: require('mongoose').Types.ObjectId(socket.restaurantId),
              status: 'delivered',
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$pricing.grandTotal' },
            }
          }
        ]),
      ]);

      callback?.({
        success: true,
        data: {
          todayOrders,
          pendingOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
        }
      });
    } catch (error) {
      logger.error('Error getting restaurant stats', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('restaurant:update-availability', async (productId, isAvailable, callback) => {
    try {
      if (socket.userRole !== 'restaurant') {
        return callback?.({ success: false, error: 'Not authorized' });
      }

      const Product = require('../models/Product');
      
      const product = await Product.findOneAndUpdate(
        { _id: productId, restaurantId: socket.restaurantId },
        { $set: { isAvailable } },
        { new: true }
      );

      if (!product) {
        return callback?.({ success: false, error: 'Product not found' });
      }

      await emitProductAvailabilityChanged(socket.restaurantId, productId, isAvailable);

      callback?.({ success: true });

      logger.info('Product availability updated', { productId, isAvailable });
    } catch (error) {
      logger.error('Error updating product availability', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('restaurant:heartbeat', async () => {
    socket.emit('restaurant:heartbeat-ack', { timestamp: new Date() });
  });
};

module.exports = {
  emitRestaurantStatusChanged,
  emitRestaurantUpdated,
  emitProductAvailabilityChanged,
  emitRestaurantNewReview,
  emitRestaurantOnline,
  emitRestaurantOffline,
  emitRestaurantNewOrder,
  emitRestaurantOrderAccepted,
  emitRestaurantOrderRejected,
  joinRestaurantRoom,
  leaveRestaurantRoom,
  setupRestaurantSocketHandlers,
};
