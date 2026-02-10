const PurchaseBill = require("../models/PurchaseBillmodel.js");
const Supplier = require("../models/Suppliermodel.js");
const Branch = require("../models/Branchmodel.js");
const LedgerEntry = require("../models/LedgerEntrymodel.js");
const logActivity = require("../libs/logger");
const { invalidateReportCache } = require("./reportController.js");
const { getCountryCurrencySnapshot } = require("../libs/currency.js");
const { assertNotLocked } = require("../libs/periodLock.js");

const calculateTotals = (items, taxRate = 0, discount = 0) => {
  const subTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = (subTotal * taxRate) / 100;
  const totalAmount = subTotal + taxAmount - discount;
  return { subTotal, taxAmount, totalAmount };
};

const generateBillNumber = async (branchId) => {
  const branch = await Branch.findById(branchId);
  if (!branch) throw new Error("Branch not found");
  const count = await PurchaseBill.countDocuments({ branchId });
  return `BILL-${branch.branchCode}-${String(count + 1).padStart(5, "0")}`;
};

module.exports.createPurchaseBill = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res
        .status(403)
        .json({ message: "Only branch staff can create purchase bills" });
    }
    const { supplierId, items, taxRate, discount, dueDate, status } = req.body;
    const { userId, branchId, countryId } = req.user || {};

    if (!supplierId || !items?.length) {
      return res
        .status(400)
        .json({ message: "Supplier and items are required" });
    }
    if (!branchId || !countryId) {
      return res
        .status(400)
        .json({ message: "Branch and country are required" });
    }
    await assertNotLocked({ countryId, branchId, transactionDate: new Date() });
    const currencySnapshot = await getCountryCurrencySnapshot(countryId);
    const userCurrency = currencySnapshot.currency;
    const userCurrencyExchangeRate = currencySnapshot.exchangeRate;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier)
      return res.status(404).json({ message: "Supplier not found" });
    if (
      supplier.countryId?.toString() !== countryId?.toString() ||
      supplier.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Supplier not in your scope" });
    }

    const totals = calculateTotals(items, taxRate, discount);
    const priceUSD = Number(
      (totals.totalAmount / userCurrencyExchangeRate).toFixed(2),
    );
    const billNumber = await generateBillNumber(branchId);

    const bill = await PurchaseBill.create({
      billNumber,
      supplierId,
      items: items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
      taxRate,
      discount,
      dueDate,
      status: status || "draft",
      workflowStatus: "Draft",
      ...totals,
      branchId,
      countryId,
      currency: userCurrency,
      exchangeRateUsed: userCurrencyExchangeRate,
      priceUSD,
      createdBy: userId,
    });

    await LedgerEntry.create({
      partyType: "supplier",
      partyId: supplierId,
      entryType: "purchase",
      debit: 0,
      credit: totals.totalAmount,
      currency: userCurrency,
      amountUSD: priceUSD,
      exchangeRateUsed: userCurrencyExchangeRate,
      branchId,
      countryId,
      referenceType: "purchaseBill",
      referenceId: bill._id,
      createdBy: userId,
    });

    await logActivity({
      action: "Add Purchase Bill",
      description: `Purchase bill ${billNumber} created`,
      entity: "purchaseBill",
      entityId: bill._id,
      userId,
      ipAddress: req.ip,
    });

    invalidateReportCache();
    res.status(201).json({ success: true, bill });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error creating purchase bill", error: error.message });
  }
};

module.exports.getAllPurchaseBills = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.countryId = countryId;
      query.branchId = branchId;
    }
    const bills = await PurchaseBill.find(query)
      .populate("supplierId", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, bills });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching purchase bills", error: error.message });
  }
};

