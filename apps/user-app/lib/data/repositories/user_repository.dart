import '../services/api_service.dart';
import '../models/user_model.dart';
import '../models/address_model.dart';

class UserRepository {
  final ApiService _apiService = ApiService();

  Future<UserModel> getProfile() async {
    try {
      return await _apiService.getProfile();
    } catch (e) {
      rethrow;
    }
  }

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    try {
      return await _apiService.updateProfile(data);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<AddressModel>> getAddresses() async {
    try {
      return await _apiService.getAddresses();
    } catch (e) {
      rethrow;
    }
  }

  Future<AddressModel> addAddress(AddressModel address) async {
    try {
      return await _apiService.addAddress(address.toJson());
    } catch (e) {
      rethrow;
    }
  }

  Future<AddressModel> updateAddress(AddressModel address) async {
    try {
      if (address.id == null) {
        throw Exception('Address ID is required for update');
      }
      return await _apiService.updateAddress(address.id!, address.toJson());
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteAddress(String id) async {
    try {
      await _apiService.deleteAddress(id);
    } catch (e) {
      rethrow;
    }
  }
}
