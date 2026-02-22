import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/notification_model.dart';
import '../../data/services/api_service.dart';

class NotificationsState {
  final List<NotificationModel> notifications;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final int unreadCount;
  final int currentPage;
  final bool hasMore;

  const NotificationsState({
    this.notifications = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.unreadCount = 0,
    this.currentPage = 1,
    this.hasMore = true,
  });

  NotificationsState copyWith({
    List<NotificationModel>? notifications,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    int? unreadCount,
    int? currentPage,
    bool? hasMore,
  }) {
    return NotificationsState(
      notifications: notifications ?? this.notifications,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error,
      unreadCount: unreadCount ?? this.unreadCount,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final ApiService _apiService;

  NotificationsNotifier(this._apiService) : super(const NotificationsState()) {
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    if (state.isLoading) return;
    
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final notifications = await _apiService.getNotifications(page: 1);
      final unreadCount = await _apiService.getUnreadNotificationCount();
      
      state = state.copyWith(
        notifications: notifications,
        unreadCount: unreadCount,
        isLoading: false,
        currentPage: 1,
        hasMore: notifications.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> loadMoreNotifications() async {
    if (state.isLoadingMore || !state.hasMore) return;
    
    state = state.copyWith(isLoadingMore: true);
    
    try {
      final nextPage = state.currentPage + 1;
      final notifications = await _apiService.getNotifications(page: nextPage);
      
      state = state.copyWith(
        notifications: [...state.notifications, ...notifications],
        isLoadingMore: false,
        currentPage: nextPage,
        hasMore: notifications.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingMore: false,
        error: e.toString(),
      );
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await _apiService.markNotificationAsRead(notificationId);
      
      final updatedNotifications = state.notifications.map((n) {
        if (n.id == notificationId) {
          return n.copyWith(isRead: true);
        }
        return n;
      }).toList();
      
      state = state.copyWith(
        notifications: updatedNotifications,
        unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0,
      );
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _apiService.markAllNotificationsAsRead();
      
      final updatedNotifications = state.notifications.map((n) {
        return n.copyWith(isRead: true);
      }).toList();
      
      state = state.copyWith(
        notifications: updatedNotifications,
        unreadCount: 0,
      );
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    try {
      await _apiService.deleteNotification(notificationId);
      
      final notification = state.notifications.firstWhere((n) => n.id == notificationId);
      final updatedNotifications = state.notifications.where((n) => n.id != notificationId).toList();
      
      state = state.copyWith(
        notifications: updatedNotifications,
        unreadCount: !notification.isRead && state.unreadCount > 0 
            ? state.unreadCount - 1 
            : state.unreadCount,
      );
    } catch (e) {
      // Handle error silently
    }
  }

  void handleNotificationNavigation(NotificationModel notification, void Function(String) navigate) {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'order':
        if (notification.dataId != null) {
          navigate('/order/${notification.dataId}');
        }
        break;
      case 'order_tracking':
        if (notification.dataId != null) {
          navigate('/order/${notification.dataId}/track');
        }
        break;
      case 'promo':
      case 'offer':
        navigate('/home');
        break;
      default:
        break;
    }
  }
}

final notificationApiServiceProvider = Provider<ApiService>((ref) => ApiService());

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  final apiService = ref.watch(notificationApiServiceProvider);
  return NotificationsNotifier(apiService);
});
