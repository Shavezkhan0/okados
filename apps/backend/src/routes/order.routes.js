/**
 * Order Routes
 * @module routes/order.routes
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/auth.middleware');
const { isAdmin, isRestaurant } = require('../middlewares/authorization.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  createOrderValidator,
  orderIdValidator,
  updateStatusValidator,
  cancelOrderValidator,
  rateOrderValidator,
  orderListValidator,
} = require('../validators/order.validator');

router.use(authenticate);

router.post('/', validate(createOrderValidator), orderController.createOrder);
router.post('/:id/verify-payment', orderIdValidator, orderController.verifyPayment);

router.get('/users/orders', orderController.getUserOrders);
router.get('/restaurant', isRestaurant, orderController.getRestaurantOrders);
router.get('/statistics', isAdmin, orderController.getOrderStatistics);
router.get('/', isAdmin, validate(orderListValidator), orderController.getAllOrders);

router.get('/:id', validate(orderIdValidator), orderController.getOrderById);
router.get('/:id/track', validate(orderIdValidator), orderController.trackOrder);

router.post('/:id/cancel', validate(cancelOrderValidator), orderController.cancelOrder);
router.post('/:id/review', validate(rateOrderValidator), orderController.rateOrder);

router.put('/:id/accept', isRestaurant, validate(orderIdValidator), orderController.acceptOrder);
router.put('/:id/reject', isRestaurant, validate(orderIdValidator), orderController.rejectOrder);
router.put('/:id/status', isRestaurant, validate(updateStatusValidator), orderController.updateOrderStatus);

module.exports = router;
