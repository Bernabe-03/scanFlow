import mongoose from 'mongoose';
import Payslip from '../models/Payslip.js';
import Employee from '../models/Employee.js';

export const getPayslips = async (req, res) => {
  try {
    const payslips = await Payslip.find({
      establishment: req.user.establishment
    })
      .populate('employee', 'firstName lastName position profession fullName cnpsNumber')
      .populate('establishment', 'name address city phone')
      .sort({ 'period.year': -1, 'period.month': -1 });

    res.json(payslips);
  } catch (error) {
    console.error('Erreur récupération bulletins:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getEmployeePayslips = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Vérification des droits
    if (req.user.role === 'employee' && req.user.employeeId !== req.params.employeeId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    if (req.user.role === 'manager' && employee.establishment.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const payslips = await Payslip.find({ employee: req.params.employeeId })
      .populate('establishment', 'name address')
      .populate('employee', 'firstName lastName position profession fullName cnpsNumber')
      .sort({ 'period.year': -1, 'period.month': -1 });

    res.json(payslips);
  } catch (error) {
    console.error('Erreur récupération bulletins employé:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createPayslip = async (req, res) => {
  try {
    console.log('📥 Données reçues:', JSON.stringify(req.body, null, 2));
    console.log('👤 User établissement:', req.user.establishment);
    console.log('🔍 ID employé reçu:', req.body.employee);

    // Validation ID employé avec logs détaillés
    if (!req.body.employee) {
      console.log('❌ ERREUR: Employee ID est undefined/null');
      return res.status(400).json({ 
        message: 'ID employé manquant',
        details: 'Le champ employee est requis mais non fourni'
      });
    }

    const employeeId = req.body.employee.toString().trim();
    
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.log('❌ ERREUR: Employee ID invalide:', employeeId);
      return res.status(400).json({ 
        message: 'ID employé invalide - Format incorrect',
        receivedId: employeeId,
        details: 'L\'ID doit être un ObjectId MongoDB valide'
      });
    }

    // Vérification existence de l'employé avec plus de détails
    const employeeData = await Employee.findById(employeeId);
    if (!employeeData) {
      console.log('❌ ERREUR: Employé non trouvé avec ID:', employeeId);
      return res.status(404).json({ 
        message: 'Employé non trouvé',
        employeeId: employeeId
      });
    }

    console.log('✅ Employé trouvé:', {
      id: employeeData._id,
      nom: employeeData.fullName,
      établissement: employeeData.establishment
    });

    // ✅ CORRECTION CRITIQUE : Extraction de l'ID d'établissement
    const userEstablishmentId = req.user.establishment._id 
      ? req.user.establishment._id.toString() 
      : req.user.establishment.toString();

    const employeeEstablishmentId = employeeData.establishment.toString();

    console.log('🔍 Comparaison établissements:', {
      employeeEstablishment: employeeEstablishmentId,
      userEstablishment: userEstablishmentId,
      types: {
        employee: typeof employeeData.establishment,
        user: typeof req.user.establishment,
        userHas_id: !!req.user.establishment._id
      }
    });

    // Vérification d'appartenance à l'établissement
    if (employeeEstablishmentId !== userEstablishmentId) {
      console.log('❌ ERREUR: Employé ne fait pas partie de cet établissement');
      return res.status(403).json({ 
        message: 'Employé non trouvé dans votre établissement',
        employeeEstablishment: employeeEstablishmentId,
        userEstablishment: userEstablishmentId
      });
    }
    // Validation de la période
    if (!req.body.period || !req.body.period.month || !req.body.period.year) {
      return res.status(400).json({ 
        message: 'Période manquante ou incomplète',
        details: 'Les champs period.month et period.year sont requis'
      });
    }

    const { month, year } = req.body.period;
    if (month < 1 || month > 12) {
      return res.status(400).json({ 
        message: 'Mois invalide',
        details: 'Le mois doit être entre 1 et 12'
      });
    }

    if (year < 2020 || year > new Date().getFullYear() + 1) {
      return res.status(400).json({ 
        message: 'Année invalide',
        details: 'L\'année doit être réaliste'
      });
    }

    // Vérification des doublons
    const existingPayslip = await Payslip.findOne({
      employee: employeeId,
      'period.month': month,
      'period.year': year
    });

    if (existingPayslip) {
      return res.status(409).json({
        message: 'Un bulletin existe déjà pour cet employé et cette période',
        existingPayslipId: existingPayslip._id
      });
    }

    // Conversion sécurisée des nombres
    const safeNumber = (value) => {
      if (value === '' || value === null || value === undefined) return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : Math.max(0, num); // Éviter les nombres négatifs
    };

    // Extraction des données avec valeurs par défaut
    const {
      period,
      baseSalary = 0,
      hoursWorked = 0,
      overtimeHours = 0,
      overtimeRate = 0,
      bonuses = 0,
      commissions = 0,
      allowances = 0,
      otherEarnings = 0,
      incomeTax = 0,
      otherDeductions = 0,
      advances = 0,
      paymentDate,
      status = 'draft',
      grossSalary, // Optionnel - peut être calculé
      totalDeductions, // Optionnel - peut être calculé
      netSalary // Optionnel - peut être calculé
    } = req.body;

    // Calculs salariaux
    const calculatedBaseSalary = safeNumber(baseSalary);
    const calculatedOvertime = safeNumber(overtimeHours) * safeNumber(overtimeRate);
    
    const calculatedGrossSalary = grossSalary || 
      (calculatedBaseSalary +
        calculatedOvertime +
        safeNumber(bonuses) +
        safeNumber(commissions) +
        safeNumber(allowances) +
        safeNumber(otherEarnings));

    // Calculs CNPS
    const cnpsSalarial = Math.round(calculatedGrossSalary * 0.048 * 100) / 100; // 4.8%
    const cnpsEmployeur = Math.round(calculatedGrossSalary * 0.096 * 100) / 100; // 9.6%

    // Calcul des déductions totales
    const calculatedTotalDeductions = totalDeductions ||
      (cnpsSalarial +
        safeNumber(incomeTax) +
        safeNumber(otherDeductions) +
        safeNumber(advances));

    // Calcul du net à payer
    const calculatedNetSalary = netSalary || 
      Math.max(0, calculatedGrossSalary - calculatedTotalDeductions);

    // Construction de l'objet payslip
    const payslipData = {
      employee: employeeId,
      establishment: req.user.establishment,
      period: {
        month: Number(month),
        year: Number(year)
      },
      baseSalary: calculatedBaseSalary,
      hoursWorked: safeNumber(hoursWorked),
      overtimeHours: safeNumber(overtimeHours),
      overtimeRate: safeNumber(overtimeRate),
      bonuses: safeNumber(bonuses),
      commissions: safeNumber(commissions),
      allowances: safeNumber(allowances),
      otherEarnings: safeNumber(otherEarnings),
      incomeTax: safeNumber(incomeTax),
      otherDeductions: safeNumber(otherDeductions),
      advances: safeNumber(advances),
      cnpsSalarial,
      cnpsEmployeur,
      grossSalary: calculatedGrossSalary,
      totalDeductions: calculatedTotalDeductions,
      netSalary: calculatedNetSalary,
      paymentDate: paymentDate || null,
      status: status,
      generatedBy: req.user.id,
      currency: 'XOF',
      employeeCnpsNumber: employeeData.cnpsNumber || ''
    };

    console.log('💾 Création du bulletin avec données:', payslipData);

    // Création et sauvegarde
    const payslip = new Payslip(payslipData);
    await payslip.save();
    
    // Populate pour la réponse
    await payslip.populate('employee', 'firstName lastName position profession fullName cnpsNumber');
    await payslip.populate('establishment', 'name address city phone');

    console.log('✅ Bulletin créé avec succès:', payslip._id);
    
    res.status(201).json({
      message: 'Bulletin créé avec succès',
      payslip
    });
    
  } catch (error) {
    console.error('❌ Erreur création bulletin:', error);

    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors,
        details: 'Vérifiez que tous les champs requis sont fournis et valides'
      });
    }

    // Gestion des doublons
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Un bulletin existe déjà pour cet employé et cette période',
        details: 'Chaque employé ne peut avoir qu\'un bulletin par mois'
      });
    }

    // Erreur serveur générique
    res.status(500).json({
      message: 'Erreur serveur lors de la création du bulletin',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

export const getPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employee', 'firstName lastName position email phone profession fullName cnpsNumber')
      .populate('establishment', 'name address city phone')
      .populate('generatedBy', 'firstName lastName');

    if (!payslip) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérification des droits d'accès
    if (req.user.role === 'employee' && payslip.employee._id.toString() !== req.user.employeeId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    if (req.user.role === 'manager' && payslip.establishment._id.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json(payslip);
  } catch (error) {
    console.error('Erreur récupération bulletin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updatePayslip = async (req, res) => {
  try {
    console.log('📥 Mise à jour bulletin:', req.params.id, req.body);

    const payslip = await Payslip.findById(req.params.id);
    
    if (!payslip) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérification des droits
    if (payslip.establishment.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Conversion sécurisée
    const safeNumber = (value) => {
      if (value === '' || value === null || value === undefined) return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    // Préparation des données de mise à jour
    const updateData = { ...req.body };
    
    // Recalcul si nécessaire
    if (req.body.baseSalary || req.body.overtimeHours || req.body.overtimeRate || 
        req.body.bonuses || req.body.commissions || req.body.allowances || req.body.otherEarnings) {
      
      const baseSalary = safeNumber(req.body.baseSalary) || payslip.baseSalary;
      const overtimeHours = safeNumber(req.body.overtimeHours) || payslip.overtimeHours;
      const overtimeRate = safeNumber(req.body.overtimeRate) || payslip.overtimeRate;
      const bonuses = safeNumber(req.body.bonuses) || payslip.bonuses;
      const commissions = safeNumber(req.body.commissions) || payslip.commissions;
      const allowances = safeNumber(req.body.allowances) || payslip.allowances;
      const otherEarnings = safeNumber(req.body.otherEarnings) || payslip.otherEarnings;

      updateData.grossSalary = baseSalary + 
        (overtimeHours * overtimeRate) + 
        bonuses + commissions + allowances + otherEarnings;
    }

    // Recalcul CNPS
    if (updateData.grossSalary) {
      updateData.cnpsSalarial = Math.round(updateData.grossSalary * 0.048 * 100) / 100;
      updateData.cnpsEmployeur = Math.round(updateData.grossSalary * 0.096 * 100) / 100;
    }

    // Recalcul déductions totales
    const incomeTax = safeNumber(req.body.incomeTax) || payslip.incomeTax;
    const otherDeductions = safeNumber(req.body.otherDeductions) || payslip.otherDeductions;
    const advances = safeNumber(req.body.advances) || payslip.advances;
    
    updateData.totalDeductions = updateData.cnpsSalarial + incomeTax + otherDeductions + advances;
    updateData.netSalary = Math.max(0, updateData.grossSalary - updateData.totalDeductions);

    const updatedPayslip = await Payslip.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName position profession fullName cnpsNumber');

    res.json({
      message: 'Bulletin mis à jour avec succès',
      payslip: updatedPayslip
    });
    
  } catch (error) {
    console.error('Erreur mise à jour bulletin:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors
      });
    }

    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deletePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    if (payslip.establishment.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await Payslip.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bulletin supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression bulletin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const downloadPayslipPDF = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employee', 'firstName lastName position profession fullName cnpsNumber code isActive')
      .populate('establishment', 'name address city phone cnpsNumber rccmNumber')
      .populate('generatedBy', 'firstName lastName');

    if (!payslip) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérification des droits
    if (req.user.role === 'employee' && payslip.employee._id.toString() !== req.user.employeeId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    if (req.user.role === 'manager' && payslip.establishment._id.toString() !== req.user.establishment.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Pour l'instant, retourner les données JSON en attendant l'implémentation PDF
    // Vous pouvez intégrer une librairie PDF comme pdfkit ou puppeteer ici
    res.json({
      message: 'Fonction PDF à implémenter avec une librairie de génération PDF',
      payslip,
      status: 'success'
    });

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};