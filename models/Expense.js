import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de la dépense est requis'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  productType: {
    type: String,
    required: [true, 'Le type de produit est requis'],
    trim: true
  },
  quantityProduced: {
    type: Number,
    required: [true, 'La quantité produite est requise'],
    min: 0
  },
  totalCost: {
    type: Number,
    required: [true, 'Le coût total est requis'],
    min: 0
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  logisticsCost: {
    type: Number,
    default: 0,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  ingredients: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseProduct',
      required: true
    },
    quantityUsed: {
      type: Number,
      required: true,
      min: 0
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    logisticsCost: { // NOUVEAU: Transport individuel pour chaque ingrédient
      type: Number,
      default: 0,
      min: 0
    }
  }],
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index
expenseSchema.index({ establishment: 1, date: -1 });
expenseSchema.index({ supplier: 1 });
expenseSchema.index({ productType: 1 });

export default mongoose.model('Expense', expenseSchema);