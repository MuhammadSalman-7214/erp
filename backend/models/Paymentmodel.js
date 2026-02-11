const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["received", "paid"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "upi", "paypal", "other"],
      default: "cash",
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    invoiceType: {
      type: String,
      enum: ["sales", "purchase"],
    },
    partyType: {
      type: String,
      enum: ["customer", "vendor"],
      required: true,
    },
    customer: {
      code: { type: String, trim: true },
      name: { type: String, trim: true },
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

const Payment = mongoose.model("Payment", PaymentSchema);

module.exports = Payment;
