const Invoice = require("../models/Invoicemodel");
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

module.exports.createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceType,
      customer,
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
        ? await getNextInvoiceNumber("SI")
        : await getNextInvoiceNumber("PI"));

    const invoice = await Invoice.create({
      invoiceNumber: resolvedInvoiceNumber,
      invoiceType,
      customer: customer || client,
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate("vendor").sort({
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
    const invoice = await Invoice.findOne({
      _id: req.params.id,
    }).populate("vendor");

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
    let invoice = await Invoice.findOne({
      _id: req.params.id,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const items = req.body.items || invoice.items;
    const taxRate = req.body.taxRate ?? invoice.taxRate;
    const discount = req.body.discount ?? invoice.discount;

    const totals = calculateTotals(items, taxRate, discount);

    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
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
    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: req.params.id,
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
