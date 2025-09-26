
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
// 💡 CORRECTION CRITIQUE : Importation du modèle Establishment
import Establishment from '../models/Establishment.js'; 

export const authenticate = (roles = []) => {
  return async (req, res, next) => {
    try {
      // 🚀 OPTIMISATION: Mise en cache de l'utilisateur
      if (req.user && req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
        if (roles.length === 0 || roles.includes(req.user.role)) {
          // Utilisateur déjà chargé et rôle OK, on passe à la suite.
          return next(); 
        }
      }

      let token = req.cookies?.token;

      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({ message: 'Token manquant' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
        return res.status(401).json({ message: 'Token invalide' });
      }

      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('establishment');

      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Compte désactivé' });
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({
          message: `Accès refusé. Rôle requis: ${roles.join(', ')}`,
        });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("Erreur d'authentification:", err);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expirée' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token invalide' });
      }

      res.status(500).json({ message: 'Erreur serveur' });
    }
  };
};

export const validateObjectId = (req, res, next) => {
  const id =
    req.params?.id ||
    req.body?.establishment ||
    req.query?.establishmentId;

  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: 'ID invalide',
      details: `L'ID ${id} n'est pas un ObjectId MongoDB valide`,
    });
  }

  next();
};

export const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Accès refusé. Rôles autorisés: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

export const establishmentAccess = async (req, res, next) => {
  const user = req.user;

  try {
    // 🚀 OPTIMISATION: Mettre en cache l'établissement si déjà chargé
    if (req.establishment && req.establishment._id) {
      return next(); 
    }
    
    // Récupération plus robuste de l'ID d'établissement
    let estabId =
      req.params.id ||
      req.body.establishmentId ||
      req.query.establishmentId;

    // 🔹 Si pas d'ID → on prend celui de l'utilisateur (manager/cashier)
    if (!estabId && user?.establishment) {
      estabId = user.establishment._id?.toString() || user.establishment.toString();
    }

    // 🔹 Si admin et aucun estabId → accès complet sans restriction
    if (user.role === 'admin' && !estabId) {
      return next();
    }

    // 🔹 Si toujours rien → on laisse passer sans bloquer (peut être normal pour certaines routes)
    if (!estabId) {
      return next();
    }

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

    // Manager et Caissier: accès seulement à leur propre établissement
    const userEstab = user.establishment?._id?.toString() || user.establishment?.toString();
    const targetEstab = estabId.toString();

    if (userEstab === targetEstab) {
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

export const publicAccess = (req, res, next) => {
  next();
};

export const managerOrCashier = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ message: 'Utilisateur non authentifié' });
  }

  if (req.user.role !== 'manager' && req.user.role !== 'cashier') {
    return res.status(403).json({
      message: 'Accès réservé aux managers et caissiers',
    });
  }

  next();
};

export const protect = authenticate();
export const admin = [authenticate(), checkRole('admin')];
export const manager = [authenticate(), checkRole('manager')];
export const cashier = [authenticate(), checkRole('cashier')];
export const managerAndCashier = [authenticate(), managerOrCashier];