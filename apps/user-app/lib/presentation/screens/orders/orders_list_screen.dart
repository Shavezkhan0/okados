import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/theme/text_styles.dart';
import '../../../data/models/order_model.dart';
import '../../../providers/order_provider.dart';
import '../../../providers/cart_provider.dart';
import '../orders/order_tracking_screen.dart';

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _activeScrollController = ScrollController();
  final ScrollController _pastScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadOrders();
    _setupScrollListeners();
  }

  void _loadOrders() {
    ref.read(ordersProvider.notifier).loadOrders(refresh: true);
  }

  void _setupScrollListeners() {
    _activeScrollController.addListener(() {
      if (_activeScrollController.position.pixels >= _activeScrollController.position.maxScrollExtent - 200) {
        ref.read(ordersProvider.notifier).loadMoreActive();
      }
    });
    _pastScrollController.addListener(() {
      if (_pastScrollController.position.pixels >= _pastScrollController.position.maxScrollExtent - 200) {
        ref.read(ordersProvider.notifier).loadMorePast();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _activeScrollController.dispose();
    _pastScrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Text(
          'My Orders',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Active'),
            Tab(text: 'Past'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _ActiveOrdersTab(scrollController: _activeScrollController),
          _PastOrdersTab(scrollController: _pastScrollController),
        ],
      ),
    );
  }
}

class _ActiveOrdersTab extends ConsumerWidget {
  final ScrollController scrollController;

  const _ActiveOrdersTab({required this.scrollController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersState = ref.watch(ordersProvider);

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(ordersProvider.notifier).loadOrders(refresh: true);
      },
      child: ordersState.isLoading && ordersState.activeOrders.isEmpty
          ? _buildLoadingList()
          : ordersState.activeOrders.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: ordersState.activeOrders.length + (ordersState.isLoadingMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index >= ordersState.activeOrders.length) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }
                    return _OrderCard(
                      order: ordersState.activeOrders[index],
                      isActive: true,
                    );
                  },
                ),
    );
  }

  Widget _buildLoadingList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) => _OrderCardShimmer(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.greyLight.withOpacity(0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.receipt_long_outlined,
                size: 48,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No active orders',
              style: AppTextStyles.titleMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your active orders will appear here',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textHint,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _PastOrdersTab extends ConsumerWidget {
  final ScrollController scrollController;

  const _PastOrdersTab({required this.scrollController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersState = ref.watch(ordersProvider);

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(ordersProvider.notifier).loadOrders(refresh: true);
      },
      child: ordersState.isLoading && ordersState.pastOrders.isEmpty
          ? _buildLoadingList()
          : ordersState.pastOrders.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: ordersState.pastOrders.length + (ordersState.isLoadingMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index >= ordersState.pastOrders.length) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }
                    return _OrderCard(
                      order: ordersState.pastOrders[index],
                      isActive: false,
                    );
                  },
                ),
    );
  }

  Widget _buildLoadingList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) => _OrderCardShimmer(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.greyLight.withOpacity(0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.history,
                size: 48,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No past orders',
              style: AppTextStyles.titleMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your order history will appear here',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textHint,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends ConsumerWidget {
  final OrderModel order;
  final bool isActive;

  const _OrderCard({
    required this.order,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => context.push('/order/${order.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
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
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: order.restaurant.logoUrl != null
                                  ? CachedNetworkImage(
                                      imageUrl: order.restaurant.logoUrl!,
                                      width: 50,
                                      height: 50,
                                      fit: BoxFit.cover,
                                    )
                                  : Container(
                                      width: 50,
                                      height: 50,
                                      color: AppColors.greyLight,
                                      child: const Icon(Icons.restaurant),
                                    ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    order.restaurant.name,
                                    style: AppTextStyles.titleSmall.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '#${order.orderNumber.substring(order.orderNumber.length - 6)}',
                                    style: AppTextStyles.bodySmall.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      _buildStatusBadge(order.status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.calendar_today, size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(order.createdAt),
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Icon(Icons.shopping_bag, size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        '${order.items.length} items',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '\$${order.pricing.grandTotal.toStringAsFixed(2)}',
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
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  if (isActive)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => context.push('/order/${order.id}/track'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Track'),
                      ),
                    )
                  else
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _reorderItems(context, ref),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Reorder'),
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => context.push('/order/${order.id}'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Details'),
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

  Widget _buildStatusBadge(String status) {
    Color backgroundColor;
    Color textColor;
    String displayText;

    switch (status.toLowerCase()) {
      case 'pending':
        backgroundColor = AppColors.warning;
        textColor = Colors.white;
        displayText = 'Pending';
        break;
      case 'confirmed':
      case 'accepted':
        backgroundColor = AppColors.info;
        textColor = Colors.white;
        displayText = 'Accepted';
        break;
      case 'preparing':
        backgroundColor = AppColors.secondary;
        textColor = Colors.white;
        displayText = 'Preparing';
        break;
      case 'ready':
        backgroundColor = AppColors.info;
        textColor = Colors.white;
        displayText = 'Ready';
        break;
      case 'on_the_way':
      case 'out_for_delivery':
        backgroundColor = AppColors.primary;
        textColor = Colors.white;
        displayText = 'On the Way';
        break;
      case 'delivered':
        backgroundColor = AppColors.success;
        textColor = Colors.white;
        displayText = 'Delivered';
        break;
      case 'cancelled':
        backgroundColor = AppColors.error;
        textColor = Colors.white;
        displayText = 'Cancelled';
        break;
      default:
        backgroundColor = AppColors.grey;
        textColor = Colors.white;
        displayText = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        displayText,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }

  void _reorderItems(BuildContext context, WidgetRef ref) async {
    final cartState = ref.read(cartProvider);
    
    if (cartState.restaurantId != null && 
        cartState.restaurantId != order.restaurant.id &&
        cartState.items.isNotEmpty) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Start Fresh?'),
          content: Text('Your cart has items from ${cartState.restaurantName}. Starting a new cart will clear it. Continue?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Start Fresh'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
      ref.read(cartProvider.notifier).clearCart();
    }

    for (final item in order.items) {
      await ref.read(cartProvider.notifier).addItem(
        item.product,
        quantity: item.quantity,
        restaurantId: order.restaurant.id,
        restaurantName: order.restaurant.name,
      );
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${order.items.length} items added to cart'),
          backgroundColor: AppColors.success,
        ),
      );
      context.go('/home');
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inDays == 0) {
      return 'Today, ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}

class _OrderCardShimmer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.greyLight,
      highlightColor: AppColors.white,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 16,
                        width: 120,
                        color: AppColors.white,
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 12,
                        width: 80,
                        color: AppColors.white,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              height: 12,
              width: 100,
              color: AppColors.white,
            ),
          ],
        ),
      ),
    );
  }
}
