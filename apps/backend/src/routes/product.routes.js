import express from 'express';
const router = express.Router();

import productController from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isRestaurant } from '../middlewares/authorization.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import productValidator from '../validators/product.validator.js';

const {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  productListValidator,
  bulkUpdateValidator,
  reorderValidator,
  searchValidator,
} = productValidator;

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

export default router;
