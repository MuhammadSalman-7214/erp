const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      default: undefined,
      set: (value) => {
        if (value === null || value === undefined) return undefined;
        const trimmed = String(value).trim();
        return trimmed === "" ? undefined : trimmed.toUpperCase();
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      phone: { type: String, trim: true },
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

CustomerSchema.index({ user_id: 1, customerCode: 1 }, { unique: true, sparse: true });

const Customer = mongoose.model("Customer", CustomerSchema);

module.exports = Customer;
