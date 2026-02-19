import { validationResult } from 'express-validator';
import ApiResponse from '../utils/response.js';

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return ApiResponse.badRequest(res, 'Validation failed', extractedErrors);
  };
};

export default validate;
