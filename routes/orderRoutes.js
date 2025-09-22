import express from 'express';
import {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrderById,
  getDailyPurchases,
  getPublicOrderTracking,
  getOrderStats,
  assignCashierToOrder
} from '../controllers/orderController.js';
import { protect, manager, managerAndCashier } from '../middlewares/authMiddleware.js';
import { validateObjectId } from '../middlewares/validationMiddleware.js';

const router = express.Router();

router.patch('/:id/status', validateObjectId, protect, updateOrderStatus);

router.route('/')
  .get(protect, managerAndCashier, getOrders)
  .post(protect, manager, createOrder);

router.get('/stats', protect, managerAndCashier, getOrderStats);

router.get('/public/tracking/:orderId', getPublicOrderTracking);
router.post('/public', createPublicOrder);
router.route('/daily-purchases')
  .get(protect, manager, getDailyPurchases);

router.patch('/:id/assign-cashier', protect, assignCashierToOrder);

router.route('/:id')
  .get(protect, manager, getOrderById)
  .put(protect, manager, updateOrderStatus);

export default router;