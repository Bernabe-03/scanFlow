
import Supplier from '../models/Supplier.js';
import { validationResult } from 'express-validator';
import BaseProduct from '../models/BaseProduct.js';
import Category from '../models/Category.js';
import Unit from '../models/Unit.js';
import mongoose from 'mongoose'; 

// Helper pour formater les réponses
const formatResponse = (data, message = 'Succès', status = 'success', errors = null) => {
  const response = {
    status,
    message,
    // MODIFIE: Si data est nul ou indéfini, on renvoie un tableau vide pour la cohérence front-end
    data: Array.isArray(data) ? data : (data !== undefined && data !== null ? [data] : []),
    timestamp: new Date().toISOString()
  };
  if (errors) {
    response.errors = errors;
  }
  return response;
};

// Middleware de validation
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(formatResponse(null, 'Données invalides', 'error', errors.array()));
  }
  next();
};

const calculateStockStatus = (product) => {
    const currentStock = product.currentStock || 0;
    const requestedStock = product.requestedStock || 0;
    
    if (requestedStock > currentStock) {
      return 'insufficient';
    } else if (requestedStock < currentStock * 0.5) {
      return 'excess';
    }
    return 'adequate';
};

// ============================================================================
// FONCTIONS CONTRÔLEUR FOURNISSEURS (existantes et conservées)
// ============================================================================

// GET /api/suppliers
export const getSuppliers = async (req, res) => {
  try {
    const managerId = req.user._id; 
    
    if (!managerId) {
      return res.status(401).json(formatResponse(null, 'Manager non authentifié', 'error'));
    }

    const suppliers = await Supplier.find({ createdBy: managerId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(formatResponse(suppliers, 'Fournisseurs récupérés avec succès'));
  } catch (error) {
    console.error('Erreur getSuppliers:', error);
    res.status(500).json(formatResponse(null, 'Erreur serveur interne', 'error'));
  }
};

// GET /api/suppliers/:id
export const getSupplier = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;

    const supplier = await Supplier.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }
    
    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    res.json(formatResponse(supplier, 'Fournisseur récupéré avec succès'));
  } catch (error) {
    console.error('Erreur getSupplier:', error);
    res.status(500).json(formatResponse(null, 'Erreur serveur interne', 'error'));
  }
};

// POST /api/suppliers
export const createSupplier = async (req, res) => {
    try {
      const managerId = req.user._id;
      
      const {
        name, contact, email, phone, whatsapp, address,
        country, city, commune, deliveryTime, company,
        taxId, paymentTerms, currency, category, notes,
        products,
        establishment 
      } = req.body;
  
      const existingSupplier = await Supplier.findOne({ 
        email, 
        createdBy: managerId 
      });
      
      if (existingSupplier) {
        return res.status(400).json(formatResponse(null, 'Un fournisseur avec cet email existe déjà pour ce manager.', 'error'));
      }
  
      const supplierData = {
        name, contact, email, phone, whatsapp, address, country, city, commune, deliveryTime, company,
        taxId, paymentTerms, currency, category, notes,
        products: products ? products.map(product => ({
          ...product,
          requestedStock: product.requestedStock || 0,
          stockStatus: calculateStockStatus(product)
        })) : [],
        establishment: establishment, 
        createdBy: managerId,
        status: 'active' 
      };
  
      const supplier = new Supplier(supplierData);
      await supplier.save();
      await supplier.populate('createdBy', 'name email');
  
      res.status(201).json(formatResponse(supplier, 'Fournisseur créé avec succès'));
    } catch (error) {
      console.error('Erreur createSupplier:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message,
            kind: error.errors[key].kind
        }));
        return res.status(400).json(formatResponse(null, 'Données de validation Mongoose invalides', 'error', errors));
      }
      res.status(500).json(formatResponse(null, 'Erreur lors de la création du fournisseur', 'error'));
    }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }

    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    Object.keys(req.body).forEach(key => {
      if (key !== 'createdBy' && key !== '_id' && key !== 'establishment') {
        supplier[key] = req.body[key];
      }
    });

    await supplier.save();
    await supplier.populate('createdBy', 'name email');

    res.json(formatResponse(supplier, 'Fournisseur mis à jour avec succès'));
  } catch (error) {
    console.error('Erreur updateSupplier:', error);
    if (error.name === 'ValidationError') {
        const errors = Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message,
            kind: error.errors[key].kind
        }));
        return res.status(400).json(formatResponse(null, 'Données de validation Mongoose invalides', 'error', errors));
    }
    res.status(500).json(formatResponse(null, 'Erreur lors de la mise à jour du fournisseur', 'error'));
  }
};

