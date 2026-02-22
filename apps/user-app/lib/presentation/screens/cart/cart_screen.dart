import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/theme/text_styles.dart';
import '../../../data/services/coupon_service.dart';
import '../../../providers/cart_provider.dart';
import '../../../providers/coupon_provider.dart';
import '../checkout/checkout_screen.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _couponController = TextEditingController();

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  double get _deliveryFee => 2.99;
  double get _taxRate => 0.08;

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);
    final couponState = ref.watch(couponStateProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              AppStrings.cart,
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (cartState.restaurantName != null)
              Text(
                cartState.restaurantName!,
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        actions: [
          if (cartState.isNotEmpty)
            TextButton(
              onPressed: () => _showClearCartDialog(),
              child: Text(
                'Clear',
                style: TextStyle(color: AppColors.error),
              ),
            ),
        ],
      ),
      body: cartState.isEmpty
          ? _buildEmptyCart()
          : _buildCartContent(cartState, couponState),
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.greyLight.withOpacity(0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.shopping_cart_outlined,
                size: 64,
                color: AppColors.textHint,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              AppStrings.emptyCart,
              style: AppTextStyles.headlineSmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              AppStrings.addItems,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              ),
              child: const Text(
                'Browse Restaurants',
                style: TextStyle(color: AppColors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartContent(CartState cartState, CouponState couponState) {
    final subtotal = cartState.subtotal;
    final discount = couponState.discount ?? 0;
    final deliveryFee = _deliveryFee;
    final taxes = (subtotal - discount) * _taxRate;
    final total = subtotal - discount + deliveryFee + taxes;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCartItems(cartState),
                const SizedBox(height: 24),
                _buildCouponSection(cartState, couponState),
                const SizedBox(height: 24),
                _buildPriceSummary(
                  subtotal: subtotal,
                  discount: discount,
                  deliveryFee: deliveryFee,
                  taxes: taxes,
                  total: total,
                ),
              ],
            ),
          ),
        ),
        _buildCheckoutButton(total),
      ],
    );
  }

  Widget _buildCartItems(CartState cartState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${cartState.itemCount} items in cart',
          style: AppTextStyles.titleMedium.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        ...cartState.items.map((item) => Dismissible(
              key: Key(item.id),
              direction: DismissDirection.endToStart,
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 20),
                color: AppColors.error,
                child: const Icon(Icons.delete, color: Colors.white),
              ),
              onDismissed: (_) {
                ref.read(cartProvider.notifier).removeItem(item.product.id);
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.shadow,
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: item.product.imageUrl != null
                          ? CachedNetworkImage(
                              imageUrl: item.product.imageUrl!,
                              width: 70,
                              height: 70,
                              fit: BoxFit.cover,
                              placeholder: (_, __) => _buildImagePlaceholder(),
                              errorWidget: (_, __, ___) => _buildImagePlaceholder(),
                            )
                          : _buildImagePlaceholder(),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: item.product.isVeg
                                      ? AppColors.veg
                                      : AppColors.nonVeg,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  item.product.name,
                                  style: AppTextStyles.titleSmall.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          if (item.product.description.isNotEmpty)
                            Text(
                              item.product.description,
                              style: AppTextStyles.bodySmall.copyWith(
                                color: AppColors.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _buildQuantityStepper(item.product.id, item.quantity),
                              const Spacer(),
                              Text(
                                '\$${item.totalPrice.toStringAsFixed(2)}',
                                style: AppTextStyles.titleSmall.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      width: 70,
      height: 70,
      color: AppColors.greyLight,
      child: const Icon(Icons.fastfood, color: AppColors.textSecondary),
    );
  }

  Widget _buildQuantityStepper(String productId, int quantity) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: () {
              if (quantity == 1) {
                ref.read(cartProvider.notifier).removeItem(productId);
              } else {
                ref.read(cartProvider.notifier).updateQuantity(productId, quantity - 1);
              }
            },
            child: const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.remove, size: 16, color: AppColors.textPrimary),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              '$quantity',
              style: AppTextStyles.buttonMedium,
            ),
          ),
          InkWell(
            onTap: () {
              ref.read(cartProvider.notifier).updateQuantity(productId, quantity + 1);
            },
            child: const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.add, size: 16, color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCouponSection(CartState cartState, CouponState couponState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _couponController,
                decoration: InputDecoration(
                  hintText: 'Enter coupon code',
                  prefixIcon: const Icon(Icons.local_offer_outlined),
                  filled: true,
                  fillColor: AppColors.greyLight.withOpacity(0.3),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton(
              onPressed: couponState.isLoading
                  ? null
                  : () => _applyCoupon(cartState),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: couponState.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Apply',
                      style: TextStyle(color: Colors.white),
                    ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton.icon(
              onPressed: () => _showAvailableCoupons(cartState),
              icon: const Icon(Icons.local_offer, size: 18),
              label: const Text('View Available Coupons'),
            ),
            if (couponState.appliedCoupon != null)
              TextButton(
                onPressed: () {
                  ref.read(couponStateProvider.notifier).removeCoupon();
                  _couponController.clear();
                },
                child: Text(
                  'Remove',
                  style: TextStyle(color: AppColors.error),
                ),
              ),
          ],
        ),
        if (couponState.error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              couponState.error!,
              style: TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ),
        if (couponState.appliedCoupon != null && couponState.discount != null)
          Container(
            margin: const EdgeInsets.only(top: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.success.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.success.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Coupon Applied: ${couponState.appliedCoupon!.code}',
                        style: TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'You save \$${couponState.discount!.toStringAsFixed(2)}',
                        style: TextStyle(
                          color: AppColors.success,
                          fontSize: 12,
                        ),
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

  Future<void> _applyCoupon(CartState cartState) async {
    if (_couponController.text.isEmpty) return;

    await ref.read(couponStateProvider.notifier).validateCoupon(
          code: _couponController.text.trim(),
          restaurantId: cartState.restaurantId ?? '',
          orderAmount: cartState.subtotal,
        );
  }

  void _showAvailableCoupons(CartState cartState) {
    ref.read(couponStateProvider.notifier).loadAvailableCoupons(
          restaurantId: cartState.restaurantId,
          orderAmount: cartState.subtotal,
        );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AvailableCouponsSheet(
        restaurantId: cartState.restaurantId ?? '',
        orderAmount: cartState.subtotal,
      ),
    );
  }

  Widget _buildPriceSummary({
    required double subtotal,
    required double discount,
    required double deliveryFee,
    required double taxes,
    required double total,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Price Details',
            style: AppTextStyles.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildPriceRow('Subtotal', subtotal),
          if (discount > 0)
            _buildPriceRow('Discount', -discount, isDiscount: true),
          _buildPriceRow('Delivery Fee', deliveryFee),
          _buildPriceRow('Taxes & Charges', taxes),
          const Divider(height: 24),
          _buildPriceRow(
            'Total',
            total,
            isTotal: true,
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isDiscount = false, bool isTotal = false}) {
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
                    fontWeight: isDiscount ? FontWeight.w600 : FontWeight.normal,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckoutButton(double total) {
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
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CheckoutScreen()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Proceed to Checkout',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showClearCartDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Cart'),
        content: const Text('Are you sure you want to clear the cart?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(AppStrings.cancel),
          ),
          TextButton(
            onPressed: () {
              ref.read(cartProvider.notifier).clearCart();
              ref.read(couponStateProvider.notifier).removeCoupon();
              Navigator.pop(context);
            },
            child: Text(
              AppStrings.delete,
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

class _AvailableCouponsSheet extends ConsumerWidget {
  final String restaurantId;
  final double orderAmount;

  const _AvailableCouponsSheet({
    required this.restaurantId,
    required this.orderAmount,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final couponState = ref.watch(couponStateProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.greyLight,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Available Coupons',
              style: AppTextStyles.titleLarge.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            child: couponState.isLoadingAvailable
                ? const Center(child: CircularProgressIndicator())
                : couponState.availableCoupons.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.local_offer_outlined,
                              size: 48,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No coupons available',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: couponState.availableCoupons.length,
                        itemBuilder: (context, index) {
                          final coupon = couponState.availableCoupons[index];
                          return _CouponTile(
                            coupon: coupon,
                            orderAmount: orderAmount,
                            isApplied: couponState.appliedCoupon?.id == coupon.id,
                            onApply: () {
                              ref.read(couponStateProvider.notifier).applyCoupon(
                                    coupon,
                                    orderAmount,
                                  );
                              Navigator.pop(context);
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _CouponTile extends StatelessWidget {
  final CouponModel coupon;
  final double orderAmount;
  final bool isApplied;
  final VoidCallback onApply;

  const _CouponTile({
    required this.coupon,
    required this.orderAmount,
    required this.isApplied,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context) {
    final discount = coupon.calculateDiscount(orderAmount);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isApplied
            ? AppColors.primary.withOpacity(0.1)
            : AppColors.greyLight.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isApplied ? AppColors.primary : AppColors.divider,
          width: isApplied ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  coupon.discountPercentage != null
                      ? '${coupon.discountPercentage!.toStringAsFixed(0)}% OFF'
                      : '\$${coupon.discountAmount!.toStringAsFixed(0)} OFF',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  coupon.code,
                  style: AppTextStyles.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (isApplied)
                const Icon(Icons.check_circle, color: AppColors.primary),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            coupon.description,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          if (coupon.minimumOrder != null) ...[
            const SizedBox(height: 4),
            Text(
              'Min order: \$${coupon.minimumOrder!.toStringAsFixed(0)}',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'You save: \$${discount.toStringAsFixed(2)}',
                style: TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (!isApplied)
                TextButton(
                  onPressed: onApply,
                  child: const Text('Apply'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
