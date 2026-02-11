const mongoose = require("mongoose");
const SaleSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true },
    customerCode: { type: String, trim: true },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "creditcard", "banktransfer"],
      required: true,
    },
    invoiceUrl: { type: String },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    stockOutRecorded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Sale = mongoose.model("Sale", SaleSchema);

module.exports = Sale;
