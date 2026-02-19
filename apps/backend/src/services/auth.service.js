/**
 * Auth Service
 * Handles authentication-related operations
 * @module services/auth.service
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const logger = {
  info: (message, meta = {}) => console.log(`[AUTH SERVICE] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[AUTH SERVICE ERROR] ${message}`, meta),
};

class AuthService {
  /**
   * Generate access and refresh tokens
   * @param {string} userId - User ID
   * @returns {object} Access and refresh tokens
   */
  generateTokens(userId) {
    logger.info('Generating tokens for user', { userId });
    
    const tokenId = crypto.randomBytes(16).toString('hex');

    const accessToken = jwt.sign(
      { id: userId, tokenId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: userId, tokenId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Tokens generated successfully', { userId, tokenId });
    return { accessToken, refreshToken, tokenId };
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    logger.info('Hashing password');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    logger.info('Password hashed successfully');
    return hashedPassword;
  }

  /**
   * Compare plain password with hashed password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(plainPassword, hashedPassword) {
    try {
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      logger.info('Password comparison completed', { match: isMatch });
      return isMatch;
    } catch (error) {
      logger.error('Password comparison failed', { error: error.message });
      return false;
    }
  }

  /**
   * Generate 6-digit OTP with 10 minute expiry
   * @returns {object} OTP and expiry date
   */
  generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    logger.info('OTP generated', { expiresAt });
    return { otp, expiresAt };
  }

  /**
   * Generate password reset token
   * @returns {object} Plain token and hashed token
   */
  generateResetToken() {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    logger.info('Reset token generated', { expiresAt });

    return { plainToken, hashedToken, expiresAt };
  }

  /**
   * Verify reset token
   * @param {string} plainToken - Plain reset token
   * @param {string} hashedToken - Hashed token from database
   * @returns {boolean} True if valid
   */
  verifyResetToken(plainToken, hashedToken) {
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    const isValid = tokenHash === hashedToken;
    logger.info('Reset token verified', { isValid });
    return isValid;
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @param {string} secret - JWT secret
   * @returns {object} Decoded token
   */
  verifyToken(token, secret) {
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  }

  /**
   * Generate email verification token
   * @param {string} userId - User ID
   * @returns {string} Verification token
   */
  generateEmailVerificationToken(userId) {
    return jwt.sign(
      { id: userId, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Generate referral code
   * @returns {string} 8-character referral code
   */
  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export default new AuthService();
