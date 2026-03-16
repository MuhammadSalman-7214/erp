const mongoose = require("mongoose");

const CategoryCodeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    variantName: { type: String, default: "", trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

CategoryCodeSchema.index(
  { user_id: 1, category: 1, code: 1, variantName: 1 },
  { unique: true },
);
CategoryCodeSchema.index({ user_id: 1, category: 1 });

const CategoryCode = mongoose.model("CategoryCode", CategoryCodeSchema);
module.exports = CategoryCode;
