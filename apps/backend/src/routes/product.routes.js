/**
 * Product Routes
 * @module routes/product.routes
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { isRestaurant } = require('../middlewares/authorization.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  productListValidator,
  bulkUpdateValidator,
  reorderValidator,
  searchValidator,
} = require('../validators/product.validator');

router.get('/search', validate(searchValidator), productController.searchProducts);
router.get('/categories', productController.getCategories);
router.get('/restaurant/:restaurantId', productController.getRestaurantProducts);
router.get('/:id', validate(productIdValidator), productController.getProductById);
router.post('/:id/calculate-price', validate(productIdValidator), productController.calculatePrice);

router.get('/', authenticate, isRestaurant, productController.getMyProducts);
router.post('/', authenticate, isRestaurant, validate(createProductValidator), productController.createProduct);
router.put('/:id', authenticate, isRestaurant, validate(updateProductValidator), productController.updateProduct);
router.delete('/:id', authenticate, isRestaurant, validate(productIdValidator), productController.deleteProduct);
router.put('/:id/toggle-availability', authenticate, isRestaurant, validate(productIdValidator), productController.toggleProductAvailability);
router.post('/bulk-update', authenticate, isRestaurant, validate(bulkUpdateValidator), productController.bulkUpdateProducts);
router.post('/reorder', authenticate, isRestaurant, validate(reorderValidator), productController.reorderProducts);

module.exports = router;
