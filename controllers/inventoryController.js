import { Inventory, InventoryEntry } from '../models/Inventory.js';
import ProductProfit from '../models/ProductProfit.js';
import { Product } from '../models/Product.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

// Enhanced error handling for all controller functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
// Nouvelle fonction pour l'analyse des pertes
export const getLossAnalysis = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const establishment = req.user.establishment;

  if (!establishment) {
    return res.status(400).json({
      success: false,
      message: 'Établissement requis'
    });
  }

  try {
    // Calcul des statistiques de pertes basé sur les entrées d'inventaire
    const lossEntries = await InventoryEntry.find({
      establishment,
      type: 'perte',
      date: getDateRangeForPeriod(period)
    }).populate('product', 'name category');

    const lossStats = calculateLossStats(lossEntries, []);
    
    res.json({
      success: true,
      losses: lossStats,
      period
    });
  } catch (error) {
    console.error('Erreur analyse pertes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des pertes'
    });
  }
});
// Fonction utilitaire pour calculer les stats de pertes
const calculateLossStats = (entries, products) => {
  const losses = {
    totalLosses: 0,
    totalMissing: 0,
    totalWaste: 0,
    totalTransport: 0,
    expiredValue: 0,
    breakageValue: 0,
    theftValue: 0,
    lossRate: 0,
    revenueImpact: 0,
    potentialSavings: 0
  };

  const lossEntries = entries.filter(entry => entry.type === 'perte');
  
  lossEntries.forEach(entry => {
    const cost = entry.totalCost || 0;
    losses.totalLosses += cost;

    // Categorize based on reason or lossCategory field
    const category = entry.lossCategory || 
                    (entry.reason?.toLowerCase().includes('manquant') ? 'missing' :
                     entry.reason?.toLowerCase().includes('gâté') ? 'damaged' :
                     entry.reason?.toLowerCase().includes('périmé') ? 'expired' :
                     entry.reason?.toLowerCase().includes('casse') ? 'breakage' :
                     entry.reason?.toLowerCase().includes('vol') ? 'theft' :
                     entry.reason?.toLowerCase().includes('transport') ? 'transport' : 'other');

    switch (category) {
      case 'missing':
        losses.totalMissing += cost;
        break;
      case 'damaged':
        losses.totalWaste += cost;
        break;
      case 'transport':
        losses.totalTransport += cost;
        break;
      case 'expired':
        losses.expiredValue += cost;
        break;
      case 'breakage':
        losses.breakageValue += cost;
        break;
      case 'theft':
        losses.theftValue += cost;
        break;
    }
  });

  // Calculate revenue for loss rate
  const revenueEntries = entries.filter(entry => entry.type === 'sortie');
  const totalRevenue = revenueEntries.reduce((sum, entry) => sum + (entry.totalRevenue || 0), 0);

  losses.lossRate = totalRevenue > 0 ? (losses.totalLosses / totalRevenue) * 100 : 0;
  losses.revenueImpact = totalRevenue > 0 ? (losses.totalLosses / (totalRevenue + losses.totalLosses)) * 100 : 0;
  losses.potentialSavings = losses.totalLosses * 0.3; // 30% savings potential

  return losses;
};
// ✅ NOUVELLE FONCTION : Statistiques avancées de l'inventaire
export const getInventoryStatistics = asyncHandler(async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const establishment = req.user.establishment;

  if (!establishment) {
    return res.status(400).json({
      success: false,
      message: 'Établissement requis',
      code: 'ESTABLISHMENT_REQUIRED'
    });
  }

  try {
    // Calcul de la plage de dates
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRangeForPeriod(period || 'monthly');
      start = range.start;
      end = range.end;
    }

    // Récupération des données agrégées
    const [
      weeklyData,
      monthlyData,
      profitData,
      lossEntries,
      currentStock,
      totalProducts
    ] = await Promise.all([
      // Inventaire hebdomadaire
      Inventory.find({
        establishment,
        period: 'weekly',
        periodDate: { $gte: start, $lte: end }
      }),
      
      // Inventaire mensuel
      Inventory.find({
        establishment,
        period: 'monthly', 
        periodDate: { $gte: start, $lte: end }
      }),
      
      // Données de bénéfices
      ProductProfit.find({
        establishment,
        periodDate: { $gte: start, $lte: end }
      }),
      
      // Analyse des pertes
      InventoryEntry.find({
        establishment,
        type: 'perte',
        date: { $gte: start, $lte: end }
      }).populate('product', 'name category'),
      
      // Stock actuel
      Product.find({ establishment }),
      
      // Total produits
      Product.countDocuments({ establishment })
    ]);

    // Calcul des statistiques avancées
    const advancedStats = {
      // 📊 Métriques de base
      totalProducts,
      totalStockValue: currentStock.reduce((sum, product) => 
        sum + (product.stock * (product.purchaseCost || 0)), 0),
      
      // 💰 Performance financière
      financialMetrics: {
        totalRevenue: profitData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
        totalCost: profitData.reduce((sum, item) => sum + (item.totalCost || 0), 0),
        totalProfit: profitData.reduce((sum, item) => sum + (item.profit || 0), 0),
        averageMargin: profitData.length > 0 ? 
          profitData.reduce((sum, item) => sum + (item.margin || 0), 0) / profitData.length : 0,
        roi: calculateROI(profitData)
      },
      
      // 📈 Tendances et efficacité
      efficiencyMetrics: {
        turnoverRate: calculateTurnoverRate(weeklyData, currentStock),
        stockCoverage: calculateStockCoverage(currentStock, monthlyData),
        serviceLevel: calculateServiceLevel(weeklyData),
        stockoutRate: calculateStockoutRate(weeklyData)
      },
      
      // ⚠️ Analyse des pertes avancée
      lossAnalysis: calculateEnhancedLossStats(lossEntries, profitData),
      
      // 🎯 KPI principaux
      kpis: {
        gmroi: calculateGMROI(profitData, currentStock),
        inventoryAccuracy: calculateInventoryAccuracy(weeklyData),
        carryingCostRate: calculateCarryingCostRate(currentStock),
        stockToSalesRatio: calculateStockToSalesRatio(currentStock, monthlyData)
      }
    };

    res.json({
      success: true,
      statistics: advancedStats,
      period: { start, end, type: period || 'monthly' },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Erreur statistiques avancées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques avancées'
    });
  }
});

