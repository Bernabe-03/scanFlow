
import mongoose from 'mongoose';
import Menu from '../models/Menu.js';
import Establishment from '../models/Establishment.js';
import { Product, Category } from '../models/Product.js';
import asyncHandler from 'express-async-handler';
import { createProduct as createProductService, updateProduct as updateProductService, deleteProduct as deleteProductService } from './productController.js';
// Middleware pour trouver un établissement par ID ou code
export const findEstablishmentByIdentifier = async (req, res, next) => {
    const { identifier } = req.params;
    if (!identifier) {
        return res.status(400).json({ message: "Identifiant d'établissement manquant." });
    }

    let establishment;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        establishment = await Establishment.findById(identifier);
    }
    if (!establishment) {
        establishment = await Establishment.findOne({ code: identifier });
    }

    if (!establishment) {
        return res.status(404).json({ message: 'Établissement non trouvé.' });
    }

    req.establishment = establishment;
    next();
};
export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { name, description, price, allergens } = req.body;
  const establishmentId = req.user.establishment;

  // Récupérez le chemin de l'image si un fichier a été uploadé
  const imagePath = req.file ? `/uploads/${req.file.filename}` : req.body.image;

  // Créez l'objet de mise à jour avec les données reçues
  const updates = {
      name,
      description,
      price,
      allergens,
      image: imagePath,
  };

  if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400);
      throw new Error('ID de produit invalide.');
  }

  const menu = await Menu.findOne({ establishment: establishment._id })
  .populate({
      path: 'categories.products',
      model: 'Product',
      match: { isActive: true },
      select: 'name price description image stock allergens'
  })
  .lean();

  if (!menu) {
      res.status(404);
      throw new Error('Menu non trouvé.');
  }

  const productToUpdate = menu.categories
      .flatMap(cat => cat.products)
      .find(p => p._id.toString() === productId);

  if (!productToUpdate) {
      res.status(404);
      throw new Error('Produit non trouvé dans le menu.');
  }

  // Mettre à jour les propriétés du produit
  Object.assign(productToUpdate, updates);

  // Mettre à jour le produit dans le stock s'il est lié
  if (productToUpdate.stockId) {
      await Product.findByIdAndUpdate(
          productToUpdate.stockId,
          updates,
          { new: true }
      );
  }

  await menu.save();
  res.status(200).json(productToUpdate);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const establishmentId = req.user.establishment;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400);
      throw new Error('ID de produit invalide.');
  }

  const menu = await Menu.findOne({ establishment: establishmentId });
  if (!menu) {
      res.status(404);
      throw new Error('Menu non trouvé.');
  }

  let productRemoved = false;
  for (const category of menu.categories) {
      const productIndex = category.products.findIndex(p => p._id.toString() === productId);
      if (productIndex > -1) {
          // Optionnel : Si vous souhaitez également supprimer le produit du stock
          // const productInMenu = category.products[productIndex];
          // if (productInMenu.stockId) {
          //     await Product.findByIdAndDelete(productInMenu.stockId);
          // }

          category.products.splice(productIndex, 1);
          productRemoved = true;
          break;
      }
  }

  if (!productRemoved) {
      res.status(404);
      throw new Error('Produit non trouvé dans le menu.');
  }

  await menu.save();
  res.status(200).json({ message: 'Produit retiré du menu avec succès.' });
});

// --- CONTRÔLEURS DU MANAGER ---
export const getMenuByEstablishmentId = asyncHandler(async (req, res) => {
    const { establishmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
        res.status(400);
        throw new Error("ID d'établissement invalide.");
    }

    const menu = await Menu.findOne({ establishment: establishmentId })
        .populate({
            path: 'categories.products',
            model: 'Product',
            select: 'name price description image stock allergens isActive'
        });

    if (!menu) {
        res.status(404);
        throw new Error("Menu non configuré pour cet établissement.");
    }

    res.status(200).json(menu);
});

