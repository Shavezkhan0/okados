import express from 'express';
const router = express.Router();

import restaurantController from '../controllers/restaurant.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/auth.middleware.js';
import { isAdmin, isRestaurant } from '../middlewares/authorization.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import restaurantValidator from '../validators/restaurant.validator.js';

const {
  restaurantListValidator,
  nearbyRestaurantsValidator,
  restaurantRegistrationValidator,
  restaurantUpdateValidator,
  bankDetailsValidator,
} = restaurantValidator;

router.get('/', validate(restaurantListValidator), restaurantController.getAllRestaurants);
router.get('/nearby', validate(nearbyRestaurantsValidator), restaurantController.getNearbyRestaurants);
router.get('/search', restaurantController.searchRestaurants);
router.get('/cuisines', restaurantController.getRestaurantCuisines);
router.get('/slug/:slug', restaurantController.getRestaurantBySlug);
router.get('/:id/reviews', restaurantController.getRestaurantReviews);

router.post('/register', authenticate, validate(restaurantRegistrationValidator), restaurantController.registerRestaurant);

router.get('/me', authenticate, isRestaurant, restaurantController.getMyRestaurant);
router.put('/me', authenticate, isRestaurant, validate(restaurantUpdateValidator), restaurantController.updateMyRestaurant);
router.put('/me/toggle-open', authenticate, isRestaurant, restaurantController.toggleRestaurantStatus);
router.put('/me/bank-details', authenticate, isRestaurant, validate(bankDetailsValidator), restaurantController.updateBankDetails);
router.get('/me/orders', authenticate, isRestaurant, restaurantController.getMyOrders);
router.get('/me/analytics', authenticate, isRestaurant, restaurantController.getMyAnalytics);
router.get('/me/earnings', authenticate, isRestaurant, restaurantController.getMyEarnings);

export default router;
