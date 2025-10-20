import express from 'express';
import {
  getProcurements,
  getProcurementById,
  createProcurement,
  updateProcurement,
  deleteProcurement,
  updateProcurementStatus,
  getProcurementStats,
  getDeliveryTracking
} from '../controllers/procurementController.js';
import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate());

// ============================================================================
// ROUTES PRINCIPALES APPROVISIONNEMENT
// ============================================================================

// Routes de lecture
router.get('/', checkRole(['manager', 'admin']), getProcurements);
router.get('/stats', checkRole(['manager', 'admin']), getProcurementStats);
router.get('/deliveries', checkRole(['manager', 'admin']), getDeliveryTracking);
router.get('/:id', checkRole(['manager', 'admin']), getProcurementById);

// Routes d'écriture
router.post('/', checkRole(['manager', 'admin']), createProcurement);
router.put('/:id', checkRole(['manager', 'admin']), updateProcurement);
router.delete('/:id', checkRole(['manager', 'admin']), deleteProcurement);
router.patch('/:id/status', checkRole(['manager', 'admin']), updateProcurementStatus);

export default router;