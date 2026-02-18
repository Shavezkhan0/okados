/**
 * Product Controller
 * Handles product/menu-related operations
 * @module controllers/product.controller
 */

const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { getPaginationMeta } = require('../utils/helpers');
const cloudinaryService = require('../services/cloudinary.service');

const logger = {
  info: (message, meta = {}) => console.log(`[PRODUCT CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[PRODUCT CONTROLLER ERROR] ${message}`, meta),
};

const CACHE_TTL = 5 * 60 * 1000;
const productCache = new Map();

const getCache = (key) => {
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  productCache.delete(key);
  return null;
};

const setCache = (key, data) => {
  productCache.set(key, { data, timestamp: Date.now() });
  if (productCache.size > 100) {
    const firstKey = productCache.keys().next().value;
    productCache.delete(firstKey);
  }
};

const clearProductCache = (restaurantId) => {
  for (const key of productCache.keys()) {
    if (key.includes(restaurantId)) {
      productCache.delete(key);
    }
  }
};

const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const validateCustomizations = (customizations) => {
  if (!customizations || !Array.isArray(customizations)) {
    return { valid: true };
  }

  for (const customization of customizations) {
    if (!customization.name || typeof customization.name !== 'string') {
      return { valid: false, error: 'Customization name is required' };
    }

    if (customization.required !== undefined && typeof customization.required !== 'boolean') {
      return { valid: false, error: 'Customization required must be a boolean' };
    }

    if (customization.multiSelect !== undefined && typeof customization.multiSelect !== 'boolean') {
      return { valid: false, error: 'Customization multiSelect must be a boolean' };
    }

    if (!customization.options || !Array.isArray(customization.options) || customization.options.length === 0) {
      return { valid: false, error: 'Customization must have at least one option' };
    }

    for (const option of customization.options) {
      if (!option.name || typeof option.name !== 'string') {
        return { valid: false, error: 'Option name is required' };
      }
      if (option.price === undefined || typeof option.price !== 'number' || option.price < 0) {
        return { valid: false, error: 'Option price must be a non-negative number' };
      }
    }
  }

  return { valid: true };
};

const calculateTotalPrice = (basePrice, selectedCustomizations, productCustomizations) => {
  let totalPrice = basePrice;

  for (const customization of selectedCustomizations) {
    const productCustomization = productCustomizations.find(
      c => c.name === customization.name
    );

    if (!productCustomization) continue;

    for (const selectedOption of customization.selectedOptions) {
      const option = productCustomization.options.find(
        o => o.name === selectedOption
      );

      if (option) {
        totalPrice += option.price;
      }
    }
  }

  return totalPrice;
};

/**
 * @desc Get product by ID
 * @route GET /api/v1/products/:id
 * @access Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cacheKey = `product:${id}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.success(res, { product: cached });
  }

  const product = await Product.findOne({ _id: id, isActive: true })
    .populate('restaurantId', 'name logo rating deliveryRadius timing isOpen');

  if (!product) {
    return ApiResponse.notFound(res, 'Product not found');
  }

  setCache(cacheKey, product);
  ApiResponse.success(res, { product });
});

/**
 * @desc Get restaurant products
 * @route GET /api/v1/restaurants/:restaurantId/products
 * @access Public
 */