export const createMenu = asyncHandler(async (req, res) => {
    const { establishmentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
        res.status(400);
        throw new Error("ID d'établissement invalide.");
    }

    const existingMenu = await Menu.findOne({ establishment: establishmentId });
    if (existingMenu) {
        res.status(400);
        throw new Error('Un menu existe déjà pour cet établissement.');
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
        res.status(404);
        throw new Error('Établissement non trouvé.');
    }

    const newMenu = new Menu({
        name: `${establishment.name} Menu`,
        establishment: establishmentId,
        categories: []
    });

    const savedMenu = await newMenu.save();
    establishment.menu = savedMenu._id;
    await establishment.save();
    res.status(201).json(savedMenu);
});

export const updateMenuName = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("ID de menu invalide.");
    }

    const menu = await Menu.findByIdAndUpdate(id, { name }, { new: true, runValidators: true })
        .populate('categories.products', 'name price description isActive');

    if (!menu) {
        res.status(404);
        throw new Error('Menu non trouvé.');
    }

    res.status(200).json(menu);
});

export const addCategoryToMenu = asyncHandler(async (req, res) => {
    const { establishmentId, name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
        res.status(400);
        throw new Error("ID d'établissement invalide.");
    }

    const menu = await Menu.findOne({ establishment: establishmentId });
    if (!menu) {
        res.status(404);
        throw new Error('Menu non trouvé pour cet établissement.');
    }

    menu.categories.push({ name, products: [] });
    await menu.save();

    const lastCategory = menu.categories[menu.categories.length - 1];
    res.status(201).json(lastCategory);
});

export const updateCategoryInMenu = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400);
        throw new Error('ID de catégorie invalide.');
    }

    const menu = await Menu.findOne({ "categories._id": categoryId });
    if (!menu) {
        res.status(404);
        throw new Error('Menu ou catégorie non trouvé.');
    }

    const category = menu.categories.id(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('Catégorie non trouvée.');
    }

    category.name = name;
    await menu.save();
    res.status(200).json(category);
});

export const deleteCategoryFromMenu = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400);
      throw new Error('ID de catégorie invalide.');
    }
  
    const menu = await Menu.findOne({ "categories._id": categoryId });
    if (!menu) {
      res.status(404);
      throw new Error('Menu ou catégorie non trouvé.');
    }
  
    const category = menu.categories.id(categoryId);
    if (!category) {
      res.status(404);
      throw new Error('Catégorie non trouvée.');
    }
  
    // Ne supprimer que les produits qui sont exclusivement des produits de menu
    await Product.deleteMany({ 
      _id: { $in: category.products },
      isMenuProduct: true 
    });
    
    menu.categories.pull(categoryId);
    await menu.save();
  
    res.status(200).json({ message: 'Catégorie et produits associés supprimés.' });
});

export const addProductToCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const productData = req.body;
  
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400);
      throw new Error('ID de catégorie invalide.');
    }
  
    const menu = await Menu.findOne({ "categories._id": categoryId });
    if (!menu) {
      res.status(404);
      throw new Error('Catégorie non trouvée.');
    }
  
    let productToAdd;
  
    // Vérifier si le produit existe déjà dans le stock
    const existingProduct = await Product.findOne({
      name: productData.name,
      establishment: menu.establishment
    });
  
    if (existingProduct) {
      // Utiliser le produit existant du stock
      productToAdd = existingProduct;
      
      // Mettre à jour les informations spécifiques au menu
      productToAdd.description = productData.description || existingProduct.description;
      productToAdd.allergens = productData.allergens || existingProduct.allergens;
      productToAdd.image = productData.image || existingProduct.image;
      productToAdd.isMenuProduct = true;
      
      await productToAdd.save();
    } else {
      // Créer un nouveau produit lié au stock
      productToAdd = new Product({
        ...productData,
        establishment: menu.establishment,
        isMenuProduct: true,
        stock: 0 // Les produits de menu n'ont pas de stock direct
      });
      await productToAdd.save();
    }
  
    const category = menu.categories.id(categoryId);
    category.products.push(productToAdd._id);
    await menu.save();
  
    res.status(201).json(productToAdd);
});


