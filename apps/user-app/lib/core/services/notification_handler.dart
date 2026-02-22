import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class NotificationHandler {
  static final NotificationHandler _instance = NotificationHandler._internal();
  factory NotificationHandler() => _instance;
  NotificationHandler._internal();

  static NotificationHandler get instance => _instance;

  static GoRouter? _router;

  static void setRouter(GoRouter router) {
    _router = router;
  }

  void handleNotificationTap(Map<String, dynamic> data) {
    if (_router == null) {
      _queueNavigation(data);
      return;
    }
    
    _performNavigation(data);
  }

  final List<Map<String, dynamic>> _navigationQueue = [];
  bool _isRouterReady = false;

  void _queueNavigation(Map<String, dynamic> data) {
    _navigationQueue.add(data);
  }

  void setRouterReady() {
    _isRouterReady = true;
    _processNavigationQueue();
  }

  void _processNavigationQueue() {
    if (!_isRouterReady || _router == null) return;
    
    for (final data in _navigationQueue) {
      _performNavigation(data);
    }
    _navigationQueue.clear();
  }

  void _performNavigation(Map<String, dynamic> data) {
    final type = data['type']?.toString() ?? '';
    final orderId = data['orderId'] ?? data['order_id'] ?? data['orderId'];
    final restaurantId = data['restaurantId'] ?? data['restaurant_id'];

    switch (type) {
      case 'order':
      case 'order_update':
      case 'order_tracking':
        if (orderId != null) {
          _navigateTo('/order/$orderId');
        }
        break;
      case 'order_delivered':
        if (orderId != null) {
          _navigateTo('/order/$orderId');
        }
        break;
      case 'review':
        if (orderId != null) {
          _navigateTo('/review/$orderId');
        }
        break;
      case 'promo':
      case 'offer':
      case 'promotion':
        _navigateTo('/home');
        break;
      case 'restaurant':
        if (restaurantId != null) {
          _navigateTo('/restaurant/$restaurantId');
        }
        break;
      case 'payment':
        if (orderId != null) {
          _navigateTo('/order/$orderId');
        }
        break;
      default:
        _navigateTo('/home');
        break;
    }
  }

  void _navigateTo(String path) {
    if (_router == null) return;

    // Get the current context's navigator state
    final navigator = _router!.routerDelegate.navigatorKey.currentContext;
    if (navigator == null) return;

    // Check if we can pop to the current route first
    if (navigator.canPop()) {
      Navigator.of(navigator).popUntil((route) => route.isFirst);
    }
    
    // Navigate to the target path
    try {
      _router!.go(path);
    } catch (e) {
      // If navigation fails, try push
      try {
        _router!.push(path);
      } catch (e) {
        debugPrint('NotificationHandler: Failed to navigate to $path');
      }
    }
  }
}
