/**
 * Banner Model
 * Represents promotional banners in the Okados platform
 * @module models/Banner
 */

import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters'],
  },
  image: {
    type: String,
    required: [true, 'Banner image is required'],
  },
  mobileImage: {
    type: String,
  },
  type: {
    type: String,
    enum: ['restaurant', 'offer', 'category', 'general', 'product'],
    default: 'general',
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  link: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  priority: {
    type: Number,
    default: 0,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  validFrom: {
    type: Date,
  },
  validTill: {
    type: Date,
  },
  buttonText: {
    type: String,
    default: 'Explore',
    maxlength: [30, 'Button text cannot exceed 30 characters'],
  },
  buttonColor: {
    type: String,
    default: '#ff4800',
  },
  textColor: {
    type: String,
    default: '#ffffff',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

/**
 * Indexes
 */
bannerSchema.index({ isActive: 1, priority: -1 });
bannerSchema.index({ validFrom: 1, validTill: 1 });
bannerSchema.index({ type: 1, isActive: 1 });

/**
 * Check if banner is currently valid
 * @returns {boolean}
 */
bannerSchema.methods.isValid = function () {
  if (!this.isActive) return false;

  const now = new Date();

  if (this.validFrom && now < this.validFrom) return false;
  if (this.validTill && now > this.validTill) return false;

  return true;
};

/**
 * Get target URL based on banner type
 * @returns {string|null}
 */
bannerSchema.methods.getTargetUrl = function () {
  if (this.link) return this.link;

  switch (this.type) {
    case 'restaurant':
      return this.targetId ? `/restaurants/${this.targetId}` : null;
    case 'category':
      return this.targetId ? `/category/${this.targetId}` : null;
    case 'product':
      return this.targetId ? `/products/${this.targetId}` : null;
    case 'offer':
      return `/offers/${this.targetId}`;
    default:
      return null;
  }
};

/**
 * Static method to get active banners
 * @param {string} type - Banner type filter
 * @returns {Promise<Banner[]>}
 */
bannerSchema.statics.getActiveBanners = function (type) {
  const now = new Date();

  const query = {
    isActive: true,
    $or: [
      { validFrom: { $exists: false } },
      { validFrom: { $lte: now } },
    ],
    $or: [
      { validTill: { $exists: false } },
      { validTill: { $gte: now } },
    ],
  };

  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 });
};

/**
 * Static method to get home page banners
 * @returns {Promise<Banner[]>}
 */
bannerSchema.statics.getHomeBanners = function () {
  return this.getActiveBanners().limit(10);
};

/**
 * Static method to reorder banners
 * @param {Array} bannerIds - Array of banner IDs in desired order
 */
bannerSchema.statics.reorder = async function (bannerIds) {
  const bulkOps = bannerIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { priority: bannerIds.length - index },
    },
  }));

  return this.bulkWrite(bulkOps);
};

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
