/**
 * Coupon Controller
 * Handles coupon-related operations
 * @module controllers/coupon.controller
 */

const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { getPaginationMeta } = require('../utils/helpers');

/**
 * @desc Get all coupons (Admin)
 * @route GET /api/v1/coupons
 * @access Private (Admin)
 */
const getCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive } = req.query;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const total = await Coupon.countDocuments(query);
  const coupons = await Coupon.find(query)
    .populate('applicableRestaurants', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { coupons }, pagination);
});

/**
 * @desc Get valid coupons for user
 * @route GET /api/v1/coupons/valid
 * @access Private
 */
const getValidCoupons = asyncHandler(async (req, res) => {
  const { restaurantId } = req.query;
  const now = new Date();

  const query = {
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  };

  if (restaurantId) {
    query.$or = [
      { applicableRestaurants: { $size: 0 } },
      { applicableRestaurants: restaurantId },
    ];
  }

  const coupons = await Coupon.find(query)
    .populate('applicableRestaurants', 'name');

  const validCoupons = coupons.filter(coupon => {
    return !coupon.totalUsageLimit || coupon.usedCount < coupon.totalUsageLimit;
  });

  ApiResponse.success(res, { coupons: validCoupons });
});

/**
 * @desc Validate coupon
 * @route POST /api/v1/coupons/validate
 * @access Private
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, restaurantId, orderTotal } = req.body;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    return ApiResponse.badRequest(res, 'Invalid coupon code');
  }

  if (!coupon.isActive) {
    return ApiResponse.badRequest(res, 'Coupon is not active');
  }

  const now = new Date();
  if (coupon.startsAt > now) {
    return ApiResponse.badRequest(res, 'Coupon is not yet active');
  }

  if (coupon.expiresAt < now) {
    return ApiResponse.badRequest(res, 'Coupon has expired');
  }

  if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) {
    return ApiResponse.badRequest(res, 'Coupon usage limit exceeded');
  }

  if (orderTotal < coupon.minimumOrderValue) {
    return ApiResponse.badRequest(res, `Minimum order value of ₹${coupon.minimumOrderValue} required`);
  }

  if (coupon.applicableRestaurants.length > 0 && restaurantId) {
    if (!coupon.applicableRestaurants.includes(restaurantId)) {
      return ApiResponse.badRequest(res, 'Coupon not valid for this restaurant');
    }
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderTotal * coupon.discountValue) / 100;
    if (coupon.maximumDiscountValue) {
      discount = Math.min(discount, coupon.maximumDiscountValue);
    }
  } else {
    discount = coupon.discountValue;
  }

  ApiResponse.success(res, {
    valid: true,
    discount,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  });
});

/**
 * @desc Create coupon (Admin)
 * @route POST /api/v1/coupons
 * @access Private (Admin)
 */
const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  ApiResponse.created(res, { coupon }, 'Coupon created successfully');
});

/**
 * @desc Update coupon (Admin)
 * @route PUT /api/v1/coupons/:id
 * @access Private (Admin)
 */
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return ApiResponse.notFound(res, 'Coupon not found');
  }

  ApiResponse.success(res, { coupon }, 'Coupon updated successfully');
});

/**
 * @desc Delete coupon (Admin)
 * @route DELETE /api/v1/coupons/:id
 * @access Private (Admin)
 */
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return ApiResponse.notFound(res, 'Coupon not found');
  }

  ApiResponse.success(res, {}, 'Coupon deleted successfully');
});

/**
 * @desc Toggle coupon status (Admin)
 * @route PUT /api/v1/coupons/:id/toggle
 * @access Private (Admin)
 */
const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return ApiResponse.notFound(res, 'Coupon not found');
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  ApiResponse.success(res, { isActive: coupon.isActive }, `Coupon is now ${coupon.isActive ? 'active' : 'inactive'}`);
});

module.exports = {
  getCoupons,
  getValidCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
};
