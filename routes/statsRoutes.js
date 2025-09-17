import express from 'express';
import { 
  getSalesStats, 
  getStockAlerts,
  getAdminStats,
} from '../controllers/statsController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
const router = express.Router();
// Correction : Middleware unique
router.use(authenticate(['admin', 'manager']));

// Statistiques de vente (pour manager)
router.get('/sales', getSalesStats);
// Alertes de stock (pour manager)
router.get('/stock-alerts', getStockAlerts);

// Statistiques admin
router.get('/admin', getAdminStats);
export default router;