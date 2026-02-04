// models/Branchmodel.js - NEW

const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    branchCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // KHI-001, DXB-001, etc.
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      area: String,
      postalCode: String,
      phone: String,
      email: String,
    },
    branchAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowStockTransfer: {
        type: Boolean,
        default: true,
      },
      autoApprovalLimit: {
        type: Number,
        default: 0, // Amount limit for auto-approval
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

BranchSchema.index({ countryId: 1 });
// BranchSchema.index({ branchCode: 1 });
BranchSchema.index({ isActive: 1 });

const Branch = mongoose.model("Branch", BranchSchema);

module.exports = Branch;
