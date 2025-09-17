import mongoose from 'mongoose';

// Définir d'abord orderItemSchema
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true
  }
});

// Ensuite définir orderSchema
const orderSchema = new mongoose.Schema(
  {
    items: [orderItemSchema],
    table: {
      type: String
    },
    total: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'completed', 'cancelled'],
      default: 'pending'
    },
    establishment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Establishment',
      required: true
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.isPublicOrder; 
      }
    },
    isPublicOrder: {
      type: Boolean,
      default: false
    },
    customerPhone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^(01|05|06|07)\d{8}$/.test(v);
        },
        message: props => `${props.value} n'est pas un numéro de téléphone valide!`
      }
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    deliveryOption: {
      type: String,
      enum: ['surPlace', 'emporter', 'livraison'],
      required: true
    },
    deliveryAddress: {
      type: String,
      required: function() {
        return this.deliveryOption === 'livraison';
      }
    },
    tableNumber: {
      type: String,
      required: function() {
        return this.deliveryOption === 'surPlace';
      }
    },
    notes: String
  },
  { timestamps: true }
);

// Calculer le total avant de sauvegarder
orderSchema.pre('save', function(next) {
  this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  next();
});

orderSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    this.completedAt = new Date();
  }
  next();
});
export default mongoose.model('Order', orderSchema);