const mongoose = require("mongoose");

const ProductCodeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    variantName: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ProductCodeSchema.index({ user_id: 1, code: 1 }, { unique: true });
ProductCodeSchema.index({ user_id: 1, product: 1 });

const ProductCode = mongoose.model("ProductCode", ProductCodeSchema);
module.exports = ProductCode;