// Fonction pour obtenir la plage de dates
function getDateRangeForPeriod(period) {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'daily':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'weekly':
      start = new Date(now.setDate(now.getDate() - now.getDay()));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start, end };
}

// Calcul du Return on Investment (ROI)
function calculateROI(profitData) {
  const totalInvestment = profitData.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalProfit = profitData.reduce((sum, item) => sum + (item.profit || 0), 0);
  
  return totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
}

// Taux de rotation des stocks
function calculateTurnoverRate(weeklyData, currentStock) {
  const totalSales = weeklyData.reduce((sum, item) => sum + (item.sales || 0), 0);
  const averageStock = currentStock.reduce((sum, product) => sum + product.stock, 0) / currentStock.length;
  
  return averageStock > 0 ? totalSales / averageStock : 0;
}

// Couverture de stock (en jours)
function calculateStockCoverage(currentStock, monthlyData) {
  const averageDailySales = monthlyData.reduce((sum, item) => sum + (item.sales || 0), 0) / 30;
  const totalStock = currentStock.reduce((sum, product) => sum + product.stock, 0);
  
  return averageDailySales > 0 ? totalStock / averageDailySales : 0;
}

// Taux de service (disponibilité des produits)
function calculateServiceLevel(weeklyData) {
  const totalProducts = weeklyData.length;
  const availableProducts = weeklyData.filter(item => (item.currentStock || 0) > 0).length;
  
  return totalProducts > 0 ? (availableProducts / totalProducts) * 100 : 0;
}

// Taux de rupture de stock
function calculateStockoutRate(weeklyData) {
  const totalProducts = weeklyData.length;
  const outOfStockProducts = weeklyData.filter(item => (item.currentStock || 0) === 0).length;
  
  return totalProducts > 0 ? (outOfStockProducts / totalProducts) * 100 : 0;
}

// Statistiques de pertes avancées
function calculateEnhancedLossStats(lossEntries, profitData) {
  const basicLossStats = calculateLossStats(lossEntries);
  const totalRevenue = profitData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  
  return {
    ...basicLossStats,
    // Métriques supplémentaires
    lossToRevenueRatio: totalRevenue > 0 ? (basicLossStats.totalLosses / totalRevenue) * 100 : 0,
    recoveryRate: calculateRecoveryRate(lossEntries),
    trendAnalysis: analyzeLossTrend(lossEntries)
  };
}

// Taux de récupération des pertes
function calculateRecoveryRate(lossEntries) {
  const totalLosses = lossEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
  const recoveredLosses = lossEntries
    .filter(entry => entry.reason?.includes('récupération') || entry.reason?.includes('recovery'))
    .reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
  
  return totalLosses > 0 ? (recoveredLosses / totalLosses) * 100 : 0;
}

// Analyse des tendances des pertes
function analyzeLossTrend(lossEntries) {
  const monthlyLosses = {};
  
  lossEntries.forEach(entry => {
    const month = new Date(entry.date).toISOString().slice(0, 7); // YYYY-MM
    monthlyLosses[month] = (monthlyLosses[month] || 0) + (entry.totalCost || 0);
  });
  
  return monthlyLosses;
}