// DELETE /api/suppliers/:id
export const deleteSupplier = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }

    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    await Supplier.findByIdAndDelete(req.params.id);

    res.json(formatResponse(null, 'Fournisseur supprimé avec succès'));
  } catch (error) {
    console.error('Erreur deleteSupplier:', error);
    let errorMessage = 'Erreur lors de la suppression du fournisseur'; // Utilisation de 'let' pour pouvoir réassigner
    if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
    }
    res.status(500).json(formatResponse(null, errorMessage, 'error'));
  }
};

// POST /api/suppliers/:id/products
export const addProductToSupplier = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;
    
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }

    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    const productData = {
      ...req.body,
      lastStockUpdate: new Date()
    };

    await supplier.addProduct(productData);
    await supplier.populate('createdBy', 'name email');

    res.status(201).json(formatResponse(supplier, 'Produit ajouté au fournisseur avec succès'));
  } catch (error) {
    console.error('Erreur addProductToSupplier:', error);
    res.status(500).json(formatResponse(null, "Erreur lors de l'ajout du produit", 'error'));
  }
};

// PUT /api/suppliers/:id/products/:productId
export const updateSupplierProduct = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }
    
    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    const updateData = {
      ...req.body,
      lastStockUpdate: new Date()
    };

    await supplier.updateProduct(req.params.productId, updateData);
    await supplier.populate('createdBy', 'name email');

    res.json(formatResponse(supplier, 'Produit mis à jour avec succès'));
  } catch (error) {
    console.error('Erreur updateSupplierProduct:', error);
    res.status(500).json(formatResponse(null, 'Erreur lors de la mise à jour du produit', 'error'));
  }
};

// DELETE /api/suppliers/:id/products/:productId
export const removeSupplierProduct = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;
    
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }

    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    await supplier.removeProduct(req.params.productId);
    await supplier.populate('createdBy', 'name email');

    res.json(formatResponse(supplier, 'Produit supprimé avec succès'));
  } catch (error) {
    console.error('Erreur removeSupplierProduct:', error);
    res.status(500).json(formatResponse(null, 'Erreur lors de la suppression du produit', 'error'));
  }
};

// GET /api/suppliers/search/products
export const searchSuppliersByProduct = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;
    const { productName } = req.query;

    if (!productName) {
      return res.status(400).json(formatResponse(null, 'Nom du produit requis', 'error'));
    }

    const suppliers = await Supplier.findByProductName(productName, managerId) 
      .populate('createdBy', 'name email');

    res.json(formatResponse(suppliers, 'Recherche effectuée avec succès'));
  } catch (error) {
    console.error('Erreur searchSuppliersByProduct:', error);
    res.status(500).json(formatResponse(null, 'Erreur lors de la recherche', 'error'));
  }
};

// GET /api/suppliers/:id/products
export const getSupplierProducts = async (req, res) => {
  // ... (code inchangé)
  try {
    const managerId = req.user._id;
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json(formatResponse(null, 'Fournisseur non trouvé', 'error'));
    }

    if (supplier.createdBy.toString() !== managerId.toString()) {
      return res.status(403).json(formatResponse(null, 'Accès non autorisé', 'error'));
    }

    res.json(formatResponse(supplier.products, 'Produits du fournisseur récupérés avec succès'));
  } catch (error) {
    console.error('Erreur getSupplierProducts:', error);
    res.status(500).json(formatResponse(null, 'Erreur lors de la récupération des produits', 'error'));
  }
};

// ============================================================================
// 🆕 NOUVEAUX CONTRÔLEURS POUR LES DONNÉES DE BASE (CORRECTION DES 404 FRONT-END)
// ============================================================================

// Dans getBaseProducts, vérifiez la structure des données
export const getBaseProducts = async (req, res) => {
    try {
      const managerId = req.user?._id; 
      
      const products = await BaseProduct.find({ 
        $or: [
          ...(managerId ? [{ createdBy: managerId }] : []), 
          { isActive: true }
        ]
      }).sort({ name: 1 });
      
      // S'assurer que chaque produit a un prix
      const productsWithPrice = products.map(product => ({
        ...product.toObject(),
        price: product.price || product.unitPrice || product.purchasePrice || 0
      }));
      
      res.json(formatResponse(productsWithPrice, 'Produits de base récupérés avec succès'));
    } catch (error) {
      console.error('Erreur getBaseProducts:', error);
      res.status(500).json(formatResponse(null, 'Erreur de récupération des produits de base', 'error'));
    }
};

