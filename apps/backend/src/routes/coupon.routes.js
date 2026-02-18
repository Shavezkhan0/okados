/**
 * Coupon Routes
 * @module routes/coupon.routes
 */

const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const auth = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/authorization.middleware');

router.get('/valid', auth.authenticate, couponController.getValidCoupons);
router.post('/validate', auth.authenticate, couponController.validateCoupon);

router.get('/', auth.authenticate, isAdmin, couponController.getCoupons);
router.post('/', auth.authenticate, isAdmin, couponController.createCoupon);
router.put('/:id', auth.authenticate, isAdmin, couponController.updateCoupon);
router.delete('/:id', auth.authenticate, isAdmin, couponController.deleteCoupon);
router.put('/:id/toggle', auth.authenticate, isAdmin, couponController.toggleCouponStatus);

module.exports = router;
