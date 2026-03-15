const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: 'Premium fashion item',
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['men', 'women', 'kids', 'accessories'],
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  images: {
    type: [String],
    default: [],
  },
  featured: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Product', productSchema);
