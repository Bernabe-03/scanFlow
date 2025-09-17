
import express from 'express';
import { 
  getPublicMenu,
  createPublicOrder,
  getOrderDetails,
  cancelOrder
} from '../controllers/publicController.js';

const router = express.Router();

router.get('/menu/:code', getPublicMenu);
router.post('/orders', createPublicOrder);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/cancel', cancelOrder);

export default router;






