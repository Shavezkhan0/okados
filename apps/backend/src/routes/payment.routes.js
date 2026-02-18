/**
 * Payment Routes
 * @module routes/payment.routes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/authorization.middleware');
const validate = require('../middlewares/validation.middleware');

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

module.exports = router;
