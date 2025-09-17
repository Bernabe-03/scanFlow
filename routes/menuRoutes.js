import express from 'express';
import {
    getMenuByEstablishmentId,
    createMenu,
    updateMenuName,
    addCategoryToMenu,
    updateCategoryInMenu,
    deleteCategoryFromMenu,
    linkProductToCategory,
    unlinkProductFromCategory,
    addProductToCategory,
    updateProduct,
    deleteProduct,
    getPublicMenu
} from '../controllers/menuController.js';

import { protect, manager } from '../middlewares/authMiddleware.js';
import upload from '../config/multerConfig.js';

const router = express.Router();

// --- ROUTES POUR LA GESTION DU MENU (MANAGER) ---

// Création du menu
router.post('/', protect, manager, createMenu);

// Obtenir un menu par ID d'établissement
router.get('/by-establishment/:establishmentId', protect, manager, getMenuByEstablishmentId);

// Mettre à jour le nom du menu
router.put('/:id', protect, manager, updateMenuName);

// Routes pour les catégories
router.route('/categories')
    .post(protect, manager, addCategoryToMenu); // Ajouter une catégorie

router.route('/categories/:categoryId')
    .put(protect, manager, updateCategoryInMenu) // Mettre à jour une catégorie
    .delete(protect, manager, deleteCategoryFromMenu); // Supprimer une catégorie

// Routes pour les produits
router.route('/categories/:categoryId/products')
    .post(protect, manager, addProductToCategory); // Ajouter un produit à une catégorie

router.route('/products/:productId')
    .put(protect, manager, upload.single('image'), updateProduct) // Mettre à jour un produit du menu
    .delete(protect, manager, deleteProduct); // Supprimer un produit du menu

// Routes pour lier/délier des produits aux catégories
router.post('/categories/:categoryId/link-product', protect, manager, linkProductToCategory);
router.delete('/unlink-product/:categoryId/:productId', protect, manager, unlinkProductFromCategory);

// --- ROUTES POUR LE MENU PUBLIC (CLIENT) ---
router.get('/public/:code', getPublicMenu);

export default router;