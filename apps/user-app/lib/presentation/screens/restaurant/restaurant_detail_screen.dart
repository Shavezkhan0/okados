import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/theme/text_styles.dart';
import '../../../data/models/restaurant_model.dart';
import '../../../data/models/product_model.dart';
import '../../../data/services/restaurant_service.dart';
import '../../../providers/cart_provider.dart';
import '../cart/cart_screen.dart';

final restaurantDetailsProvider = FutureProvider.family<RestaurantModel, String>((ref, id) async {
  final service = RestaurantService();
  return await service.getRestaurantDetails(id);
});

final restaurantMenuProvider = FutureProvider.family<List<ProductModel>, String>((ref, restaurantId) async {
  final service = RestaurantService();
  return await service.getRestaurantMenu(restaurantId);
});

final restaurantReviewsProvider = FutureProvider.family<List<ReviewModel>, String>((ref, restaurantId) async {
  final service = RestaurantService();
  return await service.getRestaurantReviews(restaurantId);
});

class RestaurantDetailScreen extends ConsumerStatefulWidget {
  final String restaurantId;

  const RestaurantDetailScreen({
    super.key,
    required this.restaurantId,
  });

  @override
  ConsumerState<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends ConsumerState<RestaurantDetailScreen> {
  int _selectedCategoryIndex = 0;
  final Map<String, GlobalKey> _categoryKeys = {};

  @override
  Widget build(BuildContext context) {
    final restaurantAsync = ref.watch(restaurantDetailsProvider(widget.restaurantId));
    final menuAsync = ref.watch(restaurantMenuProvider(widget.restaurantId));
    final cartState = ref.watch(cartProvider);

    return Scaffold(
      body: restaurantAsync.when(
        data: (restaurant) => _buildContent(restaurant, menuAsync),
        loading: () => _buildLoading(),
        error: (error, _) => _buildError(error.toString()),
      ),
      bottomNavigationBar: cartState.isNotEmpty
          ? _buildCartBar(cartState)
          : null,
    );
  }

  Widget _buildContent(RestaurantModel restaurant, AsyncValue<List<ProductModel>> menuAsync) {
    return CustomScrollView(
      slivers: [
        _buildSliverAppBar(restaurant),
        SliverToBoxAdapter(
          child: _buildRestaurantInfo(restaurant),
        ),
        if (menuAsync.hasValue)
          _buildCategoryTabs(menuAsync.value!),
        if (menuAsync.hasValue)
          _buildProductsList(menuAsync.value!, restaurant),
        if (menuAsync.hasValue)
          SliverToBoxAdapter(
            child: _buildReviewsSection(),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  Widget _buildSliverAppBar(RestaurantModel restaurant) {
    return SliverAppBar(
      expandedHeight: 250,
      pinned: true,
      backgroundColor: AppColors.surface,
      leading: GestureDetector(
        onTap: () => context.pop(),
        child: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 8,
              ),
            ],
          ),
          child: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: restaurant.bannerUrl != null
            ? CachedNetworkImage(
                imageUrl: restaurant.bannerUrl!,
                fit: BoxFit.cover,
                placeholder: (context, url) => _buildImageShimmer(),
                errorWidget: (context, url, error) => _buildImagePlaceholder(),
              )
            : _buildImagePlaceholder(),
      ),
    );
  }

  Widget _buildRestaurantInfo(RestaurantModel restaurant) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  restaurant.name,
                  style: AppTextStyles.headlineMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: restaurant.isOpen ? AppColors.success : AppColors.error,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  restaurant.isOpen ? 'Open' : 'Closed',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            restaurant.cuisines.join(' • '),
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              RatingBarIndicator(
                rating: restaurant.rating,
                itemBuilder: (context, _) => const Icon(
                  Icons.star,
                  color: AppColors.starFilled,
                ),
                itemCount: 5,
                itemSize: 18,
              ),
              const SizedBox(width: 8),
              Text(
                '${restaurant.rating.toStringAsFixed(1)} (${restaurant.totalReviews} reviews)',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildInfoChip(Icons.access_time, '${restaurant.deliveryTime} min'),
              const SizedBox(width: 16),
              _buildInfoChip(Icons.delivery_dining, '\$${restaurant.deliveryFee.toStringAsFixed(2)}'),
              const SizedBox(width: 16),
              _buildInfoChip(Icons.shopping_bag, 'Min \$${restaurant.minimumOrder.toStringAsFixed(0)}'),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.location_on, size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  restaurant.address,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(
          text,
          style: AppTextStyles.bodySmall.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryTabs(List<ProductModel> products) {
    final categories = _getCategories(products);
    
    return SliverPersistentHeader(
      pinned: true,
      delegate: _CategoryTabDelegate(
        categories: categories,
        selectedIndex: _selectedCategoryIndex,
        onCategorySelected: (index) {
          setState(() => _selectedCategoryIndex = index);
          _scrollToCategory(index, categories);
        },
      ),
    );
  }

  List<String> _getCategories(List<ProductModel> products) {
    final categorySet = <String>{};
    for (var product in products) {
      if (product.category.isNotEmpty) {
        categorySet.add(product.category);
      }
    }
    return categorySet.toList();
  }

  void _scrollToCategory(int index, List<String> categories) {
    // Implementation for smooth scroll to category
  }

  Widget _buildProductsList(List<ProductModel> products, RestaurantModel restaurant) {
    final categories = _getCategories(products);
    
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final category = categories[index];
          final categoryProducts = products.where((p) => p.category == category).toList();
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Text(
                  category,
                  style: AppTextStyles.titleLarge.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              ...categoryProducts.map((product) => _buildProductItem(product, restaurant)),
            ],
          );
        },
        childCount: categories.length,
      ),
    );
  }

