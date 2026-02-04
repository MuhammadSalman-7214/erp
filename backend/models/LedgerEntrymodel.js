const mongoose = require("mongoose");

const LedgerEntrySchema = new mongoose.Schema(
  {
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const LedgerEntry = mongoose.model("LedgerEntry", LedgerEntrySchema);

module.exports = LedgerEntry;
