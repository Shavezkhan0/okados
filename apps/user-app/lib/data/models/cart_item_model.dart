import 'package:equatable/equatable.dart';
import 'product_model.dart';

class CartItemModel extends Equatable {
  final String id;
  final ProductModel product;
  final int quantity;
  final String? specialInstructions;

  const CartItemModel({
    required this.id,
    required this.product,
    required this.quantity,
    this.specialInstructions,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    return CartItemModel(
      id: json['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      product: ProductModel.fromJson(json['product']),
      quantity: json['quantity'] ?? 1,
      specialInstructions: json['specialInstructions'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product': product.toJson(),
      'quantity': quantity,
      'specialInstructions': specialInstructions,
    };
  }

  double get totalPrice => product.finalPrice * quantity;

  CartItemModel copyWith({
    String? id,
    ProductModel? product,
    int? quantity,
    String? specialInstructions,
  }) {
    return CartItemModel(
      id: id ?? this.id,
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      specialInstructions: specialInstructions ?? this.specialInstructions,
    );
  }

  @override
  List<Object?> get props => [id, product, quantity, specialInstructions];
}
