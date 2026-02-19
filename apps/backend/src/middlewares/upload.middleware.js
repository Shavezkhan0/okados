/**
 * Upload Middleware
 * Handles file upload with Multer and Cloudinary
 * @module middlewares/upload.middleware
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
const MAX_FILES = parseInt(process.env.MAX_FILES) || 10;
const TOTAL_SIZE_LIMIT = parseInt(process.env.TOTAL_SIZE_LIMIT) || 25 * 1024 * 1024;

const logger = {
  info: (message, meta = {}) => console.log(`[UPLOAD MIDDLEWARE] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[UPLOAD MIDDLEWARE ERROR] ${message}`, meta),
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const limits = {
  fileSize: MAX_FILE_SIZE,
  files: MAX_FILES,
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.error('File too large', { size: MAX_FILE_SIZE });
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        code: 'FILE_TOO_LARGE',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      logger.error('Too many files', { limit: MAX_FILES });
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${MAX_FILES}`,
        code: 'TOO_MANY_FILES',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      logger.error('Unexpected field', { field: err.field });
      return res.status(400).json({
        success: false,
        message: `Unexpected field: ${err.field}`,
        code: 'UNEXPECTED_FIELD',
      });
    }

    logger.error('Multer error', { error: err.message });
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'MULTER_ERROR',
    });
  }

  if (err) {
    logger.error('Upload error', { error: err.message, code: err.code });
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code || 'UPLOAD_ERROR',
    });
  }

  next();
};

const uploadSingle = (fieldName = 'image') => {
  return [
    upload.single(fieldName),
    handleMulterError,
  ];
};

const uploadMultiple = (fieldName = 'images', maxCount = MAX_FILES) => {
  return [
    upload.array(fieldName, maxCount),
    handleMulterError,
  ];
};

const uploadFields = (fields) => {
  return [
    upload.fields(fields),
    handleMulterError,
  ];
};

const validateImage = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      code: 'NO_FILE',
    });
  }

  const { buffer, mimetype, size, originalname } = req.file;

  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    logger.error('Invalid file type rejected', { mimetype, originalname });
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      code: 'INVALID_TYPE',
    });
  }

  if (size > MAX_FILE_SIZE) {
    logger.error('File too large', { size, max: MAX_FILE_SIZE });
    return res.status(400).json({
      success: false,
      message: 'File too large',
      code: 'FILE_TOO_LARGE',
    });
  }

  logger.info('File validated', { 
    originalname, 
    mimetype, 
    size,
    field: req.file.fieldname 
  });

  next();
};

const validateMultipleImages = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded',
      code: 'NO_FILES',
    });
  }

  const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
  
  if (totalSize > TOTAL_SIZE_LIMIT) {
    logger.error('Total size too large', { totalSize, max: TOTAL_SIZE_LIMIT });
    return res.status(400).json({
      success: false,
      message: `Total file size exceeds ${TOTAL_SIZE_LIMIT / 1024 / 1024}MB`,
      code: 'TOTAL_SIZE_EXCEEDED',
    });
  }

  const invalidFiles = req.files.filter(file => !ALLOWED_MIME_TYPES.includes(file.mimetype));
  
  if (invalidFiles.length > 0) {
    logger.error('Invalid files in upload', { count: invalidFiles.length });
    return res.status(400).json({
      success: false,
      message: `${invalidFiles.length} file(s) have invalid type`,
      code: 'INVALID_TYPES',
      invalidFiles: invalidFiles.map(f => f.originalname),
    });
  }

  logger.info('Multiple files validated', { 
    count: req.files.length, 
    totalSize 
  });

  next();
};

const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
};

const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

const generateUniqueFilename = (originalName) => {
  const ext = getFileExtension(originalName);
  const sanitized = sanitizeFilename(path.basename(originalName, ext));
  return `${sanitized}_${uuidv4()}${ext}`;
};

export {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateImage,
  validateMultipleImages,
  handleMulterError,
  sanitizeFilename,
  generateUniqueFilename,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  TOTAL_SIZE_LIMIT,
};
