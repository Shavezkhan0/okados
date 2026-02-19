/**
 * Tracking Socket Events
 * @module sockets/tracking.socket
 */

import {
  getIO,
  emitToUser,
  emitToOrder,
  emitToAdmin,
  generateRoomName,
  ROOM_TYPES,
  emitToRoom,
} from './index.js';

const logger = {
  info: (message, meta = {}) => console.log(`[TRACKING SOCKET] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[TRACKING SOCKET ERROR] ${message}`, meta),
};

import Order from '../models/Order.js';

const activeTrackers = new Map();

const subscribeToLocation = (socket, orderId, callback) => {
  const room = generateRoomName(ROOM_TYPES.TRACKING, orderId);
  socket.join(room);

  if (!activeTrackers.has(orderId)) {
    activeTrackers.set(orderId, new Set());
  }
  activeTrackers.get(orderId).add(socket.id);

  logger.info('Socket subscribed to location tracking', { 
    socketId: socket.id, 
    orderId,
    totalTrackers: activeTrackers.get(orderId).size 
  });

  callback?.({ 
    success: true, 
    message: `Subscribed to order ${orderId} tracking` 
  });
};

const unsubscribeFromLocation = (socket, orderId) => {
  const room = generateRoomName(ROOM_TYPES.TRACKING, orderId);
  socket.leave(room);

  if (activeTrackers.has(orderId)) {
    activeTrackers.get(orderId).delete(socket.id);
    
    if (activeTrackers.get(orderId).size === 0) {
      activeTrackers.delete(orderId);
    }
  }

  logger.info('Socket unsubscribed from location tracking', { 
    socketId: socket.id, 
    orderId 
  });
};

const emitLocationUpdate = (orderId, coordinates, metadata = {}) => {
  const locationData = {
    orderId,
    coordinates: {
      lat: coordinates.lat || coordinates.latitude,
      lng: coordinates.lng || coordinates.longitude,
    },
    timestamp: new Date(),
    accuracy: coordinates.accuracy || null,
    speed: coordinates.speed || null,
    heading: coordinates.heading || null,
    ...metadata,
  };

  const room = generateRoomName(ROOM_TYPES.TRACKING, orderId);
  emitToRoom(room, 'location:update', locationData);

  logger.info('Location update emitted', { 
    orderId, 
    lat: locationData.coordinates.lat, 
    lng: locationData.coordinates.lng 
  });
};

const emitEstimatedTimeUpdate = (orderId, estimatedTime, distance = null) => {
  const etaData = {
    orderId,
    estimatedTime,
    distance,
    timestamp: new Date(),
  };

  emitToOrder(orderId, 'location:eta-update', etaData);

  logger.info('ETA update emitted', { orderId, estimatedTime, distance });
};

const emitDeliveryPartnerLocation = async (orderId, deliveryPartnerId, coordinates) => {
  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      logger.warn('Order not found for location update', { orderId });
      return;
    }

    if (order.userId.toString() !== deliveryPartnerId) {
      logger.warn('Unauthorized location update attempt', { orderId, deliveryPartnerId });
      return;
    }

    emitLocationUpdate(orderId, coordinates, {
      type: 'delivery_partner',
      deliveryPartnerId,
    });

    if (order.userId) {
      emitToUser(order.userId.toString(), 'delivery:location-update', {
        orderId,
        coordinates,
        timestamp: new Date(),
      });
    }

    logger.info('Delivery partner location emitted', { orderId, deliveryPartnerId });
  } catch (error) {
    logger.error('Error emitting delivery partner location', { error: error.message });
  }
};

const emitRestaurantLocation = async (orderId, restaurantId, coordinates) => {
  try {
    const order = await Order.findById(orderId);
    
    if (!order || order.restaurantId.toString() !== restaurantId.toString()) {
      logger.warn('Unauthorized restaurant location update', { orderId, restaurantId });
      return;
    }

    emitLocationUpdate(orderId, coordinates, {
      type: 'restaurant',
      restaurantId,
    });

    logger.info('Restaurant location emitted', { orderId, restaurantId });
  } catch (error) {
    logger.error('Error emitting restaurant location', { error: error.message });
  }
};

