import Order from '../models/Order.js';
import User from '../models/User.js';
import Establishment from '../models/Establishment.js';
import { Product } from '../models/Product.js';
import mongoose from 'mongoose';

// Statistiques pour l'administrateur
export const getAdminStats = async (req, res) => {
  try {
    const totalEstablishments = await Establishment.countDocuments();
    const activeEstablishments = await Establishment.countDocuments({ isActive: true });
    
    const activeManagers = await User.countDocuments({ 
      role: 'manager', 
      isActive: true 
    });
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const monthlyRevenue = {};
    
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const month = targetDate.getMonth() + 1;
      const year = targetDate.getFullYear();
      
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(nextYear, nextMonth - 1, 1);
      
      const orders = await Order.find({
        createdAt: { $gte: startDate, $lt: endDate },
        status: 'completed'
      });
      
      const revenue = orders.reduce((sum, order) => sum + order.total, 0);
      monthlyRevenue[`${month.toString().padStart(2, '0')}/${year}`] = revenue;
    }
    
    const completedOrders = await Order.find({ status: 'completed' });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
    
    res.json({
      totalEstablishments,
      activeEstablishments,
      activeManagers,
      totalRevenue,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    res.status(500).json({ error: error.message });
  }
};
// Statistiques de ventes pour le manager
export const getSalesStats = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;

    // Calculer le revenu total et le nombre de commandes
    const orders = await Order.find({
      establishment: establishmentId,
      status: 'completed'
    });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalItemsSold = orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    // Calculer la valeur moyenne des commandes
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculer les articles populaires
    const popularItems = await Order.aggregate([
      { $match: { 
        establishment: new mongoose.Types.ObjectId(establishmentId),
        status: 'completed'
      }},
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: 1,
          quantity: 1
        }
      }
    ]);

    // Calculer les meilleurs clients (par montant dépensé)
    const topCustomers = await Order.aggregate([
      { $match: { 
        establishment: new mongoose.Types.ObjectId(establishmentId),
        status: 'completed'
      }},
      {
        $group: {
          _id: '$customer',
          name: { $first: '$customerName' },
          phone: { $first: '$customerPhone' },
          orders: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: 1,
          phone: 1,
          orders: 1,
          amount: 1
        }
      }
    ]);

    // Calculer le revenu hebdomadaire (12 dernières semaines)
    const weeklyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);

      const weekOrders = await Order.find({
        establishment: establishmentId,
        status: 'completed',
        createdAt: { $gte: startDate, $lt: endDate }
      });

      const revenue = weekOrders.reduce((sum, order) => sum + order.total, 0);
      weeklyRevenue.push({
        week: `S${i+1}`,
        revenue
      });
    }

    res.json({
      totalRevenue,
      avgOrderValue,
      totalItemsSold,
      popularItems: popularItems || [], // Ensure it's always an array
      topCustomers,
      weeklyRevenue
    });

  } catch (error) {
    console.error('Error in getSalesStats:', error);
    res.status(500).json({ 
      error: error.message,
      popularItems: [] // Return empty array on error
    });
  }
};
// Alertes de stock pour le manager
export const getStockAlerts = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;

    // Trouver les produits d'un établissement dont le stock est inférieur à 10
    const lowStockItems = await Product.find({
        establishment: establishmentId,
        stock: { $lt: 10 }
    });

    res.json(lowStockItems);

  } catch (error) {
    console.error('Error in getStockAlerts:', error);
    res.status(500).json({ error: error.message });
  }
};