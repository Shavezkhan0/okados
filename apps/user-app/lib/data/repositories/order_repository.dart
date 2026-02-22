import '../services/api_service.dart';
import '../models/order_model.dart';
import '../models/address_model.dart';

class OrderRepository {
  final ApiService _apiService = ApiService();

  Future<List<OrderModel>> getUserOrders({List<String>? status, int page = 1, int limit = 20}) async {
    try {
      return await _apiService.getUserOrders(status: status, page: page, limit: limit);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<OrderModel>> getOrders({String? status, int page = 1}) async {
    try {
      return await _apiService.getOrders(status: status, page: page);
    } catch (e) {
      rethrow;
    }
  }

  Future<OrderModel> getOrderDetails(String id) async {
    try {
      return await _apiService.getOrderDetails(id);
    } catch (e) {
      rethrow;
    }
  }

  Future<OrderModel> createOrder({
    required String restaurantId,
    required List<Map<String, dynamic>> items,
    required AddressModel deliveryAddress,
    required String paymentMethod,
    String? deliveryInstructions,
  }) async {
    try {
      final data = {
        'restaurantId': restaurantId,
        'items': items,
        'deliveryAddress': deliveryAddress.toJson(),
        'paymentMethod': paymentMethod,
        'deliveryInstructions': deliveryInstructions,
      };
      return await _apiService.createOrder(data);
    } catch (e) {
      rethrow;
    }
  }

  Future<OrderModel> cancelOrder(String id, String reason) async {
    try {
      return await _apiService.cancelOrder(id, reason);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createPayment(String orderId, String method) async {
    try {
      return await _apiService.createPayment({
        'orderId': orderId,
        'method': method,
      });
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyPayment(String paymentId) async {
    try {
      return await _apiService.verifyPayment(paymentId);
    } catch (e) {
      rethrow;
    }
  }
}
