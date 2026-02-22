import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../constants/api_endpoints.dart';
import '../constants/storage_keys.dart';
import '../../data/services/storage_service.dart';
import 'notification_handler.dart';

class FirebaseService {
  static final FirebaseService _instance = FirebaseService._internal();
  factory FirebaseService() => _instance;
  FirebaseService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final StorageService _storageService = StorageService();

  bool _isInitialized = false;
  String? _fcmToken;

  static FirebaseService get instance => _instance;

  Future<void> initialize() async {
    if (_isInitialized) return;

    await _initLocalNotifications();
    await _requestNotificationPermission();
    _setupForegroundHandler();
    _setupBackgroundHandler();
    _setupTokenRefreshHandler();
    
    _isInitialized = true;
  }

  Future<void> _initLocalNotifications() async {
    // Skip for now - would need updated flutter_local_notifications API
  }

  Future<void> _requestNotificationPermission() async {
    try {
      final settings = await _firebaseMessaging.requestPermission(
        alert: true,
        announcement: true,
        badge: true,
        carPlay: false,
        criticalAlert: true,
        provisional: false,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        await _getAndSaveToken();
      }
    } catch (e) {
      // Handle permission error silently
    }
  }

  Future<void> _getAndSaveToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      if (token != null && token != _fcmToken) {
        _fcmToken = token;
        await _storageService.setToken(StorageKeys.fcmToken, token);
        await _subscribeToBackend(token);
      }
    } catch (e) {
      // Handle token error silently
    }
  }

  Future<void> _subscribeToBackend(String token) async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 10),
      ));

      final authToken = await _storageService.getToken(StorageKeys.accessToken);
      if (authToken != null) {
        dio.options.headers['Authorization'] = 'Bearer $authToken';
      }

      await dio.post(
        ApiEndpoints.subscribeNotifications,
        data: {
          'token': _fcmToken,
          'topic': 'general',
        },
      );
    } catch (e) {
      // Silently fail - will retry on next app launch
    }
  }

  void _setupForegroundHandler() {
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotification(
        title: message.notification?.title ?? '',
        body: message.notification?.body ?? '',
        payload: message.data,
      );
    });
  }

  void _setupBackgroundHandler() {
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _handleNotificationTap(message.data);
    });
  }

  void _setupTokenRefreshHandler() {
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
      _fcmToken = newToken;
      await _storageService.setToken(StorageKeys.fcmToken, newToken);
      await _subscribeToBackend(newToken);
    });
  }

  void _onNotificationTapped(NotificationResponse response) {
    if (response.payload != null) {
      final payload = _parsePayload(response.payload!);
      _handleNotificationTap(payload);
    }
  }

  Map<String, String> _parsePayload(String payload) {
    final result = <String, String>{};
    if (payload.isEmpty) return result;
    
    try {
      final cleanPayload = payload.replaceAll('{', '').replaceAll('}', '');
      final pairs = cleanPayload.split(', ');
      for (final pair in pairs) {
        final parts = pair.split(': ');
        if (parts.length == 2) {
          result[parts[0].trim()] = parts[1].trim();
        }
      }
    } catch (e) {
      // Fallback: return empty map
    }
    return result;
  }

  void _handleNotificationTap(Map<String, dynamic> data) {
    NotificationHandler.instance.handleNotificationTap(data);
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    Map<String, dynamic>? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'okados_push_channel',
      'Okados Push Notifications',
      channelDescription: 'Push notifications from Okados',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // Simplified - would need updated flutter_local_notifications API
  }

  Future<void> subscribeToTopic(String topic) async {
    try {
      await _firebaseMessaging.subscribeToTopic(topic);
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _firebaseMessaging.unsubscribeFromTopic(topic);
    } catch (e) {
      // Handle error silently
    }
  }

  String? get fcmToken => _fcmToken;
}
