// models/Countrymodel.js - NEW

const mongoose = require("mongoose");

const CountrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // ISO country code: PK, AE, AF, etc.
    },
    currency: {
      type: String,
      required: true,
      uppercase: true, // PKR, AED, AFN, etc.
    },
    currencySymbol: {
      type: String,
      required: true, // Rs, د.إ, ؋, etc.
    },
    exchangeRate: {
      type: Number,
      required: true,
      default: 1, // Rate to USD (set by Super Admin)
    },
    exchangeRateHistory: [
      {
        rate: Number,
        updatedAt: Date,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    countryAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      fiscalYearStart: {
        type: String,
        default: "01-01", // MM-DD format
      },
      timezone: String,
      language: {
        type: String,
        default: "en",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// CountrySchema.index({ code: 1 });
CountrySchema.index({ isActive: 1 });

const Country = mongoose.model("Country", CountrySchema);

module.exports = Country;
