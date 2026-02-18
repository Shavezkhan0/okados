/**
 * Upload Routes
 * @module routes/upload.routes
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { 
  uploadSingle, 
  uploadMultiple, 
  validateImage, 
  validateMultipleImages,
  handleMulterError 
} = require('../middlewares/upload.middleware');

router.use(authenticate);

router.post(
  '/image',
  uploadSingle('image'),
  validateImage,
  uploadController.uploadImage
);

router.post(
  '/images',
  uploadMultiple('images', 10),
  validateMultipleImages,
  uploadController.uploadMultipleImages
);

router.post(
  '/restaurant',
  uploadSingle('image'),
  validateImage,
  uploadController.uploadRestaurantImage
);

router.post(
  '/product',
  uploadSingle('image'),
  validateImage,
  uploadController.uploadProductImage
);

router.post(
  '/avatar',
  uploadSingle('image'),
  validateImage,
  uploadController.uploadUserAvatar
);

router.post(
  '/base64',
  uploadController.uploadBase64Image
);

router.delete(
  '/image',
  uploadController.deleteImage
);

router.delete(
  '/images',
  uploadController.deleteMultipleImages
);

router.get(
  '/optimize',
  uploadController.getOptimizedUrl
);

router.get(
  '/responsive',
  uploadController.getResponsiveUrls
);

router.get(
  '/details',
  uploadController.getImageDetails
);

module.exports = router;
