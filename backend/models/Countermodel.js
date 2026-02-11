const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const Counter = mongoose.model("Counter", CounterSchema);

module.exports = Counter;
