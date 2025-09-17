
import mongoose from 'mongoose';

// Schéma et Modèle pour la Catégorie
const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    establishment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Establishment',
        required: true
    }
});

const Category = mongoose.model('Category', categorySchema);

// Schéma et Modèle pour le Produit - avec champ stockId
const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    allergens: {
        type: String,
        trim: true
    },
    stock: {
        type: Number,
        min: 0,
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        min: 0,
        default: 5
    },
    image: {
        type: String
    },
    // MODIFICATION: Changement de ObjectId à String
    category: {
        type: String,  
        required: false
    },
    // NOUVEAU: Champ pour lier les produits du menu aux produits du stock
    stockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false
    },
    isMenuProduct: {
        type: Boolean,
        default: false
    },
    establishment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Establishment',
        required: true
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

// Exportation des deux modèles
export { Product, Category };