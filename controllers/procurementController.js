import Procurement from '../models/Procurement.js';
import Supplier from '../models/Supplier.js';
import mongoose from 'mongoose'; 
async function handleStockUpdate(procurement, oldStatus, newStatus) {
  try {
    // Accès aux modèles via mongoose.model()
    const Product = mongoose.model('Product');
    // Assurez-vous que le modèle StockMovement est enregistré dans votre application
    const StockMovement = mongoose.model('StockMovement'); 

    if (oldStatus === newStatus) {
      console.log(`ℹ️ Statut inchangé (${newStatus}). Aucune action de stock nécessaire.`);
      return { modifications: 0, erreurs: [] };
    }

    let modifications = 0;
    let erreurs = [];

    // Logique d'ajout du stock (passage à 'livrée')
    if (oldStatus !== 'livrée' && newStatus === 'livrée') {
      for (const productOrder of procurement.products) {
        try {
          const product = await Product.findOne({
            _id: productOrder.product,
            establishment: procurement.establishment
          });

          if (!product) {
            erreurs.push(`Produit non trouvé (ID: ${productOrder.product}): ${productOrder.name}`);
            continue;
          }

          product.currentStock += productOrder.quantity;
          await product.save();

          await StockMovement.create({
            product: product._id,
            type: 'approvisionnement',
            quantity: productOrder.quantity,
            unitPrice: productOrder.unitPrice,
            reference: `CMD-${procurement.orderNumber}`,
            movementDate: new Date(),
            establishment: procurement.establishment,
            createdBy: procurement.createdBy
          });

          modifications++;
        } catch (error) {
          console.error(`Erreur mise à jour stock produit ${productOrder.name}:`, error);
          erreurs.push(`Erreur ${productOrder.name}: ${error.message}`);
        }
      }
    } 
    // Logique de retrait du stock (annulation d'une livraison ou suppression)
    else if (oldStatus === 'livrée' && newStatus !== 'livrée') {
      for (const productOrder of procurement.products) {
        try {
          const product = await Product.findOne({
            _id: productOrder.product,
            establishment: procurement.establishment
          });

          if (!product) {
            erreurs.push(`Produit non trouvé (ID: ${productOrder.product}): ${productOrder.name}`);
            continue;
          }

          if (product.currentStock < productOrder.quantity) {
            erreurs.push(`Stock insuffisant pour retrait de ${productOrder.name}`);
            continue;
          }

          product.currentStock -= productOrder.quantity;
          await product.save();

          await StockMovement.create({
            product: product._id,
            type: 'retrait_annulation',
            quantity: -productOrder.quantity,
            unitPrice: productOrder.unitPrice,
            reference: `ANNUL-${procurement.orderNumber}`,
            movementDate: new Date(),
            establishment: procurement.establishment,
            createdBy: procurement.createdBy,
            notes: `Annulation commande ${procurement.orderNumber} (statut: ${newStatus})`
          });

          modifications++;
        } catch (error) {
          console.error(`Erreur retrait stock produit ${productOrder.name}:`, error);
          erreurs.push(`Erreur ${productOrder.name}: ${error.message}`);
        }
      }
    }

    if (modifications > 0) {
      console.log(`✅ Stock ajusté pour ${modifications} produits de la commande ${procurement.orderNumber}.`);
    }
    if (erreurs.length > 0) {
      console.error(`⚠️ Erreurs de stock pour la commande ${procurement.orderNumber}: ${erreurs.join(', ')}`);
    }

    return { modifications, erreurs };

  } catch (error) {
    console.error('❌ Erreur critique lors de la mise à jour du stock:', error);
    // Si une erreur critique se produit, il est préférable de la rejeter pour informer l'appelant
    throw error;
  }
}
export const getProcurements = async (req, res) => {
  try {
    const { status, search, startDate, endDate, supplierId } = req.query;
    const establishmentId = req.user.establishment;

    let filter = { establishment: establishmentId };
    
    if (status && status !== 'tous') {
      filter.status = status;
    }
    
    if (supplierId) {
      // Correction: Utiliser supplierId dans le filtre
      filter.supplierId = supplierId; 
    }
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { 'products.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      // Assurer que la date de fin inclut toute la journée
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    const procurements = await Procurement.find(filter)
      // Correction: Utiliser supplierId dans le populate
      .populate('supplierId', 'name phone email address') 
      .populate('createdBy', 'name email')
      .populate('products.product', 'name category unit currentStock minimumStock')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: procurements,
      total: procurements.length
    });
  } catch (error) {
    console.error('Error fetching procurements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes'
    });
  }
};
export const getProcurementById = async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      establishment: req.user.establishment
    })
      // Correction: Utiliser supplierId dans le populate
      .populate('supplierId', 'name phone email address city country') 
      .populate('createdBy', 'name email')
      .populate('products.product', 'name category unit currentStock minimumStock description');

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      data: procurement
    });
  } catch (error) {
    console.error('Error fetching procurement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la commande'
    });
  }
};
export const createProcurement = async (req, res) => {
  try {
    const {
      supplier: supplierId, // Renommer pour clarifier que c'est l'ID
      products,
      expenses,
      payment,
      notes,
      delivery,
      status // Permettre de définir un statut initial si nécessaire
    } = req.body;

    // 1. Vérifier que le fournisseur existe
    const supplierDoc = await Supplier.findOne({
      _id: supplierId,
      establishment: req.user.establishment
    });

    if (!supplierDoc) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé ou non accessible par cet établissement.'
      });
    }

    // 2. Préparation des données
    const procurementData = {
      supplierId: supplierDoc._id, 
      supplierName: supplierDoc.name,
      supplierContact: supplierDoc.phone,
      supplierEmail: supplierDoc.email,
      products: products.map(productItem => ({
        // Assurez-vous que product est l'ID ObjectId comme requis par le modèle
        product: productItem.product, 
        name: productItem.name,
        category: productItem.category, // Ajout de category (important pour l'affichage)
        quantity: productItem.quantity,
        unitPrice: productItem.unitPrice,
        unit: productItem.unit,
        subTotal: productItem.quantity * productItem.unitPrice
      })),
      expenses,
      payment, // La logique de paiement sera ajustée par le middleware
      notes,
      delivery,
      status: status || 'en_attente',
      establishment: req.user.establishment,
      createdBy: req.user._id,
      // totalAmount et orderNumber seront gérés par le middleware 'pre-save'
    };

    const procurement = new Procurement(procurementData);
    await procurement.save();

    // 3. Gérer le stock si le statut initial est 'livrée'
    if (procurement.status === 'livrée') {
      await handleStockUpdate(procurement, 'en_attente', 'livrée');
    }

    // 4. Populer et envoyer la réponse
    await procurement.populate('supplierId', 'name phone email');
    await procurement.populate('createdBy', 'name email');
    await procurement.populate('products.product', 'name category unit');

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: procurement
    });
  } catch (error) {
    console.error('Error creating procurement:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Données de commande invalides',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande'
    });
  }
};
export const updateProcurement = async (req, res) => {
  try {
    const {
      products,
      expenses,
      payment,
      notes,
      delivery,
      status: newStatus
    } = req.body;

    const procurement = await Procurement.findOne({
      _id: req.params.id,
      establishment: req.user.establishment
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const oldStatus = procurement.status;

    // 1. Mettre à jour les champs
    if (products) {
      procurement.products = products.map(product => ({
        // Assurer la présence des champs requis du sous-schéma
        product: product.product, 
        ...product,
        subTotal: product.quantity * product.unitPrice
      }));
    }

    if (expenses) procurement.expenses = expenses;
    if (payment) procurement.payment = payment;
    if (notes) procurement.notes = notes;
    if (delivery) procurement.delivery = delivery;

    // 2. Mettre à jour le statut et sauvegarder
    // Le middleware s'occupera de totalAmount et des dates (deliveredAt/cancelledAt)
    if (newStatus) {
      procurement.status = newStatus;
    }

    await procurement.save();

    // 3. Gérer la mise à jour du stock
    await handleStockUpdate(procurement, oldStatus, procurement.status);

    // 4. Populer et envoyer la réponse
    await procurement.populate('supplierId', 'name phone email');
    await procurement.populate('createdBy', 'name email');
    await procurement.populate('products.product', 'name category unit');

    res.json({
      success: true,
      message: 'Commande modifiée avec succès',
      data: procurement
    });
  } catch (error) {
    console.error('Error updating procurement:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Données de commande invalides',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la commande'
    });
  }
};
export const deleteProcurement = async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      establishment: req.user.establishment
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Gérer le retrait du stock si la commande était 'livrée' avant suppression
    if (procurement.status === 'livrée') {
      // On utilise 'supprimée' comme nouveau statut pour déclencher la logique de retrait
      await handleStockUpdate(procurement, 'livrée', 'supprimée'); 
    }

    await Procurement.findByIdAndDelete(procurement._id);

    res.json({
      success: true,
      message: 'Commande supprimée avec succès'
    });
  } catch (error) {
    console.error('Error deleting procurement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la commande'
    });
  }
};
export const updateProcurementStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      establishment: req.user.establishment
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const oldStatus = procurement.status;

    // Vérification simple pour éviter les mises à jour inutiles
    if (oldStatus === status) {
      return res.json({
        success: true,
        message: `Statut déjà à jour: ${status}`,
        data: procurement
      });
    }
    
    procurement.status = status;
    
    // Les dates deliveredAt/cancelledAt sont gérées par le middleware pre('save')
    await procurement.save();

    // Gérer la mise à jour du stock
    await handleStockUpdate(procurement, oldStatus, status);

    await procurement.populate('supplierId', 'name phone email');
    await procurement.populate('createdBy', 'name email');
    await procurement.populate('products.product', 'name category unit');

    res.json({
      success: true,
      message: `Statut de la commande mis à jour: ${status}`,
      data: procurement
    });
  } catch (error) {
    console.error('Error updating procurement status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut'
    });
  }
};
export const getProcurementStats = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    
    // Statistiques par statut
    const stats = await Procurement.aggregate([
      { $match: { establishment: establishmentId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Totaux généraux
    const [totalProcurements, totalAmountResult] = await Promise.all([
      Procurement.countDocuments({ establishment: establishmentId }),
      Procurement.aggregate([
        { $match: { establishment: establishmentId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Commandes du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayProcurements = await Procurement.countDocuments({
      establishment: establishmentId,
      createdAt: { $gte: today }
    });

    // Statistiques par fournisseur
    const supplierStats = await Procurement.aggregate([
      { $match: { establishment: establishmentId } },
      {
        $group: {
          _id: '$supplierId', // Correction: grouper par supplierId
          supplierName: { $first: '$supplierName' },
          orderCount: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        total: totalProcurements,
        today: todayProcurements,
        totalAmount: totalAmountResult[0]?.total || 0,
        statusBreakdown: stats,
        supplierStats: supplierStats
      }
    });
  } catch (error) {
    console.error('Error fetching procurement stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

export const getDeliveryTracking = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    const today = new Date();
    
    const procurements = await Procurement.find({
      establishment: establishmentId,
      // Ne suivre que les commandes qui ne sont ni livrées ni annulées
      status: { $in: ['en_attente', 'validée'] } 
    })
      // Correction: Utiliser supplierId dans le populate
      .populate('supplierId', 'name phone') 
      .sort({ createdAt: 1 }); // Tri par date de création

    // Calculer le statut de livraison pour chaque commande
    const deliveries = procurements.map(procurement => {
      let deliveryStatus = 'non-planifiée';
      
      if (procurement.delivery?.maxDelay) {
        // Calcul de la date de livraison estimée
        const estimatedDeliveryDate = new Date(procurement.createdAt);
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + procurement.delivery.maxDelay);
        
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        if (estimatedDeliveryDate < todayStart) {
          deliveryStatus = 'retard';
        } else {
          const diffTime = estimatedDeliveryDate.getTime() - todayStart.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            deliveryStatus = "aujourd'hui";
          } else if (diffDays <= 3) {
            deliveryStatus = 'bientôt';
          } else {
            deliveryStatus = 'planifiée';
          }
        }
      }

      return {
        ...procurement.toObject(),
        deliveryStatus
      };
    });

    res.json({
      success: true,
      data: deliveries
    });
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du suivi des livraisons'
    });
  }
};