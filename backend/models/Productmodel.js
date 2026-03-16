const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // use uuid v8 for CommonJS

const ProductSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    company: { type: String, trim: true },
    brand: { type: String, trim: true },
    Category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    purchasePrice: { type: Number, min: 0, default: 0 },
    tradePrice: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0, default: 0 },
    pricing: {
      currentPurchasePrice: { type: Number, min: 0 },
      currentSalesPrice: { type: Number, min: 0 },
      currentTradePrice: { type: Number, min: 0 },
    },
    priceHistory: [
      {
        type: {
          type: String,
          enum: ["purchase", "sales", "trade"],
          required: true,
        },
        price: { type: Number, required: true, min: 0 },
        effectiveAt: { type: Date, default: Date.now },
      },
    ],
    Price: { type: Number },
    image: { type: String },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    sku: {
      type: String,
      default: () => uuidv4(), // automatically generate unique SKU
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ProductSchema.index({ user_id: 1, name: 1, company: 1 }, { unique: true });
ProductSchema.index({ user_id: 1, sku: 1 }, { unique: true });

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
