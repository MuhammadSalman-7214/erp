// models/Shipmentmodel.js - Complete Shipment Model for Multi-Country ERP

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

const shipmentDocumentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true,
    enum: [
      "Invoice",
      "Packing List",
      "Bill of Lading",
      "Certificate of Origin",
      "Insurance",
      "Customs Declaration",
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

const shipmentItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  weight: Number, // in kg
  volume: Number, // in cubic meters
});

const shipmentExpenseSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    required: true,
    enum: [
      "Freight Charges",
      "Port Charges",
      "Customs Duty",
      "Insurance",
      "Documentation",
      "Storage",
      "Transportation",
      "Agent Fee",
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
  amountInUSD: Number, // Auto-converted amount
  paidTo: String,
  paidDate: Date,
  receiptNumber: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const shipmentStatusHistorySchema = new mongoose.Schema({
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

const shipmentSchema = new mongoose.Schema(
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

    // Shipment Identification
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    referenceNumber: String, // Customer/Supplier reference

    // Shipment Type
    shipmentType: {
      type: String,
      required: true,
      enum: ["Import", "Export", "Domestic"],
    },
    transportMode: {
      type: String,
      required: true,
      enum: ["Sea", "Air", "Road", "Rail"],
    },

    // Parties Involved
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    supplierName: String,
    supplierAddress: String,
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: String,
    customerAddress: String,

    // Shipment Details
    items: [shipmentItemSchema],

    // Container/Package Details
    containerNumber: String,
    containerType: String, // 20ft, 40ft, 40ft HC
    numberOfPackages: Number,
    totalWeight: Number, // in kg
    totalVolume: Number, // in cubic meters

    // Origin & Destination
    originCountry: String,
    originPort: String,
    originAddress: String,
    destinationCountry: String,
    destinationPort: String,
    destinationAddress: String,

    // Dates
    bookingDate: Date,
    estimatedDepartureDate: Date,
    actualDepartureDate: Date,
    estimatedArrivalDate: Date,
    actualArrivalDate: Date,
    deliveryDate: Date,

    // Shipping Line/Carrier Details
    carrierName: String,
    vesselName: String, // For sea shipment
    flightNumber: String, // For air shipment
    voyageNumber: String,
    masterBillOfLading: String,
    houseBillOfLading: String,

    // Financial Details (in local currency)
    currency: {
      type: String,
      default: "USD",
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },

    // Costs
    goodsValue: {
      type: Number,
      required: true,
      default: 0,
    },
    freightCharges: {
      type: Number,
      default: 0,
    },
    insuranceCharges: {
      type: Number,
      default: 0,
    },
    customsDuty: {
      type: Number,
      default: 0,
    },
    otherExpenses: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },

    // Detailed Expenses
    expenses: [shipmentExpenseSchema],

    // Revenue (for export shipments)
    sellingPrice: {
      type: Number,
      default: 0,
    },

    // Profit/Loss
    profitLoss: {
      type: Number,
      default: 0,
    },
    profitMargin: {
      type: Number,
      default: 0,
    },

    // USD Equivalents (for super admin reports)
    goodsValueUSD: Number,
    totalCostUSD: Number,
    sellingPriceUSD: Number,
    profitLossUSD: Number,

    // Status
    status: {
      type: String,
      required: true,
      default: "Booking",
      enum: [
        "Booking",
        "Confirmed",
        "In Transit",
        "Arrived",
        "Customs Clearance",
        "Cleared",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "On Hold",
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
    statusHistory: [shipmentStatusHistorySchema],

    // Documents
    documents: [shipmentDocumentSchema],

    // Clearing Job Reference
    clearingJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClearingJob",
    },

    // Additional Info
    incoterm: {
      type: String,
      enum: ["EXW", "FOB", "CIF", "DDP", "DAP", "FCA", "CPT", "CIP"],
    },
    paymentTerms: String,
    specialInstructions: String,
    notes: String,

    // Tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    isLocked: {
      type: Boolean,
      default: false, // Lock after delivery to prevent changes
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

// Indexes for better query performance
// shipmentSchema.index({ shipmentNumber: 1 });
shipmentSchema.index({ countryId: 1, branchId: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ shipmentType: 1 });
shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ supplierId: 1 });
shipmentSchema.index({ customerId: 1 });

// Pre-save middleware to calculate totals and USD equivalents
shipmentSchema.pre("save", function (next) {
  // Calculate total cost
  const expensesTotal = this.expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0,
  );

  this.totalCost =
    this.goodsValue +
    this.freightCharges +
    this.insuranceCharges +
    this.customsDuty +
    this.otherExpenses +
    expensesTotal;

  // Calculate profit/loss
  if (this.sellingPrice > 0) {
    this.profitLoss = this.sellingPrice - this.totalCost;
    this.profitMargin =
      this.totalCost > 0 ? (this.profitLoss / this.totalCost) * 100 : 0;
  }

  // Convert to USD
  const rate = this.exchangeRate || 1;
  this.goodsValueUSD = this.goodsValue / rate;
  this.totalCostUSD = this.totalCost / rate;
  this.sellingPriceUSD = this.sellingPrice / rate;
  this.profitLossUSD = this.profitLoss / rate;

  // Convert expenses to USD
  this.expenses.forEach((expense) => {
    if (!expense.amountInUSD) {
      expense.amountInUSD = expense.amount / rate;
    }
  });

  next();
});

// Method to add status history
shipmentSchema.methods.addStatusHistory = function (status, note, userId) {
  this.statusHistory.push({
    status,
    note,
    updatedBy: userId,
    updatedAt: new Date(),
  });
  this.status = status;
  this.lastUpdatedBy = userId;
};

// Method to calculate total expenses by type
shipmentSchema.methods.getExpensesByType = function () {
  const expensesByType = {};
  this.expenses.forEach((expense) => {
    if (!expensesByType[expense.expenseType]) {
      expensesByType[expense.expenseType] = 0;
    }
    expensesByType[expense.expenseType] += expense.amount;
  });
  return expensesByType;
};

const Shipment = mongoose.model("Shipment", shipmentSchema);

module.exports = Shipment;
