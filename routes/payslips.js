import express from 'express';
import {
  getPayslips,
  getEmployeePayslips,
  createPayslip,
  getPayslip,
  updatePayslip,
  deletePayslip,
  downloadPayslipPDF
} from '../controllers/payslipController.js';
import { protect, manager } from '../middlewares/authMiddleware.js'; // ✅ Corrigé ici

const router = express.Router();

// ✅ Applique le middleware de protection
router.use(protect);

// ✅ Routes
router.get('/', manager, getPayslips);
router.get('/employee/:employeeId', getEmployeePayslips);
router.post('/', manager, createPayslip);
router.get('/:id', getPayslip);
router.put('/:id', manager, updatePayslip);
router.delete('/:id', manager, deletePayslip);
router.get('/:id/download', downloadPayslipPDF);

export default router;
