/**
 * Restaurant Controller
 * Handles restaurant-related operations
 * @module controllers/restaurant.controller
 */

const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { getPaginationMeta } = require('../utils/helpers');
const notificationService = require('../services/notification.service');

const logger = {
  info: (message, meta = {}) => console.log(`[RESTAURANT CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[RESTAURANT CONTROLLER ERROR] ${message}`, meta),
};

const CACHE_TTL = 5 * 60 * 1000;
const restaurantCache = new Map();

const getCache = (key) => {
  const cached = restaurantCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  restaurantCache.delete(key);
  return null;
};

const setCache = (key, data) => {
  restaurantCache.set(key, { data, timestamp: Date.now() });
  if (restaurantCache.size > 100) {
    const firstKey = restaurantCache.keys().next().value;
    restaurantCache.delete(firstKey);
  }
};

const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getEstimatedDeliveryTime = (distance, deliveryRadius) => {
  return Math.ceil((distance / deliveryRadius) * 30 + 20);
};

/**
 * @desc Get all restaurants
 * @route GET /api/v1/restaurants
 * @access Public
 */
const getAllRestaurants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, cuisines, sortBy = 'rating', minRating, city } = req.query;

  const cacheKey = `restaurants:all:${JSON.stringify(req.query)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    logger.info('Returning cached restaurants');
    return ApiResponse.paginated(res, cached.restaurants, cached.pagination);
  }

  const query = { isApproved: true, isActive: true };

  if (cuisines) {
    const cuisineList = cuisines.split(',').map(c => new RegExp(c.trim(), 'i'));
    query.cuisines = { $in: cuisineList };
  }

  if (minRating) {
    query['rating.average'] = { $gte: parseFloat(minRating) };
  }

  if (city) {
    query['address.city'] = { $regex: new RegExp(city, 'i') };
  }

  let sortOption = { 'rating.average': -1 };
  if (sortBy === 'distance' && req.query.lat && req.query.lng) {
    sortOption = { distance: 1 };
  } else if (sortBy === 'popularity') {
    sortOption = { 'rating.count': -1 };
  } else if (sortBy === 'newest') {
    sortOption = { createdAt: -1 };
  }

  const total = await Restaurant.countDocuments(query);
  const restaurants = await Restaurant.find(query)
    .populate('ownerId', 'name email phone')
    .sort(sortOption)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  let restaurantsWithDistance = restaurants;
  if (req.query.lat && req.query.lng) {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);
    
    restaurantsWithDistance = restaurants.map(restaurant => {
      const restaurantObj = restaurant.toObject();
      if (restaurant.address?.coordinates) {
        const [lng, lat] = restaurant.address.coordinates;
        restaurantObj.distance = calculateDistance(userLat, userLng, lat, lng);
        restaurantObj.estimatedDeliveryTime = getEstimatedDeliveryTime(
          restaurantObj.distance,
          restaurant.deliveryRadius
        );
      }
      return restaurantObj;
    });

    if (sortBy === 'distance') {
      restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
    }
  }

  const pagination = getPaginationMeta(page, limit, total);
  const response = { restaurants: restaurantsWithDistance, total, pages: pagination.totalPages };
  
  setCache(cacheKey, response);
  
  ApiResponse.paginated(res, response, pagination);
});

/**
 * @desc Get nearby restaurants
 * @route GET /api/v1/restaurants/nearby
 * @access Public
 */
const getNearbyRestaurants = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5, page = 1, limit = 20 } = req.query;

  if (!lat || !lng) {
    return ApiResponse.badRequest(res, 'Latitude and longitude are required');
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusInKm = parseFloat(radius);

  const cacheKey = `restaurants:nearby:${lat}:${lng}:${radius}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.paginated(res, cached.restaurants, cached.pagination);
  }

  const restaurants = await Restaurant.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance',
        maxDistance: radiusInKm * 1000,
        spherical: true,
        query: { isApproved: true, isActive: true, isOpen: true },
      },
    },
    {
      $addFields: {
        estimatedDeliveryTime: {
          $ceil: { $add: [{ $divide: ['$distance', '$deliveryRadius'] }, 20] },
        },
      },
    },
    { $sort: { distance: 1 } },
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) },
  ]);

  const restaurantIds = restaurants.map(r => r._id);
  const populatedRestaurants = await Restaurant.find({ _id: { $in: restaurantIds } })
    .populate('ownerId', 'name email phone');

  const restaurantsWithDetails = populatedRestaurants.map(restaurant => {
    const matched = restaurants.find(r => r._id.toString() === restaurant._id.toString());
    const restaurantObj = restaurant.toObject();
    if (matched) {
      restaurantObj.distance = Math.round(matched.distance / 1000 * 10) / 10;
      restaurantObj.estimatedDeliveryTime = matched.estimatedDeliveryTime;
    }
    return restaurantObj;
  });

  const total = await Restaurant.countDocuments({
    isApproved: true,
    isActive: true,
    isOpen: true,
  });

  const pagination = getPaginationMeta(page, limit, total);
  const response = { restaurants: restaurantsWithDetails, total, pages: pagination.totalPages };
  
  setCache(cacheKey, response);

  ApiResponse.paginated(res, response, pagination);
});

