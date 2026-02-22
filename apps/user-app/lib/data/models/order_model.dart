import 'package:equatable/equatable.dart';
import 'restaurant_model.dart';
import 'product_model.dart';
import 'address_model.dart';

class OrderModel extends Equatable {
  final String id;
  final String orderNumber;
  final RestaurantModel restaurant;
  final List<OrderItemModel> items;
  final AddressModel deliveryAddress;
  final String status;
  final String paymentMethod;
  final String paymentStatus;
  final OrderPricing pricing;
  final DateTime createdAt;
  final DateTime? estimatedDeliveryTime;
  final String? cancelReason;

  const OrderModel({
    required this.id,
    required this.orderNumber,
    required this.restaurant,
    required this.items,
    required this.deliveryAddress,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.pricing,
    required this.createdAt,
    this.estimatedDeliveryTime,
    this.cancelReason,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] ?? json['_id'] ?? '',
      orderNumber: json['orderNumber'] ?? '',
      restaurant: RestaurantModel.fromJson(json['restaurant']),
      items: (json['items'] as List)
          .map((item) => OrderItemModel.fromJson(item))
          .toList(),
      deliveryAddress: AddressModel.fromJson(json['deliveryAddress']),
      status: json['status'] ?? 'pending',
      paymentMethod: json['paymentMethod'] ?? 'online',
      paymentStatus: json['paymentStatus'] ?? 'pending',
      pricing: OrderPricing.fromJson(json['pricing']),
      createdAt: DateTime.parse(json['createdAt']),
      estimatedDeliveryTime: json['estimatedDeliveryTime'] != null
          ? DateTime.parse(json['estimatedDeliveryTime'])
          : null,
      cancelReason: json['cancelReason'],
    );
  }

  bool get canCancel {
    return status == 'pending' || status == 'confirmed';
  }

  bool get isActive {
    return status != 'delivered' && 
           status != 'cancelled' && 
           status != 'failed';
  }

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        status,
        createdAt,
      ];
}

class OrderItemModel extends Equatable {
  final ProductModel product;
  final int quantity;
  final double price;
  final String? specialInstructions;

  const OrderItemModel({
    required this.product,
    required this.quantity,
    required this.price,
    this.specialInstructions,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      product: ProductModel.fromJson(json['product']),
      quantity: json['quantity'] ?? 1,
      price: (json['price'] ?? 0).toDouble(),
      specialInstructions: json['specialInstructions'],
    );
  }

  double get totalPrice => price * quantity;

  @override
  List<Object?> get props => [product, quantity, price];
}

class OrderPricing extends Equatable {
  final double itemTotal;
  final double deliveryFee;
  final double tax;
  final double discount;
  final double grandTotal;

  const OrderPricing({
    required this.itemTotal,
    required this.deliveryFee,
    required this.tax,
    required this.discount,
    required this.grandTotal,
  });

  factory OrderPricing.fromJson(Map<String, dynamic> json) {
    return OrderPricing(
      itemTotal: (json['itemTotal'] ?? 0).toDouble(),
      deliveryFee: (json['deliveryFee'] ?? 0).toDouble(),
      tax: (json['tax'] ?? 0).toDouble(),
      discount: (json['discount'] ?? 0).toDouble(),
      grandTotal: (json['grandTotal'] ?? 0).toDouble(),
    );
  }

  @override
  List<Object?> get props => [
        itemTotal,
        deliveryFee,
        tax,
        discount,
        grandTotal,
      ];
}
