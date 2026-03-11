const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
  },

{ timestamps: true }

);

CategorySchema.index({ user_id: 1, name: 1 }, { unique: true });

const Category= mongoose.model("Category", CategorySchema);

module.exports =Category
