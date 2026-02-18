/**
 * Auth Controller
 * Handles authentication-related operations
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const smsService = require('../services/sms.service');
const emailService = require('../services/email.service');

const logger = {
  info: (message, meta = {}) => console.log(`[AUTH CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[AUTH CONTROLLER ERROR] ${message}`, meta),
};

/**
 * @desc Register a new user
 * @route POST /api/v1/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  logger.info('Registration attempt', { email, phone });

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });

  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      logger.info('Registration failed - email exists', { email });
      return ApiResponse.badRequest(res, 'Email already registered');
    }
    logger.info('Registration failed - phone exists', { phone });
    return ApiResponse.badRequest(res, 'Phone number already registered');
  }

  const hashedPassword = await authService.hashPassword(password);
  const { otp, expiresAt } = authService.generateOTP();
  const referralCode = authService.generateReferralCode();

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: hashedPassword,
    referralCode,
    isVerified: false,
    verification: {
      otp,
      otpExpiry: expiresAt,
    },
  });

  await smsService.sendOrderOTP(phone, otp);

  logger.info('User registered successfully', { userId: user._id, email: user.email });

  const tokens = authService.generateTokens(user._id);

  const userResponse = user.toJSON();
  
  ApiResponse.created(res, {
    user: userResponse,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  }, 'Registration successful. Please verify your phone number.');
});

/**
 * @desc Login user
 * @route POST /api/v1/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  logger.info('Login attempt', { email });

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    logger.info('Login failed - user not found', { email });
    return ApiResponse.unauthorized(res, 'Invalid email or password');
  }

  const isMatch = await authService.comparePassword(password, user.password);
  if (!isMatch) {
    logger.info('Login failed - invalid password', { userId: user._id });
    return ApiResponse.unauthorized(res, 'Invalid email or password');
  }

  if (!user.isActive) {
    logger.info('Login failed - account deactivated', { userId: user._id });
    return ApiResponse.forbidden(res, 'Account is deactivated. Please contact support');
  }

  user.lastLogin = new Date();
  await user.save();

  const tokens = authService.generateTokens(user._id);

  logger.info('User logged in successfully', { userId: user._id, email: user.email });

  const userResponse = user.toJSON();

  const response = {
    user: userResponse,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };

  if (req.newTokens) {
    response.newTokens = req.newTokens;
  }

  ApiResponse.success(res, response, 'Login successful');
});

/**
 * @desc Refresh access token
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return ApiResponse.badRequest(res, 'Refresh token is required');
  }

  logger.info('Token refresh attempt');

  try {
    const decoded = authService.verifyToken(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      logger.info('Token refresh failed - user not found or inactive', { userId: decoded.id });
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }

    const tokens = authService.generateTokens(user._id);

    logger.info('Token refreshed successfully', { userId: user._id });

    ApiResponse.success(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'Token refreshed successfully');
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
  }
});

/**
 * @desc Verify OTP
 * @route POST /api/v1/auth/verify-otp
 * @access Public
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  logger.info('OTP verification attempt', { phone });

  const user = await User.findOne({ phone });

  if (!user) {
    logger.info('OTP verification failed - user not found', { phone });
    return ApiResponse.notFound(res, 'User not found');
  }

  if (!user.verification || user.verification.otp !== otp) {
    logger.info('OTP verification failed - invalid OTP', { userId: user._id });
    return ApiResponse.badRequest(res, 'Invalid OTP');
  }

  if (user.verification.otpExpiry < new Date()) {
    logger.info('OTP verification failed - OTP expired', { userId: user._id });
    return ApiResponse.badRequest(res, 'OTP has expired. Please request a new one');
  }

  user.isVerified = true;
  user.verification = {
    otp: undefined,
    otpExpiry: undefined,
  };
  await user.save();

  logger.info('OTP verified successfully', { userId: user._id });

  ApiResponse.success(res, { isVerified: true }, 'Phone number verified successfully');
});

/**
 * @desc Resend OTP
 * @route POST /api/v1/auth/resend-otp
 * @access Public
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  logger.info('Resend OTP attempt', { phone });

  const user = await User.findOne({ phone });

  if (!user) {
    logger.info('Resend OTP failed - user not found', { phone });
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.isVerified) {
    logger.info('Resend OTP failed - already verified', { userId: user._id });
    return ApiResponse.badRequest(res, 'Phone number is already verified');
  }

  const { otp, expiresAt } = authService.generateOTP();

  user.verification = {
    otp,
    otpExpiry: expiresAt,
  };
  await user.save();

  await smsService.sendOrderOTP(phone, otp);

  logger.info('OTP resent successfully', { userId: user._id });

  const otpInResponse = process.env.NODE_ENV === 'development' ? otp : undefined;

  ApiResponse.success(res, { otp: otpInResponse }, 'OTP sent successfully');
});

/**
 * @desc Forgot password
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  logger.info('Forgot password attempt', { email });

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    logger.info('Forgot password - user not found (email does not exist)');
    return ApiResponse.success(res, {}, 'If an account exists with this email, you will receive a password reset link');
  }

  const { plainToken, hashedToken, expiresAt } = authService.generateResetToken();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = expiresAt;
  await user.save();

  const resetUrl = `${process.env.USER_APP_URL}/reset-password?token=${plainToken}`;
  
  await emailService.sendPasswordResetEmail(user, resetUrl);

  logger.info('Password reset email sent', { userId: user._id });

  ApiResponse.success(res, {}, 'If an account exists with this email, you will receive a password reset link');
});

/**
 * @desc Reset password
 * @route POST /api/v1/auth/reset-password
 * @access Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  logger.info('Password reset attempt');

  const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: new Date() },
  }).select('+password');

  if (!user) {
    logger.info('Password reset failed - invalid or expired token');
    return ApiResponse.badRequest(res, 'Invalid or expired reset token');
  }

  const hashedPassword = await authService.hashPassword(password);
  
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  logger.info('Password reset successful', { userId: user._id });

  ApiResponse.success(res, {}, 'Password reset successful. Please login with your new password');
});

/**
 * @desc Change password
 * @route PUT /api/v1/auth/change-password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  logger.info('Change password attempt', { userId });

  const user = await User.findById(userId).select('+password');

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  const isMatch = await authService.comparePassword(currentPassword, user.password);
  if (!isMatch) {
    logger.info('Change password failed - incorrect current password', { userId });
    return ApiResponse.badRequest(res, 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    return ApiResponse.badRequest(res, 'New password must be different from current password');
  }

  const hashedPassword = await authService.hashPassword(newPassword);
  
  user.password = hashedPassword;
  await user.save();

  logger.info('Password changed successfully', { userId });

  ApiResponse.success(res, {}, 'Password changed successfully');
});

/**
 * @desc Get current user profile
 * @route GET /api/v1/auth/me
 * @access Private
 */
const getMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  logger.info('Get profile request', { userId });

  const user = await User.findById(userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  ApiResponse.success(res, { user }, 'Profile retrieved successfully');
});

/**
 * @desc Logout user
 * @route POST /api/v1/auth/logout
 * @access Private
 */
const logout = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  logger.info('User logout', { userId: userId || 'unknown' });

  ApiResponse.success(res, {}, 'Logged out successfully');
});

module.exports = {
  register,
  login,
  refreshToken,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  logout,
};
