/**
 * Upload Controller
 * Handles file upload operations
 * @module controllers/upload.controller
 */

const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const cloudinaryService = require('../services/cloudinary.service');

const logger = {
  info: (message, meta = {}) => console.log(`[UPLOAD CONTROLLER] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[UPLOAD CONTROLLER ERROR] ${message}`, meta),
};

const UPLOAD_FOLDERS = {
  restaurant: {
    logo: 'okados/restaurants/logos',
    banner: 'okados/restaurants/banners',
    gallery: 'okados/restaurants/gallery',
  },
  product: {
    main: 'okados/products',
    gallery: 'okados/products/gallery',
  },
  user: {
    avatar: 'okados/users/avatars',
    documents: 'okados/users/documents',
  },
  review: {
    image: 'okados/reviews',
  },
  general: 'okados/general',
};

const getFolder = (type, category = 'main') => {
  return UPLOAD_FOLDERS[type]?.[category] || UPLOAD_FOLDERS.general;
};

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  const { type = 'general', category = 'main', folder: customFolder } = req.body;
  const folder = customFolder || getFolder(type, category);

  logger.info('Uploading image', { 
    type, 
    category, 
    folder, 
    filename: req.file.originalname,
    size: req.file.size 
  });

  const result = await cloudinaryService.uploadFromBuffer(
    req.file.buffer,
    folder,
    { type, category }
  );

  if (!result.success) {
    logger.error('Upload failed', { error: result.error });
    return ApiResponse.error(res, 'Failed to upload image: ' + result.error);
  }

  logger.info('Image uploaded successfully', { publicId: result.publicId });

  ApiResponse.created(res, {
    url: result.url,
    publicId: result.publicId,
    width: result.width,
    height: result.height,
    format: result.format,
    size: result.bytes,
  }, 'Image uploaded successfully');
});

const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return ApiResponse.badRequest(res, 'No files uploaded');
  }

  const { type = 'general', category = 'main' } = req.body;
  const folder = getFolder(type, category);

  logger.info('Uploading multiple images', { 
    count: req.files.length, 
    folder 
  });

  const results = await cloudinaryService.uploadMultiple(req.files, folder, { type, category });

  const successful = results.successful.map(r => ({
    url: r.url,
    publicId: r.publicId,
    width: r.width,
    height: r.height,
    format: r.format,
  }));

  const failed = results.failed.map((r, i) => ({
    index: i,
    error: r.error,
  }));

  logger.info('Multiple upload completed', { 
    successful: successful.length, 
    failed: failed.length 
  });

  ApiResponse.success(res, {
    images: successful,
    failed,
    total: req.files.length,
    successfulCount: successful.length,
    failedCount: failed.length,
  }, `${successful.length} images uploaded successfully`);
});

const uploadRestaurantImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  const { imageType = 'logo' } = req.body;
  
  if (!['logo', 'banner', 'gallery'].includes(imageType)) {
    return ApiResponse.badRequest(res, 'Invalid image type');
  }

  const folder = getFolder('restaurant', imageType);

  logger.info('Uploading restaurant image', { imageType, folder });

  const result = await cloudinaryService.uploadFromBuffer(
    req.file.buffer,
    folder,
    { type: 'restaurant', category: imageType }
  );

  if (!result.success) {
    return ApiResponse.error(res, 'Failed to upload restaurant image');
  }

  ApiResponse.created(res, {
    url: result.url,
    publicId: result.publicId,
    type: imageType,
    width: result.width,
    height: result.height,
  }, 'Restaurant image uploaded successfully');
});

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  const { gallery = 'false' } = req.body;
  const category = gallery === 'true' ? 'gallery' : 'main';
  const folder = getFolder('product', category);

  logger.info('Uploading product image', { category, folder });

  const result = await cloudinaryService.uploadFromBuffer(
    req.file.buffer,
    folder,
    { type: 'product', category }
  );

  if (!result.success) {
    return ApiResponse.error(res, 'Failed to upload product image');
  }

  ApiResponse.created(res, {
    url: result.url,
    publicId: result.publicId,
    width: result.width,
    height: result.height,
    format: result.format,
  }, 'Product image uploaded successfully');
});

const uploadUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  const userId = req.userId;
  const folder = getFolder('user', 'avatar');

  logger.info('Uploading user avatar', { userId, folder });

  const result = await cloudinaryService.uploadFromBuffer(
    req.file.buffer,
    folder,
    { type: 'user', category: 'avatar', publicId: `avatar_${userId}`, overwrite: true }
  );

  if (!result.success) {
    return ApiResponse.error(res, 'Failed to upload avatar');
  }

  ApiResponse.created(res, {
    url: result.url,
    publicId: result.publicId,
    width: result.width,
    height: result.height,
  }, 'Avatar uploaded successfully');
});