const getRestaurantProducts = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { category, type, isAvailable } = req.query;

  const cacheKey = `restaurant:${restaurantId}:products:${JSON.stringify(req.query)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.success(res, cached);
  }

  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    isApproved: true,
    isActive: true,
  });

  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const query = { restaurantId, isActive: true };

  if (category) {
    query.category = { $regex: new RegExp(category, 'i') };
  }

  if (type) {
    query.type = type;
  }

  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable === 'true';
  }

  const products = await Product.find(query)
    .populate('restaurantId', 'name logo')
    .sort({ category: 1, name: 1 });

  const groupedProducts = products.reduce((acc, product) => {
    const productObj = product.toJSON();
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(productObj);
    return acc;
  }, {});

  const categories = Object.keys(groupedProducts).map(category => ({
    name: category,
    products: groupedProducts[category],
    count: groupedProducts[category].length,
  }));

  const response = { products, categories, totalProducts: products.length };
  setCache(cacheKey, response);

  ApiResponse.success(res, response);
});

/**
 * @desc Search products
 * @route GET /api/v1/products/search
 * @access Public
 */
const searchProducts = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return ApiResponse.badRequest(res, 'Search query must be at least 2 characters');
  }

  const cacheKey = `search:${q}:${page}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.paginated(res, cached.products, cached.pagination);
  }

  const searchRegex = new RegExp(q.trim(), 'i');

  const products = await Product.find({
    $or: [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { tags: { $in: [searchRegex] } },
    ],
    isActive: true,
    isAvailable: true,
  })
    .populate('restaurantId', 'name logo rating isOpen')
    .sort({ 'stats.rating.average': -1, 'stats.totalOrders': -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Product.countDocuments({
    $or: [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { tags: { $in: [searchRegex] } },
    ],
    isActive: true,
    isAvailable: true,
  });

  const pagination = getPaginationMeta(page, limit, total);
  const response = { products, total, pages: pagination.totalPages };

  setCache(cacheKey, response);

  ApiResponse.paginated(res, response, pagination);
});

/**
 * @desc Create product
 * @route POST /api/v1/products
 * @access Private (Restaurant Owner)
 */
const createProduct = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    name, description, image, category, type, price, discountedPrice,
    preparationTime, tags, customizations, nutrition
  } = req.body;

  logger.info('Creating product', { userId, name });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found. Please register your restaurant first.');
  }

  const customizationValidation = validateCustomizations(customizations);
  if (!customizationValidation.valid) {
    return ApiResponse.badRequest(res, customizationValidation.error);
  }

  let imageUrl = image;
  if (req.file) {
    const uploadResult = await cloudinaryService.uploadImage(req.file.path, `okados/restaurants/${restaurant._id}/products`);
    if (uploadResult.success) {
      imageUrl = uploadResult.url;
    }
  }

  const slug = slugify(name) + '-' + Date.now().toString(36);

  const product = await Product.create({
    restaurantId: restaurant._id,
    name,
    slug,
    description,
    image: imageUrl,
    category,
    type: type || 'veg',
    price,
    discountedPrice,
    preparationTime: preparationTime || 15,
    tags,
    customizations,
    nutrition,
    isAvailable: true,
    isActive: true,
  });

  await product.populate('restaurantId', 'name logo');

  clearProductCache(restaurant._id.toString());

  logger.info('Product created', { productId: product._id, restaurantId: restaurant._id });

  ApiResponse.created(res, { product }, 'Product created successfully');
});

/**
 * @desc Update product
 * @route PUT /api/v1/products/:id
 * @access Private (Restaurant Owner)
 */
const updateProduct = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const updateData = req.body;

  logger.info('Updating product', { productId: id, userId });

  const product = await Product.findById(id);
  if (!product) {
    return ApiResponse.notFound(res, 'Product not found');
  }

  const restaurant = await Restaurant.findById(product.restaurantId);
  if (restaurant.ownerId.toString() !== userId && req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Not authorized to update this product');
  }

  if (updateData.customizations) {
    const customizationValidation = validateCustomizations(updateData.customizations);
    if (!customizationValidation.valid) {
      return ApiResponse.badRequest(res, customizationValidation.error);
    }
  }

  if (req.file) {
    const uploadResult = await cloudinaryService.uploadImage(req.file.path, `okados/restaurants/${restaurant._id}/products`);
    if (uploadResult.success) {
      updateData.image = uploadResult.url;
    }
  }

  const allowedUpdates = [
    'name', 'description', 'image', 'category', 'type', 'price',
    'discountedPrice', 'preparationTime', 'tags', 'customizations',
    'nutrition', 'isAvailable'
  ];

  const disallowedUpdates = ['restaurantId', 'stats', 'isActive'];
  for (const key of disallowedUpdates) {
    if (updateData[key] !== undefined) {
      logger.warn('Disallowed update attempted', { key, userId });
      return ApiResponse.badRequest(res, `Cannot update ${key}`);
    }
  }

  for (const field of allowedUpdates) {
    if (updateData[field] !== undefined) {
      if (field === 'name' && updateData.name !== product.name) {
        product.slug = slugify(updateData.name) + '-' + Date.now().toString(36);
      }
      product[field] = updateData[field];
    }
  }

  await product.save();
  await product.populate('restaurantId', 'name logo');

  clearProductCache(product.restaurantId.toString());

  logger.info('Product updated', { productId: product._id });

  ApiResponse.success(res, { product }, 'Product updated successfully');
});

