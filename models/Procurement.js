import mongoose from 'mongoose';
// --- Schémas de Sous-Documents ---
const productSchema = new mongoose.Schema({
    // Correction: 'product' est utilisé pour la référence ObjectId (pour le populate)
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, 
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    unit: { type: String, required: true },
    deliveryTime: { type: Number, default: 7 },
    subTotal: { type: Number, required: true }
});

const expenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true }
});

const paymentSchema = new mongoose.Schema({
    type: { type: String, enum: ['complet', 'avance'], default: 'complet' },
    amountPaid: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    nextPaymentDate: { type: Date },
    mode: { 
        type: String, 
        enum: ['espece', 'mobile_money', 'cheque', 'virement'], 
        default: 'espece' 
    },
    details: { type: String }
});

const deliverySchema = new mongoose.Schema({
    address: { type: String },
    maxDelay: { type: Number, default: 7 }
});

// --- Schéma principal Procurement ---

const procurementSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    supplierContact: { type: String },
    supplierEmail: { type: String },
    products: [productSchema],
    expenses: {
        logistics: { type: Number, default: 0 },
        otherExpenses: [expenseSchema]
    },
    payment: paymentSchema,
    status: { 
        type: String, 
        enum: ['en_attente', 'validée', 'livrée', 'annulée'], 
        default: 'en_attente' 
    },
    notes: { type: String },
    delivery: deliverySchema,
    establishment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Establishment', 
        required: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    totalAmount: { type: Number, required: true, default: 0 }, 
    deliveredAt: { type: Date },
    cancelledAt: { type: Date }
}, {
    timestamps: true
});

// --- Méthodes du Schéma ---

procurementSchema.methods.calculateTotalAmount = function() {
    const productsTotal = this.products.reduce((sum, product) => 
        sum + (product.quantity * product.unitPrice), 0);
    
    // Gérer les dépenses nulles ou non définies
    const logistics = this.expenses?.logistics || 0;
    const otherExpensesTotal = (this.expenses?.otherExpenses || []).reduce((sum, expense) => 
        sum + expense.amount, 0);
    
    return productsTotal + logistics + otherExpensesTotal;
};

procurementSchema.methods.updatePaymentAmounts = function() {
    const total = this.totalAmount; // Utilise le montant total déjà calculé

    if (this.payment.type === 'complet') {
        this.payment.amountPaid = total;
        this.payment.remainingAmount = 0;
    } else {
        // Calcul du montant restant
        const remaining = total - (this.payment.amountPaid || 0);
        this.payment.remainingAmount = remaining < 0 ? 0 : remaining;
    }
};

// --- Middleware Pre-Save ---

procurementSchema.pre('save', async function(next) {
    // 1. Recalculer le montant total avant chaque sauvegarde
    this.totalAmount = this.calculateTotalAmount();
    
    // 2. Mettre à jour les montants de paiement
    this.updatePaymentAmounts();

    if (this.isNew) {
        // 3. Générer le numéro de commande (unique par établissement)
        const count = await mongoose.model('Procurement').countDocuments({ establishment: this.establishment });
        this.orderNumber = `CMD-${String(count + 1).padStart(4, '0')}`; // Utilisation de padStart(4, '0')
    }
    
    // 4. Mettre à jour les dates de statut si le statut a changé
    if (this.isModified('status')) {
        if (this.status === 'livrée') {
            this.deliveredAt = this.deliveredAt || new Date();
            this.cancelledAt = null;
        } else if (this.status === 'annulée') {
            this.cancelledAt = this.cancelledAt || new Date();
            this.deliveredAt = null;
        } else {
            this.deliveredAt = null;
            this.cancelledAt = null;
        }
    }

    next();
});

export default mongoose.model('Procurement', procurementSchema);