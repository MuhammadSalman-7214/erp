const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // use uuid v8 for CommonJS

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    Desciption: { type: String, required: true },
    Category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    Price: { type: Number, required: true },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      // required: true, // Every entry MUST belong to a branch
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
    currencySymbol: {
      type: String,
      required: true,
    },
    priceUSD: {
      type: Number,
      required: true, // Auto-calculated price in USD
    },
    exchangeRateUsed: {
      type: Number,
      required: true, // Snapshot of exchange rate at creation
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: { type: Number, default: 0 },
    image: { type: String },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    sku: {
      type: String,
      unique: true,
      default: () => uuidv4(), // automatically generate unique SKU
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
ProductSchema.index({ branchId: 1, countryId: 1 });
ProductSchema.index({ status: 1 });
const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
