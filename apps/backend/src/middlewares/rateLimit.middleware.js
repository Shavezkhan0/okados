const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  'Too many requests from this IP, please try again later'
);

const authLimiter = createRateLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts, please try again later');

const orderLimiter = createRateLimiter(60 * 1000, 20, 'Too many order requests, please try again later');

module.exports = { generalLimiter, authLimiter, orderLimiter };
