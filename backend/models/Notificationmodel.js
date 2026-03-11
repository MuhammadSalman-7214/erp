const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    type: { type: String, required: true },
    read: { type: Boolean, default: false }, // track read/unread
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
