const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/response');
const User = require('../models/User');
const authService = require('../services/auth.service');

const logger = {
  info: (message, meta = {}) => console.log(`[AUTH MIDDLEWARE] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[AUTH MIDDLEWARE ERROR] ${message}`, meta),
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.info('No token provided', { path: req.path });
      return ApiResponse.unauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = authService.verifyToken(token, process.env.JWT_SECRET);
      logger.info('Token verified', { userId: decoded.id, tokenType: decoded.type });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.info('Token expired, attempting refresh', { userId: error.decoded?.id });
        
        const refreshToken = req.headers['x-refresh-token'];
        if (refreshToken) {
          try {
            const refreshDecoded = authService.verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            const user = await User.findById(refreshDecoded.id);
            if (!user || !user.isActive) {
              return ApiResponse.unauthorized(res, 'Session expired. Please login again');
            }

            const newTokens = authService.generateTokens(user._id);
            
            req.user = user;
            req.newTokens = newTokens;
            req.userId = user._id;
            
            logger.info('Token refreshed successfully', { userId: user._id });
            return next();
          } catch (refreshError) {
            logger.error('Token refresh failed', { error: refreshError.message });
            return ApiResponse.unauthorized(res, 'Session expired. Please login again');
          }
        }
        
        return ApiResponse.unauthorized(res, 'Token expired. Please login again');
      }
      
      if (error.name === 'JsonWebTokenError') {
        logger.info('Invalid token', { error: error.message });
        return ApiResponse.unauthorized(res, 'Invalid token');
      }
      
      logger.error('Token verification failed', { error: error.message });
      return ApiResponse.unauthorized(res, 'Authentication failed');
    }

    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      logger.info('User not found', { userId: decoded.id });
      return ApiResponse.unauthorized(res, 'User not found');
    }

    if (!user.isActive) {
      logger.info('User account is deactivated', { userId: user._id });
      return ApiResponse.forbidden(res, 'Account is deactivated. Please contact support');
    }

    req.user = user;
    req.userId = user._id;
    req.tokenId = decoded.tokenId;
    
    logger.info('User authenticated', { userId: user._id, role: user.role });
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message, stack: error.stack });
    return ApiResponse.unauthorized(res, 'Authentication failed');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      logger.info('Access denied - insufficient permissions', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      return ApiResponse.forbidden(
        res,
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }

    logger.info('User authorized', { userId: req.user._id, role: req.user.role });
    next();
  };
};

module.exports = { authenticate, authorize };
