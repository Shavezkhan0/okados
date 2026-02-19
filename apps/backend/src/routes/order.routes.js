import express from 'express';
const router = express.Router();

import orderController from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/auth.middleware.js';
import { isAdmin, isRestaurant } from '../middlewares/authorization.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import orderValidator from '../validators/order.validator.js';

const {
  createOrderValidator,
  orderIdValidator,
  updateStatusValidator,
  cancelOrderValidator,
  rateOrderValidator,
  orderListValidator,
} = orderValidator;

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

export default router;