/**
 * @desc Get restaurant by slug
 * @route GET /api/v1/restaurants/slug/:slug
 * @access Public
 */
const getRestaurantBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  logger.info('Getting restaurant by slug', { slug });

  const cacheKey = `restaurant:slug:${slug}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.success(res, { restaurant: cached });
  }

  const restaurant = await Restaurant.findOne({ slug, isApproved: true, isActive: true })
    .populate('ownerId', 'name email phone');

  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  setCache(cacheKey, restaurant);
  ApiResponse.success(res, { restaurant });
});

/**
 * @desc Search restaurants
 * @route GET /api/v1/restaurants/search
 * @access Public
 */
const searchRestaurants = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return ApiResponse.badRequest(res, 'Search query must be at least 2 characters');
  }

  const cacheKey = `restaurants:search:${q}:${page}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.paginated(res, cached.restaurants, cached.pagination);
  }

  const searchRegex = new RegExp(q.trim(), 'i');

  const restaurants = await Restaurant.find({
    $or: [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { cuisines: { $in: [searchRegex] } },
    ],
    isApproved: true,
    isActive: true,
  })
    .populate('ownerId', 'name email phone')
    .sort({ 'rating.average': -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Restaurant.countDocuments({
    $or: [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { cuisines: { $in: [searchRegex] } },
    ],
    isApproved: true,
    isActive: true,
  });

  const pagination = getPaginationMeta(page, limit, total);
  const response = { restaurants, total, pages: pagination.totalPages };
  
  setCache(cacheKey, response);

  ApiResponse.paginated(res, response, pagination);
});

/**
 * @desc Get restaurant cuisines
 * @route GET /api/v1/restaurants/cuisines
 * @access Public
 */
const getRestaurantCuisines = asyncHandler(async (req, res) => {
  const cacheKey = 'restaurant:cuisines';
  const cached = getCache(cacheKey);
  if (cached) {
    return ApiResponse.success(res, { cuisines: cached });
  }

  const cuisines = await Restaurant.distinct('cuisines', {
    isApproved: true,
    isActive: true,
    cuisines: { $exists: true, $ne: [] },
  });

  const sortedCuisines = cuisines.sort();
  setCache(cacheKey, sortedCuisines);

  ApiResponse.success(res, { cuisines: sortedCuisines });
});

/**
 * @desc Get restaurant reviews
 * @route GET /api/v1/restaurants/:id/reviews
 * @access Public
 */
const getRestaurantReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const reviews = await Review.find({ restaurantId: id, isApproved: true })
    .populate('userId', 'name profile.avatar')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Review.countDocuments({ restaurantId: id, isApproved: true });
  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { reviews, total, pages: pagination.totalPages }, pagination);
});

/**
 * @desc Get my restaurant
 * @route GET /api/v1/restaurants/me
 * @access Private (Restaurant Owner)
 */
const getMyRestaurant = asyncHandler(async (req, res) => {
  const userId = req.userId;

  logger.info('Getting restaurant for owner', { userId });

  const restaurant = await Restaurant.findOne({ ownerId: userId })
    .populate('ownerId', 'name email phone');

  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found. Please register your restaurant first.');
  }

  ApiResponse.success(res, { restaurant });
});

/**
 * @desc Update my restaurant
 * @route PUT /api/v1/restaurants/me
 * @access Private (Restaurant Owner)
 */