module.exports.updatePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, taxRate, discount, dueDate, status } = req.body;
    const { role, countryId, branchId, userCurrencyExchangeRate } =
      req.user || {};

    const bill = await PurchaseBill.findById(id);
    if (!bill)
      return res.status(404).json({ message: "Purchase bill not found" });
    await assertNotLocked({
      countryId: bill.countryId,
      branchId: bill.branchId,
      transactionDate: new Date(),
    });
    await assertNotLocked({
      countryId: bill.countryId,
      branchId: bill.branchId,
      transactionDate: bill.createdAt,
    });
    const originalBill = bill.toObject();
    if (
      role === "countryadmin" &&
      bill.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      bill.branchId?.toString() !== branchId?.toString()
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
      const currentStatus = bill.workflowStatus;
      if (nextStatus === "Submitted" && currentStatus === "Draft") {
        if (!["branchadmin", "staff"].includes(role)) {
          return res
            .status(403)
            .json({ message: "Only branch staff can submit bills" });
        }
        bill.workflowStatus = "Submitted";
        bill.submittedBy = req.user.userId;
        bill.submittedAt = new Date();
      } else if (nextStatus === "Draft" && currentStatus === "Submitted") {
        if (!["branchadmin", "countryadmin"].includes(role)) {
          return res
            .status(403)
            .json({ message: "Only branch or country admin can reject bills" });
        }
        bill.workflowStatus = "Draft";
      } else if (nextStatus === "Approved" && currentStatus === "Submitted") {
        if (!["branchadmin", "countryadmin"].includes(role)) {
          return res.status(403).json({
            message: "Only branch or country admin can approve bills",
          });
        }
        bill.workflowStatus = "Approved";
        bill.approvedBy = req.user.userId;
        bill.approvedAt = new Date();
      } else if (nextStatus === "Locked" && currentStatus === "Approved") {
        if (role !== "branchadmin") {
          return res
            .status(403)
            .json({ message: "Only branch admin can lock bills" });
        }
        bill.workflowStatus = "Locked";
        bill.lockedBy = req.user.userId;
        bill.lockedAt = new Date();
        bill.isLocked = true;
      } else {
        return res.status(400).json({ message: "Invalid workflow transition" });
      }
      bill.lastUpdatedBy = req.user.userId;
      await bill.save();
      invalidateReportCache();
      return res.status(200).json({ success: true, bill });
    }
    if (bill.workflowStatus === "Locked" || bill.isLocked) {
      return res.status(403).json({ message: "Bill is locked" });
    }
    if (bill.workflowStatus === "Submitted" && role !== "branchadmin") {
      return res
        .status(403)
        .json({ message: "Only branch admin can edit submitted bills" });
    }
    if (bill.workflowStatus === "Approved") {
      if (role !== "branchadmin") {
        return res
          .status(403)
          .json({ message: "Only branch admin can edit approved bills" });
      }
      if (!req.body.revisionReason) {
        return res.status(400).json({
          message: "Revision reason is required for approved bill edits",
        });
      }
    }

    const nextItems = items || bill.items;
    const nextTaxRate = taxRate ?? bill.taxRate;
    const nextDiscount = discount ?? bill.discount;
    const totals = calculateTotals(nextItems, nextTaxRate, nextDiscount);
    const rate = bill.exchangeRateUsed || userCurrencyExchangeRate || 1;
    const priceUSD = Number((totals.totalAmount / rate).toFixed(2));

    bill.items = nextItems.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));
    bill.taxRate = nextTaxRate;
    bill.discount = nextDiscount;
    bill.dueDate = dueDate ?? bill.dueDate;
    bill.status = status || bill.status;
    bill.subTotal = totals.subTotal;
    bill.taxAmount = totals.taxAmount;
    bill.totalAmount = totals.totalAmount;
    bill.priceUSD = priceUSD;
    bill.lastUpdatedBy = req.user.userId;

    await bill.save();
    if (bill.workflowStatus === "Approved" && req.body.revisionReason) {
      const changes = Object.keys(req.body)
        .filter((key) => !["revisionReason", "workflowStatus"].includes(key))
        .map((key) => ({
          field: key,
          from: originalBill[key],
          to: req.body[key],
        }));
      bill.revisions.push({
        changes,
        reason: req.body.revisionReason,
        updatedBy: req.user.userId,
      });
      await bill.save();
    }
    invalidateReportCache();
    res.status(200).json({ success: true, bill });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error updating purchase bill", error: error.message });
  }
};

module.exports.deletePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, countryId, branchId } = req.user || {};
    const bill = await PurchaseBill.findById(id);
    if (!bill)
      return res.status(404).json({ message: "Purchase bill not found" });
    if (role !== "branchadmin") {
      return res.status(403).json({ message: "Access denied" });
    }
    if (bill.branchId?.toString() !== branchId?.toString()) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (bill.workflowStatus !== "Draft") {
      return res.status(403).json({
        message: "Only draft bills can be deleted",
      });
    }
    await PurchaseBill.findByIdAndDelete(id);
    invalidateReportCache();
    res.status(200).json({ success: true, message: "Purchase bill deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting purchase bill", error: error.message });
  }
};

module.exports.markPurchaseBillPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, countryId, branchId, userCurrencyExchangeRate, userId } =
      req.user || {};
    const bill = await PurchaseBill.findById(id);
    if (!bill)
      return res.status(404).json({ message: "Purchase bill not found" });
    if (
      role === "countryadmin" &&
      bill.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      bill.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    if (bill.workflowStatus !== "Approved") {
      return res
        .status(400)
        .json({ message: "Bill must be approved before payment" });
    }

    bill.status = "paid";
    bill.paidAt = new Date();
    bill.isLocked = true;
    await bill.save();

    const rate = bill.exchangeRateUsed || userCurrencyExchangeRate || 1;
    const amountUSD = Number((bill.totalAmount / rate).toFixed(2));

    await LedgerEntry.create({
      partyType: "supplier",
      partyId: bill.supplierId,
      entryType: "payment",
      debit: bill.totalAmount,
      credit: 0,
      currency: bill.currency,
      amountUSD,
      exchangeRateUsed: rate,
      branchId: bill.branchId,
      countryId: bill.countryId,
      referenceType: "purchaseBill",
      referenceId: bill._id,
      createdBy: userId,
    });

    invalidateReportCache();
    res.status(200).json({ success: true, bill });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error marking bill paid", error: error.message });
  }
};

module.exports.approvePurchaseBill = async (req, res) => {
  try {
    const { role, countryId, branchId, userId } = req.user || {};

    if (!["countryadmin", "branchadmin"].includes(role)) {
      return res.status(403).json({ message: "Approval requires admin role" });
    }
    const bill = await PurchaseBill.findById(req.params.id);
    if (!bill)
      return res.status(404).json({ message: "Purchase bill not found" });
    if (
      role === "countryadmin" &&
      bill.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      bill.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    console.log({ status: bill.workflowStatus });

    if (bill.workflowStatus !== "Submitted") {
      return res
        .status(400)
        .json({ message: "Purchase bill cannot be approved" });
    }
    bill.status = "approved";
    bill.workflowStatus = "Approved";
    bill.approvedBy = userId;
    bill.approvedAt = new Date();
    await bill.save();
    invalidateReportCache();
    res.status(200).json({ success: true, bill });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error approving bill", error: error.message });
  }
};
