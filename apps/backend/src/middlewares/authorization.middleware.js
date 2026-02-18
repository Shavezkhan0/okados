const ApiResponse = require('../utils/response');
const { USER_ROLES } = require('../utils/constants');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

const isAdmin = authorize(USER_ROLES.ADMIN);
const isRestaurant = authorize(USER_ROLES.RESTAURANT);
const isDeliveryPartner = authorize(USER_ROLES.DELIVERY_PARTNER);
const isUser = authorize(USER_ROLES.USER);
const isAdminOrRestaurant = authorize(USER_ROLES.ADMIN, USER_ROLES.RESTAURANT);

module.exports = { authorize, isAdmin, isRestaurant, isDeliveryPartner, isUser, isAdminOrRestaurant };
