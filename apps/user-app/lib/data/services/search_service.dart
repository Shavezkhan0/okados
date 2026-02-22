import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';

class SearchService {
  final ApiClient _apiClient = ApiClient();

  Future<List<RestaurantModel>> searchRestaurants({
    String? query,
    String? cuisine,
    double? minRating,
    int? maxDeliveryTime,
    String? sortBy,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get(
        '/restaurants/search',
        queryParameters: {
          if (query != null && query.isNotEmpty) 'q': query,
          if (cuisine != null) 'cuisine': cuisine,
          if (minRating != null) 'minRating': minRating,
          if (maxDeliveryTime != null) 'maxDeliveryTime': maxDeliveryTime,
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

  Future<List<ProductModel>> searchProducts({
    String? query,
    String? restaurantId,
    String? category,
    double? minPrice,
    double? maxPrice,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get(
        '/products/search',
        queryParameters: {
          if (query != null && query.isNotEmpty) 'q': query,
          if (restaurantId != null) 'restaurantId': restaurantId,
          if (category != null) 'category': category,
          if (minPrice != null) 'minPrice': minPrice,
          if (maxPrice != null) 'maxPrice': maxPrice,
          'page': page,
          'limit': limit,
        },
      );
      final List<dynamic> data = response.data['data']?['products'] ?? response.data['products'] ?? response.data;
      return data.map((e) => ProductModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }
}

class SearchFilters {
  final String? query;
  final String? cuisine;
  final double? minRating;
  final int? maxDeliveryTime;
  final String? sortBy;
  final String? category;
  final double? minPrice;
  final double? maxPrice;

  const SearchFilters({
    this.query,
    this.cuisine,
    this.minRating,
    this.maxDeliveryTime,
    this.sortBy,
    this.category,
    this.minPrice,
    this.maxPrice,
  });

  SearchFilters copyWith({
    String? query,
    String? cuisine,
    double? minRating,
    int? maxDeliveryTime,
    String? sortBy,
    String? category,
    double? minPrice,
    double? maxPrice,
  }) {
    return SearchFilters(
      query: query ?? this.query,
      cuisine: cuisine ?? this.cuisine,
      minRating: minRating ?? this.minRating,
      maxDeliveryTime: maxDeliveryTime ?? this.maxDeliveryTime,
      sortBy: sortBy ?? this.sortBy,
      category: category ?? this.category,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
    );
  }

  SearchFilters clearCuisine() {
    return SearchFilters(
      query: query,
      cuisine: null,
      minRating: minRating,
      maxDeliveryTime: maxDeliveryTime,
      sortBy: sortBy,
      category: category,
      minPrice: minPrice,
      maxPrice: maxPrice,
    );
  }

  SearchFilters clearSortBy() {
    return SearchFilters(
      query: query,
      cuisine: cuisine,
      minRating: minRating,
      maxDeliveryTime: maxDeliveryTime,
      sortBy: null,
      category: category,
      minPrice: minPrice,
      maxPrice: maxPrice,
    );
  }
}
