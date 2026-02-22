import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../services/storage_service.dart';
import '../../core/constants/storage_keys.dart';

class NotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final StorageService _storageService = StorageService();

  Future<void> initialize() async {
    await _requestPermission();
    await _getToken();
  }

  Future<void> _requestPermission() async {
    await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: true,
      badge: true,
      carPlay: false,
      criticalAlert: true,
      provisional: false,
      sound: true,
    );
  }

  Future<String?> _getToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      if (token != null) {
        await _storageService.setToken(StorageKeys.fcmToken, token);
        return token;
      }
    } catch (e) {
      // Handle error
    }
    return null;
  }

  void _onForegroundMessage() {
    FirebaseMessaging.onMessage.listen((message) {
      // Handle foreground message
    });
  }

  Future<void> subscribeToTopic(String topic) async {
    await _firebaseMessaging.subscribeToTopic(topic);
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    await _firebaseMessaging.unsubscribeFromTopic(topic);
  }

  Future<void> deleteToken() async {
    await _firebaseMessaging.deleteToken();
  }
}
