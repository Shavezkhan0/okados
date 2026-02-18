/**
 * User Routes
 * @module routes/user.routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { addAddressValidator, addressIdValidator } = require('../validators/user.validator');

router.use(auth);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(addAddressValidator), userController.updateProfile);

router.get('/addresses', userController.getAddresses);
router.post('/address', validate(addAddressValidator), userController.addAddress);
router.put('/address/:addressId', validate(addressIdValidator), userController.updateAddress);
router.delete('/address/:addressId', validate(addressIdValidator), userController.deleteAddress);

router.put('/fcm-token', userController.updateFCMToken);

router.get('/favorites', userController.getFavorites);
router.post('/favorites/:restaurantId', userController.addToFavorites);
router.delete('/favorites/:restaurantId', userController.removeFromFavorites);

module.exports = router;
