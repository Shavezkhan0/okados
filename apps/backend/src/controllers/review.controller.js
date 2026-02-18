/**
 * Review Controller
 * Handles review-related operations
 * @module controllers/review.controller
 */

const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { getPaginationMeta } = require('../utils/helpers');

/**
 * @desc Create review
 * @route POST /api/v1/reviews
 * @access Private
 */
const createReview = asyncHandler(async (req, res) => {
  const { orderId, restaurantId, productId, rating, comment, images } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  if (order.user.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (order.status !== 'delivered') {
    return ApiResponse.badRequest(res, 'Can only review delivered orders');
  }

  const existingReview = await Review.findOne({ user: req.userId, order: orderId });
  if (existingReview) {
    return ApiResponse.badRequest(res, 'You have already reviewed this order');
  }

  const reviewData = {
    user: req.userId,
    order: orderId,
    rating,
    comment,
    images: images || [],
    isVerifiedPurchase: true,
  };

  if (restaurantId) {
    reviewData.restaurant = restaurantId;
  }

  if (productId) {
    reviewData.product = productId;
  }

  const review = await Review.create(reviewData);

  if (restaurantId) {
    const restaurantReviews = await Review.find({ restaurant: restaurantId });
    const avgRating = restaurantReviews.reduce((sum, r) => sum + r.rating, 0) / restaurantReviews.length;
    await Restaurant.findByIdAndUpdate(restaurantId, {
      'rating.average': Math.round(avgRating * 10) / 10,
      'rating.count': restaurantReviews.length,
    });
  }

  if (productId) {
    const productReviews = await Review.find({ product: productId });
    const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: productReviews.length,
    });
  }

  ApiResponse.created(res, { review }, 'Review submitted successfully');
});

/**
 * @desc Get reviews for restaurant
 * @route GET /api/v1/reviews/restaurant/:restaurantId
 * @access Public
 */
const getRestaurantReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const query = { restaurant: req.params.restaurantId };
  const total = await Review.countDocuments(query);

  const reviews = await Review.find(query)
    .populate('user', 'name avatar')
    .populate('product', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { reviews }, pagination);
});

/**
 * @desc Get reviews for product
 * @route GET /api/v1/reviews/product/:productId
 * @access Public
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const query = { product: req.params.productId };
  const total = await Review.countDocuments(query);

  const reviews = await Review.find(query)
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { reviews }, pagination);
});

/**
 * @desc Get user's reviews
 * @route GET /api/v1/reviews/my-reviews
 * @access Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const query = { user: req.userId };
  const total = await Review.countDocuments(query);

  const reviews = await Review.find(query)
    .populate('restaurant', 'name logo')
    .populate('product', 'name image')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { reviews }, pagination);
});

/**
 * @desc Update review
 * @route PUT /api/v1/reviews/:id
 * @access Private
 */
const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment, images } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return ApiResponse.notFound(res, 'Review not found');
  }

  if (review.user.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  if (rating) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  if (images) review.images = images;

  await review.save();

  ApiResponse.success(res, { review }, 'Review updated successfully');
});

/**
 * @desc Delete review
 * @route DELETE /api/v1/reviews/:id
 * @access Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return ApiResponse.notFound(res, 'Review not found');
  }

  if (review.user.toString() !== req.userId && req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  await review.deleteOne();

  ApiResponse.success(res, {}, 'Review deleted successfully');
});

/**
 * @desc Report review
 * @route POST /api/v1/reviews/:id/report
 * @access Private
 */
const reportReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return ApiResponse.notFound(res, 'Review not found');
  }

  review.reported = true;
  review.reportReason = reason;
  await review.save();

  ApiResponse.success(res, {}, 'Review reported successfully');
});

/**
 * @desc Get all reviews (Admin)
 * @route GET /api/v1/reviews
 * @access Private (Admin)
 */
const getAllReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, reported } = req.query;

  const query = {};
  if (reported !== undefined) query.reported = reported === 'true';

  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query)
    .populate('user', 'name email')
    .populate('restaurant', 'name')
    .populate('product', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { reviews }, pagination);
});

module.exports = {
  createReview,
  getRestaurantReviews,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  reportReview,
  getAllReviews,
};
