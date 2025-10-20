import mongoose from 'mongoose';

const baseProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  unit: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  category: { type: String, required: true },
  expirationDays: { type: Number, default: 30 },
  description: { type: String },
  preparationLogistics: { type: Number, default: 0 },
  preparationOther: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  lastStockUpdate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  requestedStock: { 
    type: Number, 
    default: 0,
    min: 0
  },
  stockStatus: {
    type: String,
    enum: ['insufficient', 'adequate', 'excess'],
    default: 'adequate'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  establishment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Establishment', 
    required: true 
  }
}, {
  timestamps: true
});

export default mongoose.model('BaseProduct', baseProductSchema);

