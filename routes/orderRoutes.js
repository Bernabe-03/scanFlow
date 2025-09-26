import express from 'express';
import {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrderById,
  getDailyPurchases,
  getOrderStats,
  assignCashierToOrder
  // SUPPRIMER getPublicOrderTracking d'ici
} from '../controllers/orderController.js';
import { protect, manager, managerAndCashier, admin } from '../middlewares/authMiddleware.js';
import { validateObjectId } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// --- ROUTES MANAGER / CASHIER ---
router.get('/', protect, managerAndCashier, getOrders);
router.post('/', protect, manager, createOrder);

// Gestion des commandes
router.patch('/:id/status', validateObjectId, protect, managerAndCashier, updateOrderStatus);
router.get('/:id', validateObjectId, protect, managerAndCashier, getOrderById);

// Stats
router.get('/stats', protect, managerAndCashier, getOrderStats);
router.get('/daily-purchases', protect, manager, getDailyPurchases);

// Assignation
router.patch('/:id/assign-cashier', protect, managerAndCashier, assignCashierToOrder);

// --- ADMIN ---
router.get('/admin/orders', protect, admin, getOrders);

export default router;