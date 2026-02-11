const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      phone: { type: String, trim: true },
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
  },
  { timestamps: true },
);

const Customer = mongoose.model("Customer", CustomerSchema);

module.exports = Customer;
