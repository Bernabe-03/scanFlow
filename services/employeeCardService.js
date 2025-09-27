import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, registerFont } from 'canvas';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger une police professionnelle si disponible (optionnel)
try {
  const fontPath = path.join(__dirname, '../assets/fonts/arial.ttf');
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Professional' });
  }
} catch (error) {
  console.log('⚠️ Police personnalisée non trouvée, utilisation des polices par défaut');
}

export const generateEmployeeCard = async (employee) => {
  try {
    console.log('🔄 Début génération carte employé:', employee.code);
    
    // S'assurer que l'établissement est peuplé
    let establishment = employee.establishment;
    if (!establishment || typeof establishment === 'string' || mongoose.Types.ObjectId.isValid(establishment)) {
      try {
        const Establishment = mongoose.model('Establishment');
        establishment = await Establishment.findById(employee.establishment);
        console.log('✅ Établissement peuplé:', establishment?.name);
      } catch (error) {
        console.error('❌ Erreur peuplement établissement:', error);
        establishment = { name: 'Établissement', manager: { fullName: 'Manager' } };
      }
    }

    // Créer un canvas pour la carte (format carte professionnelle standard)
    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext('2d');

    // === ARRIÈRE-PLAN AVEC DÉGRADÉ PROFESSIONNEL ===
    const gradient = ctx.createLinearGradient(0, 0, 800, 500);
    gradient.addColorStop(0, '#1e3a8a'); // Bleu foncé
    gradient.addColorStop(0.5, '#2563eb'); // Bleu
    gradient.addColorStop(1, '#3b82f6'); // Bleu clair
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 500);

    // === FILIGRANE DE SÉCURITÉ AVEC NOM ÉTABLISSEMENT ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.rotate(-0.15);
    
    // Répéter le filigrane sur toute la carte
    for (let i = -100; i < 900; i += 200) {
      for (let j = -100; j < 600; j += 150) {
        ctx.fillText(establishment.name || 'SECURITE', i, j);
      }
    }
    ctx.rotate(0.15);
    ctx.textAlign = 'left';

    // === BORDURE ÉLÉGANTE ===
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 770, 470);

    // Bordure intérieure
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, 750, 450);

    // === EN-TÊTE DE LA CARTE ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CARTE PROFESSIONNELLE', 400, 60);
    
    ctx.font = 'bold 22px Arial';
    ctx.fillText(establishment.name || 'ÉTABLISSEMENT', 400, 90);
    
    ctx.font = '14px Arial';
    ctx.fillText(`Matricule: ${employee.code}`, 400, 115);

    // === PHOTO DE L'EMPLOYÉ ===
    const photoX = 50;
    const photoY = 150;
    const photoSize = 120;

    // Cercle photo avec effet d'ombre
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Cercle de fond
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2 + 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    if (employee.photo) {
      try {
        const photo = await loadImage(employee.photo);
        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(photo, photoX, photoY, photoSize, photoSize);
        ctx.restore();
      } catch (error) {
        console.error('❌ Erreur chargement photo:', error);
        // Photo par défaut stylisée
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👤', photoX + photoSize/2, photoY + photoSize/2 + 15);
        ctx.textAlign = 'left';
      }
    } else {
      // Photo par défaut si aucune photo
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('👤', photoX + photoSize/2, photoY + photoSize/2 + 15);
      ctx.textAlign = 'left';
    }

    // === INFORMATIONS DE L'EMPLOYÉ ===
    const infoX = 200;
    const infoY = 160;
    const lineHeight = 28;

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    // Nom complet
    ctx.font = 'bold 24px Arial';
    ctx.fillText(employee.fullName || 'Nom non spécifié', infoX, infoY);
    
    // Poste
    ctx.font = '18px Arial';
    ctx.fillText(`Poste: ${employee.profession || 'Non spécifié'}`, infoX, infoY + lineHeight);
    
    // Civilité et CNI
    ctx.fillText(`Civilité: ${employee.civility || 'M'}`, infoX, infoY + lineHeight * 2);
    ctx.fillText(`CNI: ${employee.cni || 'Non spécifié'}`, infoX, infoY + lineHeight * 3);
    
    // Type de contrat
    ctx.fillText(`Contrat: ${employee.contractType || 'CDI'}`, infoX, infoY + lineHeight * 4);

    // === INFORMATIONS DE CONTACT ===
    const contactX = 450;
    const contactY = 160;

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Informations Contact', contactX, contactY);
    
    ctx.font = '16px Arial';
    if (employee.emergencyContact?.name) {
      ctx.fillText(`Contact: ${employee.emergencyContact.name}`, contactX, contactY + lineHeight);
    }
    if (employee.emergencyContact?.phone) {
      ctx.fillText(`Tél: ${employee.emergencyContact.phone}`, contactX, contactY + lineHeight * 2);
    }
    if (employee.emergencyContact?.relation) {
      ctx.fillText(`Lien: ${employee.emergencyContact.relation}`, contactX, contactY + lineHeight * 3);
    }

    // === PIED DE CARTE AVEC INFORMATIONS CARTE D'ACCÈS ===
    const footerY = 350;

    // Ligne séparatrice
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, footerY);
    ctx.lineTo(750, footerY);
    ctx.stroke();

    // Informations carte d'accès
    ctx.font = 'bold 16px Arial';
    ctx.fillText('CARTE D\'ACCÈS', 50, footerY + 30);
    
    ctx.font = '14px Arial';
    ctx.fillText(`N°: ${employee.accessCard?.cardNumber || 'CARD-' + employee.code}`, 50, footerY + 55);
    ctx.fillText(`Émise le: ${new Date(employee.accessCard?.issueDate || Date.now()).toLocaleDateString('fr-FR')}`, 50, footerY + 80);
    ctx.fillText(`Expire le: ${new Date(employee.accessCard?.expirationDate || Date.now() + 365*24*60*60*1000).toLocaleDateString('fr-FR')}`, 50, footerY + 105);

    // Statut de la carte
    const isActive = employee.isActive !== false && employee.accessCard?.isActive !== false;
    ctx.fillStyle = isActive ? '#10b981' : '#ef4444';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Statut: ${isActive ? 'ACTIVE' : 'INACTIVE'}`, 300, footerY + 55);

    // Code QR simulé (zone pour futur QR code)
    const qrX = 600;
    const qrY = footerY + 20;
    const qrSize = 80;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR CODE', qrX + qrSize/2, qrY + qrSize/2);
    ctx.fillText(employee.code, qrX + qrSize/2, qrY + qrSize + 15);
    ctx.textAlign = 'left';

    // === SIGNATURE ET TIMESTAMP ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 750, 480);
    ctx.textAlign = 'left';

    // Convertir en buffer PNG haute qualité
    const buffer = canvas.toBuffer('image/png', { compressionLevel: 0, filters: canvas.PNG_FILTER_NONE });
    
    // Sauvegarder l'image dans le dossier public/cards
    const cardsDir = path.join(__dirname, '../public/cards');
    if (!fs.existsSync(cardsDir)) {
      fs.mkdirSync(cardsDir, { recursive: true });
      console.log('✅ Dossier cards créé:', cardsDir);
    }
    
    const fileName = `card-${employee.code}-${Date.now()}.png`;
    const filePath = path.join(cardsDir, fileName);
    
    try {
      fs.writeFileSync(filePath, buffer);
      console.log('✅ Carte sauvegardée:', fileName);
    } catch (error) {
      console.error('❌ Erreur sauvegarde carte:', error);
      // Fallback : retourner le buffer même si la sauvegarde échoue
    }

    const cardData = {
      employeeName: employee.fullName,
      employeeCode: employee.code,
      profession: employee.profession,
      establishmentName: establishment.name,
      managerName: establishment.manager?.fullName,
      cardNumber: employee.accessCard?.cardNumber,
      expirationDate: employee.accessCard?.expirationDate,
      issueDate: employee.accessCard?.issueDate,
      status: isActive ? 'active' : 'inactive'
    };

    console.log('✅ Carte générée avec succès pour:', employee.fullName);

    return {
      cardImageUrl: `/cards/${fileName}`,
      cardImageBuffer: buffer, // Buffer pour téléchargement immédiat
      cardData: cardData
    };

  } catch (error) {
    console.error('❌ Erreur génération carte:', error);
    
    // Fallback : carte d'erreur minimaliste
    try {
      const canvas = createCanvas(400, 200);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 400, 200);
      
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Erreur génération carte', 20, 50);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      ctx.fillText(`Employé: ${employee.fullName || 'Inconnu'}`, 20, 80);
      ctx.fillText(`Code: ${employee.code || 'Inconnu'}`, 20, 100);
      ctx.fillText(`Erreur: ${error.message}`, 20, 120);
      
      const buffer = canvas.toBuffer('image/png');
      
      return {
        cardImageUrl: null,
        cardImageBuffer: buffer,
        cardData: null,
        error: error.message
      };
    } catch (fallbackError) {
      console.error('❌ Erreur même avec fallback:', fallbackError);
      throw error;
    }
  }
};

export const generateEmployeeCardPDF = async (employee) => {
  try {
    console.log('📄 Génération PDF pour:', employee.code);
    
    // D'abord générer l'image de la carte
    const cardResult = await generateEmployeeCard(employee);
    
    // Pour l'instant, retournons un PDF basique avec l'image
    // Implémentation complète nécessiterait pdfkit ou similar
    const pdfContent = `
      CARTE PROFESSIONNELLE - ${employee.establishment?.name || 'Établissement'}
      
      Employé: ${employee.fullName}
      Matricule: ${employee.code}
      Poste: ${employee.profession}
      CNI: ${employee.cni}
      
      Carte générée le: ${new Date().toLocaleDateString('fr-FR')}
      
      Image: ${cardResult.cardImageUrl}
    `;

    // Retourner un buffer simulé (à remplacer par une vraie génération PDF)
    const buffer = Buffer.from(pdfContent, 'utf-8');
    
    console.log('✅ PDF généré (simulation) pour:', employee.code);
    
    return buffer;
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    throw error;
  }
};

// Nouvelle fonction pour générer une carte simplifiée (format badge)
export const generateEmployeeBadge = async (employee) => {
  try {
    const canvas = createCanvas(300, 150);
    const ctx = canvas.getContext('2d');

    // Design simplifié pour badge
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, 300, 150);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(employee.fullName, 10, 30);
    
    ctx.font = '12px Arial';
    ctx.fillText(employee.profession, 10, 50);
    ctx.fillText(employee.code, 10, 70);
    ctx.fillText(employee.establishment?.name || 'Établissement', 10, 90);

    const buffer = canvas.toBuffer('image/png');
    
    return {
      badgeImageBuffer: buffer,
      badgeData: {
        employeeName: employee.fullName,
        employeeCode: employee.code,
        profession: employee.profession
      }
    };
  } catch (error) {
    console.error('❌ Erreur génération badge:', error);
    throw error;
  }
};

export default {
  generateEmployeeCard,
  generateEmployeeCardPDF,
  generateEmployeeBadge
};