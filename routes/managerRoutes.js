
// import express from 'express';
// import {
//     getCashiers,
//     createCashier,
//     updateCashier,
//     deleteCashier,
//     toggleCashierStatus,
//     startCashierShift,
//     endCashierShift,
//     getDisconnectedCashiers,
//     updateLastSeen, 
//     getManagerEstablishment,
//     getDashboardStats
// } from '../controllers/managerController.js';

// import {
//     getProductsByEstablishment,
//     getProductById,
//     createProduct,
//     updateProductStock,
//     getCategoriesByEstablishment,
//     createCategory,
//     getDailyPurchases
// } from '../controllers/productController.js';
// import {
//     getEmployees,
//     getEmployee,
//     createEmployee,
//     updateEmployee,
//     toggleEmployeeStatus,
//     deleteEmployee,
//     generateEmployeeCardPdf
// } from '../controllers/employeeController.js';
// import { authenticate, checkRole } from '../middlewares/authMiddleware.js';
// import { checkManagerPermissions } from '../middlewares/permissionMiddleware.js';
// import upload from '../config/multerConfig.js';
// const router = express.Router();

// // Middlewares d'authentification et de permissions
// router.use(authenticate());
// router.use(checkRole('manager'));
// router.use(checkManagerPermissions);

// // Routes pour le tableau de bord et les statistiques
// router.get('/dashboard', getDashboardStats);
// router.get('/stats/daily-purchases', getDailyPurchases);

// // Routes pour les caissiers
// router.get('/cashiers', getCashiers);
// router.post('/cashiers', createCashier);
// router.put('/cashiers/:id', updateCashier);
// router.delete('/cashiers/:id', deleteCashier);
// router.patch('/cashiers/:id/status', toggleCashierStatus);

// router.post('/cashiers/start-shift', startCashierShift);
// router.post('/cashiers/end-shift', endCashierShift);

// router.get('/cashiers/disconnected', getDisconnectedCashiers);
// router.put('/cashiers/:id/last-seen', updateLastSeen);

// // Routes pour les employés
// router.get('/employees', getEmployees);
// router.get('/employees/:id', getEmployee);
// router.post('/employees', upload.single('photo'), createEmployee);
// router.put('/employees/:id', upload.single('photo'), updateEmployee);
// router.patch('/employees/:id/status', toggleEmployeeStatus);
// router.delete('/employees/:id', deleteEmployee);
// router.get('/employees/:id/card-pdf', generateEmployeeCardPdf);
// // ✅ Route pour obtenir l'établissement du manager
// router.get('/establishment', getManagerEstablishment);
// // Routes pour les produits (gestion du stock)
// router.route('/products')
//     .get(getProductsByEstablishment)
//     .post(upload.single('image'), createProduct);

// router.route('/products/:id')
//     .get(getProductById);

// router.patch('/products/:id/stock', updateProductStock);

// // Routes pour les catégories
// router.route('/categories')
//     .get(getCategoriesByEstablishment)
//     .post(createCategory);

// export default router;






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
    getManagerEstablishment,
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

import {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    deleteEmployee,
    generateEmployeeCardPdf
} from '../controllers/employeeController.js';

import { authenticate, checkRole } from '../middlewares/authMiddleware.js';
import { checkManagerPermissions } from '../middlewares/permissionMiddleware.js';
import upload from '../config/multerConfig.js';

const router = express.Router();

// ✅ Middlewares d'authentification et de permissions
router.use(authenticate());
router.use(checkRole('manager'));
router.use(checkManagerPermissions);

// ==================== Tableau de bord & stats ====================
router.get('/dashboard', getDashboardStats);
router.get('/stats/daily-purchases', getDailyPurchases);

// ==================== Caissiers ====================
router.get('/cashiers', getCashiers);
router.post('/cashiers', createCashier);
router.put('/cashiers/:id', updateCashier);
router.delete('/cashiers/:id', deleteCashier);
router.patch('/cashiers/:id/status', toggleCashierStatus);

router.post('/cashiers/start-shift', startCashierShift);
router.post('/cashiers/end-shift', endCashierShift);

router.get('/cashiers/disconnected', getDisconnectedCashiers);
router.put('/cashiers/:id/last-seen', updateLastSeen);

// ==================== Employés ====================
// ⚠️ On supprime multer ici : photo = URL envoyée depuis frontend
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployee);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.patch('/employees/:id/status', toggleEmployeeStatus);
router.delete('/employees/:id', deleteEmployee);
router.get('/employees/:id/card-pdf', generateEmployeeCardPdf);

// ✅ Route pour obtenir l'établissement du manager
router.get('/establishment', getManagerEstablishment);

// ==================== Produits ====================
router.route('/products')
    .get(getProductsByEstablishment)
    .post(upload.single('image'), createProduct); // ici on garde multer car produit = image directe

router.route('/products/:id')
    .get(getProductById);

router.patch('/products/:id/stock', updateProductStock);

// ==================== Catégories ====================
router.route('/categories')
    .get(getCategoriesByEstablishment)
    .post(createCategory);

export default router;
