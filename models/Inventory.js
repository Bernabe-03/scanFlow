import mongoose from 'mongoose';

// const inventoryEntrySchema = new mongoose.Schema({
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Product',
//     required: true
//   },
//   establishment: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Establishment',
//     required: true
//   },
//   date: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
//   type: {
//     type: String,
//     enum: ['entrée', 'sortie', 'inventaire', 'perte', 'ajustement'],
//     required: true
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   unitCost: {
//     type: Number,
//     default: 0
//   },
//   totalCost: {
//     type: Number,
//     default: 0
//   },
//   reason: {
//     type: String,
//     trim: true
//   },
//   notes: {
//     type: String,
//     trim: true
//   },
//   recordedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   }
// },
// Ajouter lossDetails au schéma InventoryEntry
const inventoryEntrySchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['entrée', 'sortie', 'inventaire', 'perte', 'ajustement'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // CORRECTION : Ajout des détails de pertes
  lossDetails: {
    gater: { type: Number, default: 0 },
    coutGater: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    coutTransport: { type: Number, default: 0 }
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  reference: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const inventorySchema = new mongoose.Schema({
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
    enum: ['weekly', 'monthly']
  },
  periodDate: {
    type: Date,
    required: true
  },
  initialStock: {
    type: Number,
    default: 0
  },
  currentStock: {
    type: Number,
    required: true
  },
  entries: {
    type: Number,
    default: 0
  },
  exits: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  purchaseCost: {
    type: Number,
    default: 0
  },
  preparationCost: {
    type: Number,
    default: 0
  },
  sellingPrice: {
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

// Index pour les requêtes fréquentes
inventoryEntrySchema.index({ establishment: 1, date: 1 });
inventoryEntrySchema.index({ product: 1, date: 1 });
inventorySchema.index({ establishment: 1, periodDate: 1, period: 1 });
inventorySchema.index({ product: 1, periodDate: 1 });

const InventoryEntry = mongoose.model('InventoryEntry', inventoryEntrySchema);
const Inventory = mongoose.model('Inventory', inventorySchema);

export { Inventory, InventoryEntry };