/**
 * @desc Delete product (soft delete)
 * @route DELETE /api/v1/products/:id
 * @access Private (Restaurant Owner)
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  logger.info('Deleting product', { productId: id, userId });

  const product = await Product.findById(id);
  if (!product) {
    return ApiResponse.notFound(res, 'Product not found');
  }

  const restaurant = await Restaurant.findById(product.restaurantId);
  if (restaurant.ownerId.toString() !== userId && req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Not authorized to delete this product');
  }

  product.isActive = false;
  await product.save();

  clearProductCache(product.restaurantId.toString());

  logger.info('Product deleted', { productId: product._id });

  ApiResponse.success(res, {}, 'Product deleted successfully');
});

/**
 * @desc Toggle product availability
 * @route PUT /api/v1/products/:id/toggle-availability
 * @access Private (Restaurant Owner)
 */
const toggleProductAvailability = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { isAvailable } = req.body;

  if (typeof isAvailable !== 'boolean') {
    return ApiResponse.badRequest(res, 'isAvailable must be a boolean');
  }

  logger.info('Toggling product availability', { productId: id, userId, isAvailable });

  const product = await Product.findById(id);
  if (!product) {
    return ApiResponse.notFound(res, 'Product not found');
  }

  const restaurant = await Restaurant.findById(product.restaurantId);
  if (restaurant.ownerId.toString() !== userId && req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Not authorized');
  }

  product.isAvailable = isAvailable;
  await product.save();

  clearProductCache(product.restaurantId.toString());

  if (global.io) {
    global.io.emit('product:availability', {
      productId: product._id,
      restaurantId: product.restaurantId,
      isAvailable: product.isAvailable,
    });
  }

  logger.info('Product availability toggled', { productId: product._id, isAvailable });

  ApiResponse.success(res, { isAvailable: product.isAvailable }, `Product is now ${isAvailable ? 'available' : 'unavailable'}`);
});

/**
 * @desc Bulk update products
 * @route POST /api/v1/products/bulk-update
 * @access Private (Restaurant Owner)
 */
const bulkUpdateProducts = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { products: productsToUpdate } = req.body;

  if (!Array.isArray(productsToUpdate) || productsToUpdate.length === 0) {
    return ApiResponse.badRequest(res, 'Products array is required');
  }

  if (productsToUpdate.length > 50) {
    return ApiResponse.badRequest(res, 'Cannot update more than 50 products at once');
  }

  logger.info('Bulk updating products', { userId, count: productsToUpdate.length });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const productIds = productsToUpdate.map(p => p.productId);
  const existingProducts = await Product.find({ _id: { $in: productIds }, restaurantId: restaurant._id });

  if (existingProducts.length !== productIds.length) {
    return ApiResponse.badRequest(res, 'Some products do not belong to your restaurant');
  }

  let updatedCount = 0;
  const results = [];

  for (const update of productsToUpdate) {
    const { productId, isAvailable } = update;

    if (isAvailable !== undefined) {
      await Product.updateOne(
        { _id: productId },
        { $set: { isAvailable } }
      );
      updatedCount++;
      results.push({ productId, isAvailable, success: true });
    }
  }

  clearProductCache(restaurant._id.toString());

  logger.info('Bulk update completed', { updatedCount });

  ApiResponse.success(res, { updatedCount, results }, `${updatedCount} products updated successfully`);
});

/**
 * @desc Get my products
 * @route GET /api/v1/products
 * @access Private (Restaurant Owner)
 */