// GMROI (Gross Margin Return on Investment)
function calculateGMROI(profitData, currentStock) {
  const grossMargin = profitData.reduce((sum, item) => sum + (item.profit || 0), 0);
  const averageInventory = currentStock.reduce((sum, product) => 
    sum + (product.stock * (product.purchaseCost || 0)), 0) / currentStock.length;
  
  return averageInventory > 0 ? grossMargin / averageInventory : 0;
}

// Précision de l'inventaire
function calculateInventoryAccuracy(weeklyData) {
  const totalItems = weeklyData.length;
  const accurateItems = weeklyData.filter(item => 
    Math.abs((item.initialStock || 0) - (item.currentStock || 0)) <= 2
  ).length;
  
  return totalItems > 0 ? (accurateItems / totalItems) * 100 : 0;
}

// Taux de coût de possession
function calculateCarryingCostRate(currentStock) {
  const totalStockValue = currentStock.reduce((sum, product) => 
    sum + (product.stock * (product.purchaseCost || 0)), 0);
  const estimatedCarryingCost = totalStockValue * 0.25; // Estimation à 25%
  
  return totalStockValue > 0 ? (estimatedCarryingCost / totalStockValue) * 100 : 0;
}

// Ratio stock/ventes
function calculateStockToSalesRatio(currentStock, monthlyData) {
  const totalStockValue = currentStock.reduce((sum, product) => 
    sum + (product.stock * (product.purchaseCost || 0)), 0);
  const monthlySales = monthlyData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  
  return monthlySales > 0 ? totalStockValue / monthlySales : 0;
}

// Helper to update aggregated Inventory (weekly/monthly) stats based on a manual entry
async function updateInventoryStats(product, establishment, entry) {
  const today = new Date();
  
  // Calculate the start of the current week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Calculate the start of the current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Update weekly stats
  await updateAggregatedStats(product, establishment, entry, 'weekly', weekStart);
  
  // Update monthly stats
  await updateAggregatedStats(product, establishment, entry, 'monthly', monthStart);
}

// Generic helper for updating weekly/monthly Inventory records
async function updateAggregatedStats(product, establishment, entry, period, periodDate) {
  const updateFields = {};
  
  switch (entry.type) {
    case 'entrée':
      updateFields.$inc = { entries: entry.quantity };
      break;
    case 'sortie':
      // Manual sortie is recorded as exit, but not sales (sales come from Orders)
      updateFields.$inc = { exits: entry.quantity };
      break;
    case 'perte':
      updateFields.$inc = { losses: entry.quantity, exits: entry.quantity };
      break;
  }

  if (updateFields.$inc) {
    await Inventory.findOneAndUpdate(
      {
        product: product._id,
        establishment: establishment,
        period: period,
        periodDate: periodDate
      },
      {
        ...updateFields,
        // Always set the latest stock and cost metrics
        $set: {
          currentStock: product.stock,
          purchaseCost: product.purchaseCost || 0,
          sellingPrice: product.unitPrice || 0
        }
      },
      { upsert: true, new: true }
    );
  }
}

// --- CONTROLLER FUNCTIONS ---

