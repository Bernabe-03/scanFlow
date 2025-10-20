import Order from '../models/Order.js';
import User from '../models/User.js';
import { Product } from '../models/Product.js';
import mongoose from 'mongoose';
export const startShift = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const establishmentId = req.user.establishment;

    const cashier = await User.findOne({
      _id: cashierId,
      establishment: establishmentId,
      role: 'cashier'
    }).populate('establishment', 'name manager address phone');

    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé.' });
    }

    if (cashier.isOnShift) {
      return res.status(400).json({ message: 'Service déjà démarré.' });
    }
    
    cashier.startTime = new Date();
    cashier.isOnShift = true;
    cashier.endTime = null;
    cashier.breaks = [];

    await cashier.save();

    const updatedUser = await User.findById(cashierId).select('-password').populate('establishment', 'name manager address phone');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors du démarrage du service:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
export const getPendingOrders = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    const orders = await Order.find({
      establishment: establishmentId,
      status: 'pending'
    }).sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getDailySummary = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const establishmentId = req.user.establishment;

    // 1. D'abord, trouvez le caissier dans la base de données
    const cashier = await User.findOne({
      _id: cashierId,
      establishment: establishmentId,
      role: 'cashier'
    }).select('startTime endTime isOnShift breaks');

    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé' });
    }

    // 2. Ensuite, calculez le résumé quotidien
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const summary = await Order.aggregate([
      {
        $match: {
          cashier: new mongoose.Types.ObjectId(cashierId),
          establishment: new mongoose.Types.ObjectId(establishmentId),
          status: 'completed',
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$total" }
        }
      }
    ]);

    const result = summary[0] || { orders: 0, revenue: 0 };
    
    // 3. Maintenant, renvoyez la réponse avec les données du caissier
    res.json({
      orders: result.orders,
      revenue: result.revenue,
      startTime: cashier.startTime,    // Maintenant cashier existe!
      endTime: cashier.endTime,        // Maintenant cashier existe!
      isOnShift: cashier.isOnShift,    // Maintenant cashier existe!
      breaks: cashier.breaks || []     // Maintenant cashier existe!
    });
  } catch (error) {
    console.error('Erreur getDailySummary:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
export const getCompletedOrders = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      cashier: cashierId,
      status: 'completed',
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Erreur getCompletedOrders:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const createOrder = async (req, res) => {
    try {
      const { items, table, total } = req.body;
      const establishmentId = req.user.establishment;
      const cashierId = req.user._id;
  
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Product ${item.product} not found` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        }
        product.stock -= item.quantity;
        await product.save();
      }
  
      const order = new Order({
        items,
        table,
        total,
        establishment: establishmentId,
        cashier: cashierId,
        status: 'pending'
      });
      await order.save();
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }; 
export const updateOwnLastSeen = async (req, res) => {
    try {
      const cashierId = req.user._id; // Récupéré du token
  
      const cashier = await User.findByIdAndUpdate(
        cashierId,
        { lastSeen: new Date() },
        { new: true }
      ).select('-password');
  
      if (!cashier) {
        return res.status(404).json({ message: 'Caissier non trouvé' });
      }
  
      res.json(cashier);
    } catch (error) {
      console.error('Erreur updateOwnLastSeen:', error);
      res.status(500).json({ 
        message: 'Erreur serveur',
        error: error.message 
      });
    }
  }; 
export const endShift = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const establishmentId = req.user.establishment;

    const cashier = await User.findOne({
      _id: cashierId,
      establishment: establishmentId,
      role: 'cashier'
    });

    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé.' });
    }
    
    if (!cashier.isOnShift) {
      return res.status(400).json({ message: 'Aucun service actif à terminer.' });
    }

    cashier.endTime = new Date();
    cashier.isOnShift = false;

    await cashier.save();

    const updatedUser = await User.findById(cashierId).select('-password');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la clôture du service:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
export const startBreak = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const establishmentId = req.user.establishment;

    const cashier = await User.findOne({
      _id: cashierId,
      establishment: establishmentId,
      role: 'cashier'
    });

    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé.' });
    }

    if (!cashier.isOnShift) {
      return res.status(400).json({ message: 'Le caissier doit être en service pour prendre une pause.' });
    }

    // Vérifier s'il y a déjà une pause en cours
    const activeBreak = cashier.breaks.find(breakPeriod => !breakPeriod.end);
    if (activeBreak) {
      return res.status(400).json({ message: 'Une pause est déjà en cours.' });
    }

    // Ajouter une nouvelle pause
    cashier.breaks.push({
      start: new Date(),
      end: null
    });

    await cashier.save();

    const updatedUser = await User.findById(cashierId)
      .select('-password')
      .populate('establishment', 'name manager address phone');
      
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors du démarrage de la pause:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
export const endBreak = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const establishmentId = req.user.establishment;

    const cashier = await User.findOne({
      _id: cashierId,
      establishment: establishmentId,
      role: 'cashier'
    });

    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé.' });
    }

    // Trouver la pause en cours
    const activeBreak = cashier.breaks.find(breakPeriod => !breakPeriod.end);
    if (!activeBreak) {
      return res.status(400).json({ message: 'Aucune pause en cours.' });
    }

    // Terminer la pause
    activeBreak.end = new Date();

    await cashier.save();

    const updatedUser = await User.findById(cashierId)
      .select('-password')
      .populate('establishment', 'name manager address phone');
      
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la fin de la pause:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
export const getCashierStatus = async (req, res) => {
    try {
      const cashierId = req.user._id;
      const establishmentId = req.user.establishment;
     
      const cashier = await User.findOne({
        _id: cashierId,
        role: 'cashier',
        establishment: establishmentId
      })
      .select('_id fullName code isOnShift startTime endTime breaks establishment isActive')
      .populate('establishment', 'name manager address phone')
      .lean();
     
      if (!cashier) {
        return res.status(404).json({ message: 'Caissier non trouvé' });
      }
      
      // Vérification cohérente de l'état actif
      if (!cashier.isActive) {
        return res.status(403).json({ 
          message: 'Compte caissier désactivé',
          isActive: false,
          isOnShift: false
        });
      }
     
      res.status(200).json(cashier);
    } catch (error) {
      console.error('Erreur getCashierStatus:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
};
export const getActiveCashier = async (req, res) => {
    try {
      const establishmentId = req.user.establishment;
      
      const activeCashier = await User.findOne({
        establishment: establishmentId,
        role: 'cashier',
        isActive: true,
        isOnShift: true
      })
      .select('-password')
      .populate('establishment', 'name manager address phone');
  
      if (!activeCashier) {
        return res.status(404).json({ message: 'Aucun caissier actif trouvé' });
      }
  
      res.status(200).json(activeCashier);
    } catch (error) {
      console.error('Erreur getActiveCashier:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getActiveOrders = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    const orders = await Order.find({
      establishment: establishmentId,
      status: { $in: ['pending', 'preparing'] }
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
