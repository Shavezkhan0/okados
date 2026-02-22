import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';

class RestaurantService {
  final ApiClient _apiClient = ApiClient();

  Future<List<RestaurantModel>> getRestaurants({
    String? cuisine,
    String? sortBy,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.restaurants,
        queryParameters: {
          if (cuisine != null) 'cuisine': cuisine,
          if (sortBy != null) 'sortBy': sortBy,
          'page': page,
          'limit': limit,
        },
      );
      final List<dynamic> data = response.data['data']?['restaurants'] ?? response.data['restaurants'] ?? response.data;
      return data.map((e) => RestaurantModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<RestaurantModel>> getFeaturedRestaurants() async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.restaurants,
        queryParameters: {'featured': true},
      );
      final List<dynamic> data = response.data['data']?['restaurants'] ?? response.data['restaurants'] ?? response.data;
      return data.map((e) => RestaurantModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<RestaurantModel>> getNearbyRestaurants({
    required double lat,
    required double lng,
    double radius = 5,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.nearbyRestaurants,
        queryParameters: {
          'lat': lat,
          'lng': lng,
          'radius': radius,
          'page': page,
          'limit': limit,
        },
      );
      final List<dynamic> data = response.data['data']?['restaurants'] ?? response.data['restaurants'] ?? response.data;
      return data.map((e) => RestaurantModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<RestaurantModel> getRestaurantDetails(String id) async {
    try {
      final response = await _apiClient.get(ApiEndpoints.restaurantById(id));
      return RestaurantModel.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ProductModel>> getRestaurantMenu(String restaurantId) async {
    try {
      final response = await _apiClient.get(
        '${ApiEndpoints.restaurantById(restaurantId)}/menu',
      );
      final List<dynamic> data = response.data['data']?['products'] ?? response.data['products'] ?? response.data;
      return data.map((e) => ProductModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ReviewModel>> getRestaurantReviews(String restaurantId, {int page = 1}) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.reviewsByRestaurant(restaurantId),
        queryParameters: {'page': page},
      );
      final List<dynamic> data = response.data['data']?['reviews'] ?? response.data['reviews'] ?? response.data;
      return data.map((e) => ReviewModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ProductModel>> searchProducts(String query) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.products,
        queryParameters: {'search': query},
      );
      final List<dynamic> data = response.data['data']?['products'] ?? response.data['products'] ?? response.data;
      return data.map((e) => ProductModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<CategoryModel>> getCategories() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.categories);
      final List<dynamic> data = response.data['data']?['categories'] ?? response.data['categories'] ?? response.data;
      return data.map((e) => CategoryModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<String>> getCuisines() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.cuisines);
      final List<dynamic> data = response.data['data']?['cuisines'] ?? response.data['cuisines'] ?? response.data;
      return data.map((e) => e.toString()).toList();
    } catch (e) {
      rethrow;
    }
  }
}

class CategoryModel {
  final String id;
  final String name;
  final String? imageUrl;
  final bool isActive;

  const CategoryModel({
    required this.id,
    required this.name,
    this.imageUrl,
    this.isActive = true,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      imageUrl: json['imageUrl'] ?? json['image'],
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'imageUrl': imageUrl,
      'isActive': isActive,
    };
  }
}

class ReviewModel {
  final String id;
  final String userId;
  final String userName;
  final String? userImage;
  final double rating;
  final String? comment;
  final DateTime createdAt;

  const ReviewModel({
    required this.id,
    required this.userId,
    required this.userName,
    this.userImage,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: json['id'] ?? json['_id'] ?? '',
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? json['user']?['name'] ?? 'Anonymous',
      userImage: json['userImage'] ?? json['user']?['image'],
      rating: (json['rating'] ?? 0).toDouble(),
      comment: json['comment'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
