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
    const {
      fullName, civility, profession, maritalStatus, childrenCount,
      diploma, cmu, cni, salary, emergencyContact, cnpsNumber,
      contractType, contractDuration, contractStartDate, contractEndDate,
      photo // ← on attend directement l'URL de l'image
    } = req.body;

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
      emergencyContact: emergencyContact ? JSON.parse(emergencyContact) : {},
      cnpsNumber,
      contractType,
      contractDuration: contractDuration || '',
      contractStartDate,
      contractEndDate: contractEndDate || null,
      photo: photo || '', // ← URL reçue du frontend
      createdBy: req.user._id
    };

    const employee = new Employee(employeeData);
    await employee.save({ session });

    const cardData = await generateEmployeeCard(employee);
    employee.accessCard.cardImage = cardData.cardImageUrl;
    await employee.save({ session });

    await session.commitTransaction();

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('establishment', 'name manager address phone')
      .populate('createdBy', 'fullName');

    res.status(201).json(populatedEmployee);
  } catch (error) {
    await session.abortTransaction();

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    res.status(500).json({
      message: 'Erreur lors de la création',
      error: error.message
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

    // Suppression de l'upload Cloudinary
    // On prend directement l'URL envoyée depuis le frontend
    if (updates.photo) {
      updates.photo = updates.photo;
    }

    if (updates.emergencyContact) {
      updates.emergencyContact = JSON.parse(updates.emergencyContact);
    }

    if (updates.childrenCount) {
      updates.childrenCount = parseInt(updates.childrenCount) || 0;
    }
    if (updates.salary) {
      updates.salary = parseFloat(updates.salary);
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('establishment', 'name manager address phone')
      .populate('createdBy', 'fullName');

    if (req.body.fullName || req.body.profession) {
      const cardData = await generateEmployeeCard(updatedEmployee);
      updatedEmployee.accessCard.cardImage = cardData.cardImageUrl;
      await updatedEmployee.save();
    }

    res.json(updatedEmployee);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
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
