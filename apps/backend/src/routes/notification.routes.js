/**
 * Notification Routes
 * @module routes/notification.routes
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/authorization.middleware');

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/settings', notificationController.getNotificationSettings);

router.put('/settings', notificationController.updateNotificationSettings);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

router.delete('/:id', notificationController.deleteNotification);
router.delete('/', notificationController.deleteAllNotifications);

router.post('/subscribe', notificationController.subscribeToTopic);
router.post('/unsubscribe', notificationController.unsubscribeFromTopic);

router.post('/send', isAdmin, notificationController.sendNotification);
router.post('/broadcast', isAdmin, notificationController.broadcastNotification);

router.delete('/cleanup', isAdmin, notificationController.cleanupOldNotifications);

module.exports = router;
