import ApiResponse from '../utils/response.js';
import { USER_ROLES } from '../utils/constants.js';

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

export { authorize, isAdmin, isRestaurant, isDeliveryPartner, isUser, isAdminOrRestaurant };
