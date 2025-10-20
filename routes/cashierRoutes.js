
// import express from 'express';
// import {
//     createOrder,
//     getActiveOrders,
//     updateOrderStatus,
//     getDailySummary,
//     startShift,
//     endShift,
//     getCashierStatus,
//     getCompletedOrders,
//     getActiveCashier,
//     startBreak,
//     endBreak,
//     updateOwnLastSeen,
//     getPendingOrders 
// } from '../controllers/cashierController.js';

// import { authenticate, checkRole } from '../middlewares/authMiddleware.js';
// import { checkCashierPermissions } from '../middlewares/permissionMiddleware.js';

// const router = express.Router();

// // Middleware appliqués à toutes les routes
// router.use(authenticate());
// router.use(checkRole('cashier'));

// // Routes qui ne nécessitent PAS que le caissier soit déjà de service
// router.post('/start-shift', startShift);
// router.post('/end-shift', endShift);
// router.get('/status', getCashierStatus);
// router.get('/active', getActiveCashier);
// router.get('/completed', getCompletedOrders);
// router.get('/daily-summary', getDailySummary);
// router.post('/start-break', checkCashierPermissions, startBreak);
// router.post('/end-break', checkCashierPermissions, endBreak);
// router.get('/pending-orders', checkCashierPermissions, getPendingOrders); // Nouvelle route
// router.patch('/last-seen', updateOwnLastSeen);
// // Routes qui nécessitent que le caissier soit actif
// router.route('/orders')
//     .post(checkCashierPermissions, createOrder)
//     .get(checkCashierPermissions, getActiveOrders);

// router.patch('/orders/:id/status', checkCashierPermissions, updateOrderStatus);

// export default router;





import express from 'express';
import {
    createOrder,
    getActiveOrders,
    updateOrderStatus,
    getDailySummary,
    startShift,
    endShift,
    getCashierStatus,
    getCompletedOrders,
    getActiveCashier,
    startBreak,
    endBreak,
    updateOwnLastSeen,
    getPendingOrders 
} from '../controllers/cashierController.js';

import { authenticate, checkRole, cashier } from '../middlewares/authMiddleware.js'; // AJOUTER cashier
import { checkCashierPermissions } from '../middlewares/permissionMiddleware.js';

const router = express.Router();

router.use(managerOrCashier);
// Routes qui ne nécessitent PAS que le caissier soit déjà de service
router.post('/start-shift', startShift);
router.post('/end-shift', endShift);
router.get('/status', getCashierStatus);
router.get('/active', getActiveCashier);
router.get('/completed', getCompletedOrders);
router.get('/daily-summary', getDailySummary);
router.post('/start-break', checkCashierPermissions, startBreak);
router.post('/end-break', checkCashierPermissions, endBreak);
router.get('/pending-orders', checkCashierPermissions, getPendingOrders);
router.patch('/last-seen', updateOwnLastSeen);

// Routes qui nécessitent que le caissier soit actif
router.route('/orders')
    .post(checkCashierPermissions, createOrder)
    .get(checkCashierPermissions, getActiveOrders);

router.patch('/orders/:id/status', checkCashierPermissions, updateOrderStatus);

export default router;