const startLiveTracking = async (socket, orderId, callback) => {
  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      return callback?.({ success: false, error: 'Order not found' });
    }

    const canTrack = 
      order.userId.toString() === socket.userId ||
      order.deliveryPartnerId?.toString() === socket.userId ||
      socket.userRole === 'admin' ||
      (socket.userRole === 'restaurant' && order.restaurantId.toString() === socket.restaurantId);

    if (!canTrack) {
      return callback?.({ success: false, error: 'Not authorized to track this order' });
    }

    subscribeToLocation(socket, orderId, callback);

    const initialData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryAddress: order.deliveryAddress,
    };

    socket.emit('tracking:started', {
      success: true,
      data: initialData,
    });

    logger.info('Live tracking started', { orderId, userId: socket.userId });
  } catch (error) {
    logger.error('Error starting live tracking', { error: error.message });
    callback?.({ success: false, error: error.message });
  }
};

const stopLiveTracking = (socket, orderId) => {
  unsubscribeFromLocation(socket, orderId);
  
  socket.emit('tracking:stopped', {
    orderId,
    message: 'Stopped tracking order',
  });

  logger.info('Live tracking stopped', { orderId, userId: socket.userId });
};

const getActiveTrackersCount = (orderId) => {
  return activeTrackers.get(orderId)?.size || 0;
};

const isOrderBeingTracked = (orderId) => {
  return activeTrackers.has(orderId) && activeTrackers.get(orderId).size > 0;
};

const cleanupOrderTracking = (orderId) => {
  if (activeTrackers.has(orderId)) {
    const io = getIO();
    const room = generateRoomName(ROOM_TYPES.TRACKING, orderId);
    io.to(room).emit('tracking:order-completed', {
      orderId,
      message: 'Order delivery completed',
    });
    
    activeTrackers.delete(orderId);
    logger.info('Order tracking cleaned up', { orderId });
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const setupTrackingSocketHandlers = (socket) => {
  socket.on('location:subscribe', (orderId, callback) => {
    subscribeToLocation(socket, orderId, callback);
  });

  socket.on('location:unsubscribe', (orderId) => {
    unsubscribeFromLocation(socket, orderId);
  });

  socket.on('location:update', async (data, callback) => {
    try {
      const { orderId, coordinates } = data;

      if (!orderId || !coordinates) {
        return callback?.({ success: false, error: 'Order ID and coordinates required' });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return callback?.({ success: false, error: 'Order not found' });
      }

      if (socket.userRole === 'delivery_partner' && order.deliveryPartnerId?.toString() === socket.userId) {
        await emitDeliveryPartnerLocation(orderId, socket.userId, coordinates);
      } else if (socket.userRole === 'restaurant' && order.restaurantId.toString() === socket.restaurantId) {
        await emitRestaurantLocation(orderId, socket.restaurantId, coordinates);
      } else if (socket.userRole === 'admin') {
        emitLocationUpdate(orderId, coordinates, { updatedBy: socket.userId });
      } else {
        return callback?.({ success: false, error: 'Not authorized to update location' });
      }

      callback?.({ success: true });
    } catch (error) {
      logger.error('Error in location:update', { error: error.message });
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('tracking:start', (orderId, callback) => {
    startLiveTracking(socket, orderId, callback);
  });

  socket.on('tracking:stop', (orderId) => {
    stopLiveTracking(socket, orderId);
  });

  socket.on('tracking:get-status', (orderId, callback) => {
    const isTracked = isOrderBeingTracked(orderId);
    const trackerCount = getActiveTrackersCount(orderId);

    callback?.({
      success: true,
      data: {
        isBeingTracked: isTracked,
        activeTrackers: trackerCount,
      }
    });
  });

  socket.on('eta:request', async (orderId, callback) => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return callback?.({ success: false, error: 'Order not found' });
      }

      callback?.({
        success: true,
        data: {
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          status: order.status,
        }
      });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });
};

export {
  subscribeToLocation,
  unsubscribeFromLocation,
  emitLocationUpdate,
  emitEstimatedTimeUpdate,
  emitDeliveryPartnerLocation,
  emitRestaurantLocation,
  startLiveTracking,
  stopLiveTracking,
  getActiveTrackersCount,
  isOrderBeingTracked,
  cleanupOrderTracking,
  calculateDistance,
  setupTrackingSocketHandlers,
};
