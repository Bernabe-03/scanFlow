
import mongoose from 'mongoose';

const productProfitSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  },
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly']
  },
  periodDate: {
    type: Date,
    required: true
  },
  quantitySold: {
    type: Number,
    default: 0
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  purchaseCost: {
    type: Number,
    required: true
  },
  preparationCost: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  margin: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

productProfitSchema.index({ establishment: 1, periodDate: 1, period: 1 });
productProfitSchema.index({ product: 1, periodDate: 1 });

const ProductProfit = mongoose.model('ProductProfit', productProfitSchema);

export default ProductProfit;