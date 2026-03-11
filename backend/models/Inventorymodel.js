const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["in-stock", "low-stock", "out-of-stock"], default: "in-stock" },
    lastUpdated: { type: Date, default: Date.now },
  },

{ timestamps: true }

);


InventorySchema.pre("save", function (next) {
  if (this.quantity === 0) {
    this.status = "out-of-stock";
  } else if (this.quantity < 10) { 
    this.status = "low-stock";
  } else {
    this.status = "in-stock";
  }
  next();
});

InventorySchema.index({ user_id: 1, product: 1 }, { unique: true });

const Inventory= mongoose.model("Inventory", InventorySchema);
module.exports=Inventory 
