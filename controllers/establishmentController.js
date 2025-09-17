
import mongoose from 'mongoose';
import Establishment from '../models/Establishment.js';
import Menu from '../models/Menu.js';
import { generateQrForEstablishment } from '../services/qrService.js';

// Génération de codes uniques
export const createEstablishment = async (req, res) => {
  try {
    const { name, type, address, phone, isActive } = req.body;
    
    // Générer un code unique de 8 caractères
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

    // Validation et création
    const cleanedPhone = phone ? phone.replace(/\D/g, '') : undefined;
    
    if (cleanedPhone && !/^(01|05|06|07)[0-9]{8}$/.test(cleanedPhone)) {
      return res.status(400).json({ 
        message: 'Format de téléphone invalide' 
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

    await establishment.save();
    
    // Génération automatique du QR code avec gestion d'erreur
    try {
      const qrDataUrl = await generateQrForEstablishment(establishment._id);
      establishment.qrCode = qrDataUrl;
      await establishment.save();
    } catch (qrError) {
      console.error('Erreur génération QR code:', qrError);
      // On continue même si le QR code échoue
    }

    res.status(201).json(establishment);
  } catch (error) {
    console.error('Erreur création établissement:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la création',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getEstablishmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Le middleware a déjà validé l'ID, donc on peut l'utiliser directement
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
    const { name, type, address, phone } = req.body;
    
    // Nettoyer le numéro de téléphone
    let cleanedPhone;
    if (phone) {
      cleanedPhone = phone.replace(/\D/g, '');
      if (!/^(01|05|06|07)[0-9]{8}$/.test(cleanedPhone)) {
        return res.status(400).json({ message: 'Format de téléphone invalide' });
      }
    }
    
    const updateData = { name, type, address };
    if (phone) updateData.phone = cleanedPhone;
    
    const establishment = await Establishment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    res.json(establishment);
  } catch (error) {
    console.error('Erreur mise à jour établissement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const assignMenuToEstablishment = async (req, res) => {
  try {
    const { establishmentId, menuId } = req.body;
    
    // Validation des IDs
    if (!mongoose.Types.ObjectId.isValid(establishmentId) || 
        !mongoose.Types.ObjectId.isValid(menuId)) {
      return res.status(400).json({ message: 'ID(s) invalide(s)' });
    }
    
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return res.status(404).json({ message: 'Menu non trouvé' });
    }
    
    const establishment = await Establishment.findByIdAndUpdate(
      establishmentId,
      { menu: menuId },
      { new: true }
    );
    
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    
    res.json(establishment);
  } catch (error) {
    console.error('Erreur assignation menu:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'assignation du menu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};