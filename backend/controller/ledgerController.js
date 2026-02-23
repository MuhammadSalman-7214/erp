const mongoose = require("mongoose");
const LedgerEntry = require("../models/LedgerEntrymodel.js");
const Supplier = require("../models/Suppliermodel.js");
const Customer = require("../models/Customermodel.js");
const { getCountryCurrencySnapshot } = require("../libs/currency.js");
const { invalidateReportCache } = require("./reportController.js");

const ENTITY = {
  supplier: "SUPPLIER",
  customer: "CUSTOMER",
};

const normalizeEntityType = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "supplier") return ENTITY.supplier;
  if (normalized === "customer") return ENTITY.customer;
  return null;
};

const getScopedMatch = (user = {}) => {
  const { role, countryId, branchId } = user;
  const match = {};
  if (role === "countryadmin") {
    match.countryId = countryId;
  } else if (["branchadmin", "staff"].includes(role)) {
    match.countryId = countryId;
    match.branchId = branchId;
  }
  return match;
};

const getLedgerAmounts = (entry) => {
  const debitAmount = Number(entry?.debitAmount ?? entry?.debit ?? 0) || 0;
  const creditAmount = Number(entry?.creditAmount ?? entry?.credit ?? 0) || 0;
  return { debitAmount, creditAmount };
};

const getBalanceDelta = (entityType, entry) => {
  const { debitAmount, creditAmount } = getLedgerAmounts(entry);
  if (entityType === ENTITY.supplier) {
    return creditAmount - debitAmount;
  }
  return debitAmount - creditAmount;
};

const buildEntityMatch = (entityType, entityId, user) => {
  const base = getScopedMatch(user);
  const id = new mongoose.Types.ObjectId(entityId);
  const partyType = entityType === ENTITY.supplier ? "supplier" : "customer";
  return {
    ...base,
    $or: [
      { entityType, entityId: id },
      { partyType, partyId: id },
    ],
  };
};

const aggregateEntitySummary = async (entityType, entityId, user) => {
  const match = buildEntityMatch(entityType, entityId, user);
  const [summary] = await LedgerEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $ifNull: ["$debitAmount", { $ifNull: ["$debit", 0] }],
          },
        },
        totalCredit: {
          $sum: {
            $ifNull: ["$creditAmount", { $ifNull: ["$credit", 0] }],
          },
        },
      },
    },
  ]);

  const totalDebit = summary?.totalDebit || 0;
  const totalCredit = summary?.totalCredit || 0;

  if (entityType === ENTITY.supplier) {
    return {
      totalAmount: totalCredit,
      paidAmount: totalDebit,
      pendingAmount: totalCredit - totalDebit,
    };
  }

  return {
    totalAmount: totalDebit,
    paidAmount: totalCredit,
    pendingAmount: totalDebit - totalCredit,
  };
};

const getLedgerRows = async (entityType, entityId, user) => {
  const match = buildEntityMatch(entityType, entityId, user);
  const entries = await LedgerEntry.find(match).sort({ createdAt: 1 });

  let runningBalance = 0;
  return entries.map((entry) => {
    const { debitAmount, creditAmount } = getLedgerAmounts(entry);
    runningBalance += getBalanceDelta(entityType, entry);
    return {
      ...entry.toObject(),
      debitAmount,
      creditAmount,
      balanceAfter: runningBalance,
    };
  });
};

const ensurePartyInScope = async (entityType, entityId, user) => {
  const { role, countryId, branchId } = user || {};
  const model = entityType === ENTITY.supplier ? Supplier : Customer;
  const entity = await model.findById(entityId);
  if (!entity) return { status: 404, message: "Entity not found" };

  if (role === "countryadmin" && entity.countryId?.toString() !== countryId?.toString()) {
    return { status: 403, message: "Access denied for this country" };
  }
  if (
    ["branchadmin", "staff"].includes(role) &&
    entity.branchId?.toString() !== branchId?.toString()
  ) {
    return { status: 403, message: "Access denied for this branch" };
  }
  return null;
};

const createPaymentEntry = async ({
  entityType,
  entityId,
  amount,
  description,
  referenceId,
  user,
}) => {
  const currencySnapshot = await getCountryCurrencySnapshot(user.countryId);
  const currency = currencySnapshot.currency;
  const rate = currencySnapshot.exchangeRate || 1;
  const amountNumber = Number(amount);
  const amountUSD = Number((amountNumber / rate).toFixed(2));
  const isSupplier = entityType === ENTITY.supplier;

  return LedgerEntry.create({
    entityType,
    entityId,
    transactionType: isSupplier ? "SUPPLIER_PAYMENT" : "CUSTOMER_PAYMENT",
    debitAmount: isSupplier ? amountNumber : 0,
    creditAmount: isSupplier ? 0 : amountNumber,
    partyType: isSupplier ? "supplier" : "customer",
    partyId: entityId,
    entryType: "payment",
    debit: isSupplier ? amountNumber : 0,
    credit: isSupplier ? 0 : amountNumber,
    currency,
    amountUSD,
    exchangeRateUsed: rate,
    branchId: user.branchId,
    countryId: user.countryId,
    referenceType: "manualPayment",
    referenceId: referenceId || null,
    description: description || "",
    createdBy: user.userId,
  });
};

