import express from 'express';
const router = express.Router();

import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import authValidator from '../validators/auth.validator.js';

const {
  registerValidator,
  loginValidator,
  verifyOTPValidator,
  resendOTPValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = authValidator;

const authLimiter = (req, res, next) => {
  import('express-rate-limit').then(({ default: rateLimit }) => {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        message: 'Too many attempts. Please try again after 15 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    limiter(req, res, next);
  });
};

router.post('/register', authLimiter, validate(registerValidator), authController.register);
router.post('/login', authLimiter, validate(loginValidator), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/verify-otp', authLimiter, validate(verifyOTPValidator), authController.verifyOTP);
router.post('/resend-otp', authLimiter, validate(resendOTPValidator), authController.resendOTP);
router.post('/forgot-password', authLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidator), authController.resetPassword);
router.put('/change-password', authenticate, validate(changePasswordValidator), authController.changePassword);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

export default router;
