import express from 'express';
import {
  getManagers,
  createManager,
  deleteManager,
  getEstablishments,
  createEstablishment,
  toggleEstablishmentStatus,
  deleteEstablishment,
  updateQrCode,
  getAdminDashboardStats,
  updateEstablishment,
  getEstablishmentDetails,
  deactivateEstablishment
} from '../controllers/adminController.js';
import { authenticate, admin } from '../middlewares/authMiddleware.js';
import asyncHandler from '../middlewares/asyncHandler.js';

const router = express.Router();

// Middleware combiné pour l'admin
const requireAdmin = [authenticate(['admin']), admin];

// Routes managers
router.get('/managers', requireAdmin, asyncHandler(getManagers));
router.post('/managers', requireAdmin, asyncHandler(createManager));
router.delete('/managers/:id', requireAdmin, asyncHandler(deleteManager));

// Routes établissements
router.get('/establishments', requireAdmin, asyncHandler(getEstablishments));
router.post('/establishments', requireAdmin, asyncHandler(createEstablishment));
router.get('/establishments/:id', requireAdmin, asyncHandler(getEstablishmentDetails));
router.put('/establishments/:id', requireAdmin, asyncHandler(updateEstablishment));
router.delete('/establishments/:id', requireAdmin, asyncHandler(deleteEstablishment));
router.put('/establishments/:id/qr', requireAdmin, asyncHandler(updateQrCode));
router.patch('/establishments/:id/status', requireAdmin, asyncHandler(toggleEstablishmentStatus));
router.patch('/establishments/:id/deactivate', requireAdmin, asyncHandler(deactivateEstablishment));
router.patch('/establishments/:id/status', requireAdmin, asyncHandler(toggleEstablishmentStatus));
// Dashboard
router.get('/dashboard/stats', requireAdmin, asyncHandler(getAdminDashboardStats));

export default router;