import '../services/restaurant_service.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';

class RestaurantRepository {
  final RestaurantService _service = RestaurantService();

  Future<List<RestaurantModel>> getRestaurants({
    String? cuisine,
    String? sortBy,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      return await _service.getRestaurants(
        cuisine: cuisine,
        sortBy: sortBy,
        page: page,
        limit: limit,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<List<RestaurantModel>> getFeaturedRestaurants() async {
    try {
      return await _service.getFeaturedRestaurants();
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
      return await _service.getNearbyRestaurants(
        lat: lat,
        lng: lng,
        radius: radius,
        page: page,
        limit: limit,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<RestaurantModel> getRestaurantDetails(String id) async {
    try {
      return await _service.getRestaurantDetails(id);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ProductModel>> getRestaurantMenu(String restaurantId) async {
    try {
      return await _service.getRestaurantMenu(restaurantId);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ProductModel>> searchProducts(String query) async {
    try {
      return await _service.searchProducts(query);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<CategoryModel>> getCategories() async {
    try {
      return await _service.getCategories();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<String>> getCuisines() async {
    try {
      return await _service.getCuisines();
    } catch (e) {
      rethrow;
    }
  }
}
