const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
  },
  { timestamps: true },
);

const Customer = mongoose.model("Customer", CustomerSchema);

module.exports = Customer;
