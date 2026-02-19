import { check, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidPhone = (phone) => {
  const re = /^\+?[1-9]\d{1,14}$/;
  return re.test(phone);
};

export const isValidPassword = (password) => {
  return password.length >= 8;
};

export const isValidObjectId = (id) => {
  const re = /^[0-9a-fA-F]{24}$/;
  return re.test(id);
};
