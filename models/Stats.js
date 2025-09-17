// models/Stats.js
import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema({
  establishmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  pendingOrders: {
    type: Number,
    default: 0,
  },
  revenue: {
    type: Number,
    default: 0,
  },
  popularProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    count: Number,
  }],
  topCustomers: [{
    customerPhone: String,
    customerName: String,
    totalSpent: Number,
    orderCount: Number,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Stats = mongoose.model('Stats', statsSchema);

export default Stats;