const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    contactInfo: {
      phone: { type: String },
      email: { type: String },
      address: { type: String },
    },
    productsSupplied: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
  },
  { timestamps: true },
);

const Supplier = mongoose.model("Supplier", SupplierSchema);

module.exports = Supplier;
