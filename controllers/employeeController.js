import Employee from '../models/Employee.js';
import Establishment from '../models/Establishment.js';
import mongoose from 'mongoose';
import { generateEmployeeCard } from '../services/employeeCardService.js';

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ establishment: req.user.establishment })
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
      .populate('establishment', 'name manager address phone')
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier que req.body existe et est parsé
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

    console.log('📥 Données reçues:', req.body);

    // Validation des champs obligatoires
    if (!fullName || !profession || !cni || !salary || !cnpsNumber) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Champs obligatoires manquants',
        required: ['fullName', 'profession', 'cni', 'salary', 'cnpsNumber']
      });
    }

    // Vérifier si emergencyContact est déjà un objet ou une string (pour les formulaires)
    let parsedEmergencyContact = {};
    if (emergencyContact) {
      if (typeof emergencyContact === 'string') {
        try {
          parsedEmergencyContact = JSON.parse(emergencyContact);
        } catch (error) {
          console.warn('⚠️ Impossible de parser emergencyContact (string):', error);
          parsedEmergencyContact = {};
        }
      } else {
        parsedEmergencyContact = emergencyContact;
      }
    }

    const establishment = await Establishment.findById(req.user.establishment);
    if (!establishment) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }

    const existingCNI = await Employee.findOne({ cni });
    if (existingCNI) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Un employé avec ce CNI existe déjà' });
    }

    const employeeData = {
            establishment: req.user.establishment,
            fullName,
            civility,
            profession,
            maritalStatus,
            childrenCount: parseInt(childrenCount) || 0,
            diploma: diploma || '',
            cmu: cmu || '',
            cni,
            salary: parseFloat(salary),
            emergencyContact: parsedEmergencyContact,
            cnpsNumber,
            contractType,
            contractDuration: contractDuration || '',
            contractStartDate: new Date(contractStartDate), // Conversion Date
            contractEndDate: contractEndDate ? new Date(contractEndDate) : null, // Conversion Date et gestion de null
            photo: photo || '',
            createdBy: req.user._id
          };

    console.log('💾 Données employé à sauvegarder:', employeeData);

    const employee = new Employee(employeeData);
    await employee.save({ session });

    // Générer la carte employé (si generateEmployeeCard est implémenté)
    try {
      // Note : Si generateEmployeeCard génère l'image et la stocke, l'imageURL 
      // doit être correctement stockée sur l'objet Employee.
      if (typeof generateEmployeeCard === 'function') {
        const cardData = await generateEmployeeCard(employee);
        if (employee.accessCard) {
          employee.accessCard.cardImage = cardData.cardImageUrl;
          await employee.save({ session });
        }
      }
    } catch (cardError) {
      console.error('❌ Erreur génération carte:', cardError);
      // Continuer même si la carte échoue
    }

    await session.commitTransaction();

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('establishment', 'name manager address phone')
      .populate('createdBy', 'fullName');

    res.status(201).json(populatedEmployee);
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Erreur complète:', error);

    if (error.name === 'ValidationError') {
      // 🚨 Amélioration du retour d'erreur pour indiquer le champ en faute
      const errors = Object.values(error.errors).map(err => `${err.path}: ${err.message}`);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    res.status(500).json({
      message: 'Erreur lors de la création',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    session.endSession();
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const updates = { ...req.body };

    // 🚨 CORRECTION MAJEURE: Gestion du champ emergencyContact
    // Si le client envoie du JSON, Express le parse déjà. On ne parse que si c'est une string.
    if (updates.emergencyContact && typeof updates.emergencyContact === 'string') {
      try {
        updates.emergencyContact = JSON.parse(updates.emergencyContact);
      } catch (e) {
        console.warn('⚠️ Impossible de parser emergencyContact lors de la mise à jour:', e);
        // Si le parsing échoue, on continue avec la valeur non parsée si elle est valide pour Mongoose
      }
    }
    // Gestion des champs numériques et de date

    if (updates.childrenCount !== undefined && updates.childrenCount !== null) {
      updates.childrenCount = parseInt(updates.childrenCount) || 0;
    }
    if (updates.salary !== undefined && updates.salary !== null) {
      updates.salary = parseFloat(updates.salary);
    }
    
    // Conversion explicite des dates si elles sont fournies
    if (updates.contractStartDate) {
        updates.contractStartDate = new Date(updates.contractStartDate);
    }
    if (updates.contractEndDate !== undefined) {
        // Gère la chaîne vide du formulaire comme null dans la base de données (si non requis)
        updates.contractEndDate = updates.contractEndDate === '' ? null : new Date(updates.contractEndDate);
    }


    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('establishment', 'name manager address phone')
      .populate('createdBy', 'fullName');

    if (updatedEmployee && (req.body.fullName || req.body.profession)) {
      // Régénérer la carte si le nom ou la profession change
      try {
        if (typeof generateEmployeeCard === 'function') {
          const cardData = await generateEmployeeCard(updatedEmployee);
          updatedEmployee.accessCard.cardImage = cardData.cardImageUrl;
          await updatedEmployee.save();
        }
      } catch (cardError) {
        console.error('❌ Erreur génération carte lors de la mise à jour:', cardError);
      }
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error('❌ Erreur complète lors de la mise à jour:', error);
    
    if (error.name === 'ValidationError') {
      // 🚨 Amélioration du retour d'erreur pour indiquer le champ en faute
      const errors = Object.values(error.errors).map(err => `${err.path}: ${err.message}`);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    res.status(500).json({
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
};

export const toggleEmployeeStatus = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    employee.isActive = !employee.isActive;
    employee.accessCard.isActive = employee.isActive;

    await employee.save();

    res.json(employee);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors du changement de statut',
      error: error.message
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await Employee.findByIdAndDelete(req.params.id);

    res.json({ message: 'Employé supprimé avec succès' });
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
};

export const generateEmployeeCardPdf = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('establishment', 'name manager address phone');

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    if (employee.establishment._id.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Vérifie que la fonction est disponible
    if (typeof generateEmployeeCardPdf !== 'function') {
        return res.status(501).json({ message: 'La fonctionnalité de génération de PDF n\'est pas encore implémentée.' });
    }

    const pdfBuffer = await generateEmployeeCardPdf(employee);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carte-${employee.code}.pdf`);

    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la génération du PDF',
      error: error.message
    });
  }
};