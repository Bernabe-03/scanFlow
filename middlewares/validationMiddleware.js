import mongoose from 'mongoose';

export const validateEstablishment = (req, res, next) => {
  const establishmentId = req.user?.establishment || req.body?.establishment || req.query?.establishment;
  
  if (!establishmentId) {
    return res.status(400).json({ message: "Identifiant d'établissement requis" });
  }
  
  if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
    return res.status(400).json({ message: "Identifiant d'établissement invalide" });
  }
  
  next();
};

export const validateProductData = (req, res, next) => {
  const { name, price, category } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Le nom du produit est requis" });
  }
  
  if (!price || isNaN(price) || parseFloat(price) < 0) {
    return res.status(400).json({ message: "Le prix doit être un nombre positif" });
  }
  
  if (!category || !category.trim()) {
    return res.status(400).json({ message: "La catégorie est requise" });
  }
  
  next();
};

export const validateOrder = (req, res, next) => {
  const { items, customer } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'La commande doit contenir des articles' });
  }
  
  if (!customer || !customer.name || !customer.phone) {
    return res.status(400).json({ message: 'Informations client incomplètes' });
  }
  
  next();
};

export const cleanIds = (req, res, next) => {
  // Nettoyer les IDs dans les paramètres
  if (req.params?.id) {
    req.params.id = req.params.id.replace(/[^a-f0-9]/gi, '');
  }
  
  // Nettoyer les IDs dans le body
  if (req.body) {
    if (req.body.establishment && typeof req.body.establishment === 'string') {
      req.body.establishment = req.body.establishment.replace(/[^a-f0-9]/gi, '');
    }
    
    if (req.body._id && typeof req.body._id === 'string') {
      req.body._id = req.body._id.replace(/[^a-f0-9]/gi, '');
    }
  }
  
  // Nettoyer les IDs dans la query
  if (req.query?.establishmentId) {
    req.query.establishmentId = req.query.establishmentId.replace(/[^a-f0-9]/gi, '');
  }
  
  next();
};

// Validation des ObjectId - CORRIGÉ
export const validateObjectId = (req, res, next) => {
  // Utilisation des opérateurs optionnels pour éviter les erreurs
  const id = req.params?.id || req.body?.establishment || req.query?.establishmentId;
  
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      message: 'ID invalide',
      details: `L'ID ${id} n'est pas un identifiant valide`
    });
  }
  
  next();
};