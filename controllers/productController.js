
import { Product, Category } from '../models/Product.js';
import Menu from '../models/Menu.js';
import DailyPurchase from '../models/DailyPurchase.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// Récupérer tous les produits de l'établissement de l'utilisateur connecté
export const getProductsByEstablishment = asyncHandler(async (req, res) => {
    let establishmentId;
    
    // Si l'utilisateur est admin, utiliser le establishmentId from query
    if (req.user.role === 'admin') {
        establishmentId = req.query.establishmentId;
    } else {
        // Pour les managers, utiliser leur établissement
        establishmentId = req.user.establishment;
    }

    if (!establishmentId) {
        res.status(400);
        throw new Error("ID d'établissement introuvable.");
    }

    // Validation de l'ID d'établissement
    if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
        res.status(400);
        throw new Error("ID d'établissement invalide.");
    }

    const products = await Product.find({ establishment: establishmentId });
    res.status(200).json(products);
});
export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const establishmentId = req.user.establishment;
  
    // Vérifier si le produit est utilisé dans un menu
    const menu = await Menu.findOne({
      establishment: establishmentId,
      "categories.products": id
    });
  
    if (menu) {
      // Option 1: Retirer le produit des menus sans le supprimer
      await removeProductFromAllMenus(id);
      
      return res.status(200).json({ 
        message: 'Produit retiré des menus mais conservé dans le stock.',
        removedFromMenus: true
      });
    }
  
    // Procéder à la suppression si pas utilisé dans les menus
    const deletedProduct = await Product.findOneAndDelete({ 
      _id: id, 
      establishment: establishmentId 
    });
  
    res.status(200).json({ message: 'Produit supprimé avec succès.' });
});
// export const updateProductStock = asyncHandler(async (req, res) => {
//     try {const { id } = req.params;
//     const { quantity } = req.body;
//     const establishmentId = req.user.establishment;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//         res.status(400);
//         throw new Error('ID de produit invalide.');
//     }

//     const product = await Product.findOneAndUpdate(
//         { _id: id, establishment: establishmentId },
//         { stock: quantity },
//         { new: true, runValidators: true }
//     );

//     if (!product) {
//         res.status(404);
//         throw new Error('Produit introuvable ou non associé à votre établissement.');
//     }

//     res.status(200).json(product);
// } catch (error) {
//     console.error("Erreur de mise à jour du stock:", error);
//     res.status(400).json({ 
//       message: error.message,
//       details: "Vérifiez le format des données envoyées" 
//     });
//   }
// });
export const updateProductStock = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, price, lowStockThreshold } = req.body; // Modifié pour accepter quantity au lieu de stock
      const establishmentId = req.user.establishment;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error('ID de produit invalide.');
      }
  
      const product = await Product.findOne({ _id: id, establishment: establishmentId });
  
      if (!product) {
        res.status(404);
        throw new Error('Produit introuvable ou non associé à votre établissement.');
      }
  
      // Mise à jour des champs avec vérification de l'existence
      if (quantity !== undefined) product.stock = quantity;
      if (price !== undefined) product.price = price;
      if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  
      await product.save();
  
      res.status(200).json(product);
    } catch (error) {
      console.error("Erreur de mise à jour du stock:", error);
      res.status(400).json({ 
        message: error.message,
        details: "Vérifiez le format des données envoyées" 
      });
    }
});
export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const establishmentId = req.user.establishment;
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('ID de produit invalide.');
    }
  
    const updates = { ...req.body };
    
    // Upload de la nouvelle image vers Cloudinary si elle existe
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file, `menu_digital/${establishmentId}`);
        updates.image = uploadResult.secure_url;
      } catch (error) {
        console.error("Erreur lors de l'upload Cloudinary:", error);
        res.status(500);
        throw new Error("Erreur lors du téléchargement de l'image");
      }
    }
  
    // Conversion des types numériques
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.stock) updates.stock = parseInt(updates.stock, 10);
    if (updates.lowStockThreshold) updates.lowStockThreshold = parseInt(updates.lowStockThreshold, 10);
  
    // Conversion de la catégorie en string si nécessaire
    if (updates.category && typeof updates.category !== 'string') {
      if (updates.category._id) {
        const categoryDoc = await Category.findById(updates.category._id);
        updates.category = categoryDoc ? categoryDoc.name : null;
      } else if (updates.category.name) {
        updates.category = updates.category.name;
      }
    }
  
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, establishment: establishmentId },
      updates,
      { new: true, runValidators: true }
    );
  
    if (!updatedProduct) {
      res.status(404);
      throw new Error('Produit introuvable ou non associé à votre établissement.');
    }
  
    res.status(200).json(updatedProduct);
  });
