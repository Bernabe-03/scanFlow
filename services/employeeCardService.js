// services/employeeCardService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, registerFont } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateEmployeeCard = async (employee) => {
  try {
    // Créer un canvas pour la carte
    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');

    // Arrière-plan avec dégradé
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    // Filigrane de sécurité
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = 'bold 60px Arial';
    ctx.rotate(-0.1);
    ctx.fillText('SECURITE', 50, 250);
    ctx.rotate(0.1);

    // Bordure
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 580, 380);

    // Photo de l'employé
    if (employee.photo) {
      try {
        const photo = await loadImage(employee.photo);
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 120, 40, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(photo, 80, 80, 80, 80);
        ctx.restore();
      } catch (error) {
        console.error('Erreur chargement photo:', error);
        // Photo par défaut
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(120, 120, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b82f6';
        ctx.font = '30px Arial';
        ctx.fillText('👤', 105, 130);
      }
    }

    // Informations de l'employé
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(employee.fullName, 200, 100);
    
    ctx.font = '16px Arial';
    ctx.fillText(`Poste: ${employee.profession}`, 200, 130);
    ctx.fillText(`Matricule: ${employee.code}`, 200, 160);
    ctx.fillText(`CNI: ${employee.cni}`, 200, 190);

    // Informations de l'établissement
    ctx.font = 'bold 18px Arial';
    ctx.fillText(employee.establishment.name, 50, 300);
    
    ctx.font = '12px Arial';
    ctx.fillText(`Manager: ${employee.establishment.manager?.fullName || 'Non spécifié'}`, 50, 320);
    ctx.fillText(`Carte: ${employee.accessCard.cardNumber}`, 50, 340);
    ctx.fillText(`Valide jusqu'au: ${new Date(employee.accessCard.expirationDate).toLocaleDateString()}`, 50, 360);

    // Code QR pour la carte (optionnel)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(450, 250, 100, 100);
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.fillText('SCAN ME', 470, 370);

    // Convertir en buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Sauvegarder l'image
    const cardsDir = path.join(__dirname, '../public/cards');
    if (!fs.existsSync(cardsDir)) {
      fs.mkdirSync(cardsDir, { recursive: true });
    }
    
    const fileName = `card-${employee.code}-${Date.now()}.png`;
    const filePath = path.join(cardsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return {
      cardImageUrl: `/cards/${fileName}`,
      cardData: {
        employeeName: employee.fullName,
        employeeCode: employee.code,
        profession: employee.profession,
        establishmentName: employee.establishment.name,
        managerName: employee.establishment.manager?.fullName,
        cardNumber: employee.accessCard.cardNumber,
        expirationDate: employee.accessCard.expirationDate
      }
    };
  } catch (error) {
    console.error('Erreur génération carte:', error);
    throw error;
  }
};

export const generateEmployeeCardPDF = async (employee) => {
  // Implémentation pour générer un PDF
  // Vous pouvez utiliser une librairie comme pdfkit ou jspdf
  // Pour l'instant, retournons une promesse vide
  return new Promise((resolve) => {
    // Implémentation PDF à ajouter
    resolve(Buffer.from('PDF non implémenté'));
  });
};