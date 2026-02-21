import express from 'express';
const router = express.Router();

import userController from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import userValidator from '../validators/user.validator.js';

const { addAddressValidator, addressIdValidator, updateProfileValidator } = userValidator;

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileValidator), userController.updateProfile);

router.get('/addresses', userController.getAddresses);
router.post('/address', validate(addAddressValidator), userController.addAddress);
router.put('/address/:addressId', validate(addressIdValidator), userController.updateAddress);
router.delete('/address/:addressId', validate(addressIdValidator), userController.deleteAddress);

router.put('/fcm-token', userController.updateFCMToken);

router.get('/favorites', userController.getFavorites);
router.post('/favorites/:restaurantId', userController.addToFavorites);
router.delete('/favorites/:restaurantId', userController.removeFromFavorites);

export default router;
