// models/Employee.js
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  civility: {
    type: String,
    enum: ['M', 'Mme', 'Mlle'],
    required: true
  },
  profession: {
    type: String,
    required: true
  },
  maritalStatus: {
    type: String,
    enum: ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)', 'Concubinage'],
    required: true
  },
  childrenCount: {
    type: Number,
    default: 0,
    min: 0
  },
  photo: {
    type: String,
    default: ''
  },
  diploma: {
    type: String,
    default: ''
  },
  cmu: {
    type: String,
    default: ''
  },
  cni: {
    type: String,
    required: true,
    unique: true
  },
  salary: {
    type: Number,
    required: true,
    min: 0
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  cnpsNumber: {
    type: String,
    required: true
  },
  contractType: {
    type: String,
    enum: ['CDI', 'CDD', 'Stage', 'Interim', 'Freelance'],
    required: true
  },
  contractDuration: {
    type: String, 
    default: ''
  },
  contractStartDate: {
    type: Date,
    required: true
  },
  contractEndDate: {
    type: Date
  },
  accessCard: {
    cardNumber: String,
    issueDate: Date,
    expirationDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Générer un code employé unique
employeeSchema.pre('save', async function(next) {
  if (this.isNew) {
    const establishment = await mongoose.model('Establishment').findById(this.establishment);
    const employeesCount = await mongoose.model('Employee').countDocuments({ 
      establishment: this.establishment 
    });
    this.code = `${establishment.code}-EMP${String(employeesCount + 1).padStart(3, '0')}`;
    
    // Générer numéro de carte
    this.accessCard.cardNumber = `CARD-${this.code}-${Date.now().toString().slice(-4)}`;
    this.accessCard.issueDate = new Date();
    this.accessCard.expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 an
  }
  next();
});

export default mongoose.model('Employee', employeeSchema);