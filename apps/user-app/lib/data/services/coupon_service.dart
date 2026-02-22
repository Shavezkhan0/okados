import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class CouponService {
  final ApiClient _apiClient = ApiClient();

  Future<CouponValidationResult> validateCoupon({
    required String code,
    required String restaurantId,
    required double orderAmount,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.validateCoupon(code),
        data: {
          'code': code,
          'restaurantId': restaurantId,
          'orderAmount': orderAmount,
        },
      );
      return CouponValidationResult.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<CouponModel>> getValidCoupons({
    String? restaurantId,
    double? orderAmount,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.coupons,
        queryParameters: {
          if (restaurantId != null) 'restaurantId': restaurantId,
          if (orderAmount != null) 'orderAmount': orderAmount,
          'valid': true,
        },
      );
      final List<dynamic> data = response.data['data']?['coupons'] ?? response.data['coupons'] ?? response.data;
      return data.map((e) => CouponModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }
}

class CouponModel {
  final String id;
  final String code;
  final String description;
  final String? restaurantId;
  final String? restaurantName;
  final double? discountPercentage;
  final double? discountAmount;
  final double? minimumOrder;
  final double? maximumDiscount;
  final DateTime? validUntil;
  final bool isActive;

  const CouponModel({
    required this.id,
    required this.code,
    required this.description,
    this.restaurantId,
    this.restaurantName,
    this.discountPercentage,
    this.discountAmount,
    this.minimumOrder,
    this.maximumDiscount,
    this.validUntil,
    this.isActive = true,
  });

  factory CouponModel.fromJson(Map<String, dynamic> json) {
    return CouponModel(
      id: json['id'] ?? json['_id'] ?? '',
      code: json['code'] ?? '',
      description: json['description'] ?? '',
      restaurantId: json['restaurantId'],
      restaurantName: json['restaurantName'],
      discountPercentage: json['discountPercentage']?.toDouble(),
      discountAmount: json['discountAmount']?.toDouble(),
      minimumOrder: json['minimumOrder']?.toDouble(),
      maximumDiscount: json['maximumDiscount']?.toDouble(),
      validUntil: json['validUntil'] != null ? DateTime.tryParse(json['validUntil']) : null,
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'description': description,
      'restaurantId': restaurantId,
      'restaurantName': restaurantName,
      'discountPercentage': discountPercentage,
      'discountAmount': discountAmount,
      'minimumOrder': minimumOrder,
      'maximumDiscount': maximumDiscount,
      'validUntil': validUntil?.toIso8601String(),
      'isActive': isActive,
    };
  }

  double calculateDiscount(double orderAmount) {
    double discount = 0;
    if (discountPercentage != null) {
      discount = (orderAmount * discountPercentage!) / 100;
      if (maximumDiscount != null && discount > maximumDiscount!) {
        discount = maximumDiscount!;
      }
    } else if (discountAmount != null) {
      discount = discountAmount!;
    }
    return discount;
  }
}

class CouponValidationResult {
  final bool isValid;
  final String? message;
  final CouponModel? coupon;
  final double? discount;

  const CouponValidationResult({
    required this.isValid,
    this.message,
    this.coupon,
    this.discount,
  });

  factory CouponValidationResult.fromJson(Map<String, dynamic> json) {
    return CouponValidationResult(
      isValid: json['isValid'] ?? false,
      message: json['message'],
      coupon: json['coupon'] != null ? CouponModel.fromJson(json['coupon']) : null,
      discount: json['discount']?.toDouble(),
    );
  }
}
