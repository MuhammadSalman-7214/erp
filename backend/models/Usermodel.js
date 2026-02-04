// models/Usermodel.js - FIXED

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      // REMOVE: index: true (if you have it)
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "countryadmin", "branchadmin", "staff", "agent"],
      default: "staff",
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    ProfilePic: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Indexes - ONLY USE schema.index(), not both
UserSchema.index({ role: 1 });
UserSchema.index({ countryId: 1 });
UserSchema.index({ branchId: 1 });

const User = mongoose.model("User", UserSchema);

module.exports = User;
