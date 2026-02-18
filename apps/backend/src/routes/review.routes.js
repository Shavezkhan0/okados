/**
 * Review Routes
 * @module routes/review.routes
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const auth = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/authorization.middleware');

router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/my-reviews', auth.authenticate, reviewController.getMyReviews);

router.post('/', auth.authenticate, reviewController.createReview);
router.get('/', auth.authenticate, isAdmin, reviewController.getAllReviews);
router.put('/:id', auth.authenticate, reviewController.updateReview);
router.delete('/:id', auth.authenticate, reviewController.deleteReview);
router.post('/:id/report', auth.authenticate, reviewController.reportReview);

module.exports = router;
