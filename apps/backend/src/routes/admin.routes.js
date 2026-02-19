import express from 'express';
const router = express.Router();

import adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';

router.use(authenticate, isAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/analytics', adminController.getAnalytics);

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

router.get('/restaurants', adminController.getAllRestaurants);
router.get('/restaurants/pending', adminController.getPendingRestaurants);
router.put('/restaurants/:id/approve', adminController.approveRestaurant);
router.put('/restaurants/:id/reject', adminController.rejectRestaurant);
router.put('/restaurants/:id/commission', adminController.updateRestaurantCommission);
router.put('/restaurants/:id/toggle-status', adminController.toggleRestaurantStatus);
router.delete('/restaurants/:id', adminController.deleteRestaurant);

router.get('/orders', adminController.getAllOrders);
router.get('/orders/statistics', adminController.getOrderStatistics);
router.get('/orders/:id', adminController.getOrderById);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.put('/orders/:id/cancel', adminController.cancelOrder);

router.get('/coupons', adminController.getAllCoupons);
router.post('/coupons', adminController.createCoupon);
router.put('/coupons/:id', adminController.updateCoupon);
router.put('/coupons/:id/toggle-status', adminController.toggleCouponStatus);
router.delete('/coupons/:id', adminController.deleteCoupon);
router.get('/coupons/:id/usage', adminController.getCouponUsage);

router.get('/banners', adminController.getAllBanners);
router.post('/banners', adminController.createBanner);
router.put('/banners/:id', adminController.updateBanner);
router.delete('/banners/:id', adminController.deleteBanner);
router.put('/banners/reorder', adminController.reorderBanners);

router.get('/reviews/pending', adminController.getPendingReviews);
router.put('/reviews/:id/approve', adminController.approveReview);
router.put('/reviews/:id/reject', adminController.rejectReview);
router.delete('/reviews/:id', adminController.deleteReview);

router.get('/revenue', adminController.getRevenueAnalytics);
router.get('/payouts/pending', adminController.getPayoutsPending);
router.post('/payouts/:restaurantId', adminController.processPayout);

export default router;
