const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // use uuid v8 for CommonJS

const ProductSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    brand: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    Desciption: { type: String, required: true },
    Category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    pricing: {
      currentPurchasePrice: { type: Number, required: true, min: 0 },
      currentSalesPrice: { type: Number, required: true, min: 0 },
    },
    priceHistory: [
      {
        type: {
          type: String,
          enum: ["purchase", "sales"],
          required: true,
        },
        price: { type: Number, required: true, min: 0 },
        effectiveAt: { type: Date, default: Date.now },
      },
    ],
    Price: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    image: { type: String },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
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

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
