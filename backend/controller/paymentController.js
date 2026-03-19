const Payment = require("../models/Paymentmodel");
const Invoice = require("../models/Invoicemodel");
const Vendor = require("../models/Suppliermodel");
const Customer = require("../models/Customermodel");

const normalizeText = (value = "") => String(value).trim().toLowerCase();

const customerKeyFromFields = ({ code, name }) => {
  const normalizedCode = normalizeText(code);
  const normalizedName = normalizeText(name);
  return normalizedCode || normalizedName ? `${normalizedCode}|${normalizedName}` : "";
};

const customerSnapshotFromDoc = (customerDoc) => ({
  code: customerDoc?.customerCode || "",
  name: customerDoc?.name || "Customer",
});

const createPayment = async (req, res) => {
  try {
    const {
      type,
      amount,
      method,
      invoice,
      partyType,
      customer,
      customerId,
      vendor,
      paidAt,
      notes,
    } = req.body;
    const userId = req.user.userId;

    if (!type || amount === undefined || !partyType) {
      return res
        .status(400)
        .json({ message: "Type, amount, and party are required" });
    }

    let invoiceType;
    let resolvedCustomerId = customerId;
    let resolvedCustomer = customer;
    let resolvedVendor = vendor;

    if (invoice) {
      const invoiceDoc = await Invoice.findOne({
        _id: invoice,
        user_id: userId,
      });
      if (!invoiceDoc) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      invoiceType = invoiceDoc.invoiceType;

      if (invoiceDoc.customerId && !resolvedCustomerId) {
        resolvedCustomerId = String(invoiceDoc.customerId);
      }

      if (invoiceDoc.customer?.name && !resolvedCustomer) {
        resolvedCustomer = {
          code: invoiceDoc.customer.code || "",
          name: invoiceDoc.customer.name || "Customer",
        };
      }

      if (invoiceDoc.vendor && !resolvedVendor) {
        resolvedVendor = invoiceDoc.vendor;
      }
    }

    if (partyType === "customer") {
      if (resolvedCustomerId) {
        const customerDoc = await Customer.findOne({
          _id: resolvedCustomerId,
          user_id: userId,
        });
        if (!customerDoc) {
          return res.status(404).json({ message: "Customer not found" });
        }
        resolvedCustomerId = customerDoc._id;
        resolvedCustomer = customerSnapshotFromDoc(customerDoc);
      }

      if (!resolvedCustomerId && !resolvedCustomer?.name) {
        return res.status(400).json({
          message: "Customer is required for customer payments",
        });
      }
    }

    if (partyType === "vendor" && resolvedVendor) {
      const vendorDoc = await Vendor.findOne({
        _id: resolvedVendor,
        user_id: userId,
      });
      if (!vendorDoc) {
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    const payment = await Payment.create({
      user_id: userId,
      type,
      amount,
      method,
      invoice,
      invoiceType,
      partyType,
      customerId: resolvedCustomerId || undefined,
      customer: resolvedCustomer,
      vendor: resolvedVendor,
      paidAt: paidAt || Date.now(),
      notes,
    });

    if (invoice) {
      const payments = await Payment.aggregate([
        { $match: { invoice: payment.invoice, user_id: userId } },
        { $group: { _id: "$invoice", total: { $sum: "$amount" } } },
      ]);

      const totalPaid = payments?.[0]?.total || 0;
      const invoiceDoc = await Invoice.findOne({
        _id: invoice,
        user_id: userId,
      });
      if (invoiceDoc && totalPaid >= invoiceDoc.totalAmount) {
        await Invoice.findOneAndUpdate(
          { _id: invoice, user_id: userId },
          {
          status: "paid",
          paidAt: new Date(),
          },
        );
      }
    }

    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const payments = await Payment.find({ user_id: userId })
      .populate("invoice")
      .populate("vendor")
      .populate("customerId")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPartyBalances = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [
      vendors,
      customers,
      purchaseInvoices,
      salesInvoices,
      vendorPayments,
      customerPayments,
    ] = await Promise.all([
      Vendor.find({ user_id: userId }).select("_id name openingBalance"),
      Customer.find({ user_id: userId }).select("_id name customerCode openingBalance"),
      Invoice.find({ invoiceType: "purchase", user_id: userId }).select(
        "_id vendor totalAmount status",
      ),
      Invoice.find({ invoiceType: "sales", user_id: userId }).select(
        "_id customerId customer totalAmount status",
      ),
      Payment.find({ partyType: "vendor", type: "paid", user_id: userId }).select(
        "_id vendor amount invoice",
      ),
      Payment.find({ partyType: "customer", type: "received", user_id: userId }).select(
        "_id customerId customer amount invoice",
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
    const customerLookup = new Map();
    const salesInvoiceIdsWithPayments = new Set();

    for (const customer of customers) {
      const customerId = String(customer._id);
      customerMap.set(customerId, {
        customerId: String(customer._id),
        customerCode: customer.customerCode || "",
        customerName: customer.name || "Customer",
        openingBalance: Number(customer.openingBalance) || 0,
        totalAmount: Number(customer.openingBalance) || 0,
        paidAmount: 0,
        remainingAmount: Number(customer.openingBalance) || 0,
        invoiceCount: 0,
        paymentCount: 0,
      });
      const codeKey = normalizeText(customer.customerCode);
      const nameKey = normalizeText(customer.name);
      if (codeKey) customerLookup.set(`code:${codeKey}`, customerId);
      if (nameKey) customerLookup.set(`name:${nameKey}`, customerId);
      if (codeKey || nameKey) {
        customerLookup.set(`combo:${codeKey}|${nameKey}`, customerId);
      }
    }

    const ensureLegacyCustomer = (details) => {
      const code = normalizeText(details?.code);
      const name = normalizeText(details?.name);
      const matchedCustomerId =
        customerLookup.get(`combo:${code}|${name}`) ||
        customerLookup.get(`code:${code}`) ||
        customerLookup.get(`name:${name}`);
      if (matchedCustomerId) return matchedCustomerId;

      const key = customerKeyFromFields({
        code: details?.code,
        name: details?.name,
      });
      if (!key) return null;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: "",
          customerCode: details?.code || "",
          customerName: details?.name || "Customer",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }
      return key;
    };

    for (const payment of customerPayments) {
      const customerId = payment.customerId ? String(payment.customerId) : "";
      const customerKey = customerId || ensureLegacyCustomer(payment.customer);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
      current.paidAmount += Number(payment.amount) || 0;
      current.paymentCount += 1;
      if (payment.invoice) {
        salesInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of salesInvoices) {
      const customerId = invoice.customerId ? String(invoice.customerId) : "";
      const customerKey = customerId || ensureLegacyCustomer(invoice.customer);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
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

const getVendorLedger = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = req.user.userId;

    const vendor = await Vendor.findOne({ _id: vendorId, user_id: userId })
      .select("_id name openingBalance createdAt");
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find({
        invoiceType: "purchase",
        user_id: userId,
        vendor: vendorId,
      }).select("_id invoiceNumber totalAmount issueDate status createdAt"),
      Payment.find({
        partyType: "vendor",
        type: "paid",
        user_id: userId,
        vendor: vendorId,
      }).select("_id amount method invoice notes paidAt createdAt"),
    ]);

    const invoiceNumberById = new Map(
      invoices.map((inv) => [String(inv._id), inv.invoiceNumber || ""]),
    );

    const ledger = [];

    const openingBalance = Number(vendor.openingBalance) || 0;
    if (openingBalance !== 0) {
      ledger.push({
        id: `opening-${vendor._id}`,
        date: vendor.createdAt || new Date(0),
        type: openingBalance >= 0 ? "debit" : "credit",
        amount: Math.abs(openingBalance),
        source: "opening_balance",
        reference: "",
        notes: "Opening balance",
      });
    }

    invoices.forEach((invoice) => {
      ledger.push({
        id: String(invoice._id),
        date: invoice.issueDate || invoice.createdAt || new Date(),
        type: "debit",
        amount: Number(invoice.totalAmount) || 0,
        source: "purchase_invoice",
        reference: invoice.invoiceNumber || "",
        status: invoice.status || "",
      });
    });

    payments.forEach((payment) => {
      const invoiceRef = payment.invoice
        ? invoiceNumberById.get(String(payment.invoice)) || String(payment.invoice)
        : "";
      ledger.push({
        id: String(payment._id),
        date: payment.paidAt || payment.createdAt || new Date(),
        type: "credit",
        amount: Number(payment.amount) || 0,
        source: "payment",
        reference: invoiceRef,
        method: payment.method || "",
        notes: payment.notes || "",
      });
    });

    ledger.sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledgerWithBalance = ledger.map((entry) => {
      if (entry.type === "debit") {
        runningBalance += entry.amount;
        totalDebit += entry.amount;
      } else {
        runningBalance -= entry.amount;
        totalCredit += entry.amount;
      }
      return { ...entry, balance: runningBalance };
    });

    res.status(200).json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
      },
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        balance: runningBalance,
      },
      ledger: ledgerWithBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPayment, getPayments, getPartyBalances, getVendorLedger };