export const linkProductToCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { productId, useStockData } = req.body;

  if (!mongoose.Types.ObjectId.isValid(categoryId) || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error('IDs de catégorie ou de produit invalides.');
  }

  const menu = await Menu.findOne({ "categories._id": categoryId });
  if (!menu) {
    res.status(404);
    throw new Error('Menu non trouvé.');
  }

  const category = menu.categories.id(categoryId);
  if (!category) {
    res.status(404);
    throw new Error('Catégorie non trouvée.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé.');
  }

  if (product.establishment.toString() !== menu.establishment.toString()) {
    res.status(403);
    throw new Error('Produit non autorisé.');
  }

  if (category.products.includes(productId)) {
    res.status(400);
    throw new Error('Ce produit est déjà dans cette catégorie.');
  }

  // Si useStockData est true, on utilise les données du stock plutôt que de créer un nouveau produit
  if (useStockData) {
    category.products.push(productId);
    await menu.save();
    
    const populatedMenu = await Menu.findOne({ "categories._id": categoryId })
      .populate({ path: 'categories.products', select: 'name price description isActive' });

    return res.status(200).json(populatedMenu);
  }
});

export const unlinkProductFromCategory = asyncHandler(async (req, res) => {
    const { categoryId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId) || !mongoose.Types.ObjectId.isValid(productId)) {
        res.status(400);
        throw new Error('IDs de catégorie ou de produit invalides.');
    }

    const menu = await Menu.findOne({ "categories._id": categoryId });
    if (!menu) {
        res.status(404);
        throw new Error('Menu non trouvé.');
    }

    const category = menu.categories.id(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('Catégorie non trouvée.');
    }

    // Retirer le produit de la liste et mettre à jour sa catégorie
    category.products = category.products.filter(pid => pid.toString() !== productId);
    const product = await Product.findById(productId);
    if (product) {
        product.category = null;
        await product.save();
    }
    
    await menu.save();

    const populatedMenu = await Menu.findOne({ "categories._id": categoryId })
        .populate({ path: 'categories.products', select: 'name price description isActive' });

    res.status(200).json(populatedMenu);
});

export const getPublicMenu = async (req, res) => {
    try {
      const code = req.params.code;
      
      if (!code || code.length !== 8) {
        return res.status(400).json({ 
          message: "Code d'établissement invalide" 
        });
      }
  
      // Recherche de l'établissement avec son menu et produits
      const establishment = await Establishment.findOne({ code })
        .populate({
          path: 'menu',
          populate: {
            path: 'categories.products',
            model: 'Product'
            // Retirer le filtre isActive pour debugger
          }
        });
  
      if (!establishment) {
        return res.status(404).json({ 
          message: "Établissement non trouvé"
        });
      }
  
      if (!establishment.isActive) {
        return res.status(200).json({ 
          available: false,
          establishmentName: "Établissement non disponible",
          categories: []
        });
      }
  
      // Debug: Vérifier ce qui est retourné par la population
      console.log("Establishment menu:", establishment.menu);
      
      let categories = [];
      if (establishment.menu && establishment.menu.categories) {
        categories = establishment.menu.categories.map(category => {
          // Vérifier si les produits sont bien peuplés
          console.log(`Category ${category.name} products:`, category.products);
          
          const products = (category.products || [])
            .filter(product => product && typeof product === 'object') // S'assurer que ce sont des objets
            .map(product => ({
              _id: product._id.toString(),
              name: product.name,
              price: product.price,
              description: product.description || '',
              image: product.image || null,
              stock: product.stock || 0,
              allergens: product.allergens || ''
            }));
  
          // Éliminer les doublons
          const seen = new Set();
          const uniqueProducts = products.filter(product => {
            const key = `${product.name}-${product.price}`;
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
  
          return {
            _id: category._id.toString(),
            name: category.name,
            products: uniqueProducts
          };
        }).filter(category => category.products.length > 0); // Ne garder que les catégories avec produits
      }
  
      const response = {
        available: true,
        establishmentId: establishment._id.toString(),
        establishmentName: establishment.name,
        categories
      };
  
      // Debug: Vérifier la réponse finale
      console.log("Final response:", response);
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Erreur dans getPublicMenu:', error);
      res.status(500).json({ 
        message: 'Erreur de chargement du menu',
        error: error.message 
      });
    }
  };