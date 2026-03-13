const mongoose = require("mongoose");

const StockTranscationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    productCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCode",
      required: true,
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
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    sourceModel: {
      type: String,
      enum: ["manual", "order", "sale"],
      default: "manual",
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

const StockTranscation = mongoose.model(
  "StockTranscation",
  StockTranscationSchema,
);

module.exports = StockTranscation;
