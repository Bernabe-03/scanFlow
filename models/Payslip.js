import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, "L'employé est requis"]
    },
    establishment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Establishment',
      required: [true, "L'établissement est requis"]
    },
    period: {
      month: {
        type: Number,
        required: [true, 'Le mois est requis'],
        min: [1, 'Le mois doit être entre 1 et 12'],
        max: [12, 'Le mois doit être entre 1 et 12']
      },
      year: {
        type: Number,
        required: [true, "L'année est requise"],
        min: [2020, "L'année doit être réaliste"]
      }
    },
    baseSalary: { type: Number, required: true, min: 0 },
    hoursWorked: { type: Number, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    overtimeRate: { type: Number, default: 0, min: 0 },
    bonuses: { type: Number, default: 0, min: 0 },
    commissions: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    otherEarnings: { type: Number, default: 0, min: 0 },
    cnpsSalarial: { type: Number, default: 0, min: 0 },
    cnpsEmployeur: { type: Number, default: 0, min: 0 },
    incomeTax: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    advances: { type: Number, default: 0, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netSalary: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'generated', 'paid'],
      default: 'draft'
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    currency: { type: String, default: 'XOF', enum: ['XOF'] },
    employeeCnpsNumber: String
  },
  { timestamps: true }
);

payslipSchema.index(
  { employee: 1, 'period.month': 1, 'period.year': 1 },
  { unique: true, name: 'unique_payslip_per_employee_per_period' }
);

payslipSchema.pre('save', function (next) {
  if (this.grossSalary < this.totalDeductions) {
    this.totalDeductions = this.grossSalary;
    this.netSalary = 0;
  } else {
    this.netSalary = this.grossSalary - this.totalDeductions;
  }
  next();
});

export default mongoose.model('Payslip', payslipSchema);
