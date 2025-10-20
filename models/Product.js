
// import mongoose from 'mongoose';

// // Schéma et Modèle pour la Catégorie
// const categorySchema = mongoose.Schema({
//     name: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     establishment: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Establishment',
//         required: true
//     }
// });

// const Category = mongoose.model('Category', categorySchema);

// // Schéma et Modèle pour le Produit - avec champ stockId
// const productSchema = mongoose.Schema({
//     name: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     description: {
//         type: String,
//         trim: true
//     },
//     price: {
//         type: Number,
//         required: true,
//         min: 0
//     },
//     allergens: {
//         type: String,
//         trim: true
//     },
//     stock: {
//         type: Number,
//         min: 0,
//         default: 0
//     },
//     lowStockThreshold: {
//         type: Number,
//         min: 0,
//         default: 5
//     },
//     image: {
//         type: String
//     },
//     // MODIFICATION: Changement de ObjectId à String
//     category: {
//         type: String,  
//         required: false
//     },
//     // NOUVEAU: Champ pour lier les produits du menu aux produits du stock
//     stockId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Product',
//         required: false
//     },
//     isMenuProduct: {
//         type: Boolean,
//         default: false
//     },
//     establishment: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Establishment',
//         required: true
//     }
// }, {
//     timestamps: true
// });

// const Product = mongoose.model('Product', productSchema);

// // Exportation des deux modèles
// export { Product, Category };

import mongoose from 'mongoose';

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
    expenses: {
        type: Number,
        min: 0,
        default: 0
    },
    profit: {
        type: Number,
        default: 0
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
    category: {
        type: String,  
        required: false
    },
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

// Middleware pour calculer automatiquement le profit avant sauvegarde
productSchema.pre('save', function(next) {
    this.profit = (this.price * this.stock) - this.expenses;
    next();
});

// Middleware pour findOneAndUpdate
productSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.price !== undefined || update.stock !== undefined || update.expenses !== undefined) {
        const currentDoc = this._update;
        const price = update.price !== undefined ? update.price : this._conditions.price;
        const stock = update.stock !== undefined ? update.stock : this._conditions.stock;
        const expenses = update.expenses !== undefined ? update.expenses : this._conditions.expenses;
        
        if (price !== undefined && stock !== undefined && expenses !== undefined) {
            update.profit = (price * stock) - expenses;
        }
    }
    next();
});

const Product = mongoose.model('Product', productSchema);

export { Product, Category };