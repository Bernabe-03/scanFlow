// import express from 'express';
// import {
//   calculateExpenses,
//   createExpense,
//   getExpenses,
//   updateExpense,
//   deleteExpense,
//   getExpenseStats
// } from '../controllers/expenseController.js';
// import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// // Toutes les routes nécessitent une authentification
// router.use(authenticate());

// // Routes pour les dépenses
// router.post('/calculate', checkRole(['manager', 'admin']), calculateExpenses);
// router.post('/', checkRole(['manager', 'admin']), createExpense);
// router.get('/', checkRole(['manager', 'admin']), getExpenses);
// router.get('/stats', checkRole(['manager', 'admin']), getExpenseStats);
// router.put('/:id', checkRole(['manager', 'admin']), updateExpense);
// router.delete('/:id', checkRole(['manager', 'admin']), deleteExpense);

// export default router;





import express from 'express';
import {
  calculateExpenses,
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  // 💡 AJOUTER L'IMPORT DE LA NOUVELLE FONCTION DU CONTRÔLEUR
  calculateAndSaveExpense // Assurez-vous d'avoir exporté cette fonction dans expenseController.js
} from '../controllers/expenseController.js';
import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate());

// Routes pour les dépenses
router.post('/calculate', checkRole(['manager', 'admin']), calculateExpenses);

// 💡 AJOUTER LA ROUTE CALCULER ET SAUVEGARDER
router.post('/calculate-and-save', checkRole(['manager', 'admin']), calculateAndSaveExpense); 

router.post('/', checkRole(['manager', 'admin']), createExpense);
router.get('/', checkRole(['manager', 'admin']), getExpenses);
router.get('/stats', checkRole(['manager', 'admin']), getExpenseStats);
router.put('/:id', checkRole(['manager', 'admin']), updateExpense);
router.delete('/:id', checkRole(['manager', 'admin']), deleteExpense);

export default router;