export const syncSalesWithInventory = asyncHandler(async (req, res) => {
  try {
    const { establishmentId, startDate, endDate } = req.body;
    const establishment = establishmentId || req.user.establishment;

    if (!establishment) {
      return res.status(400).json({ 
        success: false,
        message: 'Établissement requis',
        code: 'ESTABLISHMENT_REQUIRED'
      });
    }

    // Input validation
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Date de début et de fin sont obligatoires',
        code: 'DATE_RANGE_REQUIRED'
      });
    }

    const orders = await Order.find({
      establishment,
      status: 'completed',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('items.product');

    let syncedCount = 0;
    const errors = [];

    for (const order of orders) {
      for (const item of order.items) {
        if (item.product) {
          try {
            // Check if inventory entry (sortie) already exists for this order item
            const existingEntry = await InventoryEntry.findOne({
              product: item.product._id,
              // Use regex for flexible matching, or ideally a dedicated orderItem ID field if available
              'reason': new RegExp(`Vente - Commande ${order._id}`), 
              type: 'sortie'
            });

            if (!existingEntry) {
              const inventoryEntry = new InventoryEntry({
                product: item.product._id,
                establishment,
                type: 'sortie',
                quantity: item.quantity,
                unitCost: item.product.purchaseCost || 0,
                totalCost: (item.product.purchaseCost || 0) * item.quantity,
                reason: `Vente - Commande ${order._id}`,
                date: order.createdAt,
                recordedBy: req.user._id
              });

              await inventoryEntry.save();
              syncedCount++;
            }
          } catch (error) {
            errors.push({
              orderId: order._id,
              productId: item.product._id,
              error: error.message
            });
            console.error(`Error syncing order ${order._id}:`, error);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Synchronisation terminée: ${syncedCount} nouvelles entrées créées`,
      syncedCount,
      totalOrders: orders.length,
      errors: errors.length > 0 ? errors : undefined,
      hasErrors: errors.length > 0
    });

  } catch (error) {
    console.error('Erreur synchronisation ventes-inventaire:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la synchronisation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Inventaire hebdomadaire
export const getWeeklyInventory = asyncHandler(async (req, res) => {
  console.log('🔍 Début getWeeklyInventory', {
    query: req.query,
    user: req.user ? req.user._id : 'non authentifié'
  });

  const { establishmentId, startDate, endDate } = req.query;
  
  // Validation robuste de l'établissement
  const establishment = establishmentId || req.user?.establishment;
  if (!establishment) {
    return res.status(400).json({
      success: false,
      message: 'Établissement requis',
      code: 'ESTABLISHMENT_REQUIRED',
      details: 'Aucun établissement spécifié dans la requête ou associé à l\'utilisateur'
    });
  }

  // Validation que l'établissement existe
  const Establishment = mongoose.model('Establishment'); 
  const establishmentExists = await Establishment.findById(establishment);
  if (!establishmentExists) {
    return res.status(404).json({
      success: false,
      message: 'Établissement non trouvé',
      code: 'ESTABLISHMENT_NOT_FOUND'
    });
  }

  // Validation et calcul des dates
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Format de date invalide',
      code: 'INVALID_DATE_FORMAT'
    });
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  console.log('📅 Période analysée:', { start, end, establishment });

  try {
    const inventory = await Inventory.find({
      establishment,
      period: 'weekly',
      periodDate: { $gte: start, $lte: end }
    })
    .populate('product', 'name category unitPrice image')
    .sort({ periodDate: -1 });

    // Calcul des statistiques avec gestion des valeurs nulles
    const stats = {
      totalProducts: inventory.length,
      totalStockValue: inventory.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.purchaseCost || 0)), 0),
      totalRevenue: inventory.reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
      totalProfit: inventory.reduce((sum, item) => sum + (item.profit || 0), 0),
      totalLosses: inventory.reduce((sum, item) => sum + ((item.losses || 0) * (item.purchaseCost || 0)), 0),
      totalSales: inventory.reduce((sum, item) => sum + (item.sales || 0), 0)
    };

    res.json({
      success: true,
      inventory: inventory || [],
      stats,
      period: { start, end }
    });

  } catch (error) {
    console.error('💥 Erreur base de données:', error);
    // Throw error to be caught by asyncHandler
    throw new Error(`Erreur lors de la récupération de l'inventaire: ${error.message}`); 
  }
});
// Inventaire mensuel
export const getMonthlyInventory = asyncHandler(async (req, res) => {
  const { establishmentId, year, month } = req.query;
  const establishment = establishmentId || req.user?.establishment;

  if (!establishment) {
    return res.status(400).json({
      success: false,
      message: 'Établissement requis',
      code: 'ESTABLISHMENT_REQUIRED'
    });
  }

  const targetYear = parseInt(year) || new Date().getFullYear();
  const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();

  if (targetMonth < 0 || targetMonth > 11) {
    return res.status(400).json({
      success: false,
      message: 'Mois invalide',
      code: 'INVALID_MONTH'
    });
  }

  const start = new Date(targetYear, targetMonth, 1);
  const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  const inventory = await Inventory.find({
    establishment,
    period: 'monthly',
    periodDate: { $gte: start, $lte: end }
  })
  .populate('product', 'name category unitPrice image')
  .sort({ periodDate: -1 });

  // Calcul des statistiques sécurisé
  const currentStats = {
    totalProducts: inventory.length,
    totalStockValue: inventory.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.purchaseCost || 0)), 0),
    totalRevenue: inventory.reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
    totalProfit: inventory.reduce((sum, item) => sum + (item.profit || 0), 0),
    totalLosses: inventory.reduce((sum, item) => sum + ((item.losses || 0) * (item.purchaseCost || 0)), 0),
    totalSales: inventory.reduce((sum, item) => sum + (item.sales || 0), 0)
  };

  res.json({
    success: true,
    inventory: inventory || [],
    stats: currentStats,
    period: { start, end, month: targetMonth + 1, year: targetYear }
  });
});
// Bénéfices produits
export const getProductProfits = asyncHandler(async (req, res) => {
  const { establishmentId, period, startDate, endDate, productId } = req.query;
  const establishment = establishmentId || req.user?.establishment;

  if (!establishment) {
    return res.status(400).json({
      success: false,
      message: 'Établissement requis',
      code: 'ESTABLISHMENT_REQUIRED'
    });
  }

  let start, end;
  const periodType = period || 'monthly';

  // Validation et calcul de la période
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
        code: 'INVALID_DATE_FORMAT'
      });
    }
    // Ensure 'end' date includes the entire day
    end.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    if (periodType === 'daily') {
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
    } else if (periodType === 'weekly') {
      start = new Date(now.setDate(now.getDate() - now.getDay())); // Start of the current week (Sunday)
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else { // Monthly default
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
  }

  const filter = {
    establishment,
    // Note: ProductProfit should ideally store 'daily' entries, and aggregation happens client-side/in another job
    periodDate: { $gte: start, $lte: end }
  };

  if (productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de produit invalide',
        code: 'INVALID_PRODUCT_ID'
      });
    }
    filter.product = productId;
  }

  const profits = await ProductProfit.find(filter)
    .populate('product', 'name category image')
    .sort({ profit: -1 });

  const stats = {
    totalRevenue: profits.reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
    totalCost: profits.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    totalProfit: profits.reduce((sum, item) => sum + (item.profit || 0), 0),
    averageMargin: profits.length > 0 ? 
      profits.reduce((sum, item) => sum + (item.margin || 0), 0) / profits.length : 0,
    topProducts: profits.slice(0, 5)
  };

  res.json({
    success: true,
    profits: profits || [],
    stats,
    period: { start, end, type: periodType }
  });
});
// Création d'entrée d'inventaire
export const createInventoryEntry = asyncHandler(async (req, res) => {
  console.log("=== DÉBUT CREATE INVENTORY ENTRY ===");
  console.log("Utilisateur:", req.user ? req.user._id : "Aucun utilisateur");
  console.log("Établissement user:", req.user?.establishment);
  console.log("Body reçu:", req.body);
  console.log("=== FIN DEBUG ===");
  
  const { 
    productId, type, quantity, unitCost, reason, notes, date, supplierId, 
    lossDetails, reference, establishmentId 
  } = req.body;
  
  const establishment = establishmentId || req.user.establishment;
  const recordedBy = req.user._id;

  // 1. Validation de la présence des champs
  if (!productId || !type || quantity === undefined || quantity === null) {
    return res.status(400).json({
      success: false,
      message: 'Produit, type et quantité sont obligatoires',
      code: 'REQUIRED_FIELDS_MISSING'
    });
  }

  // 2. Validation de l'établissement
  console.log("Établissement utilisé:", establishment);

  if (!establishment) {
    return res.status(400).json({
      success: false,
      message: 'Établissement requis',
      code: 'ESTABLISHMENT_REQUIRED'
    });
  }

  // 3. Validation de l'ID Produit
  if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
          success: false,
          message: 'ID de produit invalide',
          code: 'INVALID_PRODUCT_ID'
      });
  }

  const product = await Product.findById(productId);
  if (!product) {
      return res.status(404).json({
          success: false,
          message: 'Produit non trouvé',
          code: 'PRODUCT_NOT_FOUND'
      });
  }

  // 4. Validation des Types
  // CORRECTION: Ajout de 'inventaire' et 'ajustement' comme dans le schéma Mongoose
  const validTypes = ['entrée', 'sortie', 'inventaire', 'perte', 'ajustement']; 
  if (!validTypes.includes(type)) {
      return res.status(400).json({
          success: false,
          message: `Type invalide. Doit être: ${validTypes.join(', ')}`,
          code: 'INVALID_TYPE'
      });
  }

  // 5. Validation de la Quantité
  const validatedQuantity = parseFloat(quantity);
  if (validatedQuantity <= 0 || isNaN(validatedQuantity)) {
      return res.status(400).json({
          success: false,
          message: 'La quantité doit être un nombre positif',
          code: 'INVALID_QUANTITY'
      });
  }

  // 6. Gestion du Stock
  let newStock = product.stock;
  if (type === 'entrée') {
      newStock += validatedQuantity;
  } else if (['sortie', 'perte', 'ajustement'].includes(type)) { // Inclure 'ajustement' dans les baisses de stock
      newStock -= validatedQuantity;
      if (newStock < 0) {
          return res.status(400).json({
              success: false,
              message: `Stock insuffisant. Stock actuel: ${product.stock}, Quantité demandée: ${validatedQuantity}`,
              code: 'INSUFFICIENT_STOCK'
          });
      }
  } else if (type === 'inventaire') {
      // Logique spécifique pour les inventaires complets (peut nécessiter plus de contexte)
      // Pour l'instant, on laisse le stock géré par les entrées/sorties ou un ajustement
  }
  
  const finalUnitCost = unitCost || product.purchaseCost || 0;

  // 7. Création de l'Entrée
  const inventoryEntry = new InventoryEntry({
      product: productId,
      establishment, // ✅ ID de l'établissement corrigé
      type,
      quantity: validatedQuantity,
      unitCost: finalUnitCost,
      totalCost: finalUnitCost * validatedQuantity,
      reason,
      notes,
      date: date ? new Date(date) : new Date(),
      recordedBy,
      supplierId: supplierId || undefined,
      lossDetails: lossDetails || undefined,
      reference: reference || undefined
  });
  try {
    await inventoryEntry.save();
    
    // Mise à jour du stock du produit
    await Product.findByIdAndUpdate(productId, { stock: newStock });

    // Mise à jour des stats agrégées
    const updatedProduct = await Product.findById(productId);
    await updateInventoryStats(updatedProduct, establishment, inventoryEntry);
    
    const populatedEntry = await InventoryEntry.findById(inventoryEntry._id)
      .populate('product', 'name category image')
      .populate('recordedBy', 'fullName')
      .populate('supplierId', 'name');

    res.status(201).json({
      success: true,
      message: 'Entrée d\'inventaire enregistrée avec succès',
      entry: populatedEntry,
      newStock
    });
  } catch (error) {
    console.error('Erreur sauvegarde entrée:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde de l\'entrée',
      error: error.message
    });
  }
});
// Générer rapport PDF
export const generateInventoryReport = async (req, res) => {
  try {
    const { establishmentId, type, startDate, endDate } = req.body;
    const establishment = establishmentId || req.user.establishment;

    // Ici vous intégrerez une librairie PDF comme pdfkit ou puppeteer
    // Pour l'instant, retournons les données structurées
    let data;
    
    if (type === 'weekly') {
      const weeklyData = await getWeeklyInventoryData(establishment, startDate, endDate);
      data = weeklyData;
    } else if (type === 'monthly') {
      const monthlyData = await getMonthlyInventoryData(establishment, startDate, endDate);
      data = monthlyData;
    } else {
      const profitData = await getProfitData(establishment, startDate, endDate);
      data = profitData;
    }

    res.json({
      success: true,
      message: 'Rapport généré avec succès',
      data,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    res.status(500).json({ message: 'Erreur génération rapport' });
  }
};
// Fonctions helpers pour la génération de rapport
async function getWeeklyInventoryData(establishment, startDate, endDate) {
  // Implémentation pour les données hebdomadaires
  return await Inventory.find({
    establishment,
    period: 'weekly',
    periodDate: { 
      $gte: new Date(startDate), 
      $lte: new Date(endDate) 
    }
  }).populate('product', 'name category');
}

async function getMonthlyInventoryData(establishment, startDate, endDate) {
  // Implémentation pour les données mensuelles
  return await Inventory.find({
    establishment,
    period: 'monthly',
    periodDate: { 
      $gte: new Date(startDate), 
      $lte: new Date(endDate) 
    }
  }).populate('product', 'name category');
}

async function getProfitData(establishment, startDate, endDate) {
  // Implémentation pour les données de bénéfices
  return await ProductProfit.find({
    establishment,
    periodDate: { 
      $gte: new Date(startDate), 
      $lte: new Date(endDate) 
    }
  }).populate('product', 'name category');
}

// Mise à jour automatique de l'inventaire (à appeler après chaque commande)
export const updateInventoryFromOrder = async (orderId) => {
  try {
    const order = await Order.findById(orderId)
      .populate('items.product')
      .populate('establishment');

    if (!order || order.status !== 'completed') return;

    // ... (date calculations unchanged)

    for (const item of order.items) {
      const product = item.product;
      
      // Mise à jour inventaire hebdomadaire
      await updateWeeklyInventory(product, order.establishment, item);
      
      // Mise à jour inventaire mensuel
      await updateMonthlyInventory(product, order.establishment, item);
      
      // Mise à jour bénéfices (daily)
      await updateProductProfit(product, order.establishment, item, new Date());
    }
  } catch (error) {
    console.error('Erreur mise à jour inventaire commande:', error);
  }
};

async function updateWeeklyInventory(product, establishment, orderItem) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  await Inventory.findOneAndUpdate(
    {
      product: product._id,
      establishment: establishment._id,
      period: 'weekly',
      periodDate: weekStart
    },
    {
      $inc: {
        sales: orderItem.quantity,
        exits: orderItem.quantity, // Sale is also an exit
        totalRevenue: orderItem.quantity * orderItem.unitPrice,
        profit: (orderItem.quantity * orderItem.unitPrice) - (orderItem.quantity * product.purchaseCost)
      },
      $set: {
        // NOTE: product.currentStock is likely stale here if called after a sale, 
        // better to re-fetch the product or rely on nightly sync for stock accuracy in reports
        currentStock: product.stock, 
        sellingPrice: orderItem.unitPrice,
        purchaseCost: product.purchaseCost
      }
    },
    { upsert: true, new: true }
  );
}

async function updateMonthlyInventory(product, establishment, orderItem) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  await Inventory.findOneAndUpdate(
    {
      product: product._id,
      establishment: establishment._id,
      period: 'monthly',
      periodDate: monthStart
    },
    {
      $inc: {
        sales: orderItem.quantity,
        exits: orderItem.quantity,
        totalRevenue: orderItem.quantity * orderItem.unitPrice,
        profit: (orderItem.quantity * orderItem.unitPrice) - (orderItem.quantity * product.purchaseCost)
      },
      $set: {
        currentStock: product.stock,
        sellingPrice: orderItem.unitPrice,
        purchaseCost: product.purchaseCost
      }
    },
    { upsert: true, new: true }
  );
}

