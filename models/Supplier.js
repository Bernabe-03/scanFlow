import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  unit: { type: String, required: true },
  minStock: { type: Number, default: 0 },
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
  // NOUVEAU CHAMP DYNAMIQUE
  requestedStock: { 
    type: Number, 
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Le stock demandé doit être un nombre entier'
    }
  },
  stockStatus: {
    type: String,
    enum: ['insufficient', 'adequate', 'excess'],
    default: 'adequate'
  }
}, {
  timestamps: true,
  _id: true
});

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    trim: true, 
    lowercase: true, 
    unique: true 
  },
  phone: { type: String, required: true, trim: true },
  whatsapp: { type: String, required: true, trim: true },
  address: { type: String },
  country: { type: String, required: true },
  city: { type: String, required: true },
  commune: { type: String },
  deliveryTime: { type: String },
  
  // Produits du fournisseur
  products: [productSchema],
  
  // Informations supplémentaires
  company: { type: String },
  taxId: { type: String },
  paymentTerms: { type: String, default: '30' },
  currency: { type: String, default: 'F CFA' },
  category: { type: String },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  
  // Références
  establishment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Establishment', 
    required: true // <-- C'est ici que le champ est requis
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
supplierSchema.index({ establishment: 1, name: 1 });
supplierSchema.index({ establishment: 1, status: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ 'products.name': 1 });

// Méthode pour ajouter un produit
supplierSchema.methods.addProduct = function(productData) {
  this.products.push(productData);
  return this.save();
};

// Méthode pour mettre à jour un produit
supplierSchema.methods.updateProduct = function(productId, updateData) {
  const product = this.products.id(productId);
  if (product) {
    Object.assign(product, updateData);
    product.lastStockUpdate = new Date();
    return this.save();
  }
  return Promise.reject(new Error('Produit non trouvé'));
};

// Méthode pour supprimer un produit
supplierSchema.methods.removeProduct = function(productId) {
  this.products.pull(productId);
  return this.save();
};

// Méthode statique pour rechercher des fournisseurs par produit
supplierSchema.statics.findByProductName = function(productName, establishmentId) {
  return this.find({
    establishment: establishmentId,
    'products.name': new RegExp(productName, 'i'),
    status: 'active'
  });
};

export default mongoose.model('Supplier', supplierSchema);