import express from 'express';
import { 
  getPublicMenu,
  createPublicOrder,
  cancelOrder
} from '../controllers/publicController.js';
// ✅ Importer depuis le bon contrôleur
import { getPublicOrderTracking } from '../controllers/orderController.js';
const router = express.Router();
// Menu public
router.get('/menu/:code', getPublicMenu);
// Commandes publiques
router.post('/orders', createPublicOrder);
// ✅ Suivi public d'une commande - CORRIGÉ
router.get('/orders/tracking/:orderId', getPublicOrderTracking);
// Annulation de commande publique
router.patch('/orders/:id/cancel', cancelOrder);
export default router;