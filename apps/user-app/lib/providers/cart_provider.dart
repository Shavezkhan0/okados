import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/cart_item_model.dart';
import '../data/models/product_model.dart';
import '../data/services/storage_service.dart';
import '../core/constants/storage_keys.dart';

final storageServiceProvider = Provider((ref) => StorageService());

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier(ref.read(storageServiceProvider));
});

class CartState {
  final List<CartItemModel> items;
  final String? restaurantId;
  final String? restaurantName;
  final bool isLoading;

  const CartState({
    this.items = const [],
    this.restaurantId,
    this.restaurantName,
    this.isLoading = false,
  });

  CartState copyWith({
    List<CartItemModel>? items,
    String? restaurantId,
    String? restaurantName,
    bool? isLoading,
  }) {
    return CartState(
      items: items ?? this.items,
      restaurantId: restaurantId ?? this.restaurantId,
      restaurantName: restaurantName ?? this.restaurantName,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  double get subtotal => items.fold(0, (sum, item) => sum + item.totalPrice);

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  bool get isEmpty => items.isEmpty;

  bool get isNotEmpty => items.isNotEmpty;
}

class CartNotifier extends StateNotifier<CartState> {
  final StorageService _storageService;

  CartNotifier(this._storageService) : super(const CartState()) {
    loadCart();
  }

  Future<void> loadCart() async {
    state = state.copyWith(isLoading: true);
    try {
      final cartData = await _storageService.getString(StorageKeys.cartData);
      if (cartData != null) {
        final List<dynamic> decoded = jsonDecode(cartData);
        final items = decoded.map((e) => CartItemModel.fromJson(e)).toList();
        
        String? restaurantId;
        String? restaurantName;
        
        if (items.isNotEmpty) {
          restaurantId = items.first.product.restaurantId;
        }

        state = state.copyWith(
          items: items,
          restaurantId: restaurantId,
          restaurantName: restaurantName,
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> addItem(ProductModel product, {int quantity = 1, String? restaurantId, String? restaurantName}) async {
    if (state.restaurantId != null && state.restaurantId != product.restaurantId) {
      state = state.copyWith(
        items: [],
        restaurantId: product.restaurantId,
        restaurantName: restaurantName,
      );
    }

    final existingIndex = state.items.indexWhere((item) => item.product.id == product.id);

    List<CartItemModel> updatedItems;
    if (existingIndex != -1) {
      updatedItems = List.from(state.items);
      final existingItem = updatedItems[existingIndex];
      updatedItems[existingIndex] = existingItem.copyWith(
        quantity: existingItem.quantity + quantity,
      );
    } else {
      final newItem = CartItemModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        product: product,
        quantity: quantity,
      );
      updatedItems = [...state.items, newItem];
    }

    state = state.copyWith(
      items: updatedItems,
      restaurantId: product.restaurantId,
      restaurantName: restaurantName,
    );

    await _saveCart();
  }

  Future<void> removeItem(String productId) async {
    final updatedItems = state.items.where((item) => item.product.id != productId).toList();
    state = state.copyWith(
      items: updatedItems,
      restaurantId: updatedItems.isEmpty ? null : state.restaurantId,
    );
    await _saveCart();
  }

  Future<void> updateQuantity(String productId, int quantity) async {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    final updatedItems = state.items.map((item) {
      if (item.product.id == productId) {
        return item.copyWith(quantity: quantity);
      }
      return item;
    }).toList();

    state = state.copyWith(items: updatedItems);
    await _saveCart();
  }

  Future<void> clearCart() async {
    state = const CartState();
    await _storageService.remove(StorageKeys.cartData);
  }

  Future<void> _saveCart() async {
    final cartData = jsonEncode(state.items.map((item) => item.toJson()).toList());
    await _storageService.setString(StorageKeys.cartData, cartData);
  }
}
