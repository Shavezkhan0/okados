class StorageKeys {
  StorageKeys._();

  // Auth
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String userId = 'user_id';
  static const String isLoggedIn = 'is_logged_in';

  // User
  static const String userEmail = 'user_email';
  static const String userName = 'user_name';
  static const String userPhone = 'user_phone';
  static const String userPhoto = 'user_photo';

  // App Settings
  static const String isFirstTime = 'is_first_time';
  static const String isFirstLaunch = 'is_first_launch';
  static const String onboardingDone = 'onboarding_done';
  static const String selectedLanguage = 'selected_language';
  static const String isDarkMode = 'is_dark_mode';
  static const String notificationsEnabled = 'notifications_enabled';

  // Location
  static const String lastLatitude = 'last_latitude';
  static const String lastLongitude = 'last_longitude';
  static const String lastAddress = 'last_address';
  static const String savedAddresses = 'saved_addresses';

  // Cart
  static const String cartItems = 'cart_items';
  static const String cartRestaurantId = 'cart_restaurant_id';
  static const String cartData = 'cart_data';

  // FCM
  static const String fcmToken = 'fcm_token';
}
