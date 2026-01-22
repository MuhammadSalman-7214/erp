import Invoice from "../models/Invoicemodel.js";

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

export const createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      client,
      items,
      taxRate,
      discount,
      currency,
      dueDate,
      notes,
      paymentMethod,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Invoice must have items" });
    }

    const totals = calculateTotals(items, taxRate, discount);

    const invoice = await Invoice.create({
      invoiceNumber,
      client,
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

export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({
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

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
    });

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

export const updateInvoice = async (req, res) => {
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

export const deleteInvoice = async (req, res) => {
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

export const markInvoiceAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
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
