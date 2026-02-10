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

const PurchaseBillItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PurchaseBillSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    items: { type: [PurchaseBillItemSchema], required: true },
    subTotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "approved", "paid", "cancelled"],
      default: "draft",
    },
    workflowStatus: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Locked"],
      default: "Draft",
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: { type: Date },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lockedAt: { type: Date },
    revisions: [RevisionSchema],
    dueDate: { type: Date },
    paidAt: { type: Date },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
      index: true,
    },
    currency: { type: String, required: true },
    priceUSD: { type: Number, required: true },
    exchangeRateUsed: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const PurchaseBill = mongoose.model("PurchaseBill", PurchaseBillSchema);

module.exports = PurchaseBill;
