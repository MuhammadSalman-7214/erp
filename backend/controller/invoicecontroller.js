const Invoice = require("../models/Invoicemodel");
const Branch = require("../models/Branchmodel.js");
const Customer = require("../models/Customermodel.js");
const LedgerEntry = require("../models/LedgerEntrymodel.js");
const { invalidateReportCache } = require("./reportController.js");
const { getCountryCurrencySnapshot } = require("../libs/currency.js");
const { assertNotLocked } = require("../libs/periodLock.js");

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
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res
        .status(403)
        .json({ message: "Only branch staff can create invoices" });
    }
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
    const { branchId, countryId, userId } = req.user || {};
    if (!branchId || !countryId) {
      return res.status(400).json({
        message: "Branch and country are required for invoice creation",
      });
    }
    await assertNotLocked({ countryId, branchId, transactionDate: new Date() });
    const currencySnapshot = await getCountryCurrencySnapshot(countryId);
    const userCurrency = currencySnapshot.currency;
    const userCurrencyExchangeRate = currencySnapshot.exchangeRate;

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
      workflowStatus: "Draft",
      createdBy: userId,
      lastUpdatedBy: userId,
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
    } else if (["branchadmin", "staff"].includes(role)) {
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
      ["branchadmin", "staff"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
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
    await assertNotLocked({
      countryId: invoice.countryId,
      branchId: invoice.branchId,
      transactionDate: invoice.createdAt,
    });
    if (invoice.workflowStatus === "Locked" || invoice.isLocked) {
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
      ["branchadmin", "staff"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (
      req.body.workflowStatus &&
      Object.keys(req.body).every((key) =>
        ["workflowStatus", "note", "revisionReason"].includes(key),
      )
    ) {
      const nextStatus = req.body.workflowStatus;
      const currentStatus = invoice.workflowStatus;
      if (nextStatus === "Submitted" && currentStatus === "Draft") {
        if (!["branchadmin", "staff"].includes(role)) {
          return res
            .status(403)
            .json({ message: "Only branch staff can submit invoices" });
        }
        invoice.workflowStatus = "Submitted";
        invoice.submittedBy = req.user.userId;
        invoice.submittedAt = new Date();
      } else if (nextStatus === "Draft" && currentStatus === "Submitted") {
        if (!["branchadmin", "countryadmin"].includes(role)) {
          return res.status(403).json({
            message: "Only branch or country admin can reject invoices",
          });
        }
        invoice.workflowStatus = "Draft";
      } else if (nextStatus === "Approved" && currentStatus === "Submitted") {
        if (!["branchadmin", "countryadmin"].includes(role)) {
          return res.status(403).json({
            message: "Only branch or country admin can approve invoices",
          });
        }
        invoice.workflowStatus = "Approved";
        invoice.status = "approved";
        invoice.approvedBy = req.user.userId;
        invoice.approvedAt = new Date();
      } else if (nextStatus === "Locked" && currentStatus === "Approved") {
        if (role !== "branchadmin") {
          return res
            .status(403)
            .json({ message: "Only branch admin can lock invoices" });
        }
        invoice.workflowStatus = "Locked";
        invoice.lockedBy = req.user.userId;
        invoice.lockedAt = new Date();
        invoice.isLocked = true;
      } else {
        return res.status(400).json({ message: "Invalid workflow transition" });
      }
      invoice.lastUpdatedBy = req.user.userId;
      await invoice.save();
      invalidateReportCache();
      return res.status(200).json({ success: true, data: invoice });
    }

    if (invoice.workflowStatus === "Submitted" && role !== "branchadmin") {
      return res.status(403).json({
        message: "Only branch admin can edit submitted invoices",
      });
    }
    if (invoice.workflowStatus === "Approved") {
      if (role !== "branchadmin") {
        return res.status(403).json({
          message: "Only branch admin can edit approved invoices",
        });
      }
      if (!req.body.revisionReason) {
        return res.status(400).json({
          message: "Revision reason is required for approved invoice edits",
        });
      }
    }
    const originalInvoice = invoice.toObject();

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
        lastUpdatedBy: req.user.userId,
      },
      { new: true, runValidators: true },
    );

    if (invoice.workflowStatus === "Approved" && req.body.revisionReason) {
      const changes = Object.keys(req.body)
        .filter((key) => !["revisionReason", "workflowStatus"].includes(key))
        .map((key) => ({
          field: key,
          from: originalInvoice[key],
          to: req.body[key],
        }));
      invoice.revisions.push({
        changes,
        reason: req.body.revisionReason,
        updatedBy: req.user.userId,
      });
      await invoice.save();
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

module.exports.deleteInvoice = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    await assertNotLocked({
      countryId: invoice.countryId,
      branchId: invoice.branchId,
      transactionDate: new Date(),
    });
    if (
      role === "countryadmin" &&
      invoice.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (invoice.workflowStatus !== "Draft") {
      return res.status(403).json({
        message: "Only draft invoices can be deleted",
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    invalidateReportCache();
    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ message: error.message });
    }
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
      ["branchadmin", "staff"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (invoice.workflowStatus !== "Approved") {
      return res.status(400).json({
        message: "Invoice must be approved before payment",
      });
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
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ message: error.message });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.approveInvoice = async (req, res) => {
  try {
    const { role, countryId, branchId, userId } = req.user || {};
    if (!["countryadmin", "branchadmin"].includes(role)) {
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
      ["branchadmin", "staff"].includes(role) &&
      invoice.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (invoice.workflowStatus !== "Submitted") {
      return res.status(400).json({ message: "Invoice cannot be approved" });
    }

    invoice.status = "approved";
    invoice.workflowStatus = "Approved";
    invoice.approvedBy = userId;
    invoice.approvedAt = new Date();
    await invoice.save();

    invalidateReportCache();
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ message: error.message });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