async function updateProductProfit(product, establishment, orderItem, date) {
  const dailyStart = new Date(date);
  dailyStart.setHours(0, 0, 0, 0);

  const profit = (orderItem.quantity * orderItem.unitPrice) - 
                 (orderItem.quantity * product.purchaseCost) - 
                 (orderItem.quantity * product.preparationCost);
  
  const margin = orderItem.unitPrice > 0 ? 
                 (profit / (orderItem.quantity * orderItem.unitPrice)) * 100 : 0;

  await ProductProfit.findOneAndUpdate(
    {
      product: product._id,
      establishment: establishment._id,
      period: 'daily',
      periodDate: dailyStart
    },
    {
      $inc: {
        quantitySold: orderItem.quantity,
        totalRevenue: orderItem.quantity * orderItem.unitPrice,
        totalCost: (orderItem.quantity * product.purchaseCost) + (orderItem.quantity * product.preparationCost),
        profit: profit
      },
      $set: {
        sellingPrice: orderItem.unitPrice,
        purchaseCost: product.purchaseCost,
        preparationCost: product.preparationCost,
        margin: margin
      }
    },
    { upsert: true, new: true }
  );
}
// Obtenir l'historique des entrées d'inventaire
// Enhanced getInventoryEntries with better error handling
export const getInventoryEntries = asyncHandler(async (req, res) => {
  try {
    const { establishmentId, startDate, endDate, productId, type } = req.query;
    
    // More robust establishment validation
    const establishment = establishmentId || req.user?.establishment;
    if (!establishment) {
      return res.status(400).json({ 
        success: false,
        message: 'Établissement requis',
        code: 'ESTABLISHMENT_REQUIRED'
      });
    }

    // Validate establishment ID format if it's provided
    if (establishmentId && !mongoose.Types.ObjectId.isValid(establishmentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'établissement invalide',
        code: 'INVALID_ESTABLISHMENT_ID'
      });
    }

    const filter = { establishment };
    
    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: new Date(startDate),
        $lte: end
      };
    }
    
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de produit invalide',
          code: 'INVALID_PRODUCT_ID'
        });
      }
      filter.product = productId;
    }
    
    if (type) filter.type = type;

    const entries = await InventoryEntry.find(filter)
      .populate('product', 'name category image unitPrice')
      .populate('recordedBy', 'fullName')
      .sort({ date: -1, createdAt: -1 });

    const totals = {
      totalEntries: entries.filter(e => e.type === 'entrée').reduce((sum, e) => sum + e.quantity, 0),
      totalExits: entries.filter(e => e.type === 'sortie').reduce((sum, e) => sum + e.quantity, 0),
      totalLosses: entries.filter(e => e.type === 'perte').reduce((sum, e) => sum + e.quantity, 0),
      totalCost: entries.reduce((sum, e) => sum + e.totalCost, 0)
    };

    res.json({
      success: true,
      entries,
      totals,
      period: { startDate, endDate }
    });
    
  } catch (error) {
    console.error('Erreur détaillée récupération entrées inventaire:', error);
    
    // More specific error response
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des entrées',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: 'SERVER_ERROR'
    });
  }
});
// Mettre à jour une entrée d'inventaire
export const updateInventoryEntry = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
  
      const entry = await InventoryEntry.findById(id);
      if (!entry) {
        return res.status(404).json({ message: 'Entrée non trouvée' });
      }
  
      // Vérifier les permissions
      if (entry.recordedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Non autorisé à modifier cette entrée' });
      }

      // --- STOCK UPDATE LOGIC ---
      const product = await Product.findById(entry.product);
      let oldStock = product.stock;
      
      // 1. Annuler l'ancien impact sur le stock
      if (entry.type === 'entrée') {
        oldStock -= entry.quantity;
      } else if (['sortie', 'perte'].includes(entry.type)) {
        oldStock += entry.quantity;
      }
      
      // Determine new type and quantity from updateData or fallback to existing entry
      const newType = updateData.type || entry.type;
      const newQuantity = updateData.quantity !== undefined ? parseFloat(updateData.quantity) : entry.quantity;
      
      // 2. Appliquer le nouvel impact sur le stock
      let newStock = oldStock; // Start from stock without old impact
      if (newType === 'entrée') {
        newStock += newQuantity;
      } else if (['sortie', 'perte'].includes(newType)) {
        newStock -= newQuantity;
      }
      
      if (newStock < 0) {
        return res.status(400).json({ message: 'La mise à jour entraînerait un stock négatif.' });
      }
      
      // 3. Mise à jour de l'entrée et du produit
      await Product.findByIdAndUpdate(entry.product, { stock: newStock });
  
      if (updateData.quantity && updateData.unitCost) {
        updateData.totalCost = updateData.quantity * updateData.unitCost;
      }
      // If only quantity is updated, recalculate totalCost based on old unitCost
      if (updateData.quantity !== undefined && updateData.unitCost === undefined) {
          updateData.totalCost = newQuantity * (updateData.unitCost || entry.unitCost);
      }
  
      const updatedEntry = await InventoryEntry.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('product', 'name category image')
       .populate('recordedBy', 'fullName');

      // 4. NOTE IMPORTANTE:
      // Les agrégations (Inventaire Hebdo/Mensuel et ProductProfit) ne sont PAS mises à jour
      // automatiquement ici. Une correction robuste nécessiterait d'annuler l'ancien impact
      // d'agrégation et d'appliquer le nouveau, ce qui est très complexe. 
      // Il est recommandé d'exécuter un job d'agrégation quotidien/hebdomadaire 
      // basé sur l'historique complet des InventoryEntry.
      
      res.json({
        message: 'Entrée mise à jour avec succès',
        entry: updatedEntry,
        newStock: newStock
      });
    } catch (error) {
      console.error('Erreur mise à jour entrée inventaire:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  };

// Supprimer une entrée d'inventaire
export const deleteInventoryEntry = async (req, res) => {
    try {
      const { id } = req.params;
  
      const entry = await InventoryEntry.findById(id);
      if (!entry) {
        return res.status(404).json({ message: 'Entrée non trouvée' });
      }
  
      // Vérifier les permissions
      if (entry.recordedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Non autorisé à supprimer cette entrée' });
      }
  
      // Annuler l'impact sur le stock
      const product = await Product.findById(entry.product);
      let newStock = product.stock;
      
      if (entry.type === 'entrée') {
        newStock -= entry.quantity;
      } else if (['sortie', 'perte'].includes(entry.type)) {
        newStock += entry.quantity;
      }

      if (newStock < 0) {
        // Should not happen unless there was a subsequent negative entry, but good guardrail
        console.warn(`Tentative de suppression de l'entrée ${id} résulterait en un stock négatif, ajustement à zéro.`);
        newStock = 0; 
      }
  
      await Product.findByIdAndUpdate(entry.product, { stock: newStock });
      await InventoryEntry.findByIdAndDelete(id);

      // NOTE IMPORTANTE: Voir commentaire dans updateInventoryEntry concernant l'agrégation.
  
      res.json({
        message: 'Entrée supprimée avec succès',
        newStock
      });
    } catch (error) {
      console.error('Erreur suppression entrée inventaire:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  };

// Obtenir le stock actuel avec alertes
export const getCurrentStock = async (req, res) => {
    try {
      const { establishmentId } = req.query;
      const establishment = establishmentId || req.user.establishment;
  
      if (!establishment) {
        return res.status(400).json({ message: 'Établissement requis' });
      }
  
      const products = await Product.find({ establishment })
        .select('name category stock lowStockThreshold unitPrice purchaseCost image')
        .sort({ stock: 1 });
  
      const stockSummary = {
        totalProducts: products.length,
        lowStockProducts: products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
        outOfStockProducts: products.filter(p => p.stock === 0).length,
        totalStockValue: products.reduce((sum, p) => sum + (p.stock * (p.purchaseCost || 0)), 0),
        products: products.map(p => ({
          ...p.toObject(),
          status: p.stock === 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'normal'
        }))
      };
  
      res.json(stockSummary);
    } catch (error) {
      console.error('Erreur récupération stock actuel:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  };
