
import express from 'express';
import {
    getCashiers,
    createCashier,
    updateCashier,
    deleteCashier,
    toggleCashierStatus,
    startCashierShift,
    endCashierShift,
    getDisconnectedCashiers,
    updateLastSeen,
    getDashboardStats
} from '../controllers/managerController.js';

import {
    getProductsByEstablishment,
    getProductById,
    createProduct,
    updateProductStock,
    getCategoriesByEstablishment,
    createCategory,
    getDailyPurchases
} from '../controllers/productController.js';

import { authenticate, checkRole } from '../middlewares/authMiddleware.js';
import { checkManagerPermissions } from '../middlewares/permissionMiddleware.js';
import upload from '../config/multerConfig.js';

const router = express.Router();

// Middlewares d'authentification et de permissions
router.use(authenticate());
router.use(checkRole('manager'));
router.use(checkManagerPermissions);

// Routes pour le tableau de bord et les statistiques
router.get('/dashboard', getDashboardStats);
router.get('/stats/daily-purchases', getDailyPurchases);

// Routes pour les caissiers
router.get('/cashiers', getCashiers);
router.post('/cashiers', createCashier);
router.put('/cashiers/:id', updateCashier);
router.delete('/cashiers/:id', deleteCashier);
router.patch('/cashiers/:id/status', toggleCashierStatus);

router.post('/cashiers/start-shift', startCashierShift);
router.post('/cashiers/end-shift', endCashierShift);

router.get('/cashiers/disconnected', getDisconnectedCashiers);
router.put('/cashiers/:id/last-seen', updateLastSeen);

// Routes pour les produits (gestion du stock)
router.route('/products')
    .get(getProductsByEstablishment)
    .post(upload.single('image'), createProduct);

router.route('/products/:id')
    .get(getProductById);

router.patch('/products/:id/stock', updateProductStock);

// Routes pour les catégories
router.route('/categories')
    .get(getCategoriesByEstablishment)
    .post(createCategory);

export default router;