const deleteImage = asyncHandler(async (req, res) => {
  const { publicId, url } = req.body;

  let targetPublicId = publicId;

  if (!targetPublicId && url) {
    targetPublicId = cloudinaryService.extractPublicIdFromUrl(url);
  }

  if (!targetPublicId) {
    return ApiResponse.badRequest(res, 'Public ID or URL is required');
  }

  logger.info('Deleting image', { publicId: targetPublicId });

  const result = await cloudinaryService.deleteImage(targetPublicId);

  if (!result.success) {
    logger.error('Delete failed', { error: result.error });
    return ApiResponse.error(res, 'Failed to delete image');
  }

  logger.info('Image deleted', { publicId: targetPublicId });

  ApiResponse.success(res, {}, 'Image deleted successfully');
});

const deleteMultipleImages = asyncHandler(async (req, res) => {
  const { publicIds } = req.body;

  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return ApiResponse.badRequest(res, 'Array of public IDs is required');
  }

  if (publicIds.length > 50) {
    return ApiResponse.badRequest(res, 'Cannot delete more than 50 images at once');
  }

  logger.info('Deleting multiple images', { count: publicIds.length });

  const result = await cloudinaryService.deleteMultiple(publicIds);

  ApiResponse.success(res, {
    deleted: result.successful.length,
    failed: result.failed.length,
    results: result,
  }, `${result.successful.length} images deleted successfully`);
});

const getOptimizedUrl = asyncHandler(async (req, res) => {
  const { publicId, url } = req.query;

  let targetPublicId = publicId;

  if (!targetPublicId && url) {
    targetPublicId = cloudinaryService.extractPublicIdFromUrl(url);
  }

  if (!targetPublicId) {
    return ApiResponse.badRequest(res, 'Public ID or URL is required');
  }

  const { width, height, quality, format } = req.query;

  const optimizedUrl = cloudinaryService.getOptimizedUrl(targetPublicId, {
    width: width ? parseInt(width) : undefined,
    height: height ? parseInt(height) : undefined,
    quality,
    format,
  });

  ApiResponse.success(res, { url: optimizedUrl });
});

const getResponsiveUrls = asyncHandler(async (req, res) => {
  const { publicId, url } = req.query;

  let targetPublicId = publicId;

  if (!targetPublicId && url) {
    targetPublicId = cloudinaryService.extractPublicIdFromUrl(url);
  }

  if (!targetPublicId) {
    return ApiResponse.badRequest(res, 'Public ID or URL is required');
  }

  const widths = req.query.widths 
    ? req.query.widths.split(',').map(w => parseInt(w.trim()))
    : [200, 400, 800, 1200];

  const urls = cloudinaryService.getResponsiveUrls(targetPublicId, widths);

  ApiResponse.success(res, { urls });
});

const getImageDetails = asyncHandler(async (req, res) => {
  const { publicId, url } = req.query;

  let targetPublicId = publicId;

  if (!targetPublicId && url) {
    targetPublicId = cloudinaryService.extractPublicIdFromUrl(url);
  }

  if (!targetPublicId) {
    return ApiResponse.badRequest(res, 'Public ID or URL is required');
  }

  const result = await cloudinaryService.getImageDetails(targetPublicId);

  if (!result.success) {
    return ApiResponse.error(res, 'Failed to get image details');
  }

  ApiResponse.success(res, result.details);
});

const uploadBase64Image = asyncHandler(async (req, res) => {
  const { image, type = 'general', category = 'main' } = req.body;

  if (!image) {
    return ApiResponse.badRequest(res, 'Base64 image data is required');
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  const folder = getFolder(type, category);

  logger.info('Uploading base64 image', { type, category, folder, size: buffer.length });

  const result = await cloudinaryService.uploadFromBuffer(buffer, folder, { type, category });

  if (!result.success) {
    return ApiResponse.error(res, 'Failed to upload base64 image');
  }

  ApiResponse.created(res, {
    url: result.url,
    publicId: result.publicId,
    width: result.width,
    height: result.height,
  }, 'Image uploaded successfully');
});

module.exports = {
  uploadImage,
  uploadMultipleImages,
  uploadRestaurantImage,
  uploadProductImage,
  uploadUserAvatar,
  deleteImage,
  deleteMultipleImages,
  getOptimizedUrl,
  getResponsiveUrls,
  getImageDetails,
  uploadBase64Image,
};
