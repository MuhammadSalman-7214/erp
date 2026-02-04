const Invoice = require("../models/Invoicemodel");
const Branch = require("../models/Branchmodel.js");
const Customer = require("../models/Customermodel.js");
const LedgerEntry = require("../models/LedgerEntrymodel.js");
const { invalidateReportCache } = require("./reportController.js");

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
      customerId,
      client,
      items,
      taxRate,
      discount,
      dueDate,
      notes,
      paymentMethod,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Invoice must have items" });
    }
    const {
      branchId,
      countryId,
      userCurrency,
      userCurrencyExchangeRate,
    } = req.user || {};
    if (!branchId || !countryId) {
      return res.status(400).json({
        message: "Branch and country are required for invoice creation",
      });
    }
    if (!userCurrency || !userCurrencyExchangeRate) {
      return res
        .status(400)
        .json({ message: "Currency configuration is missing for this user" });
    }

    const totals = calculateTotals(items, taxRate, discount);
    const priceUSD = Number(
      (totals.totalAmount / userCurrencyExchangeRate).toFixed(2),
    );
    const finalInvoiceNumber =
      invoiceNumber ||
      (await (async () => {
        const branch = await Branch.findById(branchId);
        if (!branch) throw new Error("Branch not found");
        const count = await Invoice.countDocuments({ branchId });
        return `INV-${branch.branchCode}-${String(count + 1).padStart(5, "0")}`;
      })());

    const invoice = await Invoice.create({
      invoiceNumber: finalInvoiceNumber,
      customerId: customerId || null,
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
      currency: userCurrency,
      dueDate,
      notes,
      paymentMethod,
      ...totals,
      priceUSD,
      exchangeRateUsed: userCurrencyExchangeRate,
      branchId,
      countryId,
    });

    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (customer) {
        await LedgerEntry.create({
          partyType: "customer",
          partyId: customerId,
          entryType: "invoice",
          debit: totals.totalAmount,
          credit: 0,
          currency: userCurrency,
          amountUSD: priceUSD,
          exchangeRateUsed: userCurrencyExchangeRate,
          branchId,
          countryId,
          referenceType: "invoice",
          referenceId: invoice._id,
          createdBy: req.user.userId,
        });
      }
    }

    invalidateReportCache();
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
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }

    const invoices = await Invoice.find(query).sort({
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
    const { role, countryId, branchId } = req.user || {};
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (
      role === "countryadmin" &&
      invoice.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (invoice.status !== "approved") {
      return res.status(400).json({ message: "Invoice must be approved before payment" });
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
    let invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (invoice.isLocked || ["approved", "paid", "cancelled"].includes(invoice.status)) {
      return res.status(403).json({
        message: "Invoice is locked or approved and cannot be edited",
      });
    }
    const { role, countryId, branchId, userCurrencyExchangeRate } =
      req.user || {};
    if (
      role === "countryadmin" &&
      invoice.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }

    const items = req.body.items || invoice.items;
    const taxRate = req.body.taxRate ?? invoice.taxRate;
    const discount = req.body.discount ?? invoice.discount;

    const totals = calculateTotals(items, taxRate, discount);
    const rate = invoice.exchangeRateUsed || userCurrencyExchangeRate || 1;
    const priceUSD = Number((totals.totalAmount / rate).toFixed(2));

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
        priceUSD,
      },
      { new: true, runValidators: true },
    );

    invalidateReportCache();
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
    const { role, countryId, branchId } = req.user || {};
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (
      role === "countryadmin" &&
      invoice.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    invalidateReportCache();
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
    const { role, countryId, branchId } = req.user || {};
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (
      role === "countryadmin" &&
      invoice.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }

    invoice.status = "paid";
    invoice.paidAt = new Date();
    invoice.isLocked = true;
    await invoice.save();

    if (invoice.customerId) {
      const rate = invoice.exchangeRateUsed || 1;
      const amountUSD = Number((invoice.totalAmount / rate).toFixed(2));
      await LedgerEntry.create({
        partyType: "customer",
        partyId: invoice.customerId,
        entryType: "payment",
        debit: 0,
        credit: invoice.totalAmount,
        currency: invoice.currency,
        amountUSD,
        exchangeRateUsed: rate,
        branchId: invoice.branchId,
        countryId: invoice.countryId,
        referenceType: "invoice",
        referenceId: invoice._id,
        createdBy: req.user.userId,
      });
    }

    invalidateReportCache();
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

module.exports.approveInvoice = async (req, res) => {
  try {
    const { role, countryId, branchId, userId } = req.user || {};
    if (!["superadmin", "countryadmin", "branchadmin"].includes(role)) {
      return res.status(403).json({ message: "Approval requires admin role" });
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (
      role === "countryadmin" &&
      invoice.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (invoice.status !== "draft" && invoice.status !== "sent") {
      return res.status(400).json({ message: "Invoice cannot be approved" });
    }

    invoice.status = "approved";
    invoice.approvedBy = userId;
    invoice.approvedAt = new Date();
    await invoice.save();

    invalidateReportCache();
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
