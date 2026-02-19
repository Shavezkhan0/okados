/**
 * Notification Service
 * Handles push notifications using Firebase Cloud Messaging
 * @module services/notification.service
 */

import { admin } from '../config/firebase.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const logger = {
  info: (message, meta = {}) => console.log(`[NOTIFICATION SERVICE] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[NOTIFICATION SERVICE ERROR] ${message}`, meta),
  warn: (message, meta = {}) => console.warn(`[NOTIFICATION SERVICE WARN] ${message}`, meta),
};

const MAX_BATCH_SIZE = 500;

class NotificationService {
  constructor() {
    this.isConfigured = !!process.env.FIREBASE_PROJECT_ID;
  }

  async getUserWithTokens(userId) {
    return User.findById(userId).select('name email phone fcmTokens notificationPreferences');
  }

  async sendPushNotification(fcmToken, title, body, data = {}) {
    try {
      if (!this.isConfigured || !fcmToken) {
        logger.warn('Push notification not configured or no token', { fcmToken: !!fcmToken });
        return { success: false, mock: true };
      }

      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        token: fcmToken,
        android: {
          priority: 'high',
          notification: {
            channel_id: 'okados_orders',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      logger.info('Push notification sent', { messageId: response });
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Push notification error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async sendMulticastNotification(fcmTokens, title, body, data = {}) {
    try {
      if (!this.isConfigured || !fcmTokens?.length) {
        return { success: false, mock: true };
      }

      const validTokens = fcmTokens.filter(token => token && token.length > 0);
      
      if (validTokens.length === 0) {
        return { success: false, error: 'No valid tokens' };
      }

      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        tokens: validTokens,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      logger.info('Multicast notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error('Multicast notification error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async sendToUser(userId, notification, options = {}) {
    try {
      const user = await this.getUserWithTokens(userId);
      
      if (!user) {
        logger.warn('User not found', { userId });
        return { success: false, error: 'User not found' };
      }

      if (options.checkPreferences !== false) {
        if (user.notificationPreferences?.push === false) {
          logger.info('Push notifications disabled by user', { userId });
          return { success: false, error: 'Push disabled by user' };
        }
      }

      const storedNotification = await this.createNotification(
        userId,
        notification.type || 'system',
        notification.title,
        notification.body,
        notification.data
      );

      if (user.fcmTokens && user.fcmTokens.length > 0) {
        const result = await this.sendMulticastNotification(
          user.fcmTokens,
          notification.title,
          notification.body,
          notification.data
        );

        if (result.success && result.failureCount > 0) {
          await this.cleanupInvalidTokens(user, result.failureCount);
        }

        return result;
      }

      logger.info('No FCM tokens for user', { userId });
      return { success: true, stored: true };
    } catch (error) {
      logger.error('Send to user error', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }

  async cleanupInvalidTokens(user, failureCount) {
    try {
      if (failureCount > 0 && user.fcmTokens.length > 0) {
        const invalidTokens = user.fcmTokens.slice(0, failureCount);
        const validTokens = user.fcmTokens.slice(failureCount);
        
        await User.updateOne(
          { _id: user._id },
          { $set: { fcmTokens: validTokens } }
        );
        
        logger.info('Cleaned up invalid tokens', { userId: user._id, count: failureCount });
      }
    } catch (error) {
      logger.error('Error cleaning up tokens', { error: error.message });
    }
  }

  async sendBulkNotifications(userIds, notification, options = {}) {
    const results = {
      total: userIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const batches = [];
    for (let i = 0; i < userIds.length; i += MAX_BATCH_SIZE) {
      batches.push(userIds.slice(i, i + MAX_BATCH_SIZE));
    }

    for (const batch of batches) {
      try {
        const users = await User.find({ _id: { $in: batch } })
          .select('fcmTokens notificationPreferences');

        for (const user of users) {
          if (options.checkPreferences !== false && user.notificationPreferences?.push === false) {
            results.failed++;
            continue;
          }

          if (user.fcmTokens && user.fcmTokens.length > 0) {
            const result = await this.sendMulticastNotification(
              user.fcmTokens,
              notification.title,
              notification.body,
              notification.data
            );

            if (result.success) {
              results.successful += result.successCount;
              results.failed += result.failureCount;
            }
          } else {
            results.failed++;
          }
        }

        await this.createNotification(batch, notification.type, notification.title, notification.body, notification.data);
      } catch (error) {
        logger.error('Batch send error', { error: error.message });
        results.errors.push(error.message);
      }
    }

    logger.info('Bulk notifications completed', results);
    return results;
  }

  async sendTopicNotification(topic, notification) {
    try {
      if (!this.isConfigured) {
        return { success: false, mock: true };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        topic,
      };

      const response = await admin.messaging().send(message);
      logger.info('Topic notification sent', { topic, messageId: response });
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Topic notification error', { error: error.message, topic });
      return { success: false, error: error.message };
    }
  }

  async subscribeToTopic(tokens, topic) {
    try {
      if (!this.isConfigured) {
        return { success: false, mock: true };
      }

      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info('Subscribed to topic', { topic, count: response.successCount });
      return { success: true, count: response.successCount };
    } catch (error) {
      logger.error('Subscribe to topic error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async unsubscribeFromTopic(tokens, topic) {
    try {
      if (!this.isConfigured) {
        return { success: false, mock: true };
      }

      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info('Unsubscribed from topic', { topic, count: response.successCount });
      return { success: true, count: response.successCount };
    } catch (error) {
      logger.error('Unsubscribe from topic error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async createNotification(userId, type, title, body, data = {}) {
    try {
      const notification = await Notification.create({
        user: userId,
        type: type || 'system',
        title,
        body,
        data,
        isRead: false,
        sentAt: new Date(),
      });

      return notification;
    } catch (error) {
      logger.error('Create notification error', { error: error.message });
      return null;
    }
  }

  async sendAndStore(userId, type, title, body, data = {}) {
    const notification = await this.createNotification(userId, type, title, body, data);

    const user = await this.getUserWithTokens(userId);
    
    if (user?.fcmTokens?.length > 0) {
      const result = await this.sendMulticastNotification(
        user.fcmTokens,
        title,
        body,
        data
      );
      return { notification, pushResult: result };
    }

    return { notification, pushResult: null };
  }

  async scheduleNotification(userId, notification, scheduledFor) {
    try {
      const scheduledNotification = await Notification.create({
        user: userId,
        type: notification.type || 'system',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        isScheduled: true,
        scheduledFor: new Date(scheduledFor),
        status: 'pending',
      });

      logger.info('Notification scheduled', { 
        userId, 
        scheduledFor: scheduledNotification.scheduledFor 
      });

      return scheduledNotification;
    } catch (error) {
      logger.error('Schedule notification error', { error: error.message });
      return null;
    }
  }

  async notifyOrderStatus(order, status) {
    const user = order.userId || order.user;
    
    const titles = {
      placed: 'Order Placed!',
      confirmed: 'Order Confirmed!',
      preparing: 'Order Being Prepared',
      ready: 'Order Ready!',
      picked_up: 'Order Picked Up',
      on_way: 'Order On The Way',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled',
    };

    const messages = {
      placed: `Your order #${order.orderNumber} has been placed successfully.`,
      confirmed: `Your order #${order.orderNumber} has been confirmed.`,
      preparing: `Your order #${order.orderNumber} is being prepared.`,
      ready: `Your order #${order.orderNumber} is ready for pickup!`,
      picked_up: `Your order #${order.orderNumber} has been picked up.`,
      on_way: `Your order #${order.orderNumber} is on its way!`,
      delivered: `Your order #${order.orderNumber} has been delivered. Enjoy your meal!`,
      cancelled: `Your order #${order.orderNumber} has been cancelled.`,
    };

    return this.sendAndStore(
      user,
      `order_${status}`,
      titles[status] || 'Order Update',
      messages[status] || `Order #${order.orderNumber} update`,
      { orderId: order._id?.toString() || order.orderId, status }
    );
  }

  async notifyPaymentStatus(order, status) {
    const user = order.userId;
    
    const titles = {
      pending: 'Payment Pending',
      completed: 'Payment Successful!',
      failed: 'Payment Failed',
      refunded: 'Payment Refunded',
    };

    const messages = {
      pending: `Your payment for order #${order.orderNumber} is pending.`,
      completed: `Your payment for order #${order.orderNumber} was successful.`,
      failed: `Your payment for order #${order.orderNumber} failed. Please try again.`,
      refunded: `Your payment for order #${order.orderNumber} has been refunded.`,
    };

    return this.sendAndStore(
      user,
      `payment_${status}`,
      titles[status] || 'Payment Update',
      messages[status] || `Payment update for order #${order.orderNumber}`,
      { orderId: order._id?.toString() || order.orderId, status }
    );
  }

  async notifyNewReview(review, restaurantOwnerId) {
    return this.sendAndStore(
      restaurantOwnerId,
      'new_review',
      'New Review Received!',
      `You received a ${review.ratings?.food || review.rating}-star review.`,
      { orderId: review.orderId, restaurantId: review.restaurantId }
    );
  }

  async notifyPromotional(userId, offer) {
    const user = await this.getUserWithTokens(userId);
    
    if (user?.notificationPreferences?.promotional === false) {
      return { success: false, error: 'Promotional notifications disabled' };
    }

    return this.sendAndStore(
      userId,
      'promotional',
      offer.title,
      offer.description,
      { offerId: offer._id, code: offer.code }
    );
  }

  async notifyAdmin(title, body, data = {}) {
    const admins = await User.find({ role: 'admin' }).select('_id');
    
    for (const admin of admins) {
      await this.sendToUser(admin._id, { type: 'system', title, body }, data);
    }
  }
}

export default new NotificationService();
