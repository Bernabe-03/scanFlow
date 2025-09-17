// import QRCode from 'qrcode';
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';
// import Establishment from '../models/Establishment.js';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// export const generateQrForEstablishment = async (establishmentId) => {
//   try {
//     const establishment = await Establishment.findById(establishmentId);
//     if (!establishment) throw new Error('Établissement non trouvé');
    
//     // Générer un code unique s'il n'existe pas
//     if (!establishment.code) {
//       const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//       let code;
//       let isUnique = false;
      
//       while (!isUnique) {
//         code = '';
//         for (let i = 0; i < 8; i++) {
//           code += characters.charAt(Math.floor(Math.random() * characters.length));
//         }
//         const existing = await Establishment.findOne({ code });
//         if (!existing) isUnique = true;
//       }
      
//       establishment.code = code;
//       await establishment.save();
//     }

//     // URL du menu public
//     const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/menu/${establishment.code}`;
    
//     // Générer le QR code en base64 (pas de fichier physique)
//     const qrDataUrl = await QRCode.toDataURL(url, {
//       width: 500,
//       margin: 2,
//       color: {
//         dark: '#000000',
//         light: '#FFFFFF'
//       }
//     });

//     return qrDataUrl;
//   } catch (error) {
//     console.error('Erreur génération QR:', error);
//     throw new Error('Échec de la génération du QR code');
//   }
// };

// export const getQrCode = async (code) => {
//   try {
//     const establishment = await Establishment.findOne({ code });
//     if (!establishment) throw new Error('Établissement non trouvé');
//     if (!establishment.qrCode) throw new Error('QR code non trouvé');
//     return establishment.qrCode;
//   } catch (error) {
//     console.error('Erreur récupération QR:', error);
//     throw error;
//   }
// };


// Fichier : qrService.js
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import Establishment from '../models/Establishment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateQrForEstablishment = async (establishmentId) => {
  try {
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) throw new Error('Établissement non trouvé');
    
    // Générer un code unique s'il n'existe pas
    if (!establishment.code) {
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
      
      establishment.code = code;
      await establishment.save();
    }

    // URL du menu public
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/menu/${establishment.code}`;
    
    // Générer le QR code en base64 (pas de fichier physique)
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Erreur génération QR:', error);
    throw new Error('Échec de la génération du QR code');
  }
};

export const getQrCode = async (code) => {
  try {
    const establishment = await Establishment.findOne({ code });
    if (!establishment) throw new Error('Établissement non trouvé');
    if (!establishment.qrCode) throw new Error('QR code non trouvé');
    return establishment.qrCode;
  } catch (error) {
    console.error('Erreur récupération QR:', error);
    throw error;
  }
};

