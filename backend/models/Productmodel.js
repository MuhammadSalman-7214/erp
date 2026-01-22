const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // use uuid v8 for CommonJS

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    Desciption: { type: String, required: true },
    Category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    Price: { type: Number, required: true },
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

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
