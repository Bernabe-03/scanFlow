import express from 'express';
import {
  getEstablishmentDetails,
  updateEstablishment,
  assignMenuToEstablishment
} from '../controllers/establishmentController.js';
import { authenticate, establishmentAccess } from '../middlewares/authMiddleware.js';
import { cleanIds, validateEstablishmentId } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// 🔥 CORRECTION : Appliquer le middleware de nettoyage en PREMIER
router.use(cleanIds);

// Authentification requise pour toutes les routes
router.use(authenticate());

// ✅ CORRECTION : Utiliser le middleware spécialisé pour les établissements
router.param('id', validateEstablishmentId);

// Routes
router.post('/assign-menu', establishmentAccess, assignMenuToEstablishment);
router.get('/:id', establishmentAccess, getEstablishmentDetails);
router.put('/:id', establishmentAccess, updateEstablishment);

export default router;