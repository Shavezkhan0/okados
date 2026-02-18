/**
 * Restaurant Routes
 * @module routes/restaurant.routes
 */

const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurant.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/auth.middleware');
const { isAdmin, isRestaurant } = require('../middlewares/authorization.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  restaurantListValidator,
  nearbyRestaurantsValidator,
  restaurantRegistrationValidator,
  restaurantUpdateValidator,
  bankDetailsValidator,
} = require('../validators/restaurant.validator');

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

module.exports = router;
