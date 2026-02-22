import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'core/constants/app_strings.dart';
import 'core/services/firebase_service.dart';
import 'core/services/notification_handler.dart';
import 'presentation/screens/splash/splash_screen.dart';
import 'presentation/screens/onboarding/onboarding_screen.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/auth/register_screen.dart';
import 'presentation/screens/auth/forgot_password_screen.dart';
import 'presentation/screens/auth/otp_verification_screen.dart';
import 'presentation/screens/auth/reset_password_screen.dart';
import 'presentation/screens/home/home_screen.dart';
import 'presentation/screens/restaurant/restaurant_detail_screen.dart';
import 'presentation/screens/checkout/checkout_screen.dart';
import 'presentation/screens/orders/order_detail_screen.dart';
import 'presentation/screens/orders/order_tracking_screen.dart';
import 'presentation/screens/orders/orders_list_screen.dart';
import 'presentation/screens/profile/edit_profile_screen.dart';
import 'presentation/screens/profile/addresses_screen.dart';
import 'presentation/screens/profile/profile_screen.dart';
import 'presentation/screens/search/search_screen.dart';
import 'presentation/screens/notifications/notifications_screen.dart';
import 'presentation/screens/review/write_review_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    debugPrint('Error loading .env file: $e');
  }

  // Initialize Firebase before runApp
  await Firebase.initializeApp();
  
  // Initialize Firebase Service for push notifications
  await FirebaseService.instance.initialize();
  
  runApp(const ProviderScope(child: OkadosApp()));
}

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final goRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: '/verify-otp',
      builder: (context, state) {
        final email = state.extra as String? ?? '';
        return OtpVerificationScreen(email: email);
      },
    ),
    GoRoute(
      path: '/reset-password',
      builder: (context, state) {
        final email = state.extra as String? ?? '';
        return ResetPasswordScreen(email: email);
      },
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/restaurant/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return RestaurantDetailScreen(restaurantId: id);
      },
    ),
    GoRoute(
      path: '/checkout',
      builder: (context, state) => const CheckoutScreen(),
    ),
    GoRoute(
      path: '/order/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return OrderDetailScreen(orderId: id);
      },
    ),
    GoRoute(
      path: '/order/:id/track',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return OrderTrackingScreen(orderId: id);
      },
    ),
    GoRoute(
      path: '/orders',
      builder: (context, state) => const OrdersListScreen(),
    ),
    GoRoute(
      path: '/profile/edit',
      builder: (context, state) => const EditProfileScreen(),
    ),
    GoRoute(
      path: '/profile/addresses',
      builder: (context, state) => const AddressesScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/search',
      builder: (context, state) => const SearchScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/review/:orderId',
      builder: (context, state) {
        final orderId = state.pathParameters['orderId']!;
        return WriteReviewScreen(orderId: orderId);
      },
    ),
  ],
);

class OkadosApp extends StatefulWidget {
  const OkadosApp({super.key});

  @override
  State<OkadosApp> createState() => _OkadosAppState();
}

class _OkadosAppState extends State<OkadosApp> {
  @override
  void initState() {
    super.initState();
    // Set up notification handler with router after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationHandler.setRouter(goRouter);
      NotificationHandler.instance.setRouterReady();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: AppStrings.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: goRouter,
    );
  }
}
