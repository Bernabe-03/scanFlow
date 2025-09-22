import express from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import asyncHandler from 'express-async-handler';
import { protect, manager } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Configuration de Multer pour stocker les fichiers en mémoire
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configuration de Cloudinary avec les variables d'environnement
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Route pour l'upload d'image, accessible uniquement aux managers
router.post(
  '/', 
  protect, 
  manager, 
  upload.single('file'), 
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        res.status(400);
        throw new Error('Aucun fichier image téléchargé.');
      }

      // Convertir le buffer du fichier en base64
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      // Téléchargement sécurisé vers Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
        folder: "menu_images" // Dossier dans votre Cloudinary
      });

      if (!result || !result.secure_url) {
        res.status(500);
        throw new Error('Échec du téléchargement sur Cloudinary.');
      }

      res.status(201).json({ imageUrl: result.secure_url });
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image:', error);
      res.status(500).json({ message: 'Erreur lors du téléchargement de l\'image', details: error.message });
    }
  })
);
export default router;