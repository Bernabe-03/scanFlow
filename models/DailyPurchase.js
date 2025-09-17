import mongoose from 'mongoose';

const dailyPurchaseSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  category: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  }
}, {
  timestamps: true
});

// Index pour les recherches par établissement et date
dailyPurchaseSchema.index({ establishment: 1, date: 1 });
dailyPurchaseSchema.index({ product: 1, date: 1 });

export default mongoose.model('DailyPurchase', dailyPurchaseSchema);