module.exports.getLedgerByParty = async (req, res) => {
  try {
    const { partyType, partyId } = req.params;
    const entityType = normalizeEntityType(partyType);
    if (!entityType) {
      return res.status(400).json({ message: "Invalid party type" });
    }
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ message: "Invalid party id" });
    }

    const rows = await getLedgerRows(entityType, partyId, req.user);
    const balance = rows.length ? rows[rows.length - 1].balanceAfter : 0;
    res.status(200).json({ success: true, entries: rows, balance });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching ledger", error: error.message });
  }
};

module.exports.getLedgerByQuery = async (req, res) => {
  try {
    const { entityType: queryEntityType, entityId } = req.query;
    const entityType = normalizeEntityType(queryEntityType);
    if (!entityType) {
      return res.status(400).json({ message: "Invalid entityType" });
    }
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res.status(400).json({ message: "Invalid entityId" });
    }

    const rows = await getLedgerRows(entityType, entityId, req.user);
    const balance = rows.length ? rows[rows.length - 1].balanceAfter : 0;
    res.status(200).json({ success: true, entries: rows, balance });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching ledger", error: error.message });
  }
};

module.exports.getOutstandingByParty = async (req, res) => {
  try {
    const entityType = normalizeEntityType(req.params.partyType);
    if (!entityType) {
      return res.status(400).json({ message: "Invalid party type" });
    }

    const scopeMatch = getScopedMatch(req.user);
    const partyType = entityType === ENTITY.supplier ? "supplier" : "customer";
    const data = await LedgerEntry.aggregate([
      {
        $match: {
          ...scopeMatch,
          $or: [{ entityType }, { partyType }],
        },
      },
      {
        $project: {
          partyRef: { $ifNull: ["$entityId", "$partyId"] },
          debitAmount: { $ifNull: ["$debitAmount", { $ifNull: ["$debit", 0] }] },
          creditAmount: {
            $ifNull: ["$creditAmount", { $ifNull: ["$credit", 0] }],
          },
        },
      },
      {
        $group: {
          _id: "$partyRef",
          totalDebit: { $sum: "$debitAmount" },
          totalCredit: { $sum: "$creditAmount" },
        },
      },
      {
        $project: {
          partyId: "$_id",
          outstanding:
            entityType === ENTITY.supplier
              ? { $subtract: ["$totalCredit", "$totalDebit"] }
              : { $subtract: ["$totalDebit", "$totalCredit"] },
        },
      },
      { $sort: { outstanding: -1 } },
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching outstanding data",
      error: error.message,
    });
  }
};

module.exports.getSupplierSummary = async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid supplier id" });
    }

    const scopeError = await ensurePartyInScope(ENTITY.supplier, supplierId, req.user);
    if (scopeError) {
      return res.status(scopeError.status).json({ message: scopeError.message });
    }

    const summary = await aggregateEntitySummary(ENTITY.supplier, supplierId, req.user);
    res.status(200).json({
      success: true,
      totalPurchases: summary.totalAmount,
      totalPaid: summary.paidAmount,
      pending: summary.pendingAmount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching supplier summary", error: error.message });
  }
};

module.exports.getCustomerSummary = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const scopeError = await ensurePartyInScope(ENTITY.customer, customerId, req.user);
    if (scopeError) {
      return res.status(scopeError.status).json({ message: scopeError.message });
    }

    const summary = await aggregateEntitySummary(ENTITY.customer, customerId, req.user);
    res.status(200).json({
      success: true,
      totalSales: summary.totalAmount,
      totalReceived: summary.paidAmount,
      pending: summary.pendingAmount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching customer summary", error: error.message });
  }
};

module.exports.createSupplierPayment = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res.status(403).json({ message: "Only branch staff can pay suppliers" });
    }

    const { supplierId, amount, description, referenceId } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid supplierId" });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero" });
    }

    const scopeError = await ensurePartyInScope(ENTITY.supplier, supplierId, req.user);
    if (scopeError) {
      return res.status(scopeError.status).json({ message: scopeError.message });
    }

    const entry = await createPaymentEntry({
      entityType: ENTITY.supplier,
      entityId: supplierId,
      amount,
      description,
      referenceId,
      user: req.user,
    });

    invalidateReportCache();
    res.status(201).json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ message: "Error creating supplier payment", error: error.message });
  }
};

module.exports.createCustomerPayment = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res
        .status(403)
        .json({ message: "Only branch staff can collect customer payments" });
    }

    const { customerId, amount, description, referenceId } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customerId" });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero" });
    }

    const scopeError = await ensurePartyInScope(ENTITY.customer, customerId, req.user);
    if (scopeError) {
      return res.status(scopeError.status).json({ message: scopeError.message });
    }

    const entry = await createPaymentEntry({
      entityType: ENTITY.customer,
      entityId: customerId,
      amount,
      description,
      referenceId,
      user: req.user,
    });

    invalidateReportCache();
    res.status(201).json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ message: "Error creating customer payment", error: error.message });
  }
};

