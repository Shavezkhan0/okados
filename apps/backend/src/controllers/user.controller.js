import User from '../models/User.js';
import ApiResponse from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

const getProfile = asyncHandler(async (req, res) => {
  console.log('[USER CONTROLLER] getProfile called', { userId: req.userId });
  
  if (!req.userId) {
    console.log('[USER CONTROLLER] No userId in request');
    return ApiResponse.unauthorized(res, 'User ID not found');
  }
  
  console.log('[USER CONTROLLER] Finding user...');
  const user = await User.findById(req.userId);
  console.log('[USER CONTROLLER] User found:', user ? 'YES' : 'NO');
  
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }
  
  console.log('[USER CONTROLLER] Sending response');
  ApiResponse.success(res, { user });
});

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

const addAddress = asyncHandler(async (req, res) => {
  const { label, addressLine1, addressLine2, city, state, pincode, latitude, longitude, isDefault } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (isDefault) {
    user.profile.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  const coordinates = latitude && longitude ? {
    type: 'Point',
    coordinates: [longitude, latitude],
  } : undefined;

  user.profile.addresses.push({
    label: (label || 'home').toLowerCase(),
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

const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { label, addressLine1, addressLine2, city, state, pincode, latitude, longitude, isDefault } = req.body;

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

  if (label) address.label = label.toLowerCase();
  if (addressLine1) address.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
  if (city) address.city = city;
  if (state) address.state = state;
  if (pincode) address.pincode = pincode;
  if (latitude && longitude) {
    address.coordinates = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }
  if (isDefault !== undefined) address.isDefault = isDefault;

  await user.save();

  ApiResponse.success(res, { addresses: user.profile.addresses }, 'Address updated successfully');
});

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

const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }
  ApiResponse.success(res, { addresses: user.profile.addresses });
});

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

const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).populate('favouriteRestaurants');
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }
  ApiResponse.success(res, { favorites: user.favouriteRestaurants });
});

export {
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

export default {
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
