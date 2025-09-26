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
export const validateEstablishmentId = (req, res, next) => {
  try {
    const establishmentId = req.params.id || req.body.establishment || req.user?.establishment;

    if (!establishmentId) {
      return res.status(400).json({ message: "Identifiant d'établissement requis" });
    }

    // Nettoyage basique
    const cleanedId = establishmentId.toString().trim();

    // Validation de la longueur et du format
    if (cleanedId.length !== 24) {
      return res.status(400).json({ 
        message: "ID d'établissement invalide",
        details: "L'ID doit contenir exactement 24 caractères."
      });
    }

    // Validation MongoDB (si mongoose est disponible)
    if (typeof mongoose !== 'undefined' && !mongoose.Types.ObjectId.isValid(cleanedId)) {
      return res.status(400).json({ 
        message: "ID d'établissement invalide pour la base de données"
      });
    }

    req.cleanedEstablishmentId = cleanedId;
    next();

  } catch (err) {
    // Éviter l'erreur 500 en capturant toute exception
    console.error("❌ Erreur inattendue dans validateEstablishmentId:", err);
    return res.status(400).json({ 
      message: "Erreur lors de la vérification de l'identifiant" 
    });
  }
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
  try {
    // Nettoyer les IDs dans les paramètres
    if (req.params?.id) {
      // Supprimer TOUS les caractères non hexadécimaux (seulement 0-9, a-f)
      req.params.id = req.params.id.replace(/[^0-9a-f]/g, '').toLowerCase();
    }
    
    // Nettoyer les IDs dans le body
    if (req.body) {
      if (req.body.establishment && typeof req.body.establishment === 'string') {
        req.body.establishment = req.body.establishment.replace(/[^0-9a-f]/g, '').toLowerCase();
      }
      
      if (req.body._id && typeof req.body._id === 'string') {
        req.body._id = req.body._id.replace(/[^0-9a-f]/g, '').toLowerCase();
      }
    }
    
    // Nettoyer les IDs dans la query
    if (req.query?.establishmentId) {
      req.query.establishmentId = req.query.establishmentId.replace(/[^0-9a-f]/g, '').toLowerCase();
    }

    // 🔥 CORRECTION CRITIQUE : Nettoyer l'établissement dans req.user
    if (req.user?.establishment) {
      if (typeof req.user.establishment === 'string') {
        req.user.establishment = req.user.establishment.replace(/[^0-9a-f]/g, '').toLowerCase();
      } else if (req.user.establishment._id) {
        req.user.establishment._id = req.user.establishment._id.toString().replace(/[^0-9a-f]/g, '').toLowerCase();
      }
    }

    next();
  } catch (error) {
    console.error('❌ Erreur dans cleanIds middleware:', error);
    next();
  }
};

// Validation des ObjectId - CORRIGÉ
export const validateObjectId = (req, res, next) => {
  const id = req.params?.id || req.body?.establishment || req.query?.establishmentId;
  
  if (!id) {
    return next(); // Pas d'ID à valider
  }
  
  // Vérifier que l'ID a exactement 24 caractères hexadécimaux
  if (typeof id !== 'string' || id.length !== 24 || !/^[0-9a-f]{24}$/.test(id)) {
    console.error('❌ ID invalide détecté:', {
      id: id,
      type: typeof id,
      length: id.length,
      pattern: /^[0-9a-f]{24}$/.test(id)
    });
    
    return res.status(400).json({ 
      message: 'ID invalide',
      details: `L'ID "${id}" n'est pas un ObjectId MongoDB valide. Il doit contenir exactement 24 caractères hexadécimaux (0-9, a-f).`,
      receivedLength: id.length,
      expectedLength: 24
    });
  }
  
  // Vérification MongoDB
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      message: 'ID invalide selon MongoDB',
      details: `L'ID "${id}" n'est pas valide pour MongoDB.`
    });
  }
  
  next();
};