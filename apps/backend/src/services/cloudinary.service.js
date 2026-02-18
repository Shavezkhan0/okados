/**
 * Cloudinary Service
 * Handles all Cloudinary operations for file uploads
 * @module services/cloudinary.service
 */

const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const logger = {
  info: (message, meta = {}) => console.log(`[CLOUDINARY] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[CLOUDINARY ERROR] ${message}`, meta),
};

const IMAGE_TRANSFORMATIONS = {
  restaurant: {
    logo: { width: 400, height: 400, crop: 'fill', gravity: 'center' },
    banner: { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
  },
  product: {
    main: { width: 800, height: 800, crop: 'fill', gravity: 'center' },
    thumbnail: { width: 200, height: 200, crop: 'fill', gravity: 'center' },
  },
  user: {
    avatar: { width: 200, height: 200, crop: 'fill', gravity: 'face' },
  },
  review: {
    image: { width: 600, height: 600, crop: 'limit' },
  },
};

class CloudinaryService {
  constructor() {
    this.isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && 
                          process.env.CLOUDINARY_API_KEY && 
                          process.env.CLOUDINARY_API_SECRET);
  }

  getTransformation(type, category = 'main') {
    const baseTransformation = { quality: 'auto:good', fetch_format: 'auto' };
    const specificTransformation = IMAGE_TRANSFORMATIONS[type]?.[category];
    
    if (specificTransformation) {
      return [baseTransformation, specificTransformation];
    }
    return [baseTransformation];
  }

  async uploadFromBuffer(buffer, folder = 'okados', options = {}) {
    try {
      if (!this.isConfigured) {
        logger.warn('Cloudinary not configured, returning mock response');
        return {
          success: true,
          mock: true,
          publicId: `mock_${Date.now()}`,
          url: `https://mock-cloudinary.com/image/${Date.now()}.jpg`,
          format: 'jpg',
          width: 800,
          height: 800,
        };
      }

      const uploadOptions = {
        folder,
        resource_type: 'image',
        transformation: this.getTransformation(options.type, options.category),
        public_id: options.publicId,
        overwrite: options.overwrite || false,
        tags: options.tags || [],
        context: options.context || {},
      };

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              logger.error('Upload failed', { error: error.message, folder });
              reject(error);
            } else {
              logger.info('Upload successful', { 
                publicId: result.public_id, 
                folder,
                size: result.bytes 
              });
              resolve({
                success: true,
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
                createdAt: result.created_at,
              });
            }
          }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
    } catch (error) {
      logger.error('Upload error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async uploadImage(filePath, folder = 'okados', options = {}) {
    try {
      if (!this.isConfigured) {
        logger.warn('Cloudinary not configured, returning mock response');
        return {
          success: true,
          mock: true,
          publicId: `mock_${Date.now()}`,
          url: `https://mock-cloudinary.com/image/${Date.now()}.jpg`,
          format: 'jpg',
          width: 800,
          height: 800,
        };
      }

      const uploadOptions = {
        folder,
        resource_type: 'image',
        transformation: this.getTransformation(options.type, options.category),
        public_id: options.publicId,
        overwrite: options.overwrite || false,
      };

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      logger.info('Image uploaded', { publicId: result.public_id, folder });

      return {
        success: true,
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error) {
      logger.error('Upload error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async uploadMultiple(files, folder = 'okados', options = {}) {
    try {
      const results = await Promise.all(
        files.map(file => 
          file.path 
            ? this.uploadImage(file.path, folder, options)
            : this.uploadFromBuffer(file.buffer, folder, options)
        )
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      logger.info('Multiple upload completed', { 
        total: files.length, 
        successful: successful.length, 
        failed: failed.length 
      });

      return { successful, failed };
    } catch (error) {
      logger.error('Multiple upload error', { error: error.message });
      return { successful: [], failed: [], error: error.message };
    }
  }

  async deleteImage(publicId) {
    try {
      if (!this.isConfigured) {
        logger.warn('Cloudinary not configured, mock delete');
        return { success: true, mock: true };
      }

      const result = await cloudinary.uploader.destroy(publicId);
      
      logger.info('Image deleted', { publicId, result: result.result });

      return { success: result.result === 'ok', result: result.result };
    } catch (error) {
      logger.error('Delete error', { error: error.message, publicId });
      return { success: false, error: error.message };
    }
  }

  async deleteMultiple(publicIds) {
    try {
      const results = await Promise.all(publicIds.map(id => this.deleteImage(id)));
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      logger.info('Multiple delete completed', { 
        total: publicIds.length, 
        successful: successful.length, 
        failed: failed.length 
      });

      return { successful, failed };
    } catch (error) {
      logger.error('Multiple delete error', { error: error.message });
      return { successful: [], failed: [], error: error.message };
    }
  }

  getOptimizedUrl(publicId, options = {}) {
    const { 
      width, 
      height, 
      quality = 'auto:good', 
      format = 'auto',
      crop = 'fill',
      gravity = 'center'
    } = options;

    if (!this.isConfigured) {
      return `https://mock-cloudinary.com/optimized/${publicId}`;
    }

    return cloudinary.url(publicId, {
      transformation: [
        { quality, fetch_format: format },
        ...(width ? [{ width, crop, gravity }] : []),
        ...(height && !width ? [{ height, crop, gravity }] : []),
      ],
    });
  }

  getResponsiveUrls(publicId, widths = [200, 400, 800, 1200]) {
    return widths.map(width => ({
      width,
      url: this.getOptimizedUrl(publicId, { width }),
    }));
  }

  async createSignedUrl(publicId, expiresIn = 3600) {
    try {
      const timestamp = Math.round(Date.now() / 1000) + expiresIn;
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, public_id: publicId },
        process.env.CLOUDINARY_API_SECRET
      );

      return {
        success: true,
        signature,
        timestamp,
        publicId,
        url: this.getOptimizedUrl(publicId),
        expiresAt: new Date(timestamp * 1000),
      };
    } catch (error) {
      logger.error('Signed URL error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async getImageDetails(publicId) {
    try {
      if (!this.isConfigured) {
        return { success: true, mock: true, details: {} };
      }

      const result = await cloudinary.api.resource(publicId);

      return {
        success: true,
        details: {
          publicId: result.public_id,
          url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          createdAt: result.created_at,
          colors: result.colors,
          dominantColor: result.colors?.[0]?.[0],
        },
      };
    } catch (error) {
      logger.error('Get details error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async exists(publicId) {
    try {
      if (!this.isConfigured) {
        return true;
      }

      await cloudinary.api.resource(publicId);
      return true;
    } catch {
      return false;
    }
  }

  extractPublicIdFromUrl(url) {
    if (!url) return null;
    
    const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    
    return match ? match[1] : null;
  }

  getUploadPresetConfig(preset) {
    const presets = {
      unsigned: {
        folder: 'okados',
        tags: ['unsigned'],
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      },
      authenticated: {
        folder: 'okados/authenticated',
        tags: ['authenticated'],
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      },
    };

    return presets[preset] || presets.unsigned;
  }
}

module.exports = new CloudinaryService();
