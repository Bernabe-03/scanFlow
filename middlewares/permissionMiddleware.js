
export const checkManagerPermissions = (req, res, next) => {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ 
        message: "Accès refusé: permissions manager requises" 
      });
    }
    
    if (!req.user.establishment) {
      return res.status(403).json({ 
        message: "Manager non assigné à un établissement" 
      });
    }
    
    next();
  };
  
 // Dans authMiddleware.js
export const checkCashierPermissions = (req, res, next) => {
  if (req.user.role !== 'cashier') {
    return res.status(403).json({ message: "Accès refusé: permissions caissier requises" });
  }
  
  if (!req.user.isActive) {
    return res.status(403).json({ message: "Compte caissier désactivé" });
  }
  
  // Vérifier que le caissier est actif et a commencé son service
  if (!req.user.isOnShift) {
    return res.status(403).json({ message: "Le caissier n'a pas commencé son service" });
  }
  
  next();
};