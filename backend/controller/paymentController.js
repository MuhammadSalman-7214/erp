const Payment = require("../models/Paymentmodel");
const Invoice = require("../models/Invoicemodel");

const createPayment = async (req, res) => {
  try {
    const {
      type,
      amount,
      method,
      invoice,
      partyType,
      customer,
      vendor,
      paidAt,
      notes,
    } = req.body;

    if (!type || amount === undefined || !partyType) {
      return res.status(400).json({ message: "Type, amount, and party are required" });
    }

    let invoiceType;
    let resolvedCustomer = customer;
    let resolvedVendor = vendor;

    if (invoice) {
      const invoiceDoc = await Invoice.findById(invoice);
      if (!invoiceDoc) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      invoiceType = invoiceDoc.invoiceType;
      if (invoiceDoc.customer?.name && !resolvedCustomer) {
        resolvedCustomer = invoiceDoc.customer;
      }
      if (invoiceDoc.vendor && !resolvedVendor) {
        resolvedVendor = invoiceDoc.vendor;
      }
    }

    const payment = await Payment.create({
      type,
      amount,
      method,
      invoice,
      invoiceType,
      partyType,
      customer: resolvedCustomer,
      vendor: resolvedVendor,
      paidAt: paidAt || Date.now(),
      notes,
    });

    if (invoice) {
      const payments = await Payment.aggregate([
        { $match: { invoice: payment.invoice } },
        { $group: { _id: "$invoice", total: { $sum: "$amount" } } },
      ]);

      const totalPaid = payments?.[0]?.total || 0;
      const invoiceDoc = await Invoice.findById(invoice);
      if (invoiceDoc && totalPaid >= invoiceDoc.totalAmount) {
        await Invoice.findByIdAndUpdate(invoice, {
          status: "paid",
          paidAt: new Date(),
        });
      }
    }

    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("invoice")
      .populate("vendor")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPayment, getPayments };
