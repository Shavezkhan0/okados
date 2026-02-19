import express from 'express';
const router = express.Router();

import reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';

router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/my-reviews', authenticate, reviewController.getMyReviews);

router.post('/', authenticate, reviewController.createReview);
router.get('/', authenticate, isAdmin, reviewController.getAllReviews);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);
router.post('/:id/report', authenticate, reviewController.reportReview);

export default router;
