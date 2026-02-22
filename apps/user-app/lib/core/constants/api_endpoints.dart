import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiEndpoints {
  ApiEndpoints._();

  static String get baseUrl {
    return dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:5000/api/v1';
  }

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh-token';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String verifyOtp = '/auth/verify-otp';
  static const String resendOtp = '/auth/resend-otp';
  static const String me = '/auth/me';

  // Restaurant Endpoints
  static const String restaurants = '/restaurants';
  static const String nearbyRestaurants = '/restaurants/nearby';
  static String restaurantById(String id) => '/restaurants/$id';
  static String restaurantBySlug(String slug) => '/restaurants/$slug';
  static String restaurantDetails(String id) => '/restaurants/$id';
  static String restaurantMenu(String restaurantId) => '/restaurants/$restaurantId/menu';
  static const String cuisines = '/restaurants/cuisines';

  // Product Endpoints
  static const String products = '/products';
  static String productsByRestaurant(String restaurantId) => 
    '/products?restaurant=$restaurantId';
  static String productById(String id) => '/products/$id';
  static String productDetails(String id) => '/products/$id';

  // Order Endpoints
  static const String orders = '/orders';
  static String orderById(String id) => '/orders/$id';
  static String orderDetails(String id) => '/orders/$id';
  static String trackOrder(String id) => '/orders/$id/track';
  static String cancelOrder(String id) => '/orders/$id/cancel';

  // User Endpoints
  static const String profile = '/users/me';
  static const String updateProfile = '/users/me';
  static const String updatePassword = '/users/me/password';
  static const String uploadProfilePhoto = '/upload/profile-photo';

  // Categories
  static const String categories = '/categories';

  // Payment Endpoints
  static const String createPayment = '/payments/create';
  static const String verifyPayment = '/payments/verify';

  // Address Endpoints
  static const String addresses = '/users/me/addresses';
  static String addressById(String id) => '/users/me/addresses/$id';

  // Favorites Endpoints
  static const String favorites = '/users/me/favorites';
  static String addFavorite(String restaurantId) => 
    '/users/me/favorites/$restaurantId';

  // Review Endpoints
  static const String reviews = '/reviews';
  static String reviewsByRestaurant(String restaurantId) => 
    '/reviews?restaurant=$restaurantId';

  // Coupon Endpoints
  static const String coupons = '/coupons';
  static String validateCoupon(String code) => '/coupons/validate/$code';

  // Notification Endpoints
  static const String notifications = '/notifications';
  static const String notificationCount = '/notifications/unread-count';
  static const String markAllNotificationsRead = '/notifications/read-all';
  static String markNotificationRead(String id) => '/notifications/$id/read';
  static String deleteNotification(String id) => '/notifications/$id';
  static const String subscribeNotifications = '/notifications/subscribe';

  // Order Review Endpoints
  static String submitReview(String orderId) => '/orders/$orderId/review';
}
