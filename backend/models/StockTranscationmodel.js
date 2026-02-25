const mongoose = require("mongoose");

const StockTranscationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    type: {
      type: String,
      enum: ["Stock-in", "Stock-out"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: ["order", "sale", "manual"],
      default: "manual",
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true, // Every entry MUST belong to a branch
      index: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true, // Denormalized for quick filtering
      index: true,
    },
    currency: {
      type: String,
      required: true, // Local currency (PKR, AED, etc.)
    },
    priceUSD: {
      type: Number,
      required: true, // Auto-calculated price in USD
    },
    exchangeRateUsed: {
      type: Number,
      required: true, // Snapshot of exchange rate at creation
    },
  },
  { timestamps: true },
);

const StockTranscation = mongoose.model(
  "StockTranscation",
  StockTranscationSchema,
);

module.exports = StockTranscation;
