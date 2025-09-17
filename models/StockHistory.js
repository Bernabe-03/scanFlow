// models/StockHistory.js
import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment'],
    required: true,
  },
  reason: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);

export default StockHistory;