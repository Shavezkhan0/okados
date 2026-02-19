import { body, param, query } from 'express-validator';

const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number is required'),
];

const addAddressValidator = [
  body('label').optional().trim(),
  body('street').trim().notEmpty().withMessage('Street is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').trim().notEmpty().withMessage('Pincode is required'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
];

const addressIdValidator = [
  param('addressId').isMongoId().withMessage('Valid address ID is required'),
];

export default {
  updateProfileValidator,
  addAddressValidator,
  addressIdValidator,
};
