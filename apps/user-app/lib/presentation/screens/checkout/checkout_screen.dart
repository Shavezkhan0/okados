import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/theme/text_styles.dart';
import '../../../data/models/address_model.dart';
import '../../../providers/cart_provider.dart';
import '../../../providers/user_provider.dart';
import '../../../providers/order_provider.dart';
import '../../../providers/coupon_provider.dart';
import '../../../providers/payment_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _instructionsController = TextEditingController();
  AddressModel? _selectedAddress;
  PaymentMethod? _selectedPaymentMethod;
  bool _isLoading = false;

  double get _deliveryFee => 2.99;
  double get _taxRate => 0.08;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    final userState = ref.read(userProvider);
    _selectedAddress = userState.selectedAddress;
    
    final paymentState = ref.read(paymentStateProvider);
    if (paymentState.selectedMethod != null) {
      _selectedPaymentMethod = paymentState.selectedMethod;
    }
  }

  @override
  void dispose() {
    _instructionsController.dispose();
    super.dispose();
  }

  double _calculateTotal(CartState cartState, CouponState couponState) {
    final subtotal = cartState.subtotal;
    final discount = couponState.discount ?? 0;
    final deliveryFee = _deliveryFee;
    final taxes = (subtotal - discount) * _taxRate;
    return subtotal - discount + deliveryFee + taxes;
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);
    final userState = ref.watch(userProvider);
    final couponState = ref.watch(couponStateProvider);
    final paymentState = ref.watch(paymentStateProvider);

    final total = _calculateTotal(cartState, couponState);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Text(
          AppStrings.checkout,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: cartState.isEmpty
          ? _buildEmptyCart()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDeliveryAddressSection(userState),
                  const SizedBox(height: 24),
                  _buildDeliveryInstructionsSection(),
                  const SizedBox(height: 24),
                  _buildOrderSummarySection(cartState, couponState),
                  const SizedBox(height: 24),
                  _buildPaymentMethodSection(paymentState),
                  const SizedBox(height: 100),
                ],
              ),
            ),
      bottomNavigationBar: cartState.isEmpty
          ? null
          : _buildPlaceOrderButton(cartState, total),
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 64,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            'Your cart is empty',
            style: AppTextStyles.titleMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryAddressSection(UserState userState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              AppStrings.deliveryAddress,
              style: AppTextStyles.titleMedium.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton.icon(
              onPressed: () => _showAddAddressSheet(),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add New'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (userState.addresses.isEmpty)
          _buildNoAddressCard()
        else
          ...userState.addresses.map((address) => _buildAddressCard(address)),
      ],
    );
  }

  Widget _buildNoAddressCard() {
    return GestureDetector(
      onTap: () => _showAddAddressSheet(),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.primary, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(Icons.add_location_alt, color: AppColors.primary),
            const SizedBox(width: 12),
            Text(
              'Add delivery address',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressCard(AddressModel address) {
    final isSelected = _selectedAddress?.id == address.id;

    return GestureDetector(
      onTap: () {
        setState(() => _selectedAddress = address);
        ref.read(userProvider.notifier).selectAddress(address);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.1)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.divider,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: address.id ?? '',
              groupValue: _selectedAddress?.id,
              onChanged: (value) {
                setState(() => _selectedAddress = address);
              },
              activeColor: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        address.type.toUpperCase(),
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (address.isDefault) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.success.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Default',
                            style: TextStyle(
                              color: AppColors.success,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    address.fullAddress,
                    style: AppTextStyles.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeliveryInstructionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Delivery Instructions (Optional)',
          style: AppTextStyles.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _instructionsController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'e.g., Ring the bell, leave at door...',
            filled: true,
            fillColor: AppColors.greyLight.withOpacity(0.3),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderSummarySection(CartState cartState, CouponState couponState) {
    final subtotal = cartState.subtotal;
    final discount = couponState.discount ?? 0;
    final deliveryFee = _deliveryFee;
    final taxes = (subtotal - discount) * _taxRate;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Order Summary',
          style: AppTextStyles.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 8,
              ),
            ],
          ),
          child: Column(
            children: [
              ...cartState.items.map((item) => Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: item.product.imageUrl != null
                              ? CachedNetworkImage(
                                  imageUrl: item.product.imageUrl!,
                                  width: 50,
                                  height: 50,
                                  fit: BoxFit.cover,
                                )
                              : Container(
                                  width: 50,
                                  height: 50,
                                  color: AppColors.greyLight,
                                  child: const Icon(Icons.fastfood, size: 24),
                                ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.product.name,
                                style: AppTextStyles.bodyMedium.copyWith(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                'Qty: ${item.quantity}',
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '\$${item.totalPrice.toStringAsFixed(2)}',
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    _buildSummaryRow('Subtotal', subtotal),
                    if (discount > 0)
                      _buildSummaryRow('Discount', -discount, isDiscount: true),
                    _buildSummaryRow('Delivery Fee', deliveryFee),
                    _buildSummaryRow('Taxes', taxes),
                    const Divider(),
                    _buildSummaryRow(
                      'Total',
                      subtotal - discount + deliveryFee + taxes,
                      isTotal: true,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, double amount, {bool isDiscount = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: isTotal
                ? AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.bold)
                : AppTextStyles.bodyMedium.copyWith(
                    color: isDiscount ? AppColors.success : AppColors.textSecondary,
                  ),
          ),
          Text(
            isDiscount
                ? '-\$${amount.abs().toStringAsFixed(2)}'
                : '\$${amount.toStringAsFixed(2)}',
            style: isTotal
                ? AppTextStyles.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  )
                : AppTextStyles.bodyMedium.copyWith(
                    color: isDiscount ? AppColors.success : AppColors.textPrimary,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodSection(PaymentState paymentState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.paymentMethod,
          style: AppTextStyles.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 8,
              ),
            ],
          ),
          child: Column(
            children: [
              _buildPaymentOption(
                method: PaymentMethod.online,
                title: 'Online Payment',
                subtitle: 'Pay via Razorpay',
                icon: Icons.credit_card,
              ),
              const Divider(height: 1),
              _buildPaymentOption(
                method: PaymentMethod.cod,
                title: 'Cash on Delivery',
                subtitle: paymentState.codAvailable
                    ? 'Pay when you receive'
                    : 'Not available',
                icon: Icons.money,
                enabled: paymentState.codAvailable,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required PaymentMethod method,
    required String title,
    required String subtitle,
    required IconData icon,
    bool enabled = true,
  }) {
    final isSelected = _selectedPaymentMethod == method;

    return GestureDetector(
      onTap: enabled
          ? () {
              setState(() => _selectedPaymentMethod = method);
              ref.read(paymentStateProvider.notifier).selectPaymentMethod(method);
            }
          : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.1)
              : Colors.transparent,
        ),
        child: Row(
          children: [
            Radio<PaymentMethod>(
              value: method,
              groupValue: _selectedPaymentMethod,
              onChanged: enabled
                  ? (value) {
                      setState(() => _selectedPaymentMethod = value);
                    }
                  : null,
              activeColor: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: enabled ? AppColors.textPrimary : AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: enabled
                          ? AppColors.textSecondary
                          : AppColors.error,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceOrderButton(CartState cartState, double total) {
    final paymentState = ref.watch(paymentStateProvider);
    final isProcessing = paymentState.isProcessing || paymentState.isCreatingOrder;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _selectedAddress == null || _selectedPaymentMethod == null || isProcessing
                ? null
                : () => _placeOrder(cartState, total),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              disabledBackgroundColor: AppColors.greyLight,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: isProcessing
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    'Place Order - \$${total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Future<void> _placeOrder(CartState cartState, double total) async {
    if (_selectedAddress == null) {
      _showError('Please select a delivery address');
      return;
    }

    if (_selectedPaymentMethod == null) {
      _showError('Please select a payment method');
      return;
    }

    setState(() => _isLoading = true);

    try {
      if (_selectedPaymentMethod == PaymentMethod.cod) {
        await _placeCodOrder(cartState);
      } else {
        await _placeOnlinePaymentOrder(cartState, total);
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _placeCodOrder(CartState cartState) async {
    final orderItems = cartState.items
        .map((item) => {
              'productId': item.product.id,
              'quantity': item.quantity,
              'price': item.product.finalPrice,
            })
        .toList();

    final order = await ref.read(ordersProvider.notifier).createOrder(
          restaurantId: cartState.restaurantId ?? '',
          items: orderItems,
          deliveryAddress: _selectedAddress!,
          paymentMethod: 'cod',
          deliveryInstructions: _instructionsController.text.isNotEmpty
              ? _instructionsController.text
              : null,
        );

    ref.read(cartProvider.notifier).clearCart();
    ref.read(couponStateProvider.notifier).removeCoupon();

    if (mounted) {
      context.go('/order/${order.id}');
    }
  }

  Future<void> _placeOnlinePaymentOrder(CartState cartState, double total) async {
    final orderItems = cartState.items
        .map((item) => {
              'productId': item.product.id,
              'quantity': item.quantity,
              'price': item.product.finalPrice,
            })
        .toList();

    // Create order first
    final order = await ref.read(ordersProvider.notifier).createOrder(
          restaurantId: cartState.restaurantId ?? '',
          items: orderItems,
          deliveryAddress: _selectedAddress!,
          paymentMethod: 'razorpay',
          deliveryInstructions: _instructionsController.text.isNotEmpty
              ? _instructionsController.text
              : null,
        );

    // Initialize payment
    await ref.read(paymentStateProvider.notifier).initializeRazorpay('razorpay_key_here');

    // Initiate payment
    final userState = ref.read(userProvider);
    
    await ref.read(paymentStateProvider.notifier).initiatePayment(
          orderId: order.id,
          amount: total,
          name: userState.user?.fullName ?? 'Customer',
          email: userState.user?.email ?? 'customer@email.com',
          phone: userState.user?.phone ?? '9999999999',
          onSuccess: (paymentId) async {
            try {
              await ref.read(paymentStateProvider.notifier).verifyPayment(
                    order.id,
                    paymentId,
                  );
              
              ref.read(cartProvider.notifier).clearCart();
              ref.read(couponStateProvider.notifier).removeCoupon();
              
              if (mounted) {
                context.go('/order/${order.id}');
              }
            } catch (e) {
              _showError('Payment verification failed: ${e.toString()}');
            }
          },
          onError: (error) {
            _showError('Payment failed: $error');
          },
        );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
      ),
    );
  }

  void _showAddAddressSheet() {
    // Navigate to add address screen or show bottom sheet
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Add address feature coming soon'),
      ),
    );
  }
}
