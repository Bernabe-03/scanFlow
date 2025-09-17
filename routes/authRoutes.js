
import express from 'express';
import { 
  login, 
  logout, 
  createEstablishmentWithManager,
  createCashier 
} from '../controllers/authController.js';

const router = express.Router();

// Authentification
router.post('/login', login);
router.post('/logout', logout);

// Création d'établissement + manager (par admin)
router.post('/establishment-manager', createEstablishmentWithManager);

// Création de caissier (par manager)
router.post('/cashier', createCashier);

export default router;