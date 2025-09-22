import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import DailyPurchase from '../models/DailyPurchase.js';

export const getOrders = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.establishment) {
      res.status(401);
      throw new Error('Utilisateur non authentifié ou établissement manquant');
    }
    
    const establishmentId = 
      typeof req.user.establishment === 'string' 
        ? req.user.establishment 
        : req.user.establishment._id;
  
    // Vérifier les permissions - autoriser les managers ET les caissiers
    if (req.user.role !== 'manager' && req.user.role !== 'cashier') {
      res.status(403);
      throw new Error('Permissions insuffisantes pour accéder aux commandes');
    }
  
    const { status } = req.query;
    let filter = { establishment: establishmentId };
    
    if (status) {
      filter.status = status;
    }
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('items.product', 'name price')
      // Peupler les informations du caissier, y compris le code
      .populate('cashier', 'fullName code'); 
    
    // Mapper les commandes pour ajouter les propriétés `cashierName` et `cashierCode`
    // attendues par le front-end.
    const ordersWithCashierInfo = orders.map(order => {
        // Convertir l'objet Mongoose en un objet JS simple pour le modifier
        const orderObject = order.toObject();

        // Si la commande a un caissier assigné, ajoutez son nom et son code.
        // Sinon, les valeurs par défaut "Non assigné" et "" sont utilisées.
        return {
            ...orderObject,
            cashierName: orderObject.cashier ? orderObject.cashier.fullName : 'Non assigné',
            cashierCode: orderObject.cashier ? orderObject.cashier.code : null,
        };
    });

    res.json(ordersWithCashierInfo);
});
export const createOrder = asyncHandler(async (req, res) => {
    const { 
      items, 
      table, 
      total, 
      customerPhone, 
      customerName, 
      deliveryOption, 
      deliveryAddress, 
      tableNumber, 
      notes 
    } = req.body;
    
    if (!items || items.length === 0) {
        res.status(400);
        throw new Error('Aucun article dans la commande');
    }

    if (!req.user || !req.user.establishment) {
        res.status(401);
        throw new Error('Utilisateur non authentifié ou établissement manquant');
    }

    // Validation des informations client
    if (!customerName || !customerPhone) {
      res.status(400);
      throw new Error('Nom et téléphone du client sont requis');
    }

    const establishmentId = 
        typeof req.user.establishment === 'string' 
            ? req.user.establishment 
            : req.user.establishment._id;

    // Validation des produits et mise à jour du stock
    for (const item of items) {
        const product = await Product.findById(item.product);
        
        if (!product) {
            res.status(404);
            throw new Error(`Produit non trouvé: ${item.product}`);
        }
        
        if (product.stock < item.quantity) {
            res.status(400);
            throw new Error(`Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}`);
        }
        
        // Réserver le stock
        product.stock -= item.quantity;
        await product.save();

        // Enregistrer l'achat pour les statistiques du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        await DailyPurchase.findOneAndUpdate(
            {
                product: item.product,
                date: { $gte: today },
                establishment: establishmentId
            },
            {
                $inc: { 
                    quantity: item.quantity, 
                    total: item.quantity * item.price 
                },
                $setOnInsert: {
                    productName: product.name,
                    category: product.category,
                    unitPrice: item.price,
                    date: new Date(),
                    establishment: establishmentId
                }
            },
            { upsert: true, new: true }
        );
    }

    const order = new Order({
        items,
        table: deliveryOption === 'surPlace' ? tableNumber : table,
        total,
        customerPhone,
        customerName,
        deliveryOption,
        deliveryAddress: deliveryOption === 'livraison' ? deliveryAddress : undefined,
        tableNumber: deliveryOption === 'surPlace' ? tableNumber : undefined,
        notes,
        establishment: establishmentId,
        createdBy: req.user._id
    });
    
    const createdOrder = await order.save();
    console.log('Nouvelle commande créée:', createdOrder);

    res.status(201).json(createdOrder);
});
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
  
    // Vérification supplémentaire de l'ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('ID de commande invalide.');
    }
  
    const order = await Order.findById(id);
    
    if (!order) {
      res.status(404);
      throw new Error('Commande non trouvée');
    }
  
    // Décrémenter le stock seulement quand la commande est confirmée
    if (status === 'completed' && order.status !== 'completed') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          if (product.stock < item.quantity) {
            res.status(400);
            throw new Error(`Stock insuffisant pour ${product.name}`);
          }
          product.stock -= item.quantity;
          await product.save();
        }
      }
    }
  
    // Remettre le stock si la commande est annulée
    if (status === 'cancelled' && order.status === 'completed') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }
  
    order.status = status;
    const updatedOrder = await order.save();
    
    res.json(updatedOrder);
});
export const getOrderById = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400);
        throw new Error('ID de commande invalide');
    }

    const order = await Order.findById(req.params.id)
        .populate('items.product', 'name price')
        .populate('createdBy', 'fullName');
    
    if (!order) {
        res.status(404);
        throw new Error('Commande non trouvée');
    }

    if (!req.user) {
        res.status(401);
        throw new Error('Utilisateur non authentifié');
    }

    // Vérification des permissions
    const userEstablishmentId = 
        typeof req.user.establishment === 'string' 
            ? req.user.establishment 
            : req.user.establishment._id;

    if (req.user.role !== 'admin' && 
        order.establishment.toString() !== userEstablishmentId.toString()) {
        res.status(403);
        throw new Error('Non autorisé à voir cette commande');
    }
    
    res.json(order);
});
export const getDailyPurchases = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.establishment) {
        res.status(401);
        throw new Error('Utilisateur non authentifié ou établissement manquant');
    }
    const establishmentId = 
        typeof req.user.establishment === 'string' 
            ? req.user.establishment 
            : req.user.establishment._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const purchases = await DailyPurchase.find({
        establishment: establishmentId,
        date: { $gte: today }
    }).sort({ date: -1 });

    const totalValue = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalCount = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);

    res.json({
        items: purchases,
        totalValue,
        count: totalCount
    });
});
export const getOrderStats = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.establishment) {
      res.status(401);
      throw new Error('Utilisateur non authentifié ou établissement manquant');
    }
  
    const establishmentId = 
      typeof req.user.establishment === 'string' 
        ? req.user.establishment 
        : req.user.establishment._id;
  
    // Autoriser à la fois manager et cashier
    if (req.user.role !== 'manager' && req.user.role !== 'cashier') {
      res.status(403);
      throw new Error('Permissions insuffisantes');
    }
    // Statistiques pour aujourd'hui
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayStats = await Order.aggregate([
        {
            $match: {
                establishment: new mongoose.Types.ObjectId(establishmentId),
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$total" },
                pendingOrders: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
                    }
                }
            }
        }
    ]);

    // Statistiques pour le mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await Order.aggregate([
        {
            $match: {
                establishment: new mongoose.Types.ObjectId(establishmentId),
                createdAt: { $gte: startOfMonth }
            }
        },
        {
            $group: {
                _id: null,
                monthlyRevenue: { $sum: "$total" },
                completedOrders: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                    }
                }
            }
        }
    ]);

    // Produit le plus populaire
    const popularProduct = await Order.aggregate([
        {
            $match: {
                establishment: new mongoose.Types.ObjectId(establishmentId),
                createdAt: { $gte: startOfMonth }
            }
        },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 1 },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $project: {
                _id: 0,
                productId: "$_id",
                productName: "$product.name",
                totalQuantity: 1
            }
        }
    ]);

    res.json({
        today: todayStats[0] || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 },
        monthly: monthlyStats[0] || { monthlyRevenue: 0, completedOrders: 0 },
        popularProduct: popularProduct[0] || null
    });
});
export const getPublicOrderTracking = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400);
      throw new Error('ID de commande invalide');
    }
  
    const order = await Order.findById(orderId)
      .select('-internalNotes -modifiedBy -revisionHistory')
      .populate('items.product', 'name price image')
      .populate('establishment', 'name');
      
    if (!order) {
      res.status(404);
      throw new Error('Commande non trouvée');
    }
  
    // CORRECTION : Retourner toutes les informations nécessaires
    res.json({
      id: order._id,
      status: order.status,
      items: order.items.map(item => ({
        product: {
          name: item.product?.name || 'Produit non disponible',
          price: item.product?.price || item.price,
          image: item.product?.image
        },
        quantity: item.quantity,
        price: item.price,
        name: item.product?.name || 'Produit non disponible', // Ajout pour compatibilité
        options: item.options || [] // Ajout des options si elles existent
      })),
      total: order.total,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryOption: order.deliveryOption,
      deliveryAddress: order.deliveryAddress,
      tableNumber: order.tableNumber,
      notes: order.notes,
      createdAt: order.createdAt,
      estimatedPreparationTime: order.estimatedPreparationTime,
      cashierName: order.cashierName,
      establishmentName: order.establishment?.name
    });
  });
// Dans orderController.js
export const assignCashierToOrder = asyncHandler(async (req, res) => {
    const { cashierId, cashierName } = req.body;
    
    // Vérification des permissions
    if (req.user.role !== 'cashier' && req.user.role !== 'manager') {
      res.status(403);
      throw new Error('Permissions insuffisantes');
    }
  
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        cashier: cashierId,
        cashierName: cashierName,
        status: 'preparing'
      },
      { new: true }
    );
  
    if (!order) {
      res.status(404);
      throw new Error('Commande non trouvée');
    }
  
    res.json(order);
});