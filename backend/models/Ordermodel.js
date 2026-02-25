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

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    Description: {
      type: String,
      required: true,
    },
    Product: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      unitPrice: {
        type: Number,
        default: 0,
      },
      purchasePrice: {
        type: Number,
        default: 0,
      },
    },

    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered"],
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
    isLocked: { type: Boolean, default: false },
    revisions: [RevisionSchema],

    invoiceUrl: {
      type: String,
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