// POST /api/base-products
export const addBaseProduct = async (req, res) => {
  try {
    const managerId = req.user._id;
    const { establishment } = req.user; // À adapter selon votre auth middleware
    
    const productData = {
      ...req.body,
      createdBy: managerId,
      establishment: establishment || req.body.establishment
    };

    const product = new BaseProduct(productData);
    await product.save();
    
    res.status(201).json(formatResponse(product, 'Produit de base créé avec succès'));
  } catch (error) {
    console.error('Erreur addBaseProduct:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json(formatResponse(null, 'Données invalides', 'error', errors));
    }
    
    if (error.code === 11000) {
      return res.status(400).json(formatResponse(null, 'Un produit avec ce nom existe déjà', 'error'));
    }
    
    res.status(500).json(formatResponse(null, 'Erreur lors de la création du produit de base', 'error'));
  }
};
// PUT /api/base-products/:id
export const updateBaseProduct = async (req, res) => {
  try {
    const managerId = req.user._id;
    const product = await BaseProduct.findOne({ 
      _id: req.params.id, 
      createdBy: managerId 
    });

    if (!product) {
      return res.status(404).json(formatResponse(null, 'Produit de base non trouvé', 'error'));
    }

    Object.keys(req.body).forEach(key => {
      if (key !== 'createdBy' && key !== '_id') {
        product[key] = req.body[key];
      }
    });

    await product.save();
    res.json(formatResponse(product, 'Produit de base mis à jour avec succès'));
  } catch (error) {
    console.error('Erreur updateBaseProduct:', error);
    res.status(500).json(formatResponse(null, 'Erreur lors de la mise à jour du produit de base', 'error'));
  }
};
// DELETE /api/base-products/:id
export const removeBaseProduct = async (req, res) => {
  try {
    const managerId = req.user._id;
    const product = await BaseProduct.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: managerId 
    });

    if (!product) {
      return res.status(404).json(formatResponse(null, 'Produit de base non trouvé', 'error'));
    }

    res.json(formatResponse(null, 'Produit de base supprimé avec succès'));
  } catch (error) {
    console.error('Erreur removeBaseProduct:', error);
    res.status(500).json(formatResponse(null, 'Erreur lors de la suppression du produit de base', 'error'));
  }
};

// GET /api/units
export const getUnits = async (req, res) => {
  try {
    const units = await Unit.find({}).sort({ name: 1 });
    res.json(formatResponse(units, 'Unités récupérées avec succès'));
  } catch (error) {
    console.error('Erreur getUnits:', error);
    res.status(500).json(formatResponse(null, 'Erreur de récupération des unités', 'error'));
  }
};

