const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      phone: { type: String },
      email: { type: String, lowercase: true, trim: true },
      address: { type: String, trim: true },
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    productsSupplied: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
  },
  { timestamps: true },
);

const Vendor = mongoose.model("Vendor", VendorSchema);

module.exports = Vendor;
