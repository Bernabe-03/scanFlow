import Employee from '../models/Employee.js';
import Establishment from '../models/Establishment.js';
import mongoose from 'mongoose';
import { generateEmployeeCard } from '../services/employeeCardService.js';

// Fonction pour générer les initiales de l'établissement
const generateEstablishmentInitials = (establishmentName) => {
  if (!establishmentName) return "ET";
  
  const words = establishmentName.trim().split(/\s+/);
  if (words.length >= 2) {
    // Prendre les premières lettres des deux premiers mots
    return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    // Prendre les deux premières lettres si un seul mot
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Fallback
    return "ET";
  }
};

// Fonction pour générer le code employé unique
const generateEmployeeCode = async (establishmentId, session) => {
  try {
    // Récupérer l'établissement
    const establishment = await Establishment.findById(establishmentId).session(session);
    if (!establishment) {
      throw new Error('Établissement non trouvé');
    }

    // Générer les initiales
    const initials = generateEstablishmentInitials(establishment.name);
    
    // Trouver le dernier employé de cet établissement
    const lastEmployee = await Employee.findOne({ 
      establishment: establishmentId 
    }).session(session).sort({ createdAt: -1 });

    let sequenceNumber = 1;
    
    if (lastEmployee && lastEmployee.code) {
      // Extraire le numéro de séquence du dernier code
      const lastCode = lastEmployee.code;
      const lastInitials = lastCode.substring(0, 2);
      const lastNumber = parseInt(lastCode.substring(2), 10);
      
      // Si les initiales correspondent, incrémenter le numéro
      if (lastInitials === initials && !isNaN(lastNumber)) {
        sequenceNumber = lastNumber + 1;
      }
    }

    // Formater le numéro sur 3 chiffres
    const formattedNumber = sequenceNumber.toString().padStart(3, '0');
    return initials + formattedNumber;

  } catch (error) {
    console.error('Erreur génération code employé:', error);
    // Fallback avec timestamp
    return 'ET' + Date.now().toString().slice(-3);
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ establishment: req.user.establishment })
      .populate('establishment', 'name code address phone')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('establishment', 'name code manager address phone')
      .populate('createdBy', 'fullName');

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment._id.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createEmployee = async (req, res) => {
  console.log('📥 Received request body:', req.body);
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validation de base
    if (!req.body || Object.keys(req.body).length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Données manquantes dans la requête' });
    }

    const {
      fullName, civility, profession, maritalStatus, childrenCount,
      diploma, cmu, cni, salary, emergencyContact, cnpsNumber,
      contractType, contractDuration, contractStartDate, contractEndDate,
      photo
    } = req.body;

    console.log('📥 Données reçues:', { fullName, cni, profession, establishment: req.user.establishment });

    // ✅ VALIDATION CRITIQUE : Vérification de l'établissement
    if (!req.user.establishment) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Aucun établissement associé à votre compte utilisateur.' });
    }

    // Vérification que l'établissement existe
    const establishment = await Establishment.findById(req.user.establishment).session(session);
    if (!establishment) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }

    console.log('✅ Établissement validé:', establishment.name);

    // Validation des champs obligatoires
    if (!fullName || !profession || !cni || !salary || !cnpsNumber) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Champs obligatoires manquants',
        required: ['fullName', 'profession', 'cni', 'salary', 'cnpsNumber']
      });
    }

    // Gestion de l'objet emergencyContact
    let parsedEmergencyContact = { name: "", phone: "", relation: "" };
    if (emergencyContact) {
      if (typeof emergencyContact === 'string') {
        try {
          parsedEmergencyContact = JSON.parse(emergencyContact);
        } catch (error) {
          console.warn('⚠️ Impossible de parser emergencyContact:', error);
        }
      } else if (typeof emergencyContact === 'object') {
        parsedEmergencyContact = { 
          name: emergencyContact.name || "",
          phone: emergencyContact.phone || "", 
          relation: emergencyContact.relation || "" 
        };
      }
    }

    // Vérification de l'unicité du CNI
    const existingCNI = await Employee.findOne({ cni }).session(session);
    if (existingCNI) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Un employé avec ce CNI existe déjà' });
    }

    // ✅ SUPPRIMÉ : La génération du code est maintenant gérée par le hook pre-save
    // Préparation des données (sans le code, il sera généré automatiquement)
    const employeeData = {
      establishment: req.user.establishment,
      // Le code sera généré automatiquement par le hook pre-save
      fullName: fullName ? fullName.trim() : '',
      civility: civility || 'M',
      profession: profession ? profession.trim() : '',
      maritalStatus: maritalStatus || 'Célibataire',
      childrenCount: parseInt(childrenCount) || 0,
      diploma: diploma || '',
      cmu: cmu || '',
      cni: cni ? cni.trim() : '',
      salary: parseFloat(salary) || 0,
      emergencyContact: parsedEmergencyContact,
      cnpsNumber: cnpsNumber ? cnpsNumber.trim() : '',
      contractType: contractType || 'CDI',
      contractDuration: contractDuration || '',
      contractStartDate: contractStartDate ? new Date(contractStartDate) : new Date(),
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      photo: photo || '',
      createdBy: req.user._id
    };

    // Validation manuelle supplémentaire
    const validationErrors = [];
    
    if (!employeeData.fullName || employeeData.fullName.trim().length < 2) {
      validationErrors.push('Le nom complet doit contenir au moins 2 caractères');
    }
    
    if (employeeData.salary < 0) {
      validationErrors.push('Le salaire ne peut pas être négatif');
    }
    
    if (employeeData.childrenCount < 0) {
      validationErrors.push('Le nombre d\'enfants ne peut pas être négatif');
    }
    
    if (!employeeData.contractStartDate || isNaN(employeeData.contractStartDate.getTime())) {
      validationErrors.push('La date de début de contrat est invalide');
    }
    
    if (employeeData.contractEndDate && isNaN(employeeData.contractEndDate.getTime())) {
      validationErrors.push('La date de fin de contrat est invalide');
    }

    if (validationErrors.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Erreur de validation des données',
        errors: validationErrors 
      });
    }

    console.log('💾 Données employé finales:', employeeData);

    // Création et sauvegarde du nouvel employé
    // Le hook pre-save va générer automatiquement le code
    const employee = new Employee(employeeData);
    await employee.save({ session });
    console.log('✅ Employé créé avec code:', employee.code);

    // Validation finale
    if (!employee.code) {
      throw new Error('Le code employé n\'a pas été généré lors de la sauvegarde');
    }

    await session.commitTransaction();
    console.log('✅ Transaction confirmée');

    // Récupération de l'employé avec les données peuplées
    const populatedEmployee = await Employee.findById(employee._id)
      .populate('establishment', 'name code manager address phone')
      .populate('createdBy', 'fullName');

    console.log('✅ Employé créé avec succès:', populatedEmployee._id, '- Code:', populatedEmployee.code);
    
    res.status(201).json(populatedEmployee);

  } catch (error) {
    // Gestion des erreurs
    await session.abortTransaction();
    console.error('❌ Erreur complète lors de la création:', error);

    if (error.message.includes('Établissement non trouvé') || error.message.includes('établissement')) {
      return res.status(400).json({ 
        message: 'Problème avec l\'établissement: ' + error.message 
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => `${err.path}: ${err.message}`);
      return res.status(400).json({ 
        message: 'Erreur de validation des données Mongoose',
        errors,
        details: 'Vérifiez les types de données et les champs requis'
      });
    }

    if (error.code === 11000) {
      // Gestion spécifique des erreurs d'unicité
      if (error.keyPattern && error.keyPattern.cni) {
        return res.status(400).json({ 
          message: 'Erreur de duplication',
          error: 'Un employé avec ce CNI existe déjà'
        });
      }
      if (error.keyPattern && error.keyPattern.code) {
        return res.status(400).json({ 
          message: 'Erreur de duplication',
          error: 'Un employé avec ce code existe déjà (erreur système)'
        });
      }
    }

    res.status(500).json({
      message: 'Erreur serveur lors de la création',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    session.endSession();
  }
};
export const updateEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment.toString() !== req.user.establishment.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const updates = { ...req.body };
    console.log('📥 Mise à jour reçue:', updates);

    // ✅ EMPÊCHER LA MODIFICATION DU CODE ET DE L'ÉTABLISSEMENT
    if (updates.code) {
      delete updates.code; // Le code ne peut pas être modifié
    }
    
    if (updates.establishment && updates.establishment !== employee.establishment.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'La modification de l\'établissement n\'est pas autorisée.' 
      });
    }

    // ✅ Gestion robuste de emergencyContact
    if (updates.emergencyContact) {
      if (typeof updates.emergencyContact === 'string') {
        try {
          updates.emergencyContact = JSON.parse(updates.emergencyContact);
        } catch (e) {
          console.warn('⚠️ Impossible de parser emergencyContact:', e);
          updates.emergencyContact = employee.emergencyContact;
        }
      } else if (typeof updates.emergencyContact === 'object') {
        updates.emergencyContact = {
          name: updates.emergencyContact.name || employee.emergencyContact.name || "",
          phone: updates.emergencyContact.phone || employee.emergencyContact.phone || "",
          relation: updates.emergencyContact.relation || employee.emergencyContact.relation || ""
        };
      }
    }

    // ✅ Conversion explicite des types
    if (updates.childrenCount !== undefined && updates.childrenCount !== null) {
      updates.childrenCount = parseInt(updates.childrenCount) || 0;
    }
    
    if (updates.salary !== undefined && updates.salary !== null) {
      updates.salary = parseFloat(updates.salary);
    }
    
    if (updates.contractStartDate) {
      updates.contractStartDate = new Date(updates.contractStartDate);
    }
    
    if (updates.contractEndDate !== undefined) {
      updates.contractEndDate = updates.contractEndDate === '' ? null : new Date(updates.contractEndDate);
    }

    // ✅ Nettoyage des chaînes de caractères
    if (updates.fullName) updates.fullName = updates.fullName.trim();
    if (updates.profession) updates.profession = updates.profession.trim();
    if (updates.cni) updates.cni = updates.cni.trim();
    if (updates.cnpsNumber) updates.cnpsNumber = updates.cnpsNumber.trim();
    if (updates.diploma) updates.diploma = updates.diploma.trim();
    if (updates.cmu) updates.cmu = updates.cmu.trim();
    if (updates.contractDuration) updates.contractDuration = updates.contractDuration.trim();

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true, session }
    ).populate('establishment', 'name code manager address phone')
     .populate('createdBy', 'fullName');

    if (!updatedEmployee) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Employé non trouvé lors de la mise à jour' });
    }

    // ✅ Régénération de la carte si nécessaire
    if (updates.fullName || updates.profession) {
      try {
        if (typeof generateEmployeeCard === 'function') {
          const cardData = await generateEmployeeCard(updatedEmployee);
          if (cardData && cardData.cardImageUrl) {
            updatedEmployee.accessCard.cardImage = cardData.cardImageUrl;
            await updatedEmployee.save({ session });
          }
        }
      } catch (cardError) {
        console.error('❌ Erreur génération carte lors de la mise à jour:', cardError);
      }
    }

    await session.commitTransaction();
    console.log('✅ Employé mis à jour avec succès:', updatedEmployee._id);

    res.json(updatedEmployee);
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Erreur complète lors de la mise à jour:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => `${err.path}: ${err.message}`);
      return res.status(400).json({ 
        message: 'Erreur de validation lors de la mise à jour',
        errors 
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Erreur de duplication',
        error: 'Un employé avec ce CNI existe déjà'
      });
    }

    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Les autres fonctions (toggleEmployeeStatus, deleteEmployee, generateEmployeeCardPdf, testEmployeeCreation) restent identiques
