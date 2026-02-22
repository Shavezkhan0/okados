import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/order_model.dart';

class OrderService {
  final ApiClient _apiClient = ApiClient();

  Future<OrderModel> getOrderDetails(String orderId) async {
    try {
      final response = await _apiClient.get(ApiEndpoints.orderById(orderId));
      return OrderModel.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<OrderModel> getOrderById(String orderId) => getOrderDetails(orderId);

  Future<OrderTrackingModel> getOrderTracking(String orderId) async {
    try {
      final response = await _apiClient.get(ApiEndpoints.trackOrder(orderId));
      return OrderTrackingModel.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<OrderModel>> getOrders({String? status, int page = 1}) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.orders,
        queryParameters: {
          if (status != null) 'status': status,
          'page': page,
        },
      );
      final List<dynamic> data = response.data['data']?['orders'] ?? response.data['orders'] ?? response.data;
      return data.map((e) => OrderModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<OrderModel> createOrder(Map<String, dynamic> orderData) async {
    try {
      final response = await _apiClient.post(ApiEndpoints.orders, data: orderData);
      return OrderModel.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<OrderModel> cancelOrder(String orderId, String reason) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.cancelOrder(orderId),
        data: {'reason': reason},
      );
      return OrderModel.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createPayment(String orderId, String method) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.createPayment,
        data: {'orderId': orderId, 'method': method},
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyPayment(String paymentId) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.verifyPayment,
        data: {'paymentId': paymentId},
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }
}

class OrderTrackingModel {
  final String orderId;
  final String status;
  final List<OrderStatusUpdate> statusHistory;
  final RiderInfo? riderInfo;
  final int? estimatedDeliveryMinutes;
  final DeliveryLocation? deliveryLocation;

  const OrderTrackingModel({
    required this.orderId,
    required this.status,
    required this.statusHistory,
    this.riderInfo,
    this.estimatedDeliveryMinutes,
    this.deliveryLocation,
  });

  factory OrderTrackingModel.fromJson(Map<String, dynamic> json) {
    return OrderTrackingModel(
      orderId: json['orderId'] ?? json['order_id'] ?? '',
      status: json['status'] ?? 'pending',
      statusHistory: (json['statusHistory'] as List?)
              ?.map((e) => OrderStatusUpdate.fromJson(e))
              .toList() ??
          [],
      riderInfo: json['riderInfo'] != null
          ? RiderInfo.fromJson(json['riderInfo'])
          : null,
      estimatedDeliveryMinutes: json['estimatedDeliveryMinutes']?.toInt(),
      deliveryLocation: json['deliveryLocation'] != null
          ? DeliveryLocation.fromJson(json['deliveryLocation'])
          : null,
    );
  }
}

class OrderStatusUpdate {
  final String status;
  final DateTime timestamp;
  final String? message;

  const OrderStatusUpdate({
    required this.status,
    required this.timestamp,
    this.message,
  });

  factory OrderStatusUpdate.fromJson(Map<String, dynamic> json) {
    return OrderStatusUpdate(
      status: json['status'] ?? '',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      message: json['message'],
    );
  }
}

class RiderInfo {
  final String id;
  final String name;
  final String phone;
  final String? photoUrl;

  const RiderInfo({
    required this.id,
    required this.name,
    required this.phone,
    this.photoUrl,
  });

  factory RiderInfo.fromJson(Map<String, dynamic> json) {
    return RiderInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      photoUrl: json['photoUrl'],
    );
  }
}

class DeliveryLocation {
  final double latitude;
  final double longitude;

  const DeliveryLocation({
    required this.latitude,
    required this.longitude,
  });

  factory DeliveryLocation.fromJson(Map<String, dynamic> json) {
    return DeliveryLocation(
      latitude: (json['latitude'] ?? 0).toDouble(),
      longitude: (json['longitude'] ?? 0).toDouble(),
    );
  }
}
