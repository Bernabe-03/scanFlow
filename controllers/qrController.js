
// Fichier : qrController.js
import Establishment from '../models/Establishment.js';
import mongoose from 'mongoose';
import { generateQrForEstablishment, getQrCode } from '../services/qrService.js';

// Fonction pour générer un code QR
export const generateQrCode = async (req, res) => {
  try {
    const { establishmentId } = req.body;

    // Vérifier si l'ID de l'établissement est valide
    if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
      return res.status(400).json({ message: 'ID établissement invalide' });
    }

    // Trouver l'établissement par son ID
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }

    // Générer le code QR
    const qrUrl = await generateQrForEstablishment(
      establishment._id,
      establishment.name
    );

    // Mettre à jour l'établissement avec l'URL du nouveau code QR
    establishment.qrCode = qrUrl;
    await establishment.save();

    res.json({ qrUrl });
  } catch (error) {
    // Gérer les erreurs lors de la génération du code QR
    res.status(500).json({
      message: 'Erreur lors de la génération du code QR',
      error: error.message
    });
  }
};

// Fonction pour récupérer un code QR
export const getQrCodeForEstablishment = async (req, res) => {
  try {
    const { establishmentId } = req.params;

    // Vérifier si l'ID de l'établissement est valide
    if (!mongoose.Types.ObjectId.isValid(establishmentId)) {
      return res.status(400).json({ message: 'ID établissement invalide' });
    }

    // Appeler la fonction importée du service pour obtenir l'URL du QR code
    const qrUrl = await getQrCode(establishmentId);
    res.json({ qrUrl });
  } catch (error) {
    // Gérer les erreurs spécifiques pour les codes QR non trouvés
    if (error.message === 'QR code non trouvé') {
      return res.status(404).json({ message: 'QR code non trouvé' });
    }
    // Gérer les erreurs pour les établissements non trouvés
    if (error.message === 'Établissement non trouvé') {
        return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    // Gérer les autres erreurs serveur
    res.status(500).json({
      message: 'Erreur lors de la récupération du code QR',
      error: error.message
    });
  }
};
