import 'package:equatable/equatable.dart';

class RestaurantModel extends Equatable {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String? logoUrl;
  final String? bannerUrl;
  final List<String> cuisines;
  final double rating;
  final int totalReviews;
  final String address;
  final double latitude;
  final double longitude;
  final int deliveryTime;
  final double deliveryFee;
  final double minimumOrder;
  final bool isOpen;
  final bool isActive;
  final bool isFeatured;
  final double? distance;
  final DateTime createdAt;

  const RestaurantModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    this.logoUrl,
    this.bannerUrl,
    required this.cuisines,
    required this.rating,
    required this.totalReviews,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.deliveryTime,
    required this.deliveryFee,
    required this.minimumOrder,
    required this.isOpen,
    required this.isActive,
    this.isFeatured = false,
    this.distance,
    required this.createdAt,
  });

  factory RestaurantModel.fromJson(Map<String, dynamic> json) {
    final address = json['address'] as Map<String, dynamic>?;
    final coords = address?['coordinates'] as Map<String, dynamic>?;
    final rating = json['rating'] as Map<String, dynamic>?;
    final pricing = json['pricing'] as Map<String, dynamic>?;
    
    return RestaurantModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'] ?? '',
      logoUrl: json['logo'] ?? json['logoUrl'] ?? json['companyLogoUrl'],
      bannerUrl: json['banner'] ?? json['bannerUrl'],
      cuisines: json['cuisines'] != null
          ? List<String>.from(json['cuisines'])
          : [],
      rating: (rating?['average'] ?? 0).toDouble(),
      totalReviews: rating?['count'] ?? 0,
      address: '${address?['addressLine1'] ?? ''}, ${address?['city'] ?? ''}',
      latitude: coords?['coordinates'] != null 
          ? (coords!['coordinates'] as List)[1].toDouble() 
          : 0.0,
      longitude: coords?['coordinates'] != null 
          ? (coords!['coordinates'] as List)[0].toDouble() 
          : 0.0,
      deliveryTime: json['estimatedDeliveryTime'] ?? 30,
      deliveryFee: (pricing?['deliveryFee'] ?? 0).toDouble(),
      minimumOrder: (pricing?['costForTwo'] ?? 0).toDouble(),
      isOpen: json['isOpen'] ?? false,
      isActive: json['isActive'] ?? true,
      isFeatured: json['isFeatured'] ?? false,
      distance: json['distance']?.toDouble(),
      createdAt: DateTime.parse(
        json['createdAt'] ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'logoUrl': logoUrl,
      'bannerUrl': bannerUrl,
      'cuisines': cuisines,
      'rating': rating,
      'totalReviews': totalReviews,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'deliveryTime': deliveryTime,
      'deliveryFee': deliveryFee,
      'minimumOrder': minimumOrder,
      'isOpen': isOpen,
      'isActive': isActive,
      'isFeatured': isFeatured,
      'distance': distance,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
        id,
        name,
        slug,
        rating,
        totalReviews,
        isOpen,
        distance,
      ];
}