// Récupérer un produit par son ID
export const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const establishmentId = req.user.establishment;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error('ID de produit invalide.');
    }

    const product = await Product.findOne({ _id: id, establishment: establishmentId });

    if (!product) {
        res.status(404);
        throw new Error('Produit introuvable ou non associé à votre établissement.');
    }

    res.status(200).json(product);
});
// Créer un nouveau produit avec image Cloudinary
export const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, allergens, stock, lowStockThreshold, category, unit } = req.body;
    
    console.log("Données reçues pour création produit:", req.body);
    
    if (!name || !price) {
      res.status(400);
      throw new Error('Le nom et le prix sont requis.');
    }
  
    // Validation de l'établissement
    if (!req.user.establishment) {
      res.status(400);
      throw new Error("Utilisateur non associé à un établissement.");
    }
  
    const establishmentId = req.user.establishment;
  
    // Upload de l'image vers Cloudinary si elle existe
    let imageUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file, `menu_digital/${establishmentId}`);
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error("Erreur lors de l'upload Cloudinary:", error);
        res.status(500);
        throw new Error("Erreur lors du téléchargement de l'image");
      }
    }
  
    // Validation des types de données
    const productData = {
      name: name.toString().trim(),
      description: description ? description.toString().trim() : '',
      price: parseFloat(price),
      allergens: allergens ? allergens.toString().trim() : '',
      stock: parseInt(stock, 10) || 0,
      lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
      category: category ? category.toString().trim() : null,
      unit: unit || 'pièce',
      establishment: establishmentId
    };
  
    // Ajouter l'URL Cloudinary si disponible
    if (imageUrl) {
      productData.image = imageUrl;
    }
  
    // Validation des valeurs numériques
    if (isNaN(productData.price) || productData.price < 0) {
      res.status(400);
      throw new Error('Prix invalide.');
    }
  
    if (isNaN(productData.stock) || productData.stock < 0) {
      res.status(400);
      throw new Error('Stock invalide.');
    }
  
    console.log("Données du produit à créer:", productData);
    
    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();
    
    console.log("Produit créé avec succès:", savedProduct);
    
    // Populer les données pour la réponse
    const populatedProduct = await Product.findById(savedProduct._id)
      .populate('establishment', 'name');
    
    res.status(201).json(populatedProduct);
  });
// FONCTIONS DE GESTION DES CATÉGORIES
export const getCategoriesByEstablishment = asyncHandler(async (req, res) => {
    const establishmentId = req.user.establishment;

    if (!establishmentId) {
        res.status(400);
        throw new Error("ID d'établissement introuvable pour l'utilisateur.");
    }

    const categories = await Category.find({ establishment: establishmentId });
    res.status(200).json(categories);
});
export const createCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const establishmentId = req.user.establishment;

    if (!name) {
        res.status(400);
        throw new Error('Le nom de la catégorie est requis.');
    }

    const categoryExists = await Category.findOne({ name, establishment: establishmentId });

    if (categoryExists) {
        res.status(409); // Conflit
        throw new Error('Une catégorie avec ce nom existe déjà pour cet établissement.');
    }

    const newCategory = new Category({
        name,
        establishment: establishmentId
    });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
});
// Récupérer les achats du jour
export const getDailyPurchases = asyncHandler(async (req, res) => {
    const establishmentId = req.user.establishment;

    if (!establishmentId) {
        res.status(400);
        throw new Error("ID d'établissement introuvable pour l'utilisateur.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const purchases = await DailyPurchase.find({
        establishment: establishmentId,
        date: { $gte: today }
    }).sort({ date: -1 });

    const totalValue = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalCount = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);

    // Formatage correct pour le frontend
    const items = purchases.map(purchase => ({
        productName: purchase.productName,
        category: purchase.category,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        total: purchase.total
    }));

    res.status(200).json({
        items,
        totalValue,
        count: totalCount
    });
});