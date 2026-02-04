const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true, // Every entry MUST belong to a branch
      index: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true, // Denormalized for quick filtering
      index: true,
    },
    // currency: {
    //   type: String,
    //   required: true, // Local currency (PKR, AED, etc.)
    // },
    // priceUSD: {
    //   type: Number,
    //   required: true, // Auto-calculated price in USD
    // },
    // exchangeRateUsed: {
    //   type: Number,
    //   required: true, // Snapshot of exchange rate at creation
    // },
  },

  { timestamps: true },
);

const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
