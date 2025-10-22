import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Establishment from '../models/Establishment.js';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      establishment: user.establishment,
      fullName: user.fullName
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    // Recherche de l'utilisateur par email ou téléphone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    
    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    
    // Vérification du statut actif
    if (!user.isActive) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }
    
    // Mise à jour de lastSeen
    user.lastSeen = new Date();
    await user.save();
    
    // Génération du token
    const token = generateToken(user);
    
    // Configuration du cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true en production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : 'localhost'
    });
    
    // Réponse
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        establishment: user.establishment
      }
    });
    
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

export const logout = async (req, res) => {
  try {
    // Mettre à jour lastSeen si l'utilisateur est connecté
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.lastSeen = new Date();
        await user.save();
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de lastSeen:', error);
  } finally {
    res.clearCookie('token');
    res.status(200).json({ message: 'Déconnexion réussie' });
  }
};

export const createEstablishmentWithManager = async (req, res) => {
  try {
    const { establishmentData, managerData } = req.body;
    const establishment = new Establishment({ name: establishmentData.name, type: establishmentData.type, address: establishmentData.address, phone: establishmentData.phone, isActive: true });
    await establishment.save();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(managerData.password, salt);
    const manager = new User({ fullName: managerData.fullName, email: managerData.email, phone: managerData.phone, password: hashedPassword, role: 'manager', establishment: establishment._id });
    await manager.save();
    res.status(201).json({ establishment, manager });
  } catch (error) {
    console.error('Error creating establishment with manager:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

export const createCashier = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!req.user.establishment) return res.status(400).json({ message: 'Manager non assigné à un établissement' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const cashier = new User({ fullName, email, phone, password: hashedPassword, role: 'cashier', establishment: req.user.establishment });
    await cashier.save();
    res.status(201).json(cashier);
  } catch (error) {
    console.error('Error creating cashier:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};