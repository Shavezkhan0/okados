import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/restaurant_model.dart';
import '../../../data/models/product_model.dart';
import '../../../data/services/search_service.dart';
import '../../../data/services/storage_service.dart';
import '../../widgets/restaurant_card.dart';
import '../../widgets/product_card.dart';

final searchServiceProvider = Provider((ref) => SearchService());
final storageServiceProvider = Provider((ref) => StorageService());

final searchQueryProvider = StateProvider<String>((ref) => '');
final searchFiltersProvider = StateProvider<SearchFilters>((ref) => const SearchFilters());
final searchTabProvider = StateProvider<int>((ref) => 0);
final recentSearchesProvider = StateProvider<List<String>>((ref) => []);

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  Timer? _debounce;
  bool _isSearching = false;
  List<RestaurantModel> _restaurantResults = [];
  List<ProductModel> _productResults = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRecentSearches();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  Future<void> _loadRecentSearches() async {
    final storage = ref.read(storageServiceProvider);
    final searches = await storage.getList('recent_searches') ?? [];
    ref.read(recentSearchesProvider.notifier).state = searches;
  }

  Future<void> _saveRecentSearch(String query) async {
    if (query.isEmpty) return;
    final storage = ref.read(storageServiceProvider);
    final searches = ref.read(recentSearchesProvider);
    if (!searches.contains(query)) {
      final updated = [query, ...searches].take(10).toList();
      await storage.setList('recent_searches', updated);
      ref.read(recentSearchesProvider.notifier).state = updated;
    }
  }

  void _onSearchChanged(String query) {
    ref.read(searchQueryProvider.notifier).state = query;
    
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (query.isNotEmpty) {
        _performSearch(query);
      } else {
        setState(() {
          _restaurantResults = [];
          _productResults = [];
          _isSearching = false;
        });
      }
    });
  }

  Future<void> _performSearch(String query) async {
    setState(() {
      _isSearching = true;
      _error = null;
    });

    try {
      final service = ref.read(searchServiceProvider);
      final filters = ref.read(searchFiltersProvider);

      final results = await Future.wait([
        service.searchRestaurants(
          query: query,
          cuisine: filters.cuisine,
          minRating: filters.minRating,
          maxDeliveryTime: filters.maxDeliveryTime,
          sortBy: filters.sortBy,
        ),
        service.searchProducts(
          query: query,
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        ),
      ]);

      setState(() {
        _restaurantResults = results[0] as List<RestaurantModel>;
        _productResults = results[1] as List<ProductModel>;
        _isSearching = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isSearching = false;
      });
    }
  }

  void _clearSearch() {
    _searchController.clear();
    ref.read(searchQueryProvider.notifier).state = '';
    setState(() {
      _restaurantResults = [];
      _productResults = [];
      _isSearching = false;
    });
  }

  void _onRecentSearchTap(String query) {
    _searchController.text = query;
    _onSearchChanged(query);
  }

  Future<void> _applyFilters() async {
    final filters = ref.read(searchFiltersProvider);
    await _performSearch(filters.query ?? _searchController.text);
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _FilterBottomSheet(
        onApply: _applyFilters,
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(searchQueryProvider);
    final currentTab = ref.watch(searchTabProvider);
    final recentSearches = ref.watch(recentSearchesProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        titleSpacing: 0,
        title: Container(
          height: 48,
          margin: const EdgeInsets.only(left: 16),
          decoration: BoxDecoration(
            color: AppColors.greyLight.withOpacity(0.3),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            decoration: InputDecoration(
              hintText: 'Search restaurants or dishes',
              hintStyle: TextStyle(color: AppColors.textHint),
              prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
              suffixIcon: query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: AppColors.textSecondary),
                      onPressed: _clearSearch,
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onChanged: _onSearchChanged,
            textInputAction: TextInputAction.search,
            onSubmitted: (value) {
              if (value.isNotEmpty) {
                _saveRecentSearch(value);
                _performSearch(value);
              }
            },
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune, color: AppColors.textPrimary),
            onPressed: _showFilterSheet,
          ),
        ],
      ),
      body: query.isEmpty
          ? _buildRecentSearches(recentSearches)
          : _isSearching
              ? _buildLoading()
              : _error != null
                  ? _buildError()
                  : _buildResults(currentTab),
    );
  }

  Widget _buildRecentSearches(List<String> searches) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (searches.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Searches',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton(
                  onPressed: () async {
                    final storage = ref.read(storageServiceProvider);
                    await storage.remove('recent_searches');
                    ref.read(recentSearchesProvider.notifier).state = [];
                  },
                  child: Text(
                    'Clear All',
                    style: TextStyle(color: AppColors.error),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: searches.map((search) {
                return GestureDetector(
                  onTap: () => _onRecentSearchTap(search),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.greyLight.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.history, size: 16, color: AppColors.textSecondary),
                        const SizedBox(width: 6),
                        Text(
                          search,
                          style: TextStyle(color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ] else
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 100),
                  Icon(
                    Icons.search,
                    size: 80,
                    color: AppColors.textHint,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Search for your favorite food',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLoading() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (int i = 0; i < 5; i++) const ProductCardShimmer(),
      ],
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: AppColors.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Something went wrong',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => _performSearch(_searchController.text),
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(int currentTab) {
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.greyLight.withOpacity(0.3),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              _buildTab('Restaurants (${_restaurantResults.length})', 0),
              _buildTab('Items (${_productResults.length})', 1),
            ],
          ),
        ),
        Expanded(
          child: currentTab == 0
              ? _buildRestaurantResults()
              : _buildProductResults(),
        ),
      ],
    );
  }

  Widget _buildTab(String label, int index) {
    final currentTab = ref.watch(searchTabProvider);
    final isSelected = currentTab == index;

    return Expanded(
      child: GestureDetector(
        onTap: () => ref.read(searchTabProvider.notifier).state = index,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? AppColors.white : AppColors.textPrimary,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRestaurantResults() {
    if (_restaurantResults.isEmpty) {
      return _buildEmptyState('No restaurants found');
    }

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 16),
      itemCount: _restaurantResults.length,
      itemBuilder: (context, index) {
        final restaurant = _restaurantResults[index];
        return RestaurantCard(
          restaurant: restaurant,
          onTap: () => context.push('/restaurant/${restaurant.id}'),
        );
      },
    );
  }

  Widget _buildProductResults() {
    if (_productResults.isEmpty) {
      return _buildEmptyState('No items found');
    }

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 16),
      itemCount: _productResults.length,
      itemBuilder: (context, index) {
        final product = _productResults[index];
        return ProductListTile(
          product: product,
          onTap: () {},
        );
      },
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
        ],
      ),
    );
  }
}

