/**
 * Review Model
 * Represents user reviews for orders/restaurants in Okados
 * @module models/Review
 */

const mongoose = require('mongoose');

const ratingsSchema = new mongoose.Schema({
  food: {
    type: Number,
    required: [true, 'Food rating is required'],
    min: [1, 'Food rating must be at least 1'],
    max: [5, 'Food rating cannot exceed 5'],
  },
  delivery: {
    type: Number,
    required: [true, 'Delivery rating is required'],
    min: [1, 'Delivery rating must be at least 1'],
    max: [5, 'Delivery rating cannot exceed 5'],
  },
  packaging: {
    type: Number,
    min: [1, 'Packaging rating must be at least 1'],
    max: [5, 'Packaging rating cannot exceed 5'],
  },
}, { _id: false });

const responseSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    maxlength: 500,
  },
  respondedAt: {
    type: Date,
    default: Date.now,
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required'],
    index: true,
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  ratings: {
    type: ratingsSchema,
    required: [true, 'Ratings are required'],
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
    trim: true,
  },
  images: [{
    type: String,
    validate: {
      validator: function (v) {
        return v.length <= 5;
      },
      message: 'Maximum 5 images allowed',
    },
  }],
  response: responseSchema,
  isApproved: {
    type: Boolean,
    default: false,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

/**
 * Compound indexes
 */
reviewSchema.index({ restaurantId: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

/**
 * Virtual property for average rating
 * @returns {number} Average of food, delivery, and packaging ratings
 */
reviewSchema.virtual('averageRating').get(function () {
  const { food, delivery, packaging } = this.ratings;
  const ratings = [food, delivery];
  if (packaging) ratings.push(packaging);
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
});

/**
 * Method to approve review
 */
reviewSchema.methods.approve = async function () {
  this.isApproved = true;
  await this.save();
  await this.updateRestaurantRating();
};

/**
 * Method to add restaurant response
 * @param {string} text - Response text
 * @param {string} respondedBy - User ID who responded
 */
reviewSchema.methods.addResponse = async function (text, respondedBy) {
  this.response = {
    text,
    respondedAt: new Date(),
    respondedBy,
  };
  await this.save();
};

/**
 * Update restaurant's average rating
 */
reviewSchema.methods.updateRestaurantRating = async function () {
  const Restaurant = require('./Restaurant');
  
  const reviews = await this.constructor.find({
    restaurantId: this.restaurantId,
    isApproved: true,
    isActive: true,
  });

  if (reviews.length === 0) {
    await Restaurant.findByIdAndUpdate(this.restaurantId, {
      'rating.average': 0,
      'rating.count': 0,
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.averageRating, 0);
  const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

  await Restaurant.findByIdAndUpdate(this.restaurantId, {
    'rating.average': averageRating,
    'rating.count': reviews.length,
  });
};

/**
 * Pre-save hook to update restaurant rating after save
 */
reviewSchema.post('save', async function () {
  if (this.isApproved) {
    await this.updateRestaurantRating();
  }
});

/**
 * Pre-remove hook to update restaurant rating after delete
 */
reviewSchema.post('deleteOne', { document: true }, async function () {
  await this.updateRestaurantRating();
});

/**
 * Static method to get restaurant reviews
 * @param {string} restaurantId - Restaurant ID
 * @param {object} options - Query options
 * @returns {Promise<Review[]>}
 */
reviewSchema.statics.findByRestaurant = function (restaurantId, options = {}) {
  const { approved = true, limit = 10, skip = 0 } = options;

  return this.find({
    restaurantId,
    isApproved: approved,
    isActive: true,
  })
    .populate('userId', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Static method to get user's reviews
 * @param {string} userId - User ID
 * @returns {Promise<Review[]>}
 */
reviewSchema.statics.findByUser = function (userId) {
  return this.find({ userId })
    .populate('restaurantId', 'name logo')
    .sort({ createdAt: -1 });
};

/**
 * Ensure virtuals are included in JSON
 */
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
