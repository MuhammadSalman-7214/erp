const mongoose = require("mongoose");

const RevisionSchema = new mongoose.Schema(
  {
    changes: [
      {
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],
    reason: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const InvoiceItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    client: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },

    items: {
      type: [InvoiceItemSchema],
      validate: [
        (val) => val.length > 0,
        "Invoice must have at least one item",
      ],
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },


    status: {
      type: String,
      enum: ["draft", "sent", "approved", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    workflowStatus: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Locked"],
      default: "Draft",
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lockedAt: { type: Date },
    revisions: [RevisionSchema],

    issueDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "upi", "paypal", "other"],
    },

    paidAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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
    currency: {
      type: String,
      required: true, // Local currency (PKR, AED, etc.)
      uppercase: true,
    },
    priceUSD: {
      type: Number,
      required: true, // Auto-calculated price in USD
    },
    exchangeRateUsed: {
      type: Number,
      required: true, // Snapshot of exchange rate at creation
    },
  },
  {
    timestamps: true,
  },
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);

module.exports = Invoice;
