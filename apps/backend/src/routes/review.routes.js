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
router.get('/my-reviews', auth, reviewController.getMyReviews);

router.post('/', auth, reviewController.createReview);
router.get('/', auth, isAdmin, reviewController.getAllReviews);
router.put('/:id', auth, reviewController.updateReview);
router.delete('/:id', auth, reviewController.deleteReview);
router.post('/:id/report', auth, reviewController.reportReview);

module.exports = router;
