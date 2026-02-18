/**
 * Notification Controller
 * Handles notification-related operations
 * @module controllers/notification.controller
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { getPaginationMeta } = require('../utils/helpers');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');

const logger = {
  info: (message, meta = {}) => console.log(`[NOTIFICATION CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[NOTIFICATION CONTROLLER ERROR] ${message}`, meta),
};

/**
 * @desc Get user notifications
 * @route GET /api/v1/notifications
 * @access Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { page = 1, limit = 20, isRead, type } = req.query;

  logger.info('Getting notifications', { userId });

  const query = { user: userId };
  
  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }
  
  if (type) {
    query.type = type;
  }

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { 
    notifications, 
    unreadCount,
    total 
  }, pagination);
});

/**
 * @desc Get unread notification count
 * @route GET /api/v1/notifications/unread-count
 * @access Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.userId;
  
  const count = await Notification.countDocuments({ 
    user: userId, 
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });
  
  logger.info('Get unread count', { userId, count });
  
  ApiResponse.success(res, { unreadCount: count });
});

/**
 * @desc Mark notification as read
 * @route PUT /api/v1/notifications/:id/read
 * @access Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  logger.info('Marking notification as read', { userId, notificationId: id });

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  ApiResponse.success(res, { notification }, 'Notification marked as read');
});

/**
 * @desc Mark all notifications as read
 * @route PUT /api/v1/notifications/read-all
 * @access Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.userId;

  logger.info('Marking all notifications as read', { userId });

  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  logger.info('All notifications marked as read', { userId, modifiedCount: result.modifiedCount });

  ApiResponse.success(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
});

/**
 * @desc Delete notification
 * @route DELETE /api/v1/notifications/:id
 * @access Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  logger.info('Deleting notification', { userId, notificationId: id });

  const notification = await Notification.findOneAndDelete({
    _id: id,
    user: userId,
  });

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  ApiResponse.success(res, {}, 'Notification deleted');
});

/**
 * @desc Delete all notifications
 * @route DELETE /api/v1/notifications
 * @access Private
 */
const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.userId;

  logger.info('Deleting all notifications', { userId });

  const result = await Notification.deleteMany({ user: userId });

  ApiResponse.success(res, { deletedCount: result.deletedCount }, 'All notifications deleted');
});

/**
 * @desc Send notification to user (Admin)
 * @route POST /api/v1/notifications/send
 * @access Private (Admin)
 */
const sendNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, body, data, sendPush, sendEmail: sendEmailNotification } = req.body;

  logger.info('Sending notification', { userId, type, title });

  if (sendPush) {
    await notificationService.sendToUser(userId, { type, title, body }, data);
  }

  if (sendEmailNotification) {
    const user = await User.findById(userId);
    if (user?.email) {
      await emailService.sendEmail(user.email, title, `<p>${body}</p>`);
    }
  }

  const notification = await Notification.create({
    user: userId,
    type: type || 'system',
    title,
    body,
    data,
    isRead: false,
    sentAt: new Date(),
  });

  ApiResponse.created(res, { notification }, 'Notification sent');
});

/**
 * @desc Send broadcast notification (Admin)
 * @route POST /api/v1/notifications/broadcast
 * @access Private (Admin)
 */
const broadcastNotification = asyncHandler(async (req, res) => {
  const { 
    type, 
    title, 
    body, 
    data, 
    targetAudience, 
    sendPush, 
    sendEmail: sendEmailNotification,
    excludeUserIds 
  } = req.body;

  logger.info('Broadcasting notification', { type, title, targetAudience });

  let query = { isActive: true };
  
  if (targetAudience === 'new_users') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query.createdAt = { $gte: thirtyDaysAgo };
  } else if (targetAudience === 'existing_users') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query.createdAt = { $lt: thirtyDaysAgo };
  } else if (targetAudience === 'restaurants') {
    query.role = 'restaurant';
  }

  if (excludeUserIds && excludeUserIds.length > 0) {
    query._id = { $nin: excludeUserIds };
  }

  const users = await User.find(query).select('_id email fcmTokens notificationPreferences');
  
  logger.info('Broadcasting to users', { count: users.length });

  const notifications = [];
  let pushSent = 0;
  let emailSent = 0;

  for (const user of users) {
    const notification = await Notification.create({
      user: user._id,
      type: type || 'system',
      title,
      body,
      data,
      isRead: false,
      sentAt: new Date(),
    });
    notifications.push(notification);

    if (sendPush && user.fcmTokens?.length > 0) {
      if (user.notificationPreferences?.push !== false) {
        await notificationService.sendMulticastNotification(user.fcmTokens, title, body, data);
        pushSent++;
      }
    }

    if (sendEmailNotification && user.email) {
      if (user.notificationPreferences?.email !== false) {
        await emailService.sendEmail(user.email, title, `<p>${body}</p>`);
        emailSent++;
      }
    }
  }

  logger.info('Broadcast completed', { 
    totalUsers: users.length, 
    pushSent, 
    emailSent 
  });

  ApiResponse.success(res, { 
    count: users.length,
    pushSent,
    emailSent,
  }, 'Broadcast sent successfully');
});

