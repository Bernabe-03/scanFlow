import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Order from '../models/Order.js'; 
import { Product, Category } from '../models/Product.js';
import asyncHandler from 'express-async-handler';

export const getDisconnectedCashiers = asyncHandler(async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const cashiers = await User.find({
      establishment: establishmentId,
      role: 'cashier',
      isActive: true,
      $or: [
        { lastSeen: { $lt: fiveMinutesAgo } },
        { lastSeen: { $exists: false } }
      ]
    }).select('fullName lastSeen lastLogin isOnShift');

    res.status(200).json(cashiers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Mettre à jour lastSeen
export const updateLastSeen = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    
    const cashier = await User.findByIdAndUpdate(
      id,
      { lastSeen: new Date() },
      { new: true }
    ).select('-password');
    
    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé' });
    }
    
    res.json(cashier);
  } catch (error) {
    console.error('Erreur updateLastSeen:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};
export const getCashiers = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    
    if (!establishmentId) {
      return res.status(400).json({ message: 'L\'ID de l\'établissement est manquant.' });
    }
    
    const cashiers = await User.find({
      establishment: establishmentId,
      role: 'cashier'
    }).select('-password -__v');
    
    res.status(200).json(cashiers);
  } catch (error) {
    console.error('Erreur lors de la récupération des caissiers:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
export const createCashier = async (req, res) => {
  try {
    const { fullName, email, phone, password, code } = req.body;
    const establishmentId = req.user.establishment;

    if (!establishmentId) {
      return res.status(400).json({ message: 'Manager non assigné à un établissement' });
    }
    
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }],
      establishment: establishmentId
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email ou téléphone existe déjà dans cet établissement.' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const cashier = new User({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'cashier',
      establishment: establishmentId,
      code: code || `CASH${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      isActive: true
    });

    await cashier.save();
    
    const cashierResponse = await User.findById(cashier._id).select('-password');
    res.status(201).json(cashierResponse);
  } catch (error) {
    console.error('Erreur lors de la création d\'un caissier:', error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
};
// export const getLocationData = async (req, res) => {
//   try {
//       // Your logic to fetch location data from database
//       const locationData = await Location.find({ establishment: req.user.establishment });
//       res.json({
//           success: true,
//           data: locationData
//       });
//   } catch (error) {
//       console.error('Error fetching location data:', error);
//       res.status(500).json({
//           success: false,
//           message: 'Erreur lors de la récupération des données de localisation'
//       });
//   }
// };
// export const getUnits = async (req, res) => {
//   try {
//       // Your logic to fetch units from database
//       const units = await Unit.find({ establishment: req.user.establishment });
//       res.json({
//           success: true,
//           data: units
//       });
//   } catch (error) {
//       console.error('Error fetching units:', error);
//       res.status(500).json({
//           success: false,
//           message: 'Erreur lors de la récupération des unités'
//       });
//   }
// };
export const getActiveCashier = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;

    if (!establishmentId) {
      return res.status(400).json({ message: 'Établissement non spécifié.' });
    }

    const activeCashier = await User.findOne({
      establishment: establishmentId,
      role: 'cashier',
      isActive: true, 
      isOnShift: true 
    })
    .select('-password')
    .populate('establishment', 'name manager address phone');

    if (!activeCashier) {
      return res.status(404).json({ message: 'Aucun caissier actif.' });
    }

    res.status(200).json(activeCashier);
  } catch (error) {
    console.error('Erreur lors de la récupération du caissier actif:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
export const toggleCashierStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const establishmentId = req.user.establishment;

    const cashier = await User.findOne({ 
      _id: id, 
      establishment: establishmentId, 
      role: 'cashier' 
    });
    
    if (!cashier) {
      return res.status(404).json({ message: 'Caissier non trouvé.' });
    }

    cashier.isActive = isActive;
    
    if (!isActive && cashier.isOnShift) {
      cashier.isOnShift = false;
      cashier.endTime = new Date();
    }
    
    await cashier.save();

    res.status(200).json(cashier);
  } catch (error) {
    console.error('Erreur lors du changement de statut du caissier:', error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
};
export const getCashierStatusForManager = async (req, res) => {
  try {
    const cashierId = req.params.id;
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

    if (!cashier.isActive) {
      return res.status(403).json({ message: 'Compte caissier désactivé' });
    }

    res.status(200).json(cashier);
  } catch (error) {
    console.error('Erreur getCashierStatusForManager:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const deleteCashier = async (req, res) => {
    try {
        const { id } = req.params;
        const establishmentId = req.user.establishment;

        const cashier = await User.findOneAndDelete({ _id: id, establishment: establishmentId, role: 'cashier' });
        if (!cashier) {
            return res.status(404).json({ message: 'Caissier non trouvé.' });
        }

        res.status(200).json({ message: 'Caissier supprimé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression du caissier:', error);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
};
export const startCashierShift = async (req, res) => {
    try {
        const { cashierId } = req.body;
        const establishmentId = req.user.establishment;

        const cashier = await User.findOne({ 
            _id: cashierId, 
            establishment: establishmentId, 
            role: 'cashier' 
        }).populate('establishment', 'name manager address phone');

        if (!cashier) {
            return res.status(404).json({ message: 'Caissier non trouvé.' });
        }

        cashier.startTime = new Date();
        cashier.endTime = null;
        cashier.isOnShift = true;
        cashier.breaks = [];

        await cashier.save();

        const cashierWithoutPassword = await User.findById(cashierId)
            .select('-password')
            .populate('establishment', 'name manager address phone');
            
        res.status(200).json(cashierWithoutPassword);
    } catch (error) {
        console.error('Erreur lors du démarrage du service:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};
export const endCashierShift = async (req, res) => {
    try {
        const { cashierId } = req.body;
        const establishmentId = req.user.establishment;

        const cashier = await User.findOne({ 
            _id: cashierId, 
            establishment: establishmentId, 
            role: 'cashier' 
        });

        if (!cashier) {
            return res.status(404).json({ message: 'Caissier non trouvé.' });
        }

        cashier.endTime = new Date();
        cashier.isOnShift = false;

        await cashier.save();

        const cashierWithoutPassword = await User.findById(cashierId).select('-password');
        res.status(200).json(cashierWithoutPassword);
    } catch (error) {
        console.error('Erreur lors de la clôture du service:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};
export const getDashboardStats = async (req, res) => {
  try {
      const establishmentId = req.user.establishment;
      
      if (!establishmentId) {
          return res.status(400).json({ message: 'Establishment ID not found for authenticated user.' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrdersCount = await Order.countDocuments({
          establishment: establishmentId,
          createdAt: { $gte: today }
      });

      const todayRevenueResult = await Order.aggregate([
          { $match: { establishment: establishmentId, createdAt: { $gte: today }, status: 'completed' } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]);
      const totalRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].totalRevenue : 0;

      const pendingOrdersCount = await Order.countDocuments({
          establishment: establishmentId,
          status: 'pending',
          createdAt: { $gte: today }
      });

      const popularProductResult = await Order.aggregate([
          { $match: { establishment: establishmentId, createdAt: { $gte: today } } },
          { $unwind: "$items" },
          {
              $group: {
                  _id: "$items.product",
                  count: { $sum: "$items.quantity" }
              }
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
          {
              $lookup: {
                  from: "products",
                  localField: "_id",
                  foreignField: "_id",
                  as: "productInfo"
              }
          },
          { $unwind: "$productInfo" },
          {
              $project: {
                  _id: 0,
                  name: "$productInfo.name",
                  count: 1
              }
          }
      ]);
      const popularProduct = popularProductResult.length > 0 ? popularProductResult[0].name : 'Aucun';

      res.json({
          todayOrders: todayOrdersCount,
          pendingOrders: pendingOrdersCount, 
          todayRevenue: totalRevenue, 
          popularProduct: popularProduct 
      });
  } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: error.message || 'Server error fetching dashboard stats.' });
  }
};
export const createProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;
        const establishmentId = req.user.establishment;

        if (!establishmentId) {
            return res.status(400).json({ message: 'Establishment ID not found for authenticated manager.' });
        }
        
        const product = new Product({
            name,
            description,
            price,
            category,
            stock,
            establishment: establishmentId
        });
        
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product (in managerController):', error);
        res.status(500).json({ error: error.message || 'Server error creating product.' });
    }
};
export const updateCashier = async (req, res) => {
  try {
      const { id } = req.params;
      const { fullName, email, phone, password, isActive } = req.body;
      const establishmentId = req.user.establishment;

      const cashier = await User.findOne({ _id: id, establishment: establishmentId, role: 'cashier' });
      if (!cashier) {
          return res.status(404).json({ message: 'Caissier non trouvé.' });
      }

      cashier.fullName = fullName || cashier.fullName;
      cashier.email = email || cashier.email;
      cashier.phone = phone || cashier.phone;
      cashier.isActive = isActive !== undefined ? isActive : cashier.isActive;

      if (password) {
          const salt = await bcrypt.genSalt(10);
          cashier.password = await bcrypt.hash(password, salt);
      }

      await cashier.save();
      res.status(200).json(cashier);
  } catch (error) {
      console.error('Erreur lors de la mise à jour du caissier:', error);
      res.status(500).json({ message: 'Erreur du serveur.' });
  }
};
export const getManagerEstablishment = async (req, res) => {
  try {
    const establishmentId = req.user.establishment;
    
    if (!establishmentId) {
      return res.status(400).json({ message: 'Manager non assigné à un établissement' });
    }

    const establishment = await Establishment.findById(establishmentId)
      .select('_id name code address phone isActive');
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }

    res.status(200).json(establishment);
  } catch (error) {
    console.error('Erreur getManagerEstablishment:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};