  Widget _buildProductItem(ProductModel product, RestaurantModel restaurant) {
    final cartState = ref.watch(cartProvider);
    final cartItem = cartState.items.where((item) => item.product.id == product.id).firstOrNull;
    final quantity = cartItem?.quantity ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: product.imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: product.imageUrl!,
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => _buildProductImageShimmer(),
                    errorWidget: (context, url, error) => _buildProductImagePlaceholder(),
                  )
                : _buildProductImagePlaceholder(),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: product.isVeg ? AppColors.veg : AppColors.nonVeg,
                        border: Border.all(color: AppColors.divider),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        product.name,
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
                Text(
                  product.description,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      '\$${product.finalPrice.toStringAsFixed(2)}',
                      style: AppTextStyles.titleSmall.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (product.discountPrice != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        '\$${product.price.toStringAsFixed(2)}',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (quantity == 0)
                      GestureDetector(
                        onTap: () => _addToCart(product, restaurant),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Add',
                            style: AppTextStyles.buttonSmall.copyWith(
                              color: AppColors.white,
                            ),
                          ),
                        ),
                      )
                    else
                      _buildQuantityControls(product, quantity),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuantityControls(ProductModel product, int quantity) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () {
              if (quantity == 1) {
                ref.read(cartProvider.notifier).removeItem(product.id);
              } else {
                ref.read(cartProvider.notifier).updateQuantity(product.id, quantity - 1);
              }
            },
            child: const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.remove, color: AppColors.white, size: 18),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '$quantity',
              style: AppTextStyles.buttonMedium.copyWith(
                color: AppColors.white,
              ),
            ),
          ),
          GestureDetector(
            onTap: () => _addToCart(product, null),
            child: const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.add, color: AppColors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _addToCart(ProductModel product, RestaurantModel? restaurant) async {
    final cartState = ref.read(cartProvider);
    
    if (cartState.restaurantId != null && 
        cartState.restaurantId != product.restaurantId &&
        cartState.items.isNotEmpty) {
      final confirmed = await _showClearCartDialog(restaurant?.name ?? 'another restaurant');
      if (!confirmed) return;
      await ref.read(cartProvider.notifier).clearCart();
    }
    
    await ref.read(cartProvider.notifier).addItem(
      product,
      quantity: 1,
      restaurantId: product.restaurantId,
      restaurantName: restaurant?.name,
    );
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${product.name} added to cart'),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<bool> _showClearCartDialog(String restaurantName) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Start Fresh?'),
        content: Text('Your cart has items from $restaurantName. Starting a new cart will clear it. Continue?'),
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
    ) ?? false;
  }

  Widget _buildReviewsSection() {
    final reviewsAsync = ref.watch(restaurantReviewsProvider(widget.restaurantId));
    
    return reviewsAsync.when(
      data: (reviews) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Reviews',
              style: AppTextStyles.titleLarge.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (reviews.isEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'No reviews yet',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            )
          else
            ...reviews.take(5).map((review) => _buildReviewItem(review)),
        ],
      ),
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const SizedBox(),
    );
  }

  Widget _buildReviewItem(ReviewModel review) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.greyLight,
                backgroundImage: review.userImage != null
                    ? CachedNetworkImageProvider(review.userImage!)
                    : null,
                child: review.userImage == null
                    ? Text(review.userName[0].toUpperCase())
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.userName,
                      style: AppTextStyles.titleSmall.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    RatingBarIndicator(
                      rating: review.rating,
                      itemBuilder: (context, _) => const Icon(
                        Icons.star,
                        color: AppColors.starFilled,
                      ),
                      itemCount: 5,
                      itemSize: 14,
                    ),
                  ],
                ),
              ),
              Text(
                _formatDate(review.createdAt),
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          if (review.comment != null && review.comment!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              review.comment!,
              style: AppTextStyles.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays > 30) {
      return '${date.day}/${date.month}/${date.year}';
    } else if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    } else {
      return 'Just now';
    }
  }

  Widget _buildCartBar(CartState cartState) {
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
        child: GestureDetector(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CartScreen()),
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${cartState.itemCount}',
                    style: AppTextStyles.buttonMedium.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'View Cart',
                  style: AppTextStyles.buttonMedium.copyWith(
                    color: AppColors.white,
                  ),
                ),
                const Spacer(),
                Text(
                  '\$${cartState.subtotal.toStringAsFixed(2)}',
                  style: AppTextStyles.buttonMedium.copyWith(
                    color: AppColors.white,
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

  Widget _buildLoading() {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 250,
          pinned: true,
          flexibleSpace: Shimmer.fromColors(
            baseColor: AppColors.greyLight,
            highlightColor: AppColors.white,
            child: Container(color: AppColors.white),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Shimmer.fromColors(
              baseColor: AppColors.greyLight,
              highlightColor: AppColors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 24, width: 200, color: AppColors.white),
                  const SizedBox(height: 8),
                  Container(height: 16, width: 150, color: AppColors.white),
                  const SizedBox(height: 16),
                  Container(height: 16, width: 100, color: AppColors.white),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text('Error: $error'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.refresh(restaurantDetailsProvider(widget.restaurantId)),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildImageShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.greyLight,
      highlightColor: AppColors.white,
      child: Container(color: AppColors.greyLight),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: AppColors.greyLight,
      child: const Icon(Icons.restaurant, size: 64, color: AppColors.textSecondary),
    );
  }

  Widget _buildProductImageShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.greyLight,
      highlightColor: AppColors.white,
      child: Container(width: 80, height: 80, color: AppColors.white),
    );
  }

  Widget _buildProductImagePlaceholder() {
    return Container(
      width: 80,
      height: 80,
      color: AppColors.greyLight,
      child: const Icon(Icons.fastfood, color: AppColors.textSecondary),
    );
  }
}

class _CategoryTabDelegate extends SliverPersistentHeaderDelegate {
  final List<String> categories;
  final int selectedIndex;
  final Function(int) onCategorySelected;

  _CategoryTabDelegate({
    required this.categories,
    required this.selectedIndex,
    required this.onCategorySelected,
  });

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.surface,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final isSelected = index == selectedIndex;
          return GestureDetector(
            onTap: () => onCategorySelected(index),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.greyLight.withOpacity(0.3),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                categories[index],
                style: TextStyle(
                  color: isSelected ? AppColors.white : AppColors.textPrimary,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  double get maxExtent => 56;

  @override
  double get minExtent => 56;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) => true;
}
