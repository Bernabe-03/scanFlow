import mongoose from 'mongoose';
import Establishment from '../models/Establishment.js';

export const establishmentAccess = async (req, res, next) => {
  const user = req.user;
  
  // Récupération plus robuste de l'ID d'établissement
  let estabId = req.params.id || req.body.establishmentId || req.query.establishmentId;
  
  if (!estabId) {
    return res.status(400).json({ 
      message: 'ID établissement manquant dans la requête'
    });
  }

  try {
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(estabId)) {
      return res.status(400).json({ message: 'ID établissement invalide' });
    }

    const establishment = await Establishment.findById(estabId).lean();
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }

    // Admin: accès complet
    if (user.role === 'admin') {
      req.establishment = establishment;
      return next();
    }

    // Manager: accès seulement à son établissement
    if (user.role === 'manager') {
      // Conversion en string pour comparaison sûre
      const userEstab = user.establishment?.toString();
      const targetEstab = estabId.toString();
      
      if (userEstab === targetEstab) {
        req.establishment = establishment;
        return next();
      }
    }

    // Caissier: accès seulement à son établissement
    if (user.role === 'cashier') {
      const userEstab = user.establishment?.toString();
      const targetEstab = estabId.toString();
      
      if (userEstab === targetEstab) {
        req.establishment = establishment;
        return next();
      }
    }

    return res.status(403).json({ 
      message: 'Accès non autorisé à cet établissement'
    });
  } catch (err) {
    console.error('Erreur establishmentAccess:', err);
    return res.status(500).json({ 
      message: 'Erreur serveur lors de la vérification des accès'
    });
  }
};