/**
 * Coupon Routes
 * @module routes/coupon.routes
 */

const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const auth = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/authorization.middleware');

router.get('/valid', auth, couponController.getValidCoupons);
router.post('/validate', auth, couponController.validateCoupon);

router.get('/', auth, isAdmin, couponController.getCoupons);
router.post('/', auth, isAdmin, couponController.createCoupon);
router.put('/:id', auth, isAdmin, couponController.updateCoupon);
router.delete('/:id', auth, isAdmin, couponController.deleteCoupon);
router.put('/:id/toggle', auth, isAdmin, couponController.toggleCouponStatus);

module.exports = router;
