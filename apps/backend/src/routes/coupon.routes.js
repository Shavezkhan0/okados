import express from 'express';
const router = express.Router();

import couponController from '../controllers/coupon.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';

router.get('/valid', authenticate, couponController.getValidCoupons);
router.post('/validate', authenticate, couponController.validateCoupon);

router.get('/', authenticate, isAdmin, couponController.getCoupons);
router.post('/', authenticate, isAdmin, couponController.createCoupon);
router.put('/:id', authenticate, isAdmin, couponController.updateCoupon);
router.delete('/:id', authenticate, isAdmin, couponController.deleteCoupon);
router.put('/:id/toggle', authenticate, isAdmin, couponController.toggleCouponStatus);

export default router;
