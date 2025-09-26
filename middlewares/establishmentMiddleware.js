import mongoose from 'mongoose';
import Establishment from '../models/Establishment.js';

export const establishmentAccess = async (req, res, next) => {
  const user = req.user;

  try {
    // Récupération robuste de l'ID
    let estabId = req.params.id || req.body.establishmentId || req.query.establishmentId;

    // 🔹 Si pas d’ID → on prend celui de l’utilisateur
    if (!estabId && user?.establishment) {
      estabId = user.establishment._id?.toString() || user.establishment.toString();
    }

    // 🔹 Si admin sans ID → accès illimité
    if (user.role === 'admin' && !estabId) {
      return next();
    }

    // 🔹 Si toujours pas d’ID → on laisse passer sans bloquer
    if (!estabId) {
      return next();
    }

    // Vérification validité de l’ID
    if (!mongoose.Types.ObjectId.isValid(estabId)) {
      return res.status(400).json({ message: 'ID établissement invalide' });
    }

    const establishment = await Establishment.findById(estabId).lean();
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }

    // Admin → accès complet
    if (user.role === 'admin') {
      req.establishment = establishment;
      return next();
    }

    // Manager / Caissier → accès uniquement à leur établissement
    const userEstab = user.establishment?.toString();
    if (userEstab === estabId.toString()) {
      req.establishment = establishment;
      return next();
    }

    return res.status(403).json({
      message: 'Accès non autorisé à cet établissement',
    });
  } catch (err) {
    console.error('Erreur establishmentAccess:', err);
    return res.status(500).json({
      message: 'Erreur serveur lors de la vérification des accès',
    });
  }
};
