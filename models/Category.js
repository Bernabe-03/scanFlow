// // models/Category.js
// import mongoose from 'mongoose';

// const categorySchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   establishmentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Establishment',
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// const Category = mongoose.model('Category', categorySchema);

// export default Category;


import mongoose from 'mongoose';
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['product', 'supplier'],
    default: 'product',
  },
  establishmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
}, {
  timestamps: true,
});

categorySchema.index(
  { name: 1, type: 1, establishmentId: 1 },
  { unique: true, collation: { locale: 'fr', strength: 2 } }
);

// ⚡ Vérifie si le modèle existe déjà
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
