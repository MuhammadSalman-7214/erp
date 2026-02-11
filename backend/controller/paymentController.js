const Payment = require("../models/Paymentmodel");
const Invoice = require("../models/Invoicemodel");
const Vendor = require("../models/Suppliermodel");

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

const normalizeText = (value = "") => String(value).trim().toLowerCase();

const customerKeyFromFields = ({ code, name }) => {
  const normalizedCode = normalizeText(code);
  const normalizedName = normalizeText(name);
  return normalizedCode || normalizedName ? `${normalizedCode}|${normalizedName}` : "";
};

const getPartyBalances = async (req, res) => {
  try {
    const [vendors, purchaseInvoices, salesInvoices, vendorPayments, customerPayments] =
      await Promise.all([
        Vendor.find().select("_id name openingBalance"),
        Invoice.find({ invoiceType: "purchase" }).select("_id vendor totalAmount status"),
        Invoice.find({ invoiceType: "sales" }).select("_id customer totalAmount status"),
        Payment.find({ partyType: "vendor", type: "paid" }).select(
          "_id vendor amount invoice",
        ),
        Payment.find({ partyType: "customer", type: "received" }).select(
          "_id customer amount invoice",
        ),
      ]);

    const vendorMap = new Map();
    for (const vendor of vendors) {
      vendorMap.set(String(vendor._id), {
        vendorId: String(vendor._id),
        name: vendor.name || "Vendor",
        openingBalance: Number(vendor.openingBalance) || 0,
        totalAmount: Number(vendor.openingBalance) || 0,
        paidAmount: 0,
        remainingAmount: Number(vendor.openingBalance) || 0,
        invoiceCount: 0,
        paymentCount: 0,
      });
    }

    const purchaseInvoiceIdsWithPayments = new Set();
    for (const payment of vendorPayments) {
      const vendorId = payment.vendor ? String(payment.vendor) : "";
      if (!vendorId) continue;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          name: "Unknown Vendor",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }

      const current = vendorMap.get(vendorId);
      current.paidAmount += Number(payment.amount) || 0;
      current.paymentCount += 1;
      if (payment.invoice) {
        purchaseInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of purchaseInvoices) {
      const vendorId = invoice.vendor ? String(invoice.vendor) : "";
      if (!vendorId) continue;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          name: "Unknown Vendor",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }
      const current = vendorMap.get(vendorId);
      current.totalAmount += Number(invoice.totalAmount) || 0;
      current.invoiceCount += 1;
      if (
        invoice.status === "paid" &&
        !purchaseInvoiceIdsWithPayments.has(String(invoice._id))
      ) {
        current.paidAmount += Number(invoice.totalAmount) || 0;
      }
    }

    const customerMap = new Map();
    const salesInvoiceIdsWithPayments = new Set();

    for (const payment of customerPayments) {
      const key = customerKeyFromFields({
        code: payment.customer?.code,
        name: payment.customer?.name,
      });
      if (!key) continue;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerKey: key,
          customerCode: payment.customer?.code || "",
          customerName: payment.customer?.name || "Customer",
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }
      const current = customerMap.get(key);
      current.paidAmount += Number(payment.amount) || 0;
      current.paymentCount += 1;
      if (payment.invoice) {
        salesInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of salesInvoices) {
      const key = customerKeyFromFields({
        code: invoice.customer?.code,
        name: invoice.customer?.name,
      });
      if (!key) continue;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerKey: key,
          customerCode: invoice.customer?.code || "",
          customerName: invoice.customer?.name || "Customer",
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }
      const current = customerMap.get(key);
      current.totalAmount += Number(invoice.totalAmount) || 0;
      current.invoiceCount += 1;
      if (
        invoice.status === "paid" &&
        !salesInvoiceIdsWithPayments.has(String(invoice._id))
      ) {
        current.paidAmount += Number(invoice.totalAmount) || 0;
      }
    }

    const vendorsSummary = Array.from(vendorMap.values())
      .map((entry) => ({
        ...entry,
        remainingAmount: Math.max(entry.totalAmount - entry.paidAmount, 0),
      }))
      .sort((a, b) => b.remainingAmount - a.remainingAmount);

    const customersSummary = Array.from(customerMap.values())
      .map((entry) => ({
        ...entry,
        remainingAmount: Math.max(entry.totalAmount - entry.paidAmount, 0),
      }))
      .sort((a, b) => b.remainingAmount - a.remainingAmount);

    res.status(200).json({
      success: true,
      vendors: vendorsSummary,
      customers: customersSummary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPayment, getPayments, getPartyBalances };
