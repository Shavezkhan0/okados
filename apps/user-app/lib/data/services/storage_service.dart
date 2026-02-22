import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/storage_keys.dart';

class StorageService {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  SharedPreferences? _prefs;

  Future<SharedPreferences> get prefs async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<void> setToken(String key, String value) async {
    await _secureStorage.write(key: key, value: value);
  }

  Future<String?> getToken(String key) async {
    return await _secureStorage.read(key: key);
  }

  Future<void> deleteToken(String key) async {
    await _secureStorage.delete(key: key);
  }

  Future<void> clearAllTokens() async {
    await _secureStorage.deleteAll();
  }

  Future<void> setBool(String key, bool value) async {
    final p = await prefs;
    await p.setBool(key, value);
  }

  Future<bool?> getBool(String key) async {
    final p = await prefs;
    return p.getBool(key);
  }

  Future<void> setString(String key, String value) async {
    final p = await prefs;
    await p.setString(key, value);
  }

  Future<String?> getString(String key) async {
    final p = await prefs;
    return p.getString(key);
  }

  Future<void> setInt(String key, int value) async {
    final p = await prefs;
    await p.setInt(key, value);
  }

  Future<int?> getInt(String key) async {
    final p = await prefs;
    return p.getInt(key);
  }

  Future<void> setDouble(String key, double value) async {
    final p = await prefs;
    await p.setDouble(key, value);
  }

  Future<double?> getDouble(String key) async {
    final p = await prefs;
    return p.getDouble(key);
  }

  Future<void> setList(String key, List<String> value) async {
    final p = await prefs;
    await p.setStringList(key, value);
  }

  Future<List<String>?> getList(String key) async {
    final p = await prefs;
    return p.getStringList(key);
  }

  Future<void> remove(String key) async {
    final p = await prefs;
    await p.remove(key);
  }

  Future<void> clear() async {
    final p = await prefs;
    await p.clear();
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken(StorageKeys.accessToken);
    return token != null;
  }

  Future<void> setLoggedIn(bool value) async {
    await setBool(StorageKeys.isLoggedIn, value);
  }

  Future<void> setFirstLaunch(bool value) async {
    await setBool(StorageKeys.isFirstLaunch, value);
  }

  Future<bool> isFirstLaunch() async {
    final value = await getBool(StorageKeys.isFirstLaunch);
    return value ?? true;
  }
}