export const toggleEmployeeStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment.toString() !== req.user.establishment.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    employee.isActive = !employee.isActive;
    employee.accessCard.isActive = employee.isActive;

    await employee.save({ session });
    await session.commitTransaction();

    res.json(employee);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      message: 'Erreur lors du changement de statut',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

export const deleteEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment.toString() !== req.user.establishment.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await Employee.findByIdAndDelete(req.params.id, { session });
    await session.commitTransaction();

    res.json({ message: 'Employé supprimé avec succès' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

export const generateEmployeeCardPdf = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('establishment', 'name code manager address phone');

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment._id.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Vérifie que la fonction est disponible
    if (typeof generateEmployeeCardPdf !== 'function') {
      return res.status(501).json({ 
        message: 'La fonctionnalité de génération de PDF n\'est pas encore implémentée.' 
      });
    }

    const pdfBuffer = await generateEmployeeCardPdf(employee);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carte-${employee.code}.pdf`);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(500).json({
      message: 'Erreur lors de la génération du PDF',
      error: error.message
    });
  }
};

export const testEmployeeCreation = async (req, res) => {
  try {
    console.log('🧪 Test endpoint called with body:', req.body);
    console.log('🧪 User:', req.user);
    
    // Test de génération de code
    const testCode = await generateEmployeeCode(req.user.establishment, null);
    
    const testData = {
      fullName: 'Test Employee',
      civility: 'M',
      profession: 'Testeur',
      maritalStatus: 'Célibataire',
      childrenCount: 0,
      cni: 'TEST-' + Date.now(),
      salary: 100000,
      cnpsNumber: 'TEST-CNPS',
      contractType: 'CDI',
      contractStartDate: new Date(),
      establishment: req.user.establishment,
      createdBy: req.user._id,
      code: testCode
    };

    console.log('🧪 Test data avec code généré:', testData);

    res.json({ 
      message: 'Test réussi', 
      receivedData: req.body,
      testData: testData,
      generatedCode: testCode,
      user: { id: req.user._id, establishment: req.user.establishment },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ message: error.message });
  }
};