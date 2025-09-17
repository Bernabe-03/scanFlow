
import express from 'express';
import {
  generateQrCode,
  getQrCodeForEstablishment
} from '../controllers/qrController.js';
import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

// Créer une instance de router express
const router = express.Router();

// Route pour générer un QR code (accessible par les Manager/Admin)
router.post('/generate',
  authenticate(), 
  checkRole(['manager', 'admin']),
  generateQrCode
);

// Route pour obtenir un QR code spécifique par ID d'établissement (accessible publiquement)
router.get('/:establishmentId', getQrCodeForEstablishment);

// Exportation du router
export default router;