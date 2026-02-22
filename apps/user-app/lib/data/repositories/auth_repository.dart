import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../../core/constants/storage_keys.dart';
import '../../core/errors/exceptions.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  Future<UserModel> login(String email, String password) async {
    try {
      final response = await _apiService.login(email, password);
      final data = response['data'];
      
      await _storageService.setToken(StorageKeys.accessToken, data['accessToken']);
      await _storageService.setToken(StorageKeys.refreshToken, data['refreshToken']);
      await _storageService.setLoggedIn(true);
      
      return UserModel.fromJson(data['user']);
    } catch (e) {
      rethrow;
    }
  }

  Future<UserModel> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      final response = await _apiService.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
      );
      final data = response['data'];
      
      await _storageService.setToken(StorageKeys.accessToken, data['accessToken']);
      await _storageService.setToken(StorageKeys.refreshToken, data['refreshToken']);
      await _storageService.setLoggedIn(true);
      
      return UserModel.fromJson(data['user']);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _apiService.forgotPassword(email);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> verifyOtp(String email, String otp) async {
    try {
      await _apiService.verifyOtp(email, otp);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> resendOtp(String email) async {
    try {
      await _apiService.resendOtp(email);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> resetPassword(String email, String password, String otp) async {
    try {
      await _apiService.resetPassword(email, password, otp);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.logout();
    } catch (e) {
      // Continue with local logout even if API fails
    } finally {
      await _storageService.clearAllTokens();
      await _storageService.setLoggedIn(false);
    }
  }

  Future<bool> isLoggedIn() async {
    return await _storageService.isLoggedIn();
  }

  Future<UserModel?> getCurrentUser() async {
    try {
      final isLoggedIn = await _storageService.isLoggedIn();
      if (!isLoggedIn) return null;
      return await _apiService.getProfile();
    } catch (e) {
      return null;
    }
  }
}