const updateMyRestaurant = asyncHandler(async (req, res) => {
  const userId = req.userId;

  logger.info('Updating restaurant', { userId });

  const restaurant = await Restaurant.findOne({ ownerId: userId });

  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const allowedUpdates = [
    'name', 'description', 'logo', 'banner', 'contact', 'address',
    'cuisines', 'deliveryRadius', 'timing', 'pricing'
  ];

  const disallowedUpdates = ['ownerId', 'isApproved', 'commission', 'isActive', 'rating', 'stats'];

  for (const key of disallowedUpdates) {
    if (req.body[key] !== undefined) {
      logger.warn('Disallowed update attempted', { key, userId });
      return ApiResponse.badRequest(res, `Cannot update ${key}`);
    }
  }

  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      if (field === 'name' && req.body.name !== restaurant.name) {
        restaurant.slug = slugify(req.body.name);
      }
      restaurant[field] = req.body[field];
    }
  }

  await restaurant.save();

  restaurantCache.clear();

  logger.info('Restaurant updated successfully', { restaurantId: restaurant._id });

  ApiResponse.success(res, { restaurant }, 'Restaurant updated successfully');
});

/**
 * @desc Toggle restaurant open/close status
 * @route PUT /api/v1/restaurants/me/toggle-open
 * @access Private (Restaurant Owner)
 */
const toggleRestaurantStatus = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { isOpen } = req.body;

  if (typeof isOpen !== 'boolean') {
    return ApiResponse.badRequest(res, 'isOpen must be a boolean');
  }

  logger.info('Toggling restaurant status', { userId, isOpen });

  const restaurant = await Restaurant.findOne({ ownerId: userId });

  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  restaurant.isOpen = isOpen;
  await restaurant.save();

  if (global.io) {
    global.io.emit('restaurant:status', {
      restaurantId: restaurant._id,
      isOpen: restaurant.isOpen,
    });
  }

  logger.info('Restaurant status toggled', { restaurantId: restaurant._id, isOpen });

  ApiResponse.success(res, { isOpen: restaurant.isOpen }, `Restaurant is now ${isOpen ? 'open' : 'closed'}`);
});

/**
 * @desc Update bank details
 * @route PUT /api/v1/restaurants/me/bank-details
 * @access Private (Restaurant Owner)
 */
const updateBankDetails = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { accountNumber, ifscCode, accountHolderName, upiId } = req.body;

  logger.info('Updating bank details', { userId });

  const restaurant = await Restaurant.findOne({ ownerId: userId });

  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  restaurant.bankDetails = {
    accountNumber,
    ifscCode,
    accountHolderName,
    upiId,
  };

  await restaurant.save();

  logger.info('Bank details updated', { restaurantId: restaurant._id });

  ApiResponse.success(res, { message: 'Bank details updated successfully' });
});

/**
 * @desc Get restaurant orders
 * @route GET /api/v1/restaurants/me/orders
 * @access Private (Restaurant Owner)
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { status, page = 1, limit = 20, startDate, endDate } = req.query;

  logger.info('Getting restaurant orders', { userId, status });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const query = { restaurant: restaurant._id };

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('userId', 'name phone profile.addresses')
    .populate('items.productId', 'name image')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const pagination = getPaginationMeta(page, limit, total);

  ApiResponse.paginated(res, { orders, total, pages: pagination.totalPages }, pagination);
});

/**
 * @desc Get restaurant analytics
 * @route GET /api/v1/restaurants/me/analytics
 * @access Private (Restaurant Owner)
 */
