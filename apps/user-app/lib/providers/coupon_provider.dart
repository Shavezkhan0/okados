import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/services/coupon_service.dart';

final couponServiceProvider = Provider((ref) => CouponService());

final couponStateProvider = StateNotifierProvider<CouponNotifier, CouponState>((ref) {
  return CouponNotifier(ref.read(couponServiceProvider));
});

class CouponState {
  final CouponModel? appliedCoupon;
  final double? discount;
  final bool isLoading;
  final String? error;
  final List<CouponModel> availableCoupons;
  final bool isLoadingAvailable;

  const CouponState({
    this.appliedCoupon,
    this.discount,
    this.isLoading = false,
    this.error,
    this.availableCoupons = const [],
    this.isLoadingAvailable = false,
  });

  CouponState copyWith({
    CouponModel? appliedCoupon,
    double? discount,
    bool? isLoading,
    String? error,
    List<CouponModel>? availableCoupons,
    bool? isLoadingAvailable,
    bool clearCoupon = false,
    bool clearError = false,
  }) {
    return CouponState(
      appliedCoupon: clearCoupon ? null : (appliedCoupon ?? this.appliedCoupon),
      discount: clearCoupon ? null : (discount ?? this.discount),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      availableCoupons: availableCoupons ?? this.availableCoupons,
      isLoadingAvailable: isLoadingAvailable ?? this.isLoadingAvailable,
    );
  }
}

class CouponNotifier extends StateNotifier<CouponState> {
  final CouponService _service;

  CouponNotifier(this._service) : super(const CouponState());

  Future<void> validateCoupon({
    required String code,
    required String restaurantId,
    required double orderAmount,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _service.validateCoupon(
        code: code,
        restaurantId: restaurantId,
        orderAmount: orderAmount,
      );

      if (result.isValid && result.coupon != null) {
        final discount = result.coupon!.calculateDiscount(orderAmount);
        state = state.copyWith(
          appliedCoupon: result.coupon,
          discount: discount,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: result.message ?? 'Invalid coupon',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> loadAvailableCoupons({
    String? restaurantId,
    double? orderAmount,
  }) async {
    state = state.copyWith(isLoadingAvailable: true);
    try {
      final coupons = await _service.getValidCoupons(
        restaurantId: restaurantId,
        orderAmount: orderAmount,
      );
      state = state.copyWith(
        availableCoupons: coupons,
        isLoadingAvailable: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingAvailable: false,
      );
    }
  }

  void applyCoupon(CouponModel coupon, double orderAmount) {
    final discount = coupon.calculateDiscount(orderAmount);
    state = state.copyWith(
      appliedCoupon: coupon,
      discount: discount,
      clearError: true,
    );
  }

  void removeCoupon() {
    state = state.copyWith(clearCoupon: true, clearError: true);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}
