/**
 * User Controller
 * Handles user-related operations
 * @module controllers/user.controller
 */

const User = require('../models/User');
const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc Get current user profile
 * @route GET /api/v1/users/profile
 * @access Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }
  ApiResponse.success(res, { user });
});

/**
 * @desc Update user profile
 * @route PUT /api/v1/users/profile
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, profile } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (profile) {
    if (profile.avatar !== undefined) user.profile.avatar = profile.avatar;
  }

  await user.save();

  ApiResponse.success(res, { user }, 'Profile updated successfully');
});

/**
 * @desc Add new address
 * @route POST /api/v1/users/address
 * @access Private
 */
const addAddress = asyncHandler(async (req, res) => {
  const { label, addressLine1, addressLine2, city, state, pincode, coordinates, isDefault } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (isDefault) {
    user.profile.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.profile.addresses.push({
    label: label || 'home',
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    coordinates,
    isDefault: isDefault || user.profile.addresses.length === 0,
  });

  await user.save();

  ApiResponse.created(res, { addresses: user.profile.addresses }, 'Address added successfully');
});

/**
 * @desc Update address
 * @route PUT /api/v1/users/address/:addressId
 * @access Private
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { label, addressLine1, addressLine2, city, state, pincode, coordinates, isDefault } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  const address = user.profile.addresses.id(addressId);
  if (!address) {
    return ApiResponse.notFound(res, 'Address not found');
  }

  if (isDefault) {
    user.profile.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  if (label) address.label = label;
  if (addressLine1) address.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
  if (city) address.city = city;
  if (state) address.state = state;
  if (pincode) address.pincode = pincode;
  if (coordinates) address.coordinates = coordinates;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await user.save();

  ApiResponse.success(res, { addresses: user.profile.addresses }, 'Address updated successfully');
});

/**
 * @desc Delete address
 * @route DELETE /api/v1/users/address/:addressId
 * @access Private
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  const address = user.profile.addresses.id(addressId);
  if (!address) {
    return ApiResponse.notFound(res, 'Address not found');
  }

  const wasDefault = address.isDefault;
  user.profile.addresses.pull(addressId);

  if (wasDefault && user.profile.addresses.length > 0) {
    user.profile.addresses[0].isDefault = true;
  }

  await user.save();

  ApiResponse.success(res, { addresses: user.profile.addresses }, 'Address deleted successfully');
});

/**
 * @desc Get all addresses
 * @route GET /api/v1/users/addresses
 * @access Private
 */
const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }
  ApiResponse.success(res, { addresses: user.profile.addresses });
});

/**
 * @desc Update FCM token
 * @route PUT /api/v1/users/fcm-token
 * @access Private
 */
const updateFCMToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
    await user.save();
  }

  ApiResponse.success(res, {}, 'FCM token updated successfully');
});

/**
 * @desc Add to favorites
 * @route POST /api/v1/users/favorites/:restaurantId
 * @access Private
 */
const addToFavorites = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (!user.favouriteRestaurants.includes(restaurantId)) {
    user.favouriteRestaurants.push(restaurantId);
    await user.save();
  }

  ApiResponse.success(res, { favorites: user.favouriteRestaurants }, 'Added to favorites');
});

/**
 * @desc Remove from favorites
 * @route DELETE /api/v1/users/favorites/:restaurantId
 * @access Private
 */
const removeFromFavorites = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  user.favouriteRestaurants.pull(restaurantId);
  await user.save();

  ApiResponse.success(res, { favorites: user.favouriteRestaurants }, 'Removed from favorites');
});

/**
 * @desc Get favorites
 * @route GET /api/v1/users/favorites
 * @access Private
 */
const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).populate('favouriteRestaurants');
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }
  ApiResponse.success(res, { favorites: user.favouriteRestaurants });
});

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
  updateFCMToken,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
};
