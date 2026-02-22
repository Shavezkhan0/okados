import 'package:equatable/equatable.dart';

class ProductModel extends Equatable {
  final String id;
  final String name;
  final String description;
  final double price;
  final double? discountPrice;
  final String? imageUrl;
  final String category;
  final bool isVeg;
  final bool isAvailable;
  final String restaurantId;
  final String? restaurantName;
  final List<String>? tags;
  final int? preparationTime;

  const ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.discountPrice,
    this.imageUrl,
    required this.category,
    required this.isVeg,
    required this.isAvailable,
    required this.restaurantId,
    this.restaurantName,
    this.tags,
    this.preparationTime,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? json['title'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      discountPrice: json['discountedPrice']?.toDouble() ?? json['discountPrice']?.toDouble(),
      imageUrl: json['image'] ?? json['imageUrl'] ?? json['image'],
      category: json['category'] ?? '',
      isVeg: json['type'] == 'veg',
      isAvailable: json['isAvailable'] ?? json['isActive'] ?? true,
      restaurantId: json['restaurantId']?.toString() ?? json['restaurant']?.toString() ?? '',
      restaurantName: json['restaurantName'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      preparationTime: json['preparationTime'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'discountPrice': discountPrice,
      'imageUrl': imageUrl,
      'category': category,
      'isVeg': isVeg,
      'isAvailable': isAvailable,
      'restaurantId': restaurantId,
      'restaurantName': restaurantName,
      'tags': tags,
      'preparationTime': preparationTime,
    };
  }

  double get finalPrice => discountPrice ?? price;

  int? get discountPercentage {
    if (discountPrice == null) return null;
    return (((price - discountPrice!) / price) * 100).round();
  }

  @override
  List<Object?> get props => [
        id,
        name,
        price,
        discountPrice,
        isAvailable,
        restaurantId,
      ];
}