/**
 * @desc Get notification settings
 * @route GET /api/v1/notifications/settings
 * @access Private
 */
const getNotificationSettings = asyncHandler(async (req, res) => {
  const userId = req.userId;
  
  const user = await User.findById(userId).select('notificationPreferences');
  
  ApiResponse.success(res, { 
    preferences: user.notificationPreferences || {
      push: true,
      email: true,
      sms: false,
      promotional: true,
    }
  });
});

/**
 * @desc Update notification settings
 * @route PUT /api/v1/notifications/settings
 * @access Private
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { push, email, sms, promotional } = req.body;

  logger.info('Updating notification settings', { userId });

  const updateData = {};
  
  if (typeof push === 'boolean') updateData['notificationPreferences.push'] = push;
  if (typeof email === 'boolean') updateData['notificationPreferences.email'] = email;
  if (typeof sms === 'boolean') updateData['notificationPreferences.sms'] = sms;
  if (typeof promotional === 'boolean') updateData['notificationPreferences.promotional'] = promotional;

  await User.updateOne({ _id: userId }, { $set: updateData });

  ApiResponse.success(res, { message: 'Settings updated successfully' });
});

/**
 * @desc Subscribe to topic
 * @route POST /api/v1/notifications/subscribe
 * @access Private
 */
const subscribeToTopic = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { topic } = req.body;

  if (!topic) {
    return ApiResponse.badRequest(res, 'Topic is required');
  }

  logger.info('Subscribing to topic', { userId, topic });

  const user = await User.findById(userId).select('fcmTokens');
  
  if (!user?.fcmTokens?.length) {
    return ApiResponse.badRequest(res, 'No FCM tokens found');
  }

  const result = await notificationService.subscribeToTopic(user.fcmTokens, topic);

  if (result.success) {
    ApiResponse.success(res, { count: result.count }, 'Subscribed to topic');
  } else {
    ApiResponse.error(res, 'Failed to subscribe to topic');
  }
});

/**
 * @desc Unsubscribe from topic
 * @route POST /api/v1/notifications/unsubscribe
 * @access Private
 */
const unsubscribeFromTopic = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { topic } = req.body;

  if (!topic) {
    return ApiResponse.badRequest(res, 'Topic is required');
  }

  logger.info('Unsubscribing from topic', { userId, topic });

  const user = await User.findById(userId).select('fcmTokens');
  
  if (!user?.fcmTokens?.length) {
    return ApiResponse.badRequest(res, 'No FCM tokens found');
  }

  const result = await notificationService.unsubscribeFromTopic(user.fcmTokens, topic);

  if (result.success) {
    ApiResponse.success(res, { count: result.count }, 'Unsubscribed from topic');
  } else {
    ApiResponse.error(res, 'Failed to unsubscribe from topic');
  }
});

/**
 * @desc Cleanup old notifications
 * @route DELETE /api/v1/notifications/cleanup
 * @access Private (Admin)
 */
const cleanupOldNotifications = asyncHandler(async (req, res) => {
  const { daysOld = 30 } = req.query;

  logger.info('Cleaning up old notifications', { daysOld });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

  const result = await Notification.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });

  logger.info('Cleanup completed', { deletedCount: result.deletedCount });

  ApiResponse.success(res, { deletedCount: result.deletedCount }, 'Old notifications cleaned up');
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendNotification,
  broadcastNotification,
  getNotificationSettings,
  updateNotificationSettings,
  subscribeToTopic,
  unsubscribeFromTopic,
  cleanupOldNotifications,
};