const getMyProducts = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { category, isAvailable, page = 1, limit = 20, sortBy = 'createdAt' } = req.query;

  logger.info('Getting my products', { userId });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const query = { restaurantId: restaurant._id };

  if (category) {
    query.category = { $regex: new RegExp(category, 'i') };
  }

  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable === 'true';
  }

  let sortOption = { createdAt: -1 };
  if (sortBy === 'name') sortOption = { name: 1 };
  if (sortBy === 'price') sortOption = { price: 1 };
  if (sortBy === 'popularity') sortOption = { 'stats.totalOrders': -1 };
  if (sortBy === 'rating') sortOption = { 'stats.rating.average': -1 };

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sortOption)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { products, total, pages: pagination.totalPages }, pagination);
});

/**
 * @desc Update product stats (internal)
 * @route POST /api/v1/products/:id/update-stats
 * @access Internal
 */
const updateProductStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    return ApiResponse.notFound(res, 'Product not found');
  }

  if (rating !== undefined) {
    const currentCount = product.stats.rating.count;
    const currentAverage = product.stats.rating.average;
    const newCount = currentCount + 1;
    const newAverage = ((currentAverage * currentCount) + rating) / newCount;

    product.stats.rating.average = Math.round(newAverage * 10) / 10;
    product.stats.rating.count = newCount;
  }

  await product.save();

  ApiResponse.success(res, { stats: product.stats });
});

/**
 * @desc Get categories
 * @route GET /api/v1/products/categories
 * @access Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const cacheKey = 'product:categories';
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.success(res, { categories: cached });
  }

  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const categoryList = categories.map(c => ({
    name: c._id,
    count: c.count,
    avgPrice: Math.round(c.avgPrice * 100) / 100,
  }));

  setCache(cacheKey, categoryList);

  ApiResponse.success(res, { categories: categoryList });
});

/**
 * @desc Reorder products
 * @route POST /api/v1/products/reorder
 * @access Private (Restaurant Owner)
 */
const reorderProducts = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { products: productsOrder } = req.body;

  if (!Array.isArray(productsOrder) || productsOrder.length === 0) {
    return ApiResponse.badRequest(res, 'Products array is required');
  }

  logger.info('Reordering products', { userId, count: productsOrder.length });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const productIds = productsOrder.map(p => p.productId);
  const existingProducts = await Product.find({ _id: { $in: productIds }, restaurantId: restaurant._id });

  if (existingProducts.length !== productIds.length) {
    return ApiResponse.badRequest(res, 'Some products do not belong to your restaurant');
  }

  for (const orderUpdate of productsOrder) {
    await Product.updateOne(
      { _id: orderUpdate.productId },
      { $set: { displayOrder: orderUpdate.order } }
    );
  }

  clearProductCache(restaurant._id.toString());

  logger.info('Products reordered successfully');

  ApiResponse.success(res, {}, 'Products reordered successfully');
});

/**
 * @desc Calculate price with customizations
 * @route POST /api/v1/products/:id/calculate-price
 * @access Public
 */
const calculatePrice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customizations } = req.body;

  const product = await Product.findOne({ _id: id, isActive: true });
  if (!product) {
    return ApiResponse.notFound(res, 'Product not found');
  }

  if (!customizations || !Array.isArray(customizations)) {
    return ApiResponse.success(res, {
      basePrice: product.price,
      finalPrice: product.price,
      customizations: [],
    });
  }

  const finalPrice = calculateTotalPrice(product.price, customizations, product.customizations);

  const customizationDetails = customizations.map(c => {
    const productCustomization = product.customizations.find(
      pc => pc.name === c.name
    );

    if (!productCustomization) return null;

    const selectedOptions = c.selectedOptions.map(optionName => {
      const opt = productCustomization.options.find(o => o.name === optionName);
      return opt || { name: optionName, price: 0 };
    });

    return {
      name: c.name,
      selectedOptions,
      totalPrice: selectedOptions.reduce((sum, opt) => sum + opt.price, 0),
    };
  }).filter(Boolean);

  ApiResponse.success(res, {
    basePrice: product.price,
    finalPrice,
    customizations: customizationDetails,
    savings: product.price - finalPrice > 0 ? product.price - finalPrice : 0,
  });
});

module.exports = {
  getProductById,
  getRestaurantProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  bulkUpdateProducts,
  getMyProducts,
  updateProductStats,
  getCategories,
  reorderProducts,
  calculatePrice,
};
