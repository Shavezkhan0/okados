import express from 'express';
const router = express.Router();

import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';
import validate from '../middlewares/validation.middleware.js';

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

router.get('/methods', paymentController.getPaymentMethods);
router.get('/cod/check', paymentController.checkCodAvailability);

router.use(authenticate);

router.post('/create-order', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/:orderId/details', paymentController.getPaymentDetails);

router.post('/refund', isAdmin, paymentController.initiateRefund);

export default router;
