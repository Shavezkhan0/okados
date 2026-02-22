import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import '../models/notification_model.dart';
import '../models/address_model.dart';

class ApiService {
  final ApiClient _apiClient = ApiClient();

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _apiClient.post(
      ApiEndpoints.login,
      data: {'email': email, 'password': password},
    );
    return response.data;
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.register,
      data: {
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
      },
    );
    return response.data;
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final response = await _apiClient.post(
      ApiEndpoints.forgotPassword,
      data: {'email': email},
    );
    return response.data;
  }

  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    final response = await _apiClient.post(
      ApiEndpoints.verifyOtp,
      data: {'email': email, 'otp': otp},
    );
    return response.data;
  }

  Future<Map<String, dynamic>> resendOtp(String email) async {
    final response = await _apiClient.post(
      ApiEndpoints.resendOtp,
      data: {'email': email},
    );
    return response.data;
  }

  Future<Map<String, dynamic>> resetPassword(String email, String password, String otp) async {
    final response = await _apiClient.post(
      ApiEndpoints.resetPassword,
      data: {'email': email, 'password': password, 'otp': otp},
    );
    return response.data;
  }

  Future<UserModel> getProfile() async {
    final response = await _apiClient.get(ApiEndpoints.profile);
    return UserModel.fromJson(response.data);
  }

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.updateProfile, data: data);
    return UserModel.fromJson(response.data);
  }

  Future<AddressModel> addAddress(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.addresses, data: data);
    return AddressModel.fromJson(response.data);
  }

  Future<AddressModel> updateAddress(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.addressById(id), data: data);
    return AddressModel.fromJson(response.data);
  }

  Future<void> deleteAddress(String id) async {
    await _apiClient.delete(ApiEndpoints.addressById(id));
  }

  Future<List<AddressModel>> getAddresses() async {
    final response = await _apiClient.get(ApiEndpoints.addresses);
    final List<dynamic> data = response.data['data']?['addresses'] ?? response.data['addresses'] ?? response.data;
    return data.map((e) => AddressModel.fromJson(e)).toList();
  }

  Future<List<RestaurantModel>> getRestaurants({int page = 1, int limit = 20}) async {
    final response = await _apiClient.get(
      ApiEndpoints.restaurants,
      queryParameters: {'page': page, 'limit': limit},
    );
    final List<dynamic> data = response.data['data']?['restaurants'] ?? response.data['restaurants'] ?? response.data;
    return data.map((e) => RestaurantModel.fromJson(e)).toList();
  }

  Future<List<RestaurantModel>> getFeaturedRestaurants() async {
    final response = await _apiClient.get(
      ApiEndpoints.restaurants,
      queryParameters: {'featured': true},
    );
    final List<dynamic> data = response.data['data']?['restaurants'] ?? response.data['restaurants'] ?? response.data;
    return data.map((e) => RestaurantModel.fromJson(e)).toList();
  }

  Future<List<RestaurantModel>> getNearbyRestaurants(double lat, double lng, {int radius = 10}) async {
    final response = await _apiClient.get(
      ApiEndpoints.restaurants,
      queryParameters: {'lat': lat, 'lng': lng, 'radius': radius},
    );
    final List<dynamic> data = response.data['data']?['restaurants'] ?? response.data['restaurants'] ?? response.data;
    return data.map((e) => RestaurantModel.fromJson(e)).toList();
  }

  Future<RestaurantModel> getRestaurantDetails(String id) async {
    final response = await _apiClient.get('${ApiEndpoints.restaurantDetails}/$id');
    return RestaurantModel.fromJson(response.data['data'] ?? response.data);
  }

  Future<List<ProductModel>> getRestaurantMenu(String restaurantId) async {
    final response = await _apiClient.get(
      '${ApiEndpoints.restaurantMenu}/$restaurantId/menu',
    );
    final List<dynamic> data = response.data['data']?['products'] ?? response.data['products'] ?? response.data;
    return data.map((e) => ProductModel.fromJson(e)).toList();
  }

  Future<List<ProductModel>> searchProducts(String query) async {
    final response = await _apiClient.get(
      ApiEndpoints.products,
      queryParameters: {'search': query},
    );
    final List<dynamic> data = response.data['data']?['products'] ?? response.data['products'] ?? response.data;
    return data.map((e) => ProductModel.fromJson(e)).toList();
  }

  Future<ProductModel> getProductDetails(String id) async {
    final response = await _apiClient.get('${ApiEndpoints.productDetails}/$id');
    return ProductModel.fromJson(response.data['data'] ?? response.data);
  }

  Future<List<OrderModel>> getOrders({String? status, int page = 1}) async {
    final response = await _apiClient.get(
      ApiEndpoints.orders,
      queryParameters: {'status': status, 'page': page},
    );
    final List<dynamic> data = response.data['data']?['orders'] ?? response.data['orders'] ?? response.data;
    return data.map((e) => OrderModel.fromJson(e)).toList();
  }

  Future<List<OrderModel>> getUserOrders({List<String>? status, int page = 1, int limit = 20}) async {
    final response = await _apiClient.get(
      '/orders/users/orders',
      queryParameters: {
        if (status != null && status.isNotEmpty) 'status': status.join(','),
        'page': page,
        'limit': limit,
      },
    );
    final List<dynamic> data = response.data['data']?['orders'] ?? response.data['orders'] ?? response.data;
    return data.map((e) => OrderModel.fromJson(e)).toList();
  }

  Future<OrderModel> getOrderDetails(String id) async {
    final response = await _apiClient.get('${ApiEndpoints.orderDetails}/$id');
    return OrderModel.fromJson(response.data['data'] ?? response.data);
  }

  Future<OrderModel> createOrder(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.orders, data: data);
    return OrderModel.fromJson(response.data);
  }

  Future<OrderModel> cancelOrder(String id, String reason) async {
    final response = await _apiClient.post(
      '${ApiEndpoints.cancelOrder}/$id/cancel',
      data: {'reason': reason},
    );
    return OrderModel.fromJson(response.data);
  }

  Future<List<dynamic>> getCategories() async {
    final response = await _apiClient.get(ApiEndpoints.categories);
    return response.data['data']?['categories'] ?? response.data['categories'] ?? response.data;
  }

  Future<Map<String, dynamic>> createPayment(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.createPayment, data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> verifyPayment(String paymentId) async {
    final response = await _apiClient.post(
      ApiEndpoints.verifyPayment,
      data: {'paymentId': paymentId},
    );
    return response.data;
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _apiClient.post(
      '/auth/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }

  Future<String> uploadProfileImage(String filePath) async {
    // Implementation would use multipart upload
    final response = await _apiClient.post(
      '/upload/profile-image',
      data: {'image': filePath},
    );
    return response.data['url'];
  }

  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 20}) async {
    final response = await _apiClient.get(
      ApiEndpoints.notifications,
      queryParameters: {'page': page, 'limit': limit},
    );
    final List<dynamic> data = response.data['notifications'] ?? response.data;
    return data.map((e) => NotificationModel.fromJson(e)).toList();
  }

  Future<int> getUnreadNotificationCount() async {
    final response = await _apiClient.get(ApiEndpoints.notificationCount);
    return response.data['count'] ?? 0;
  }

  Future<void> markNotificationAsRead(String notificationId) async {
    await _apiClient.put(ApiEndpoints.markNotificationRead(notificationId));
  }

  Future<void> markAllNotificationsAsRead() async {
    await _apiClient.put(ApiEndpoints.markAllNotificationsRead);
  }

  Future<void> deleteNotification(String notificationId) async {
    await _apiClient.delete(ApiEndpoints.deleteNotification(notificationId));
  }

  Future<void> submitReview({
    required String orderId,
    required String restaurantId,
    required double rating,
    String? comment,
  }) async {
    await _apiClient.post(
      ApiEndpoints.submitReview(orderId),
      data: {
        'restaurantId': restaurantId,
        'rating': rating,
        'comment': comment,
      },
    );
  }

  Future<void> logout() async {
    try {
      await _apiClient.post(ApiEndpoints.logout);
    } catch (e) {
      // Ignore logout API errors
    }
  }
}
