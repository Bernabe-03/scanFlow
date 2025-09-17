import Establishment from '../models/Establishment.js';
import User from '../models/User.js';
import Menu from '../models/Menu.js';
import { generateQrForEstablishment } from '../services/qrService.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Établissements
export const getEstablishments = async (req, res) => {
  try {
    const establishments = await Establishment.find()
      .populate('manager', 'fullName email phone')
      .populate('menu', 'name');
    res.json(establishments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEstablishment = async (req, res) => {
  if (!req.body.name || !req.body.address) {
    return res.status(400).json({ message: 'Nom et adresse requis' });
  }
  
  try {
    const { name, type, address, phone, isActive } = req.body;
    
    // Générer un code unique
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      const existing = await Establishment.findOne({ code });
      if (!existing) isUnique = true;
    }

    const cleanedPhone = phone ? phone.replace(/\D/g, '') : undefined;
    
    // Validation téléphone
    if (cleanedPhone && !/^(01|05|06|07)[0-9]{8}$/.test(cleanedPhone)) {
      return res.status(400).json({ 
        message: 'Format de téléphone invalide. Utilisez 01/05/06/07 suivi de 8 chiffres.' 
      });
    }

    const establishment = new Establishment({
      code,
      name,
      type: type || 'restaurant',
      address: address || '',
      phone: cleanedPhone,
      isActive: isActive !== undefined ? isActive : true
    });

    // Créer un menu par défaut
    const menu = new Menu({
      name: `${name} Menu`,
      establishment: establishment._id,
      categories: []
    });
    await menu.save();

    // Lier le menu à l'établissement
    establishment.menu = menu._id;
    await establishment.save();
    
    // Générer QR code
    const qrDataUrl = await generateQrForEstablishment(establishment._id);
    establishment.qrCode = qrDataUrl;
    await establishment.save();

    res.status(201).json(establishment);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ errors });
    }
    
    console.error('Erreur création établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Managers
export const getManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' })
      .populate('establishment', 'name')
      .select('-password');
    res.json(managers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createManager = async (req, res) => {
  try {
    const { fullName, email, phone, password, establishmentId } = req.body;
    
    // Validation des champs requis
    const requiredFields = ['fullName', 'email', 'phone', 'password', 'establishmentId'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Tous les champs sont requis',
        missingFields 
      });
    }
    
    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format d\'email invalide' });
    }
    
    // Validation du format téléphone
    const phoneRegex = /^(01|05|06|07)[0-9]{8}$/;
    const cleanedPhone = phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({ 
        message: 'Format de téléphone invalide. Utilisez 01/05/06/07 suivi de 8 chiffres.' 
      });
    }
    
    // Vérifier que l'établissement existe
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    // Vérifier si l'email existe déjà
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }
    
    // Vérifier si le téléphone existe déjà
    const existingPhone = await User.findOne({ phone: cleanedPhone });
    if (existingPhone) {
      return res.status(409).json({ message: 'Téléphone déjà utilisé' });
    }
    
    const hashed = await bcrypt.hash(password, 10);
    const manager = new User({ 
      fullName, 
      email, 
      phone: cleanedPhone, 
      password: hashed, 
      role: 'manager', 
      establishment: establishmentId 
    });
    
    await manager.save();
    
    // Mettre à jour l'établissement avec le manager
    establishment.manager = manager._id;
    await establishment.save();
    
    const mgr = manager.toObject(); 
    delete mgr.password;
    res.status(201).json(mgr);
  } catch (error) {
    console.error('Erreur création manager:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email ou téléphone déjà utilisé' });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de la création du manager',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que le manager existe
    const manager = await User.findById(id);
    if (!manager) {
      return res.status(404).json({ message: 'Manager non trouvé' });
    }
    
    // Supprimer le manager
    await User.findByIdAndDelete(id);
    
    // Supprimer le manager de l'établissement
    await Establishment.updateOne(
      { _id: manager.establishment },
      { $unset: { manager: "" } }
    );
    
    res.json({ message: 'Manager supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression manager:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getEstablishmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }
    
    const establishment = await Establishment.findById(id)
      .populate('manager', 'fullName email phone')
      .populate('menu', 'name categories');
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    res.json(establishment);
  } catch (error) {
    console.error('Erreur récupération établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateEstablishment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }
    
    const { name, type, address, phone } = req.body;
    
    const cleanedPhone = phone ? phone.replace(/\D/g, '') : undefined;
    
    if (cleanedPhone && !/^(01|05|06|07)[0-9]{8}$/.test(cleanedPhone)) {
      return res.status(400).json({ 
        message: 'Format de téléphone invalide. Utilisez 01/05/06/07 suivi de 8 chiffres.' 
      });
    }

    const establishment = await Establishment.findByIdAndUpdate(
      id,
      { name, type, address, phone: cleanedPhone },
      { new: true, runValidators: true }
    );
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    res.json(establishment);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ errors });
    }
    
    console.error('Erreur mise à jour établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const toggleEstablishmentStatus = async (req, res) => {
  // Désactiver les transactions en environnement de développement
  const useTransactions = process.env.NODE_ENV === 'production';
  const session = useTransactions ? await mongoose.startSession() : null;
  
  try {
    if (useTransactions && session) {
      await session.startTransaction();
    }
    
    const { id } = req.params;
    
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (useTransactions && session) {
        await session.abortTransaction();
      }
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }
    
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      if (useTransactions && session) {
        await session.abortTransaction();
      }
      return res.status(400).json({ message: 'Le statut doit être un booléen' });
    }
    
    const establishment = await Establishment.findById(id);
    
    if (!establishment) {
      if (useTransactions && session) {
        await session.abortTransaction();
      }
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    // Mettre à jour le statut de l'établissement
    establishment.isActive = isActive;
    await establishment.save();
    
    // Mettre à jour le statut du manager
    if (establishment.manager) {
      await User.findByIdAndUpdate(
        establishment.manager,
        { isActive }
      );
    }
    
    // Mettre à jour le statut de tous les caissiers
    await User.updateMany(
      { establishment: id, role: 'cashier' },
      { isActive }
    );
    
    if (useTransactions && session) {
      await session.commitTransaction();
    }
    
    // Rafraîchir l'établissement pour retourner les données à jour
    const updatedEstablishment = await Establishment.findById(id)
      .populate('manager', 'fullName email phone')
      .populate('menu', 'name');
    
    res.json(updatedEstablishment);
  } catch (error) {
    if (useTransactions && session) {
      await session.abortTransaction();
    }
    
    console.error('Erreur changement statut établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const deactivateEstablishment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }
    
    // Désactiver l'établissement
    const establishment = await Establishment.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true, session }
    );
    
    if (!establishment) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    // Désactiver tous les utilisateurs associés
    await User.updateMany(
      { establishment: id },
      { isActive: false },
      { session }
    );
    
    await session.commitTransaction();
    res.json({ message: 'Établissement et utilisateurs désactivés avec succès' });
  } catch (error) {
    await session.abortTransaction();
    
    console.error('Erreur désactivation établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la désactivation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

export const deleteEstablishment = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID d\'établissement invalide' });
  }
  
  // Désactiver les transactions en environnement de développement
  const useTransactions = process.env.NODE_ENV === 'production';
  const session = useTransactions ? await mongoose.startSession() : null;
  
  try {
    if (useTransactions) {
      await session.startTransaction();
    }
    
    const { id } = req.params;
    const establishment = await Establishment.findById(id);
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    // Supprimer les utilisateurs associés
    await User.deleteMany({ 
      establishment: id,
      role: { $in: ['manager', 'cashier'] }
    });
    
    // Supprimer le menu associé
    if (establishment.menu) {
      await Menu.findByIdAndDelete(establishment.menu);
    }
    
    // Supprimer l'établissement
    await Establishment.findByIdAndDelete(id);
    
    if (useTransactions) {
      await session.commitTransaction();
    }
    
    res.json({ message: 'Établissement et utilisateurs supprimés avec succès' });
  } catch (error) {
    if (useTransactions && session) {
      await session.abortTransaction();
    }
    
    console.error('Erreur suppression établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const updateQrCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }
    
    const qrDataUrl = await generateQrForEstablishment(id);
    
    const establishment = await Establishment.findByIdAndUpdate(
      id, 
      { qrCode: qrDataUrl }, 
      { new: true }
    );
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    res.json(establishment);
  } catch (error) {
    console.error('Erreur mise à jour QR code:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Stats pour le tableau de bord admin
export const getAdminDashboardStats = async (req, res) => {
  try {
    const establishments = await Establishment.countDocuments();
    const managers = await User.countDocuments({ role: 'manager' });
    const activeManagers = await User.countDocuments({ 
      role: 'manager',
      isActive: true 
    });

    res.json({
      establishments,
      managers,
      activeManagers,
    });
  } catch (error) {
    console.error('Erreur récupération stats dashboard:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};