import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/restaurant_repository.dart';
import '../data/models/restaurant_model.dart';
import '../data/models/product_model.dart';
import '../data/services/restaurant_service.dart';
import '../data/services/location_service.dart';

final restaurantRepositoryProvider = Provider((ref) => RestaurantRepository());

final locationServiceProvider = Provider((ref) => LocationService());

final currentLocationProvider = FutureProvider.autoDispose<LocationData>((ref) async {
  final locationService = ref.read(locationServiceProvider);
  final position = await locationService.getCurrentPosition();
  
  if (position == null) {
    throw Exception('Unable to get location');
  }
  
  final address = await locationService.getAddressFromCoordinates(
    position.latitude,
    position.longitude,
  );
  
  return LocationData(
    latitude: position.latitude,
    longitude: position.longitude,
    address: address ?? 'Unknown location',
  );
});

class LocationData {
  final double latitude;
  final double longitude;
  final String address;

  LocationData({
    required this.latitude,
    required this.longitude,
    required this.address,
  });
}

final restaurantsProvider = StateNotifierProvider<RestaurantsNotifier, RestaurantsState>((ref) {
  return RestaurantsNotifier(ref.read(restaurantRepositoryProvider));
});

class RestaurantsState {
  final List<RestaurantModel> restaurants;
  final List<RestaurantModel> featuredRestaurants;
  final List<RestaurantModel> nearbyRestaurants;
  final bool isLoading;
  final String? error;

  const RestaurantsState({
    this.restaurants = const [],
    this.featuredRestaurants = const [],
    this.nearbyRestaurants = const [],
    this.isLoading = false,
    this.error,
  });

  RestaurantsState copyWith({
    List<RestaurantModel>? restaurants,
    List<RestaurantModel>? featuredRestaurants,
    List<RestaurantModel>? nearbyRestaurants,
    bool? isLoading,
    String? error,
  }) {
    return RestaurantsState(
      restaurants: restaurants ?? this.restaurants,
      featuredRestaurants: featuredRestaurants ?? this.featuredRestaurants,
      nearbyRestaurants: nearbyRestaurants ?? this.nearbyRestaurants,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class RestaurantsNotifier extends StateNotifier<RestaurantsState> {
  final RestaurantRepository _repository;

  RestaurantsNotifier(this._repository) : super(const RestaurantsState());

  Future<void> loadRestaurants() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final restaurants = await _repository.getRestaurants();
      final featured = await _repository.getFeaturedRestaurants();
      state = state.copyWith(
        restaurants: restaurants,
        featuredRestaurants: featured,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadNearbyRestaurants(double lat, double lng, {double radius = 5}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final restaurants = await _repository.getNearbyRestaurants(
        lat: lat,
        lng: lng,
        radius: radius,
      );
      state = state.copyWith(
        nearbyRestaurants: restaurants,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> filterByCategory(String? category) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final restaurants = await _repository.getRestaurants(cuisine: category);
      state = state.copyWith(
        restaurants: restaurants,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<List<ProductModel>> searchProducts(String query) async {
    try {
      return await _repository.searchProducts(query);
    } catch (e) {
      return [];
    }
  }
}

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  final repository = ref.read(restaurantRepositoryProvider);
  return await repository.getCategories();
});

final selectedCategoryProvider = StateProvider<String?>((ref) => null);

final restaurantDetailsProvider = FutureProvider.family<RestaurantModel, String>((ref, id) async {
  final repository = ref.read(restaurantRepositoryProvider);
  return await repository.getRestaurantDetails(id);
});

final restaurantMenuProvider = FutureProvider.family<List<ProductModel>, String>((ref, restaurantId) async {
  final repository = ref.read(restaurantRepositoryProvider);
  return await repository.getRestaurantMenu(restaurantId);
});
