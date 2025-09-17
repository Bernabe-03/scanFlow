
import express from 'express';
import {
  getEstablishmentDetails,
  updateEstablishment,
  assignMenuToEstablishment
} from '../controllers/establishmentController.js';
import { authenticate, establishmentAccess } from '../middlewares/authMiddleware.js';
import { cleanIds, validateObjectId } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Appliquer le middleware de nettoyage des IDs à toutes les routes
router.use(cleanIds);

// Authentification requise pour toutes les routes
router.use(authenticate());

// Middleware de validation des IDs pour les routes avec paramètre :id
router.param('id', validateObjectId);

// Routes
router.post('/assign-menu', establishmentAccess, assignMenuToEstablishment);
router.get('/:id', establishmentAccess, getEstablishmentDetails);
router.put('/:id', establishmentAccess, updateEstablishment);

export default router;