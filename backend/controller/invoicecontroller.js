const Invoice = require("../models/Invoicemodel");
const Customer = require("../models/Customermodel");
const Vendor = require("../models/Suppliermodel");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");

/**
 * Utility: Calculate invoice totals
 */
const calculateTotals = (items, taxRate = 0, discount = 0) => {
  const subTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const taxAmount = (subTotal * taxRate) / 100;
  const totalAmount = subTotal + taxAmount - discount;

  return {
    subTotal,
    taxAmount,
    totalAmount,
  };
};

const resolveCustomerPayload = async ({
  invoiceType,
  customerId,
  customer,
  userId,
}) => {
  if (invoiceType !== "sales") {
    return {
      resolvedCustomerId: undefined,
      resolvedCustomerSnapshot: undefined,
    };
  }

  if (customerId) {
    const customerDoc = await Customer.findOne({
      _id: customerId,
      user_id: userId,
    });
    if (!customerDoc) {
      const error = new Error("Customer not found");
      error.statusCode = 404;
      throw error;
    }

    return {
      resolvedCustomerId: customerDoc._id,
      resolvedCustomerSnapshot: {
        code: customerDoc.customerCode || "",
        name: customerDoc.name,
        email: customerDoc.contactInfo?.email || "",
        phone: customerDoc.contactInfo?.phone || "",
        address: customerDoc.contactInfo?.address || "",
      },
    };
  }

  return {
    resolvedCustomerId: undefined,
    resolvedCustomerSnapshot: customer,
  };
};

module.exports.createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceType,
      customer,
      customerId,
      client,
      vendor,
      items,
      taxRate,
      discount,
      currency,
      dueDate,
      notes,
      paymentMethod,
      status,
    } = req.body;
    const userId = req.user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Invoice must have items" });
    }
    if (!invoiceType) {
      return res.status(400).json({ message: "Invoice type is required" });
    }

    const totals = calculateTotals(items, taxRate, discount);

    const resolvedInvoiceNumber =
      invoiceNumber ||
      (invoiceType === "sales"
        ? await getNextInvoiceNumber("SI", userId)
        : await getNextInvoiceNumber("PI", userId));

    const { resolvedCustomerId, resolvedCustomerSnapshot } =
      await resolveCustomerPayload({
        invoiceType,
        customerId,
        customer: customer || client,
        userId,
      });

    if (vendor) {
      const vendorDoc = await Vendor.findOne({ _id: vendor, user_id: userId });
      if (!vendorDoc) {
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    const invoice = await Invoice.create({
      user_id: userId,
      invoiceNumber: resolvedInvoiceNumber,
      invoiceType,
      customerId: resolvedCustomerId,
      customer: resolvedCustomerSnapshot,
      vendor,
      items: items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
      taxRate,
      discount,
      currency,
      dueDate,
      notes,
      paymentMethod,
      status,
      ...totals,
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.getAllInvoices = async (req, res) => {
  try {
    const userId = req.user.userId;
    const invoices = await Invoice.find({ user_id: userId })
      .populate("vendor")
      .populate("customerId")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.getInvoiceById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user_id: userId,
    })
      .populate("vendor")
      .populate("customerId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.updateInvoice = async (req, res) => {
  try {
    const userId = req.user.userId;
    let invoice = await Invoice.findOne({
      _id: req.params.id,
      user_id: userId,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const items = req.body.items || invoice.items;
    const taxRate = req.body.taxRate ?? invoice.taxRate;
    const discount = req.body.discount ?? invoice.discount;

    const totals = calculateTotals(items, taxRate, discount);

    const { resolvedCustomerId, resolvedCustomerSnapshot } =
      await resolveCustomerPayload({
        invoiceType: req.body.invoiceType || invoice.invoiceType,
        customerId: req.body.customerId || invoice.customerId,
        customer: req.body.customer || invoice.customer,
        userId,
      });

    if (req.body.vendor) {
      const vendorDoc = await Vendor.findOne({
        _id: req.body.vendor,
        user_id: userId,
      });
      if (!vendorDoc) {
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user_id: userId },
      {
        ...req.body,
        customerId: resolvedCustomerId,
        customer: resolvedCustomerSnapshot,
        items: items.map((item) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
        ...totals,
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.deleteInvoice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      user_id: userId,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.markInvoiceAsPaid = async (req, res) => {
  try {
    const userId = req.user.userId;
    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: userId,
      },
      {
        status: "paid",
        paidAt: new Date(),
      },
      { new: true },
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
