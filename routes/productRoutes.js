
import express from 'express';
import {
    createProduct,
    getProductsByEstablishment,
    getProductById,
    updateProduct,
    deleteProduct,
    updateProductStock,
    getCategoriesByEstablishment,
    createCategory,
    getDailyPurchases
} from '../controllers/productController.js';
import { protect, manager } from '../middlewares/authMiddleware.js';
import upload from '../config/multerConfig.js';
import { validateProduct } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Routes pour les PRODUITS
router.route('/')
    .post(protect, manager, upload.single('image'), validateProduct, createProduct)
    .get(protect, manager, getProductsByEstablishment);

router.route('/:id')
    .get(protect, manager, getProductById)
    .put(protect, manager, upload.single('image'), updateProduct)
    .delete(protect, manager, deleteProduct);

router.route('/:id/stock')
    .patch(protect, manager, updateProductStock);

// Routes pour les CATÉGORIES
router.route('/categories')
    .get(protect, manager, getCategoriesByEstablishment)
    .post(protect, manager, createCategory);

// Route pour les ACHATS DU JOUR
router.route('/stats/daily-purchases')
    .get(protect, manager, getDailyPurchases);

export default router;