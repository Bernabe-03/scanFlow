// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema(
//   {
//     fullName: { 
//       type: String, 
//       required: [true, 'Full name is required'] 
//     },
//     email: { 
//       type: String, 
//       required: true,
//       unique: true,
//       match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
//     },
//     password: { 
//       type: String, 
//       required: [true, 'Password is required'],
//       minlength: [6, 'Password must be at least 6 characters']
//     },
//     phone: {
//       type: String,
//       validate: {
//         validator: function(v) {
//           return /^(01|05|06|07)\d{8}$/.test(v);
//         },
//         message: props => `${props.value} n'est pas un numéro de téléphone valide!`
//       }
//     },
//     lastSeen: {
//       type: Date,
//       default: Date.now
//     },
//     role: {
//       type: String,
//       required: true,
//       enum: ['admin', 'manager', 'cashier'],
//       default: 'cashier'
//     },
//     establishment: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: 'Establishment',
//       required: function() { 
//         return this.role === 'manager' || this.role === 'cashier'; 
//       } 
//     },
//     code: {
//       type: String,
//       unique: true,
//       required: function() { 
//         return this.role === 'cashier'; 
//       }
//     },
//     isActive: { 
//       type: Boolean,
//       default: true 
//     },
//     // Nouveaux champs pour la gestion des services
//     startTime: {
//       type: Date,
//       default: null
//     },
//     endTime: {
//       type: Date,
//       default: null
//     },
//     isOnShift: {
//       type: Boolean,
//       default: false
//     },
//     breaks: [{
//       start: Date,
//       end: Date,
//       duration: Number
//     }],
//     lastLogin: Date,
//   },
//   { 
//     timestamps: true,
//     toJSON: {
//       transform: function(doc, ret) {
//         delete ret.password;
//         return ret;
//       }
//     }
//   }
// );

// userSchema.index({ email: 1 });
// userSchema.index({ role: 1, isActive: 1 });
// userSchema.index({ establishment: 1, role: 1 });
// userSchema.index({ _id: 1, role: 1 });

// const User = mongoose.model('User', userSchema);
// export default User;
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { 
      type: String, 
      required: [true, 'Full name is required'] 
    },
    email: { 
      type: String, 
      required: true,
      unique: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    password: { 
      type: String, 
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return /^(01|05|06|07)\d{8}$/.test(v);
        },
        message: props => `${props.value} n'est pas un numéro de téléphone valide!` // Correction ici
      }
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'manager', 'cashier'],
      default: 'cashier'
    },
    establishment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Establishment',
      required: function() { 
        return this.role === 'manager' || this.role === 'cashier'; 
      } 
    },
    code: {
      type: String,
      sparse: true, // Permet plusieurs valeurs null
      required: function() { 
        return this.role === 'cashier'; 
      }
    },
    isActive: { 
      type: Boolean,
      default: true 
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    isOnShift: {
      type: Boolean,
      default: false
    },
    breaks: [{
      start: Date,
      end: Date,
      duration: Number
    }],
    lastLogin: Date,
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

// Index pour l'email
userSchema.index({ email: 1 });

// Index partiel pour le code - seulement pour les documents où code existe
userSchema.index({ code: 1 }, { 
  unique: true, 
  partialFilterExpression: { 
    code: { $exists: true, $type: 'string' } 
  } 
});

// Autres index
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ establishment: 1, role: 1 });
userSchema.index({ _id: 1, role: 1 });

const User = mongoose.model('User', userSchema);
export default User;