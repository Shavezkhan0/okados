/**
 * Notification Model
 * Represents user notifications in the Okados platform
 * @module models/Notification
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  body: {
    type: String,
    required: [true, 'Notification body is required'],
    trim: true,
    maxlength: [500, 'Body cannot exceed 500 characters'],
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  type: {
    type: String,
    enum: ['order', 'promotion', 'announcement', 'system', 'chat', 'offer'],
    default: 'system',
    index: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  readAt: {
    type: Date,
  },
  imageUrl: {
    type: String,
  },
  actionUrl: {
    type: String,
  },
  priority: {
    type: String,
    enum: ['high', 'normal', 'low'],
    default: 'normal',
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

/**
 * Compound indexes
 */
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Static method to create and send notification
 * @param {string} userId - User ID
 * @param {object} data - Notification data
 * @returns {Promise<Notification>}
 */
notificationSchema.statics.send = async function (userId, data) {
  const notification = await this.create({
    userId,
    title: data.title,
    body: data.body,
    data: data.data || {},
    type: data.type || 'system',
    imageUrl: data.imageUrl,
    actionUrl: data.actionUrl,
    priority: data.priority || 'normal',
    expiresAt: data.expiresAt,
  });

  return notification;
};

/**
 * Static method to send bulk notifications
 * @param {string[]} userIds - Array of User IDs
 * @param {object} data - Notification data
 * @returns {Promise<Notification[]>}
 */
notificationSchema.statics.sendBulk = async function (userIds, data) {
  const notifications = userIds.map(userId => ({
    userId,
    title: data.title,
    body: data.body,
    data: data.data || {},
    type: data.type || 'system',
    imageUrl: data.imageUrl,
    actionUrl: data.actionUrl,
    priority: data.priority || 'normal',
    expiresAt: data.expiresAt,
  }));

  return this.insertMany(notifications);
};

/**
 * Static method to get unread count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });
};

/**
 * Static method to get user notifications
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<Notification[]>}
 */
notificationSchema.statics.getUserNotifications = function (userId, options = {}) {
  const { limit = 20, skip = 0, unreadOnly = false } = options;

  const query = {
    userId,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  };

  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Static method to mark all notifications as read for user
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * Static method to delete old notifications
 * @param {number} daysOld - Delete notifications older than this many days
 * @returns {Promise<object>}
 */
notificationSchema.statics.cleanupOldNotifications = function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
