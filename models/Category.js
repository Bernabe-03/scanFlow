// models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  establishmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category = mongoose.model('Category', categorySchema);

export default Category;