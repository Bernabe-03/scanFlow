
import mongoose from 'mongoose';

const establishmentSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    minlength: 8,
    maxlength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['restaurant', 'cafe', 'bar', 'hotel', 'nightclub', 'other'],
    default: 'restaurant'
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^(01|05|06|07)[0-9]{8}$/.test(v);
      },
      message: props => `${props.value} n'est pas un numéro de téléphone valide!`
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  },
  qrCode: String
},{
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // S'assurer que l'ID est toujours retourné comme string
      ret._id = ret._id.toString();
      return ret;
    }
  }
});

const Establishment = mongoose.model('Establishment', establishmentSchema);

export default Establishment;