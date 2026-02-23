const mongoose = require("mongoose");

const LedgerEntrySchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["SUPPLIER", "CUSTOMER"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "entityTypeRef",
    },
    entityTypeRef: {
      type: String,
      enum: ["Supplier", "Customer"],
    },
    transactionType: {
      type: String,
      enum: [
        "PURCHASE",
        "SALE",
        "SUPPLIER_PAYMENT",
        "CUSTOMER_PAYMENT",
        "REFUND",
        "ADJUSTMENT",
      ],
    },
    debitAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    partyType: {
      type: String,
      enum: ["customer", "supplier"],
      required: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "partyType",
    },
    entryType: {
      type: String,
      enum: ["invoice", "payment", "purchase", "refund", "adjustment"],
      required: true,
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    currency: { type: String, required: true },
    amountUSD: { type: Number, required: true },
    exchangeRateUsed: { type: Number, required: true },
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
    referenceType: { type: String },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

LedgerEntrySchema.pre("validate", function syncLedgerAliases(next) {
  if (!this.entityType && this.partyType) {
    this.entityType = this.partyType === "supplier" ? "SUPPLIER" : "CUSTOMER";
  }
  if (!this.partyType && this.entityType) {
    this.partyType = this.entityType === "SUPPLIER" ? "supplier" : "customer";
  }

  if (!this.entityId && this.partyId) this.entityId = this.partyId;
  if (!this.partyId && this.entityId) this.partyId = this.entityId;

  if (!this.debitAmount && this.debit) this.debitAmount = this.debit;
  if (!this.creditAmount && this.credit) this.creditAmount = this.credit;
  if (!this.debit && this.debitAmount) this.debit = this.debitAmount;
  if (!this.credit && this.creditAmount) this.credit = this.creditAmount;

  if (!this.transactionType && this.entryType) {
    const map = {
      purchase: "PURCHASE",
      invoice: "SALE",
      payment:
        this.partyType === "supplier" ? "SUPPLIER_PAYMENT" : "CUSTOMER_PAYMENT",
      refund: "REFUND",
      adjustment: "ADJUSTMENT",
    };
    this.transactionType = map[this.entryType] || "ADJUSTMENT";
  }
  if (!this.entryType && this.transactionType) {
    const map = {
      PURCHASE: "purchase",
      SALE: "invoice",
      SUPPLIER_PAYMENT: "payment",
      CUSTOMER_PAYMENT: "payment",
      REFUND: "refund",
      ADJUSTMENT: "adjustment",
    };
    this.entryType = map[this.transactionType] || "adjustment";
  }

  if (!this.entityTypeRef && this.entityType) {
    this.entityTypeRef = this.entityType === "SUPPLIER" ? "Supplier" : "Customer";
  }

  next();
});

const LedgerEntry = mongoose.model("LedgerEntry", LedgerEntrySchema);

module.exports = LedgerEntry;
