
// import express from 'express';
// import {
//   getWeeklyInventory,
//   getMonthlyInventory,
//   getProductProfits,
//   generateInventoryReport,
//   createInventoryEntry,
//   getInventoryEntries,
//   updateInventoryEntry,
//   deleteInventoryEntry,
//   getCurrentStock,
//   syncSalesWithInventory,
//   getLossAnalysis,
//   getInventoryStatistics
// } from '../controllers/inventoryController.js';
// import { protect, manager } from '../middlewares/authMiddleware.js';
// const router = express.Router();

// router.use(protect);
// router.use(manager);

// // Routes CRUD pour les entrées
// router.route('/entries')
//   .post(createInventoryEntry)
//   .get(getInventoryEntries);

// router.route('/entries/:id')
//   .put(updateInventoryEntry)
//   .delete(deleteInventoryEntry);

// // Routes d'analyse
// router.get('/weekly', getWeeklyInventory);
// router.get('/monthly', getMonthlyInventory);
// router.get('/profits', getProductProfits);
// router.get('/loss-analysis', getLossAnalysis); 
// router.get('/statistics/advanced', getInventoryStatistics);

// // Gestion du stock
// router.get('/stock/current', getCurrentStock);

// // Synchronisation et rapports
// router.post('/reports/generate', generateInventoryReport);
// router.post('/sync/sales', syncSalesWithInventory);

// // Health check
// router.get('/health', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     timestamp: new Date().toISOString(),
//     service: 'Inventory API'
//   });
// });

// export default router;



// routes/inventoryRoutes.js

import express from 'express';
import {
    getWeeklyInventory,
    getMonthlyInventory,
    getProductProfits,
    generateInventoryReport,
    createInventoryEntry,
    getInventoryEntries,
    updateInventoryEntry,
    deleteInventoryEntry,
    getCurrentStock,
    syncSalesWithInventory,
    getLossAnalysis,
    getInventoryStatistics
} from '../controllers/inventoryController.js';
import { protect, manager } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.use(protect);
router.use(manager);

// Routes CRUD pour les entrées
// Le POST pour la création utilise l'URL /api/inventory/entries (CORRECT)
router.route('/entries')
    .post(createInventoryEntry)
    .get(getInventoryEntries);

router.route('/entries/:id')
    .put(updateInventoryEntry)
    .delete(deleteInventoryEntry);

// Routes d'analyse
router.get('/weekly', getWeeklyInventory);
router.get('/monthly', getMonthlyInventory);
router.get('/profits', getProductProfits);
router.get('/loss-analysis', getLossAnalysis); 
router.get('/statistics/advanced', getInventoryStatistics);

// Gestion du stock
router.get('/stock/current', getCurrentStock);

// Synchronisation et rapports
router.post('/reports/generate', generateInventoryReport);
router.post('/sync/sales', syncSalesWithInventory);

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Inventory API'
    });
});

export default router;