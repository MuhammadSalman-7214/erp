const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema(
  {
    globalAccountingLockUntil: {
      type: Date,
      default: null,
    },
    numbering: {
      type: Object,
      default: {},
    },
    taxLogic: {
      type: Object,
      default: {},
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const SystemSettings = mongoose.model("SystemSettings", SystemSettingsSchema);

module.exports = SystemSettings;
