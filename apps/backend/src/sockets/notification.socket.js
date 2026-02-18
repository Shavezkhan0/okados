/**
 * Notification Socket Events
 * @module sockets/notification.socket
 */

const {
  getIO,
  emitToUser,
  emitToAdmin,
  emitToRoom,
  broadcastToAll,
  isUserOnline,
  getOnlineUsersCount,
} = require('./index');

const logger = {
  info: (message, meta = {}) => console.log(`[NOTIFICATION SOCKET] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[NOTIFICATION SOCKET ERROR] ${message}`, meta),
};

const User = require('../models/User');
const Notification = require('../models/Notification');

const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PROMOTION: 'promotion',
  ANNOUNCEMENT: 'announcement',
  GENERAL: 'general',
  CHAT: 'chat',
  SYSTEM: 'system',
};

const emitNotification = async (userId, notification) => {
  try {
    const notificationData = {
      _id: notification._id || `notif_${Date.now()}`,
      type: notification.type || NOTIFICATION_TYPES.GENERAL,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      timestamp: new Date(),
      read: false,
    };

    emitToUser(userId, 'notification', notificationData);

    logger.info('Notification emitted', { userId, type: notification.type });
    return true;
  } catch (error) {
    logger.error('Error emitting notification', { error: error.message });
    return false;
  }
};

const emitOrderNotification = (userId, orderData, eventType) => {
  const titles = {
    placed: 'Order Placed',
    confirmed: 'Order Confirmed',
    preparing: 'Order Being Prepared',
    ready: 'Order Ready',
    dispatched: 'Order Dispatched',
    delivered: 'Order Delivered',
    cancelled: 'Order Cancelled',
  };

  const messages = {
    placed: `Your order #${orderData.orderNumber} has been placed successfully.`,
    confirmed: `Your order #${orderData.orderNumber} has been confirmed.`,
    preparing: `Your order #${orderData.orderNumber} is being prepared.`,
    ready: `Your order #${orderData.orderNumber} is ready!`,
    dispatched: `Your order #${orderData.orderNumber} is on its way.`,
    delivered: `Your order #${orderData.orderNumber} has been delivered. Enjoy!`,
    cancelled: `Your order #${orderData.orderNumber} has been cancelled.`,
  };

  const notification = {
    type: NOTIFICATION_TYPES.ORDER,
    title: titles[eventType] || 'Order Update',
    body: messages[eventType] || `Order #${orderData.orderNumber} update`,
    data: {
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      status: eventType,
    },
  };

  return emitNotification(userId, notification);
};

const emitPromotionNotification = (userId, promotion) => {
  const notification = {
    type: NOTIFICATION_TYPES.PROMOTION,
    title: promotion.title || 'Special Offer',
    body: promotion.body || promotion.description,
    data: {
      offerId: promotion.offerId,
      code: promotion.code,
      discount: promotion.discount,
    },
  };

  return emitNotification(userId, notification);
};

const emitAnnouncement = (announcement) => {
  const notification = {
    type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    title: announcement.title || 'Announcement',
    body: announcement.body,
    data: announcement.data || {},
  };

  broadcastToAll('notification', notification);

  logger.info('Announcement broadcasted', { title: announcement.title });
};

const emitBulkNotifications = async (userIds, notification) => {
  const results = await Promise.all(
    userIds.map(userId => emitNotification(userId, notification))
  );

  const successCount = results.filter(r => r).length;
  logger.info('Bulk notifications sent', { total: userIds.length, success: successCount });

  return { total: userIds.length, success: successCount };
};

const emitNotificationRead = (userId, notificationId) => {
  emitToUser(userId, 'notification:read', {
    notificationId,
    timestamp: new Date(),
  });
};

const emitAllNotificationsRead = (userId) => {
  emitToUser(userId, 'notification:all-read', {
    timestamp: new Date(),
  });
};

const saveAndEmitNotification = async (userId, notificationData) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type: notificationData.type || NOTIFICATION_TYPES.GENERAL,
      title: notificationData.title,
      message: notificationData.body || notificationData.message,
      data: notificationData.data,
    });

    await emitNotification(userId, notification);

    return notification;
  } catch (error) {
    logger.error('Error saving and emitting notification', { error: error.message });
    return null;
  }
};

const updateFCMToken = async (socket, fcmToken) => {
  try {
    if (!fcmToken || typeof fcmToken !== 'string') {
      return { success: false, error: 'Invalid FCM token' };
    }

    const user = await User.findById(socket.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const tokens = user.fcmTokens || [];
    
    if (!tokens.includes(fcmToken)) {
      tokens.push(fcmToken);
      
      await User.updateOne(
        { _id: socket.userId },
        { $set: { fcmTokens: tokens } }
      );
    }

    logger.info('FCM token updated', { userId: socket.userId });

    return { success: true, message: 'FCM token updated' };
  } catch (error) {
    logger.error('Error updating FCM token', { error: error.message });
    return { success: false, error: error.message };
  }
};

const removeFCMToken = async (socket, fcmToken) => {
  try {
    const user = await User.findById(socket.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const tokens = (user.fcmTokens || []).filter(t => t !== fcmToken);
    
    await User.updateOne(
      { _id: socket.userId },
      { $set: { fcmTokens: tokens } }
    );

    logger.info('FCM token removed', { userId: socket.userId });

    return { success: true, message: 'FCM token removed' };
  } catch (error) {
    logger.error('Error removing FCM token', { error: error.message });
    return { success: false, error: error.message };
  }
};

const setupNotificationSocketHandlers = (socket) => {
  socket.on('fcm:update', async (fcmToken, callback) => {
    const result = await updateFCMToken(socket, fcmToken);
    callback?.(result);
  });

  socket.on('fcm:remove', async (fcmToken, callback) => {
    const result = await removeFCMToken(socket, fcmToken);
    callback?.(result);
  });

  socket.on('notification:subscribe', (type) => {
    if (type) {
      socket.join(`notifications:${type}`);
      logger.info('Subscribed to notification type', { userId: socket.userId, type });
    }
  });

  socket.on('notification:unsubscribe', (type) => {
    if (type) {
      socket.leave(`notifications:${type}`);
      logger.info('Unsubscribed from notification type', { userId: socket.userId, type });
    }
  });

  socket.on('notification:read', (notificationId, callback) => {
    emitNotificationRead(socket.userId, notificationId);
    callback?.({ success: true });
  });

  socket.on('notification:read-all', async (callback) => {
    try {
      await Notification.updateMany(
        { user: socket.userId, read: false },
        { $set: { read: true } }
      );
      
      emitAllNotificationsRead(socket.userId);
      callback?.({ success: true });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('notification:get-unread-count', async (callback) => {
    try {
      const count = await Notification.countDocuments({
        user: socket.userId,
        read: false,
      });
      
      callback?.({ success: true, count });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });
};

const emitToNotificationType = (type, notification) => {
  const room = `notifications:${type}`;
  emitToRoom(room, 'notification', {
    ...notification,
    type,
    timestamp: new Date(),
  });
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ user: userId, read: false });
};

module.exports = {
  emitNotification,
  emitOrderNotification,
  emitPromotionNotification,
  emitAnnouncement,
  emitBulkNotifications,
  emitNotificationRead,
  emitAllNotificationsRead,
  saveAndEmitNotification,
  updateFCMToken,
  removeFCMToken,
  setupNotificationSocketHandlers,
  emitToNotificationType,
  getUnreadCount,
  NOTIFICATION_TYPES,
};