class _FilterBottomSheet extends ConsumerStatefulWidget {
  final VoidCallback onApply;

  const _FilterBottomSheet({required this.onApply});

  @override
  ConsumerState<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends ConsumerState<_FilterBottomSheet> {
  late String? _selectedSortBy;
  late double _minRating;
  late int _maxDeliveryTime;
  final List<String> _cuisines = [
    'Indian',
    'Chinese',
    'Italian',
    'Mexican',
    'Thai',
    'Japanese',
    'American',
    'Continental',
  ];
  late List<String> _selectedCuisines;

  @override
  void initState() {
    super.initState();
    final filters = ref.read(searchFiltersProvider);
    _selectedSortBy = filters.sortBy;
    _minRating = filters.minRating ?? 0;
    _maxDeliveryTime = filters.maxDeliveryTime ?? 60;
    _selectedCuisines = filters.cuisine?.split(',').where((c) => c.isNotEmpty).toList() ?? [];
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
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
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Filters',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _selectedSortBy = null;
                      _minRating = 0;
                      _maxDeliveryTime = 60;
                      _selectedCuisines = [];
                    });
                  },
                  child: Text('Reset', style: TextStyle(color: AppColors.error)),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sort By',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildSortChip('Rating', 'rating'),
                      _buildSortChip('Delivery Time', 'deliveryTime'),
                      _buildSortChip('Price', 'price'),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Cuisine',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _cuisines.map((cuisine) {
                      final isSelected = _selectedCuisines.contains(cuisine);
                      return FilterChip(
                        label: Text(cuisine),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            if (selected) {
                              _selectedCuisines.add(cuisine);
                            } else {
                              _selectedCuisines.remove(cuisine);
                            }
                          });
                        },
                        selectedColor: AppColors.primary.withOpacity(0.15),
                        checkmarkColor: AppColors.primary,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Minimum Rating: ${_minRating.toStringAsFixed(1)}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  Slider(
                    value: _minRating,
                    min: 0,
                    max: 5,
                    divisions: 10,
                    activeColor: AppColors.primary,
                    onChanged: (value) => setState(() => _minRating = value),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Max Delivery Time: $_maxDeliveryTime min',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  Slider(
                    value: _maxDeliveryTime.toDouble(),
                    min: 15,
                    max: 120,
                    divisions: 7,
                    activeColor: AppColors.primary,
                    onChanged: (value) => setState(() => _maxDeliveryTime = value.toInt()),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  final filters = SearchFilters(
                    query: ref.read(searchQueryProvider),
                    sortBy: _selectedSortBy,
                    cuisine: _selectedCuisines.isNotEmpty ? _selectedCuisines.join(',') : null,
                    minRating: _minRating > 0 ? _minRating : null,
                    maxDeliveryTime: _maxDeliveryTime < 60 ? _maxDeliveryTime : null,
                  );
                  ref.read(searchFiltersProvider.notifier).state = filters;
                  widget.onApply();
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Apply Filters',
                  style: TextStyle(
                    color: AppColors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSortChip(String label, String value) {
    final isSelected = _selectedSortBy == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedSortBy = isSelected ? null : value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.greyLight.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppColors.white : AppColors.textPrimary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
