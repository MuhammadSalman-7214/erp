const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

CounterSchema.index({ user_id: 1, key: 1 }, { unique: true });

const Counter = mongoose.model("Counter", CounterSchema);

module.exports = Counter;
