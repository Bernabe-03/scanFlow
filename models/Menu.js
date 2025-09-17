
import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true,
    unique: true 
  },
  categories: [{
    name: String,
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }]
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// S'assurer que l'établissement est toujours défini
menuSchema.pre('save', function(next) {
  if (!this.establishment) {
    return next(new Error('Un menu doit être associé à un établissement'));
  }
  next();
});

export default mongoose.model('Menu', menuSchema);