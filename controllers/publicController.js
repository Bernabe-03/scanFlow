import asyncHandler from 'express-async-handler';
import Establishment from '../models/Establishment.js';
import Menu from '../models/Menu.js';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import Order from '../models/Order.js';
import DailyPurchase from '../models/DailyPurchase.js';
export const getPublicMenu = async (req, res) => {
  try {
    const code = req.params.code;
    
    // Validation du code
    if (!code || code.length !== 8) {
      return res.status(400).json({ 
        message: "Code d'établissement invalide" 
      });
    }

    const establishment = await Establishment.findOne({ code })
      .populate({
        path: 'menu',
        populate: {
          path: 'categories.products',
          model: 'Product',
          // SUPPRIMER le filtre sur le stock pour afficher tous les produits actifs
          match: { 
            isActive: true
          }
        }
      });

    // Établissement non trouvé
    if (!establishment) {
      return res.status(404).json({ 
        message: "Établissement non trouvé"
      });
    }

    // Établissement inactif
    if (!establishment.isActive) {
      return res.status(200).json({ 
        available: false,
        establishmentName: "Établissement non disponible",
        categories: []
      });
    }

    let categories = [];
    if (establishment.menu) {
      // Éviter les doublons de produits dans chaque catégorie
      categories = (establishment.menu.categories || []).map(category => {
        // Utiliser un Set pour éliminer les doublons (même nom et même prix)
        const seen = new Set();
        const uniqueProducts = (category.products || []).filter(product => {
          const key = `${product.name}-${product.price}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });

        return {
          id: category._id,
          name: category.name,
          products: uniqueProducts
        };
      });
    }

    const response = {
      available: true,
      establishmentId: establishment._id,
      establishmentName: establishment.name,
      categories
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erreur dans getPublicMenu:', error);
    res.status(500).json({ 
      message: 'Erreur de chargement du menu',
      error: error.message 
    });
  }
};
export const createPublicOrder = asyncHandler(async (req, res) => {
  const { 
    items, 
    customerName, 
    customerPhone, 
    deliveryOption, 
    deliveryAddress, 
    tableNumber, 
    notes, 
    total, 
    establishmentId 
  } = req.body;

  // Validation
  if (!items || items.length === 0) {
      res.status(400);
      throw new Error('Aucun article dans la commande');
  }

  if (!customerName || !customerPhone) {
      res.status(400);
      throw new Error('Nom et téléphone du client sont requis');
  }

  // Validation de l'établissement
  if (!establishmentId) {
      res.status(400);
      throw new Error('Établissement non spécifié');
  }

  // Vérifier que l'établissement existe et est actif
  const establishment = await Establishment.findById(establishmentId);
  if (!establishment || !establishment.isActive) {
      res.status(400);
      throw new Error('Établissement non valide ou désactivé');
  }

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

  // Créer la commande
  const order = new Order({
      items,
      customerName,
      customerPhone,
      deliveryOption,
      deliveryAddress: deliveryOption === 'livraison' ? deliveryAddress : undefined,
      tableNumber: deliveryOption === 'surPlace' ? tableNumber : undefined,
      notes,
      total,
      establishment: establishmentId,
      isPublicOrder: true
  });

  const savedOrder = await order.save();
  res.status(201).json(savedOrder);
});
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "ID de commande invalide" });
    }

    const order = await Order.findOne({
      _id: orderId,
      isPublicOrder: true,
      status: 'pending'
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Commande non trouvée ou ne peut pas être annulée',
        details: 'Seules les commandes en attente peuvent être annulées'
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = 'Annulée par le client';
    await order.save();

    res.status(200).json({ 
      message: 'Commande annulée avec succès',
      orderId: order._id
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la commande:', error);
    res.status(500).json({ 
      message: 'Erreur interne du serveur',
      error: error.message
    });
  }
};