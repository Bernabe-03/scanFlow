// models/Employee.js
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: [true, 'L\'établissement est requis']
  },
  code: {
    type: String,
    unique: true,
    required: [true, 'Le code employé est requis']
  },
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères']
  },
  civility: {
    type: String,
    enum: {
      values: ['M', 'Mme', 'Mlle', 'Mr', 'M.'],
      message: 'Civilité non valide. Valeurs acceptées: M, Mme, Mlle, Mr, M.'
    },
    required: [true, 'La civilité est requise']
  },
  profession: {
    type: String,
    required: [true, 'La profession est requise'],
    trim: true
  },
  maritalStatus: {
    type: String,
    enum: {
      values: ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)', 'Concubinage'],
      message: 'Statut matrimonial non valide'
    },
    required: [true, 'Le statut matrimonial est requis']
  },
  childrenCount: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre d\'enfants ne peut pas être négatif'],
    validate: {
      validator: Number.isInteger,
      message: 'Le nombre d\'enfants doit être un entier'
    }
  },
  photo: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // Valide que c'est une URL valide si fournie
        if (!v) return true; // Vide est autorisé
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'L\'URL de la photo n\'est pas valide'
    }
  },
  diploma: {
    type: String,
    default: '',
    trim: true
  },
  cmu: {
    type: String,
    default: '',
    trim: true
  },
  cni: {
    type: String,
    required: [true, 'Le numéro CNI est requis'],
    unique: true,
    trim: true,
    minlength: [5, 'Le CNI doit contenir au moins 5 caractères']
  },
  salary: {
    type: Number,
    required: [true, 'Le salaire est requis'],
    min: [0, 'Le salaire ne peut pas être négatif'],
    validate: {
      validator: function(v) {
        return v !== null && v !== undefined && !isNaN(v);
      },
      message: 'Le salaire doit être un nombre valide'
    }
  },
  emergencyContact: {
    name: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    relation: {
      type: String,
      default: '',
      trim: true
    }
  },
  cnpsNumber: {
    type: String,
    required: [true, 'Le numéro CNPS est requis'],
    trim: true
  },
  contractType: {
    type: String,
    enum: {
      values: ['CDI', 'CDD', 'Stage', 'Interim', 'Freelance'],
      message: 'Type de contrat non valide'
    },
    required: [true, 'Le type de contrat est requis']
  },
  contractDuration: {
    type: String,
    default: '',
    trim: true
  },
  contractStartDate: {
    type: Date,
    required: [true, 'La date de début de contrat est requise'],
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: 'La date de début de contrat n\'est pas valide'
    }
  },
  contractEndDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true; // Null ou undefined est autorisé
        return v instanceof Date && !isNaN(v);
      },
      message: 'La date de fin de contrat n\'est pas valide'
    }
  },
  accessCard: {
    cardNumber: {
      type: String,
      default: ''
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    expirationDate: {
      type: Date,
      default: function() {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1); // 1 an
        return date;
      }
    },
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
    required: [true, 'L\'utilisateur créateur est requis']
  }
}, {
  timestamps: true,
  strict: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// ✅ CORRECTION CRITIQUE : Hook pre-save robuste pour générer le code
employeeSchema.pre('save', async function(next) {
  // Ne s'exécute que pour les nouveaux documents
  if (this.isNew) {
    try {
      console.log('🔄 Génération du code employé pour establishment:', this.establishment);
      
      // Vérification CRITIQUE : s'assurer que l'établissement existe
      if (!this.establishment) {
        console.error('❌ Erreur: establishment est undefined/null');
        return next(new Error('L\'identifiant de l\'établissement est requis'));
      }

      // Vérifier que l'établissement est un ObjectId valide
      if (!mongoose.Types.ObjectId.isValid(this.establishment)) {
        console.error('❌ Erreur: establishment n\'est pas un ObjectId valide:', this.establishment);
        return next(new Error('Identifiant d\'établissement invalide'));
      }

      const Establishment = mongoose.model('Establishment');
      const establishment = await Establishment.findById(this.establishment);
      
      if (!establishment) {
        console.error('❌ Erreur: Établissement non trouvé avec ID:', this.establishment);
        return next(new Error('Établissement non trouvé'));
      }

      if (!establishment.code) {
        console.error('❌ Erreur: L\'établissement n\'a pas de code:', establishment);
        return next(new Error('L\'établissement ne possède pas de code valide'));
      }

      console.log('✅ Établissement trouvé:', establishment.name, 'Code:', establishment.code);

      // Compter les employés existants pour cet établissement
      const employeesCount = await mongoose.model('Employee').countDocuments({ 
        establishment: this.establishment 
      });
      
      console.log('📊 Nombre d\'employés existants:', employeesCount);

      // Générer le code unique
      this.code = `${establishment.code}-EMP${String(employeesCount + 1).padStart(3, '0')}`;
      console.log('✅ Code employé généré:', this.code);
      
      // Générer les informations de carte d'accès
      this.accessCard = {
        cardNumber: `CARD-${this.code}-${Date.now().toString().slice(-4)}`,
        issueDate: new Date(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
        isActive: this.isActive !== false
      };

      console.log('✅ Carte d\'accès générée:', this.accessCard.cardNumber);
      
    } catch (error) {
      console.error('❌ Erreur critique dans le pre-save hook:', error);
      return next(error);
    }
  }
  next();
});
// ✅ Index pour améliorer les performances
employeeSchema.index({ establishment: 1, code: 1 });
employeeSchema.index({ cni: 1 }, { unique: true });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ contractStartDate: 1 });

// ✅ Méthodes virtuelles pour des données calculées
employeeSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

employeeSchema.virtual('contractStatus').get(function() {
  if (!this.contractEndDate) return 'Permanent';
  
  const today = new Date();
  const endDate = new Date(this.contractEndDate);
  
  if (endDate < today) return 'Expiré';
  if (endDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) return 'Bientôt expiré';
  return 'Actif';
});

export default mongoose.model('Employee', employeeSchema);