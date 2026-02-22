import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:flutter/foundation.dart';

typedef PaymentSuccessCallback = void Function(PaymentSuccessResponse response);
typedef PaymentErrorCallback = void Function(PaymentFailureResponse response);
typedef ExternalWalletCallback = void Function(ExternalWalletResponse response);

class PaymentService {
  late Razorpay _razorpay;
  String? _keyId;
  
  PaymentSuccessCallback? _onSuccess;
  PaymentErrorCallback? _onError;
  ExternalWalletCallback? _onExternalWallet;

  void initialize(String keyId) {
    _keyId = keyId;
    _razorpay = Razorpay();
    _setupListeners();
  }

  void _setupListeners() {
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (response) {
      _onSuccess?.call(PaymentSuccessResponse.fromMap(response.data));
    });
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (response) {
      _onError?.call(PaymentFailureResponse.fromMap(response.data));
    });
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (response) {
      _onExternalWallet?.call(ExternalWalletResponse.fromMap(response.data));
    });
  }

  void setPaymentCallbacks({
    PaymentSuccessCallback? onSuccess,
    PaymentErrorCallback? onError,
    ExternalWalletCallback? onExternalWallet,
  }) {
    _onSuccess = onSuccess;
    _onError = onError;
    _onExternalWallet = onExternalWallet;
  }

  Future<void> checkout({
    required String orderId,
    required double amount,
    required String name,
    required String email,
    required String phone,
    String? description,
  }) async {
    if (_keyId == null) {
      throw Exception('Razorpay key not initialized');
    }

    final options = {
      'key': _keyId,
      'amount': (amount * 100).toInt(),
      'currency': 'INR',
      'name': 'Okados',
      'description': description ?? 'Order Payment',
      'order_id': orderId,
      'prefill': {
        'contact': phone,
        'email': email,
        'name': name,
      },
      'theme': {
        'color': '#FF6B35',
      }
    };

    try {
      _razorpay.open(options);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createRazorpayOrder({
    required double amount,
    required String orderId,
  }) async {
    // This would typically call your backend to create a Razorpay order
    // For now, we'll assume the backend returns the order details
    return {
      'id': 'order_${DateTime.now().millisecondsSinceEpoch}',
      'amount': amount,
      'order_id': orderId,
    };
  }

  void close() {
    _razorpay.clear();
  }

  void dispose() {
    _razorpay.clear();
  }
}
