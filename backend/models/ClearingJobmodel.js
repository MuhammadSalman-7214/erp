// models/ClearingJobmodel.js - Complete Clearing Job Model for Multi-Country ERP

const mongoose = require("mongoose");

const RevisionSchema = new mongoose.Schema(
  {
    changes: [
      {
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],
    reason: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const clearingJobNoteSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  isInternal: {
    type: Boolean,
    default: false, // Internal notes visible only to admin/staff
  },
});

const clearingJobDocumentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true,
    enum: [
      "Customs Declaration",
      "Tax Payment Receipt",
      "Release Order",
      "Inspection Certificate",
      "Duty Assessment",
      "Import Permit",
      "Export Permit",
      "Other",
    ],
  },
  documentName: {
    type: String,
    required: true,
  },
  documentUrl: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const clearingJobExpenseSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    required: true,
    enum: [
      "Agent Fee",
      "Customs Duty",
      "VAT/Tax",
      "Documentation Fee",
      "Inspection Fee",
      "Storage Charges",
      "Demurrage",
      "Other",
    ],
  },
  description: String,
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "USD",
  },
  amountInUSD: Number,
  paidTo: String,
  receiptNumber: String,
  paidDate: Date,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const clearingJobStatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  note: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const clearingJobSchema = new mongoose.Schema(
  {
    // Hierarchy References
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    // Job Identification
    jobNumber: {
      type: String,
      required: true,
      unique: true,
    },
    referenceNumber: String,

    // Related Shipment
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
    },

    // Agent Assignment
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // User with role 'agent'
    },
    agentName: String,
    agentContact: String,
    assignedDate: Date,

    // Job Type
    jobType: {
      type: String,
      required: true,
      enum: ["Import Clearance", "Export Clearance"],
    },

    // Customs Details
    customsOffice: String,
    declarationNumber: String,
    declarationDate: Date,
    customsOfficer: String,

    // Financial Details (in local currency)
    currency: {
      type: String,
      default: "USD",
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },

    // Duties & Taxes
    assessedValue: Number,
    customsDuty: {
      type: Number,
      default: 0,
    },
    vatAmount: {
      type: Number,
      default: 0,
    },
    otherTaxes: {
      type: Number,
      default: 0,
    },
    totalDutiesAndTaxes: {
      type: Number,
      default: 0,
    },

    // Agent Charges
    agentFee: {
      type: Number,
      default: 0,
    },
    documentationFee: {
      type: Number,
      default: 0,
    },
    otherCharges: {
      type: Number,
      default: 0,
    },
    totalAgentCharges: {
      type: Number,
      default: 0,
    },

    // Total Cost
    totalClearingCost: {
      type: Number,
      default: 0,
    },

    // Detailed Expenses
    expenses: [clearingJobExpenseSchema],

    // USD Equivalents
    totalClearingCostUSD: Number,
    customsDutyUSD: Number,
    agentFeeUSD: Number,

    // Status
    status: {
      type: String,
      required: true,
      default: "Pending",
      enum: [
        "Pending",
        "Assigned",
        "Documents Submitted",
        "Under Inspection",
        "Duties Assessed",
        "Payment Pending",
        "Payment Completed",
        "Goods Released",
        "Completed",
        "On Hold",
        "Cancelled",
      ],
    },
    workflowStatus: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Locked"],
      default: "Draft",
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lockedAt: { type: Date },
    revisions: [RevisionSchema],
    statusHistory: [clearingJobStatusHistorySchema],

    // Important Dates
    submissionDate: Date,
    inspectionDate: Date,
    assessmentDate: Date,
    paymentDate: Date,
    releaseDate: Date,
    completionDate: Date,
    expectedCompletionDate: Date,

    // Documents
    documents: [clearingJobDocumentSchema],

    // Communication
    notes: [clearingJobNoteSchema],
    specialInstructions: String,

    // Priority
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },

    // Tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
// clearingJobSchema.index({ jobNumber: 1 });
clearingJobSchema.index({ countryId: 1, branchId: 1 });
clearingJobSchema.index({ shipmentId: 1 });
clearingJobSchema.index({ agentId: 1 });
clearingJobSchema.index({ status: 1 });
clearingJobSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
clearingJobSchema.pre("save", function (next) {
  // Calculate total duties and taxes
  this.totalDutiesAndTaxes =
    (this.customsDuty || 0) + (this.vatAmount || 0) + (this.otherTaxes || 0);

  // Calculate total agent charges
  this.totalAgentCharges =
    (this.agentFee || 0) +
    (this.documentationFee || 0) +
    (this.otherCharges || 0);

  // Calculate expenses total
  const expensesTotal = this.expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0,
  );

  // Calculate total clearing cost
  this.totalClearingCost =
    this.totalDutiesAndTaxes + this.totalAgentCharges + expensesTotal;

  // Convert to USD
  const rate = this.exchangeRate || 1;
  this.totalClearingCostUSD = this.totalClearingCost / rate;
  this.customsDutyUSD = (this.customsDuty || 0) / rate;
  this.agentFeeUSD = (this.agentFee || 0) / rate;

  // Convert expenses to USD
  this.expenses.forEach((expense) => {
    if (!expense.amountInUSD) {
      expense.amountInUSD = expense.amount / rate;
    }
  });

  // Mark as completed if status is Completed
  if (this.status === "Completed" && !this.isCompleted) {
    this.isCompleted = true;
    this.completionDate = new Date();
  }

  next();
});

// Method to add status history
clearingJobSchema.methods.addStatusHistory = function (status, note, userId) {
  this.statusHistory.push({
    status,
    note,
    updatedBy: userId,
    updatedAt: new Date(),
  });
  this.status = status;
  this.lastUpdatedBy = userId;

  // Auto-set dates based on status
  const now = new Date();
  switch (status) {
    case "Documents Submitted":
      this.submissionDate = now;
      break;
    case "Under Inspection":
      this.inspectionDate = now;
      break;
    case "Duties Assessed":
      this.assessmentDate = now;
      break;
    case "Payment Completed":
      this.paymentDate = now;
      break;
    case "Goods Released":
      this.releaseDate = now;
      break;
    case "Completed":
      this.completionDate = now;
      this.isCompleted = true;
      break;
  }
};

// Method to add note
clearingJobSchema.methods.addNote = function (
  message,
  userId,
  isInternal = false,
) {
  this.notes.push({
    message,
    addedBy: userId,
    addedAt: new Date(),
    isInternal,
  });
  this.lastUpdatedBy = userId;
};

// Method to assign agent
clearingJobSchema.methods.assignAgent = function (
  agentId,
  agentName,
  agentContact,
  userId,
) {
  this.agentId = agentId;
  this.agentName = agentName;
  this.agentContact = agentContact;
  this.assignedDate = new Date();
  this.lastUpdatedBy = userId;

  // Update status to Assigned if it's Pending
  if (this.status === "Pending") {
    this.addStatusHistory(
      "Assigned",
      `Assigned to agent: ${agentName}`,
      userId,
    );
  }
};

// Method to calculate total expenses by type
clearingJobSchema.methods.getExpensesByType = function () {
  const expensesByType = {};
  this.expenses.forEach((expense) => {
    if (!expensesByType[expense.expenseType]) {
      expensesByType[expense.expenseType] = 0;
    }
    expensesByType[expense.expenseType] += expense.amount;
  });
  return expensesByType;
};

const ClearingJob = mongoose.model("ClearingJob", clearingJobSchema);

module.exports = ClearingJob;
