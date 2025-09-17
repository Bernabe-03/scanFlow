import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const authenticate = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Récupération du token depuis cookies ou en-tête Authorization
      let token = req.cookies?.token;
      
      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
      
      if (!token) {
        return res.status(401).json({ message: 'Token manquant' });
      }

      // Vérification du token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validation de l'ID utilisateur
      if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
        return res.status(401).json({ message: 'Token invalide' });
      }
      
      // Récupération de l'utilisateur
      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('establishment');
      
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Vérification du statut actif
      if (!user.isActive) {
        return res.status(403).json({ message: 'Compte désactivé' });
      }
      
      // Vérification des rôles
      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Accès refusé. Rôle requis: ${roles.join(', ')}` 
        });
      }
      
      req.user = user;
      next();
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      
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
  const id = req.params?.id || req.body?.establishment || req.query?.establishmentId;
  
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      message: 'ID invalide',
      details: `L'ID ${id} n'est pas un ObjectId MongoDB valide`
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
        message: `Accès refusé. Rôles autorisés: ${roles.join(', ')}` 
      });
    }
    
    next();
  };
};

export const establishmentAccess = async (req, res, next) => {
  try {
    const establishmentId = req.params.establishmentId || req.body.establishmentId;
    
    if (!establishmentId) {
      return res.status(400).json({ message: 'ID établissement manquant' });
    }
    
    // Les admins ont accès à tout
    if (req.user.role === 'admin') return next();
    
    // Pour les managers et caissiers, vérifier l'accès à l'établissement
    const userEstablishmentId = req.user.establishment?._id?.toString() || req.user.establishment?.toString();
    
    if (userEstablishmentId === establishmentId.toString()) {
      return next();
    }
    
    res.status(403).json({ message: 'Accès non autorisé à cet établissement' });
  } catch (error) {
    console.error('Erreur vérification accès établissement:', error);
    res.status(500).json({ message: 'Erreur de vérification des accès' });
  }
};

export const publicAccess = (req, res, next) => {
  // Middleware pour les routes publiques - pas d'authentification requise
  next();
};

// Middleware combiné pour manager et caissier
export const managerOrCashier = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }
  
  if (req.user.role !== 'manager' && req.user.role !== 'cashier') {
    return res.status(403).json({ 
      message: 'Accès réservé aux managers et caissiers' 
    });
  }
  
  next();
};

// Middlewares pratiques
export const protect = authenticate();
export const admin = [authenticate(), checkRole('admin')];
export const manager = [authenticate(), checkRole('manager')];
export const cashier = [authenticate(), checkRole('cashier')];
export const managerAndCashier = [authenticate(), managerOrCashier];