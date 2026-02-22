import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/user_repository.dart';
import '../data/models/user_model.dart';
import '../data/models/address_model.dart';

final userRepositoryProvider = Provider((ref) => UserRepository());

final userProvider = StateNotifierProvider<UserNotifier, UserState>((ref) {
  return UserNotifier(ref.read(userRepositoryProvider));
});

class UserState {
  final UserModel? user;
  final List<AddressModel> addresses;
  final AddressModel? selectedAddress;
  final bool isLoading;
  final String? error;

  const UserState({
    this.user,
    this.addresses = const [],
    this.selectedAddress,
    this.isLoading = false,
    this.error,
  });

  UserState copyWith({
    UserModel? user,
    List<AddressModel>? addresses,
    AddressModel? selectedAddress,
    bool? isLoading,
    String? error,
  }) {
    return UserState(
      user: user ?? this.user,
      addresses: addresses ?? this.addresses,
      selectedAddress: selectedAddress ?? this.selectedAddress,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class UserNotifier extends StateNotifier<UserState> {
  final UserRepository _repository;

  UserNotifier(this._repository) : super(const UserState());

  Future<void> loadUser() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repository.getProfile();
      final addresses = user.addresses ?? [];
      state = state.copyWith(
        user: user,
        addresses: addresses,
        selectedAddress: addresses.where((a) => a.isDefault).firstOrNull ?? addresses.firstOrNull,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repository.updateProfile(data);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> loadAddresses() async {
    try {
      final addresses = await _repository.getAddresses();
      state = state.copyWith(
        addresses: addresses,
        selectedAddress: addresses.where((a) => a.isDefault).firstOrNull ?? addresses.firstOrNull,
      );
    } catch (e) {
      // Handle error
    }
  }

  Future<void> addAddress(AddressModel address) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final newAddress = await _repository.addAddress(address);
      final updatedAddresses = [...state.addresses, newAddress];
      state = state.copyWith(
        addresses: updatedAddresses,
        selectedAddress: newAddress.isDefault ? newAddress : state.selectedAddress,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateAddress(AddressModel address) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final updatedAddress = await _repository.updateAddress(address);
      final updatedAddresses = state.addresses.map((a) {
        return a.id == address.id ? updatedAddress : a;
      }).toList();
      state = state.copyWith(
        addresses: updatedAddresses,
        selectedAddress: updatedAddress.isDefault ? updatedAddress : state.selectedAddress,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> deleteAddress(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.deleteAddress(id);
      final updatedAddresses = state.addresses.where((a) => a.id != id).toList();
      state = state.copyWith(
        addresses: updatedAddresses,
        selectedAddress: updatedAddresses.isNotEmpty ? updatedAddresses.first : null,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  void selectAddress(AddressModel address) {
    state = state.copyWith(selectedAddress: address);
  }
}
