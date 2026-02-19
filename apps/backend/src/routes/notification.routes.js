import express from 'express';
const router = express.Router();

import notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';

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

export default router;
