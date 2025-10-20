
import express from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addProductToSupplier,
  updateSupplierProduct,
  removeSupplierProduct,
  getSupplierProducts,
  searchSuppliersByProduct,
  
  // Données de base
  getUnits,
  getSupplierCategories,
  getLocationData,
  getBaseProducts,
  addUnit,
  addCategory,
  addBaseProduct,
  updateBaseProduct,
  removeBaseProduct,
  addCountry,
  addCity,
  addCommune,
} from '../controllers/supplierController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ============================================================================
// 1. DONNÉES DE BASE (ROUTES DE LECTURE PUBLIQUES)
// Ces routes sont généralement consultables même sans être connecté
// ============================================================================

// Utilisation d'un préfixe pour isoler les utilitaires
const baseDataRouter = express.Router(); 
baseDataRouter.get('/base-products', getBaseProducts); 
baseDataRouter.get('/units', getUnits); 
baseDataRouter.get('/categories', getSupplierCategories); 
baseDataRouter.get('/locations', getLocationData);

// Appliquer les routes de données de base sous un préfixe
// ⚠️ Si votre routeur est monté sur '/api/suppliers', ces routes seront
// accessibles via /api/suppliers/base-products, etc.
router.use('/', baseDataRouter); 

// ============================================================================
// 2. MIDDLEWARE D'AUTHENTIFICATION (APPLIQUÉ AUX ACTIONS SENSIBLES)
// ============================================================================

router.use(protect); // 👈 Le 'protect' est appliqué à partir de ce point

// ============================================================================
// 3. FOURNISSEURS (TOUTES CES ROUTES NÉCESSITENT L'AUTH)
// ============================================================================
router.get('/', getSuppliers); // 👈 Maintenant protégée !
router.get('/:id', getSupplier);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

// Recherche
router.get('/search/products', searchSuppliersByProduct);

// Produits liés à un fournisseur
router.get('/:id/products', getSupplierProducts);
router.post('/:id/products', addProductToSupplier);
router.put('/:id/products/:productId', updateSupplierProduct);
router.delete('/:id/products/:productId', removeSupplierProduct);

// ============================================================================
// 4. DONNÉES DE BASE (ROUTES D'ÉCRITURE PROTÉGÉES)
// ============================================================================

// Produits de base (Écriture)
router.post('/base-products', addBaseProduct);
router.put('/base-products/:id', updateBaseProduct);
router.delete('/base-products/:id', removeBaseProduct);

// Unités (Écriture)
router.post('/units', addUnit);

// Catégories (Écriture)
router.post('/categories', addCategory);

// Localisations (Écriture)
router.post('/locations/countries', addCountry);
router.post('/locations/cities', addCity);
router.post('/locations/communes', addCommune);

export default router;