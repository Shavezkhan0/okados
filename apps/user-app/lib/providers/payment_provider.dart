import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/services/payment_service.dart';
import '../data/repositories/order_repository.dart';

final paymentServiceProvider = Provider((ref) => PaymentService());
final orderRepositoryProvider = Provider((ref) => OrderRepository());

final paymentStateProvider = StateNotifierProvider<PaymentNotifier, PaymentState>((ref) {
  return PaymentNotifier(
    ref.read(paymentServiceProvider),
    ref.read(orderRepositoryProvider),
  );
});

enum PaymentMethod { online, cod }

class PaymentState {
  final PaymentMethod? selectedMethod;
  final bool isProcessing;
  final bool isCreatingOrder;
  final String? error;
  final String? currentOrderId;
  final bool codAvailable;

  const PaymentState({
    this.selectedMethod,
    this.isProcessing = false,
    this.isCreatingOrder = false,
    this.error,
    this.currentOrderId,
    this.codAvailable = true,
  });

  PaymentState copyWith({
    PaymentMethod? selectedMethod,
    bool? isProcessing,
    bool? isCreatingOrder,
    String? error,
    String? currentOrderId,
    bool? codAvailable,
    bool clearError = false,
    bool clearOrderId = false,
  }) {
    return PaymentState(
      selectedMethod: selectedMethod ?? this.selectedMethod,
      isProcessing: isProcessing ?? this.isProcessing,
      isCreatingOrder: isCreatingOrder ?? this.isCreatingOrder,
      error: clearError ? null : (error ?? this.error),
      currentOrderId: clearOrderId ? null : (currentOrderId ?? this.currentOrderId),
      codAvailable: codAvailable ?? this.codAvailable,
    );
  }
}

class PaymentNotifier extends StateNotifier<PaymentState> {
  final PaymentService _paymentService;
  final OrderRepository _orderRepository;

  PaymentNotifier(this._paymentService, this._orderRepository) : super(const PaymentState());

  void selectPaymentMethod(PaymentMethod method) {
    state = state.copyWith(selectedMethod: method, clearError: true);
  }

  Future<Map<String, dynamic>?> initializeRazorpay(String keyId) async {
    _paymentService.initialize(keyId);
    return null;
  }

  Future<void> checkCodAvailability(String restaurantId, double amount) async {
    try {
      // In a real app, this would call the API to check COD availability
      // For now, we'll assume COD is available
      state = state.copyWith(codAvailable: true);
    } catch (e) {
      state = state.copyWith(codAvailable: false);
    }
  }

  void setPaymentCallbacks({
    required Function(String paymentId) onSuccess,
    required Function(String error) onError,
  }) {
    _paymentService.setPaymentCallbacks(
      onSuccess: (response) {
        if (response.paymentId != null) {
          onSuccess(response.paymentId!);
        }
      },
      onError: (response) {
        onError(response.message ?? 'Payment failed');
      },
    );
  }

  Future<String?> createRazorpayOrder({
    required double amount,
    required String orderId,
  }) async {
    state = state.copyWith(isCreatingOrder: true, clearError: true);
    try {
      final orderData = await _orderRepository.createPayment(orderId, 'razorpay');
      state = state.copyWith(
        isCreatingOrder: false,
        currentOrderId: orderData['id'] ?? orderId,
      );
      return orderData['id'];
    } catch (e) {
      state = state.copyWith(
        isCreatingOrder: false,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<void> initiatePayment({
    required String orderId,
    required double amount,
    required String name,
    required String email,
    required String phone,
    required Function(String paymentId) onSuccess,
    required Function(String error) onError,
  }) async {
    state = state.copyWith(isProcessing: true, clearError: true);

    try {
      setPaymentCallbacks(
        onSuccess: (paymentId) {
          state = state.copyWith(isProcessing: false);
          onSuccess(paymentId);
        },
        onError: (error) {
          state = state.copyWith(isProcessing: false, error: error);
          onError(error);
        },
      );

      final razorpayOrderId = await createRazorpayOrder(
        amount: amount,
        orderId: orderId,
      );

      if (razorpayOrderId != null) {
        await _paymentService.checkout(
          orderId: razorpayOrderId,
          amount: amount,
          name: name,
          email: email,
          phone: phone,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isProcessing: false,
        error: e.toString(),
      );
    }
  }

  Future<void> verifyPayment(String orderId, String paymentId) async {
    state = state.copyWith(isProcessing: true, clearError: true);
    try {
      await _orderRepository.verifyPayment(paymentId);
      state = state.copyWith(isProcessing: false);
    } catch (e) {
      state = state.copyWith(
        isProcessing: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void reset() {
    state = const PaymentState();
  }
}