// POST /api/units
export const addUnit = async (req, res) => {
    try {
      const { name } = req.body;
      
      // 1. Vérification du nom
      if (!name || !name.trim()) {
        return res.status(400).json(formatResponse(null, "Le nom de l'unité est requis", 'error'));
      }
  
      // 2. VÉRIFICATION CRITIQUE DE L'UTILISATEUR (POUR ÉVITER LE 500) 🚨
      // Le champ 'createdBy' est requis. Si 'req.user' manque, cela lèvera une erreur 500
      // dans le code original. On gère cela explicitement avec un 401.
      if (!req.user || !req.user._id) {
          console.error('Erreur: Tentative d\'ajouter une unité sans utilisateur authentifié.');
          return res.status(401).json(formatResponse(null, "Authentification requise pour effectuer cette action", 'error'));
      }
  
      // 3. Création et sauvegarde
      const unit = new Unit({ 
        name: name.trim(),
        createdBy: req.user._id // Nécessite que le middleware d'auth ait attaché l'utilisateur
      });
      
      await unit.save();
      res.status(201).json(formatResponse(unit, 'Unité ajoutée avec succès'));
  
    } catch (error) {
      console.error('Erreur addUnit:', error);
      
      // Gestion de l'erreur de duplication (code Mongoose 11000)
      if (error.code === 11000) {
        return res.status(400).json(formatResponse(null, 'Cette unité existe déjà', 'error'));
      }
      
      // 4. Réponse 500 pour toutes les autres erreurs non gérées
      res.status(500).json(formatResponse(null, "Erreur lors de l'ajout de l'unité (Erreur interne non gérée)", 'error'));
    }
};
// GET /api/suppliers/categories
export const getSupplierCategories = async (req, res) => {
  try {
    console.log("Tentative de récupération des catégories...");
    
    // Vérification de la connexion à la base de données (utilise l'importation de mongoose)
    if (mongoose.connection.readyState !== 1) {
      console.error("❌ Base de données non connectée");
      return res.status(500).json(formatResponse(null, 'Base de données indisponible', 'error'));
    }

    const categories = await Category.find({ type: 'product' }).sort({ name: 1 });
    console.log(`✅ ${categories.length} catégories trouvées`);

    // Vérification de la structure des données renvoyées
    const validatedCategories = categories.map(cat => {
      if (!cat.name) {
        console.warn("Catégorie sans nom trouvée:", cat._id);
        return { ...cat.toObject(), name: 'Nom manquant' };
      }
      return cat;
    });

    res.json(formatResponse(validatedCategories, 'Catégories récupérées avec succès'));
  } catch (error) {
    console.error('❌ Erreur détaillée getSupplierCategories:', error);
    
    // Gestion spécifique des erreurs Mongoose
    if (error.name === 'MongoNetworkError') {
      return res.status(500).json(formatResponse(null, 'Erreur de connexion à la base de données', 'error'));
    }
    
    res.status(500).json(formatResponse(null, `Erreur de récupération des catégories: ${error.message}`, 'error'));
  }
};
// POST /api/categories
export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json(formatResponse(null, 'Le nom de la catégorie est requis', 'error'));
    }

    const category = new Category({ 
      name: name.trim(),
      type: 'product',
      createdBy: req.user._id 
    });
    
    await category.save();
    res.status(201).json(formatResponse(category, 'Catégorie ajoutée avec succès'));
  } catch (error) {
    console.error('Erreur addCategory:', error);
    
    if (error.code === 11000) {
      return res.status(400).json(formatResponse(null, 'Cette catégorie existe déjà', 'error'));
    }
    
    res.status(500).json(formatResponse(null, "Erreur lors de l'ajout de la catégorie", 'error'));
  }
};
// GET /api/locations
export const getLocationData = async (req, res) => {
    try {
        // ⚠️ REMARQUE : Cette route retourne traditionnellement un objet complexe
        // contenant tous les pays, villes et communes. Ajustez selon votre modèle Mongoose.
        // Pour l'exemple, on retourne une structure vide ou simple.
        const locations = {
             countries: [], // Remplacer par la logique de récupération réelle
             cities: [],
             communes: []
        };
        res.json({
            status: 'success',
            message: 'Données de localisation récupérées avec succès',
            data: locations, // Ne pas utiliser formatResponse qui met 'data' dans un tableau
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur getLocationData:', error);
        res.status(500).json(formatResponse(null, 'Erreur de récupération des données de localisation', 'error'));
    }
};

// POST /api/locations/countries
export const addCountry = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json(formatResponse(null, 'Le nom du pays est requis', 'error'));
    }

    // Dans une vraie implémentation, vous auriez un modèle Country
    // Pour l'instant, on retourne un succès
    res.status(201).json(formatResponse(
      { name: name.trim(), _id: Date.now().toString() }, 
      'Pays ajouté avec succès'
    ));
  } catch (error) {
    console.error('Erreur addCountry:', error);
    res.status(500).json(formatResponse(null, "Erreur lors de l'ajout du pays", 'error'));
  }
};

// POST /api/locations/cities
export const addCity = async (req, res) => {
  try {
    const { name, country } = req.body;
    
    if (!name || !name.trim() || !country) {
      return res.status(400).json(formatResponse(null, 'Le nom de la ville et le pays sont requis', 'error'));
    }

    // Dans une vraie implémentation, vous auriez un modèle City
    res.status(201).json(formatResponse(
      { name: name.trim(), country, _id: Date.now().toString() }, 
      'Ville ajoutée avec succès'
    ));
  } catch (error) {
    console.error('Erreur addCity:', error);
    res.status(500).json(formatResponse(null, "Erreur lors de l'ajout de la ville", 'error'));
  }
};

// POST /api/locations/communes
export const addCommune = async (req, res) => {
  try {
    const { name, city, country } = req.body;
    
    if (!name || !name.trim() || !city || !country) {
      return res.status(400).json(formatResponse(null, 'Tous les champs sont requis', 'error'));
    }

    // Dans une vraie implémentation, vous auriez un modèle Commune
    res.status(201).json(formatResponse(
      { name: name.trim(), city, country, _id: Date.now().toString() }, 
      'Commune ajoutée avec succès'
    ));
  } catch (error) {
    console.error('Erreur addCommune:', error);
    res.status(500).json(formatResponse(null, "Erreur lors de l'ajout de la commune", 'error'));
  }
};