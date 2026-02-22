import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/order_repository.dart';
import '../data/models/order_model.dart';
import '../data/models/address_model.dart';

final orderRepositoryProvider = Provider((ref) => OrderRepository());

final ordersProvider = StateNotifierProvider<OrdersNotifier, OrdersState>((ref) {
  return OrdersNotifier(ref.read(orderRepositoryProvider));
});

class OrdersState {
  final List<OrderModel> activeOrders;
  final List<OrderModel> pastOrders;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasMoreActive;
  final bool hasMorePast;
  final String? error;
  final int activePage;
  final int pastPage;

  const OrdersState({
    this.activeOrders = const [],
    this.pastOrders = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasMoreActive = true,
    this.hasMorePast = true,
    this.error,
    this.activePage = 1,
    this.pastPage = 1,
  });

  List<OrderModel> get allOrders => [...activeOrders, ...pastOrders];
  List<OrderModel> get orders => allOrders;

  OrdersState copyWith({
    List<OrderModel>? activeOrders,
    List<OrderModel>? pastOrders,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasMoreActive,
    bool? hasMorePast,
    String? error,
    int? activePage,
    int? pastPage,
  }) {
    return OrdersState(
      activeOrders: activeOrders ?? this.activeOrders,
      pastOrders: pastOrders ?? this.pastOrders,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMoreActive: hasMoreActive ?? this.hasMoreActive,
      hasMorePast: hasMorePast ?? this.hasMorePast,
      error: error,
      activePage: activePage ?? this.activePage,
      pastPage: pastPage ?? this.pastPage,
    );
  }
}

class OrdersNotifier extends StateNotifier<OrdersState> {
  final OrderRepository _repository;

  OrdersNotifier(this._repository) : super(const OrdersState());

  static const List<String> activeStatuses = ['pending', 'confirmed', 'accepted', 'preparing', 'ready', 'on_the_way'];
  static const List<String> pastStatuses = ['delivered', 'cancelled', 'failed'];

  Future<void> loadOrders({bool refresh = false}) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final activePage = refresh ? 1 : state.activePage;
      final pastPage = refresh ? 1 : state.pastPage;

      final activeResults = await Future.wait([
        _repository.getUserOrders(status: activeStatuses, page: activePage),
        _repository.getUserOrders(status: pastStatuses, page: pastPage),
      ]);

      final activeOrders = activeResults[0];
      final pastOrders = activeResults[1];

      if (refresh) {
        state = state.copyWith(
          activeOrders: activeOrders,
          pastOrders: pastOrders,
          isLoading: false,
          activePage: 1,
          pastPage: 1,
          hasMoreActive: activeOrders.length >= 20,
          hasMorePast: pastOrders.length >= 20,
        );
      } else {
        state = state.copyWith(
          activeOrders: [...state.activeOrders, ...activeOrders],
          pastOrders: [...state.pastOrders, ...pastOrders],
          isLoading: false,
          hasMoreActive: activeOrders.length >= 20,
          hasMorePast: pastOrders.length >= 20,
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMoreActive() async {
    if (state.isLoadingMore || !state.hasMoreActive) return;

    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.activePage + 1;
      final orders = await _repository.getUserOrders(status: activeStatuses, page: nextPage);

      state = state.copyWith(
        activeOrders: [...state.activeOrders, ...orders],
        isLoadingMore: false,
        activePage: nextPage,
        hasMoreActive: orders.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }

  Future<void> loadMorePast() async {
    if (state.isLoadingMore || !state.hasMorePast) return;

    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.pastPage + 1;
      final orders = await _repository.getUserOrders(status: pastStatuses, page: nextPage);

      state = state.copyWith(
        pastOrders: [...state.pastOrders, ...orders],
        isLoadingMore: false,
        pastPage: nextPage,
        hasMorePast: orders.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }

  void updateOrderStatus(String orderId, String newStatus) {
    final updatedActive = state.activeOrders.map((order) {
      if (order.id == orderId) {
        return OrderModel(
          id: order.id,
          orderNumber: order.orderNumber,
          restaurant: order.restaurant,
          items: order.items,
          deliveryAddress: order.deliveryAddress,
          status: newStatus,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          pricing: order.pricing,
          createdAt: order.createdAt,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
        );
      }
      return order;
    }).toList();

    if (!activeStatuses.contains(newStatus) && !pastStatuses.contains(newStatus)) {
      return;
    }

    final movedOrder = updatedActive.firstWhere((o) => o.id == orderId, orElse: () => updatedActive.first);
    
    if (pastStatuses.contains(newStatus)) {
      final filteredActive = updatedActive.where((o) => o.id != orderId).toList();
      state = state.copyWith(
        activeOrders: filteredActive,
        pastOrders: [movedOrder, ...state.pastOrders],
      );
    } else {
      state = state.copyWith(activeOrders: updatedActive);
    }
  }

  void addReorderItems(List<OrderItemModel> items, String restaurantId, String restaurantName) {
    // This will be handled by cart_provider
  }

  Future<OrderModel> createOrder({
    required String restaurantId,
    required List<Map<String, dynamic>> items,
    required AddressModel deliveryAddress,
    required String paymentMethod,
    String? deliveryInstructions,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final order = await _repository.createOrder(
        restaurantId: restaurantId,
        items: items,
        deliveryAddress: deliveryAddress,
        paymentMethod: paymentMethod,
        deliveryInstructions: deliveryInstructions,
      );
      state = state.copyWith(
        isLoading: false,
        activeOrders: [order, ...state.activeOrders],
      );
      return order;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> cancelOrder(String id, String reason) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.cancelOrder(id, reason);
      await loadOrders(refresh: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

final orderDetailsProvider = FutureProvider.family<OrderModel, String>((ref, id) async {
  final repository = ref.read(orderRepositoryProvider);
  return await repository.getOrderDetails(id);
});
