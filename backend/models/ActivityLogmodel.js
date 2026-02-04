const mongoose = require("mongoose");
const logger=require('../libs/logger')


const ActivityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    
    },
    description: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, 
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: false,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: false,
      index: true,
    },
    entity: {
      type: String,
      required: true,
      enum: [
        "product",
        "category",
        "order",
        "user",
        "system",
        "shipment",
        "clearingJob",
        "invoice",
        "sales",
        "supplier",
        "customer",
        "purchaseBill",
        "ledger",
        "stockTransaction",
        "inventory",
        "notification",
        "country",
        "branch",
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, 
    },
    ipAddress: {
        type: String,
        required: false,
      },
    
  },
  { timestamps: true }

);







const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

module.exports = ActivityLog;