const getMyAnalytics = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { startDate, endDate } = req.query;

  logger.info('Getting restaurant analytics', { userId, startDate, endDate });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  const dateQuery = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  const matchQuery = {
    restaurant: restaurant._id,
    ...dateQuery,
  };

  const [statusAggregation, trendAggregation] = await Promise.all([
    Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalOrders = statusAggregation.reduce((sum, s) => sum + s.count, 0);
  const completedOrders = statusAggregation.find(s => s._id === 'delivered')?.count || 0;
  const cancelledOrders = statusAggregation.find(s => s._id === 'cancelled')?.count || 0;
  const totalRevenue = statusAggregation.reduce((sum, s) => sum + s.totalRevenue, 0);

  const ordersByStatus = {};
  statusAggregation.forEach(s => {
    ordersByStatus[s._id] = { count: s.count, revenue: s.totalRevenue };
  });

  const analytics = {
    summary: {
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
    ordersByStatus,
    trends: trendAggregation,
  };

  ApiResponse.success(res, { analytics });
});

/**
 * @desc Get restaurant earnings
 * @route GET /api/v1/restaurants/me/earnings
 * @access Private (Restaurant Owner)
 */
const getMyEarnings = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { startDate, endDate } = req.query;

  logger.info('Getting restaurant earnings', { userId, startDate, endDate });

  const restaurant = await Restaurant.findOne({ ownerId: userId });
  if (!restaurant) {
    return ApiResponse.notFound(res, 'Restaurant not found');
  }

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  const dateQuery = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  const commissionRate = restaurant.commission?.rate || 20;

  const matchQuery = {
    restaurant: restaurant._id,
    status: { $in: ['delivered', 'completed'] },
    ...dateQuery,
  };

  const earningsByDate = await Order.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        grossRevenue: { $sum: '$total' },
        platformCommission: {
          $sum: { $multiply: ['$total', commissionRate / 100] },
        },
        orderCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        netEarnings: { $subtract: ['$grossRevenue', '$platformCommission'] },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totals = earningsByDate.reduce(
    (acc, day) => ({
      grossRevenue: acc.grossRevenue + day.grossRevenue,
      platformCommission: acc.platformCommission + day.platformCommission,
      netEarnings: acc.netEarnings + day.netEarnings,
      orderCount: acc.orderCount + day.orderCount,
    }),
    { grossRevenue: 0, platformCommission: 0, netEarnings: 0, orderCount: 0 }
  );

  const pendingSettlements = await Order.aggregate([
    {
      $match: {
        restaurant: restaurant._id,
        status: { $nin: ['delivered', 'completed', 'cancelled'] },
        paymentStatus: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        pendingAmount: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
  ]);

  const earnings = {
    grossRevenue: totals.grossRevenue,
    platformCommission: totals.platformCommission,
    netEarnings: totals.netEarnings,
    commissionRate,
    totalOrders: totals.orderCount,
    averageOrderValue: totals.orderCount > 0 ? totals.grossRevenue / totals.orderCount : 0,
    dailyBreakdown: earningsByDate,
    pendingSettlements: pendingSettlements[0] || { pendingAmount: 0, count: 0 },
  };

  ApiResponse.success(res, { earnings });
});

/**
 * @desc Register new restaurant
 * @route POST /api/v1/restaurants/register
 * @access Private
 */
const registerRestaurant = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    name, description, logo, banner, contact, address,
    cuisines, deliveryRadius, timing, pricing, documents
  } = req.body;

  logger.info('Registering new restaurant', { userId, name });

  const existingRestaurant = await Restaurant.findOne({ ownerId: userId });
  if (existingRestaurant) {
    return ApiResponse.conflict(res, 'You already have a registered restaurant');
  }

  const slug = slugify(name);

  const existingSlug = await Restaurant.findOne({ slug });
  if (existingSlug) {
    return ApiResponse.conflict(res, 'Restaurant name already exists. Please choose a different name.');
  }

  const restaurant = await Restaurant.create({
    ownerId: userId,
    name,
    slug,
    description,
    logo,
    banner,
    contact,
    address: {
      ...address,
      coordinates: {
        type: 'Point',
        coordinates: [address.longitude, address.latitude],
      },
    },
    cuisines,
    deliveryRadius: deliveryRadius || 5,
    timing: timing || {
      openTime: '09:00',
      closeTime: '22:00',
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
    pricing,
    documents,
    isApproved: false,
    isOpen: false,
  });

  const adminUsers = await User.find({ role: 'admin' });
  for (const admin of adminUsers) {
    await notificationService.createNotification(
      admin._id,
      'restaurant_registration',
      'New Restaurant Registration',
      `${name} has registered and is awaiting approval`,
      { restaurantId: restaurant._id.toString() }
    );
  }

  logger.info('Restaurant registered successfully', { restaurantId: restaurant._id });

  ApiResponse.created(res, {
    restaurant,
    message: 'Restaurant registered successfully. You will be notified once approved.',
  }, 'Restaurant registered successfully. Pending approval.');
});

module.exports = {
  getAllRestaurants,
  getNearbyRestaurants,
  getRestaurantBySlug,
  searchRestaurants,
  getRestaurantCuisines,
  getRestaurantReviews,
  getMyRestaurant,
  updateMyRestaurant,
  toggleRestaurantStatus,
  updateBankDetails,
  getMyOrders,
  getMyAnalytics,
  getMyEarnings,
  registerRestaurant,
};
