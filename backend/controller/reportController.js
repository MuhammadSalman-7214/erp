const Sale = require("../models/Salesmodel.js");
const Invoice = require("../models/Invoicemodel.js");
const Order = require("../models/Ordermodel.js");
const Shipment = require("../models/Shipmentmodel.js");
const ClearingJob = require("../models/ClearingJobmodel.js");
const PurchaseBill = require("../models/PurchaseBillmodel.js");
const PDFDocument = require("pdfkit");

const CACHE_TTL_MS = 5 * 60 * 1000;
const reportCache = new Map();

const getCacheKey = (prefix, user, query) =>
  JSON.stringify({
    prefix,
    role: user?.role || null,
    countryId: user?.countryId || null,
    branchId: user?.branchId || null,
    query,
  });

const getCached = (key) => {
  const entry = reportCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    reportCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value) => {
  reportCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

const invalidateReportCache = () => {
  reportCache.clear();
};

module.exports.invalidateReportCache = invalidateReportCache;

const buildScopeMatch = (user) => {
  const { role, countryId, branchId } = user || {};
  const match = {};
  if (role === "countryadmin") {
    match.countryId = countryId;
  } else if (["branchadmin", "staff"].includes(role)) {
    match.countryId = countryId;
    match.branchId = branchId;
  }
  return match;
};

const buildDateMatch = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) createdAt.$lte = new Date(endDate);
  return { createdAt };
};

const aggregateTotals = async (Model, match, localField, usdField) => {
  const result = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalLocal: { $sum: { $ifNull: [`$${localField}`, 0] } },
        totalUSD: { $sum: { $ifNull: [`$${usdField}`, 0] } },
      },
    },
  ]);
  return result[0] || { count: 0, totalLocal: 0, totalUSD: 0 };
};

const aggregateByCountry = async (Model, match, localField, usdField) => {
  const result = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$countryId",
        count: { $sum: 1 },
        totalLocal: { $sum: { $ifNull: [`$${localField}`, 0] } },
        totalUSD: { $sum: { $ifNull: [`$${usdField}`, 0] } },
      },
    },
    {
      $lookup: {
        from: "countries",
        localField: "_id",
        foreignField: "_id",
        as: "country",
      },
    },
    { $unwind: { path: "$country", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        countryId: "$_id",
        countryName: "$country.name",
        currency: "$country.currency",
        count: 1,
        totalLocal: 1,
        totalUSD: 1,
      },
    },
    { $sort: { countryName: 1 } },
  ]);
  return result;
};

// Summary report
module.exports.getSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user || {};
    const cacheKey = getCacheKey("summary", user, { startDate, endDate });
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }
    const scopeMatch = buildScopeMatch(user);
    const dateMatch = buildDateMatch(startDate, endDate);

    const salesTotals = await aggregateTotals(
      Sale,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const orderTotals = await aggregateTotals(
      Order,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const invoiceTotals = await aggregateTotals(
      Invoice,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const shipmentTotals = await aggregateTotals(
      Shipment,
      { ...scopeMatch, ...dateMatch, isActive: true },
      "totalCost",
      "totalCostUSD",
    );
    const purchaseTotals = await aggregateTotals(
      PurchaseBill,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const clearingTotals = await aggregateTotals(
      ClearingJob,
      { ...scopeMatch, ...dateMatch, isActive: true },
      "totalClearingCost",
      "totalClearingCostUSD",
    );

    const invoiceOutstanding = await Invoice.aggregate([
      {
        $match: {
          ...scopeMatch,
          ...dateMatch,
          status: { $in: ["draft", "sent", "approved", "overdue"] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalLocal: { $sum: { $ifNull: ["$totalAmount", 0] } },
          totalUSD: { $sum: { $ifNull: ["$priceUSD", 0] } },
        },
      },
    ]);
    const purchaseOutstanding = await PurchaseBill.aggregate([
      {
        $match: {
          ...scopeMatch,
          ...dateMatch,
          status: { $in: ["draft", "approved"] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalLocal: { $sum: { $ifNull: ["$totalAmount", 0] } },
          totalUSD: { $sum: { $ifNull: ["$priceUSD", 0] } },
        },
      },
    ]);

    const payload = {
      scope: {
        level:
          user.role === "superadmin"
            ? "global"
            : user.role === "countryadmin"
            ? "country"
            : "branch",
        countryId: user.countryId || null,
        branchId: user.branchId || null,
      },
      filters: { startDate: startDate || null, endDate: endDate || null },
      totals: {
        sales: salesTotals,
        orders: orderTotals,
        invoices: invoiceTotals,
        invoiceOutstanding: invoiceOutstanding[0] || {
          count: 0,
          totalLocal: 0,
          totalUSD: 0,
        },
        purchaseBills: purchaseTotals,
        purchaseOutstanding: purchaseOutstanding[0] || {
          count: 0,
          totalLocal: 0,
          totalUSD: 0,
        },
        shipments: shipmentTotals,
        clearingJobs: clearingTotals,
      },
    };
    setCached(cacheKey, payload);
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      message: "Error generating summary report",
      error: error.message,
    });
  }
};

// Shipment-wise P&L report
module.exports.getShipmentPnlReport = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, status } = req.query;
    const user = req.user || {};
    const cacheKey = getCacheKey("shipmentPnl", user, {
      startDate,
      endDate,
      page,
      limit,
      status,
    });
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const scopeMatch = buildScopeMatch(user);
    const dateMatch = buildDateMatch(startDate, endDate);
    const match = {
      ...scopeMatch,
      ...dateMatch,
      isActive: true,
    };
    if (status) {
      match.status = status;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const skip = (pageNumber - 1) * limitNumber;

    const [items, totalCount, totals] = await Promise.all([
      Shipment.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select(
          "shipmentNumber shipmentType transportMode currency sellingPrice totalCost profitLoss profitMargin sellingPriceUSD totalCostUSD profitLossUSD status customerName supplierName countryId branchId createdAt",
        )
        .populate("countryId", "name currency")
        .populate("branchId", "name"),
      Shipment.countDocuments(match),
      Shipment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ["$sellingPrice", 0] } },
            totalCost: { $sum: { $ifNull: ["$totalCost", 0] } },
            totalProfit: { $sum: { $ifNull: ["$profitLoss", 0] } },
            totalRevenueUSD: { $sum: { $ifNull: ["$sellingPriceUSD", 0] } },
            totalCostUSD: { $sum: { $ifNull: ["$totalCostUSD", 0] } },
            totalProfitUSD: { $sum: { $ifNull: ["$profitLossUSD", 0] } },
          },
        },
      ]),
    ]);

    const payload = {
      scope: {
        level:
          user.role === "superadmin"
            ? "global"
            : user.role === "countryadmin"
            ? "country"
            : "branch",
        countryId: user.countryId || null,
        branchId: user.branchId || null,
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || null,
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalCount,
        totalPages: Math.max(Math.ceil(totalCount / limitNumber), 1),
      },
      totals:
        totals[0] || {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalRevenueUSD: 0,
          totalCostUSD: 0,
          totalProfitUSD: 0,
        },
      data: items,
    };

    setCached(cacheKey, payload);
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      message: "Error generating shipment P&L report",
      error: error.message,
    });
  }
};

// Country consolidation (superadmin = all, others scoped)
module.exports.getCountryConsolidation = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user || {};
    const cacheKey = getCacheKey("by-country", user, { startDate, endDate });
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }
    const scopeMatch = buildScopeMatch(user);
    const dateMatch = buildDateMatch(startDate, endDate);

    const sales = await aggregateByCountry(
      Sale,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const orders = await aggregateByCountry(
      Order,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const invoices = await aggregateByCountry(
      Invoice,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const purchaseBills = await aggregateByCountry(
      PurchaseBill,
      { ...scopeMatch, ...dateMatch },
      "totalAmount",
      "priceUSD",
    );
    const shipments = await aggregateByCountry(
      Shipment,
      { ...scopeMatch, ...dateMatch, isActive: true },
      "totalCost",
      "totalCostUSD",
    );
    const clearingJobs = await aggregateByCountry(
      ClearingJob,
      { ...scopeMatch, ...dateMatch, isActive: true },
      "totalClearingCost",
      "totalClearingCostUSD",
    );

    const payload = {
      scope: {
        level:
          user.role === "superadmin"
            ? "global"
            : user.role === "countryadmin"
            ? "country"
            : "branch",
        countryId: user.countryId || null,
        branchId: user.branchId || null,
      },
      filters: { startDate: startDate || null, endDate: endDate || null },
      byCountry: {
        sales,
        orders,
        invoices,
        purchaseBills,
        shipments,
        clearingJobs,
      },
    };
    setCached(cacheKey, payload);
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      message: "Error generating country consolidation report",
      error: error.message,
    });
  }
};

const buildSummaryCsv = (data) => {
  const lines = [
    "section,count,totalLocal,totalUSD",
    `sales,${data.totals.sales.count},${data.totals.sales.totalLocal},${data.totals.sales.totalUSD}`,
    `orders,${data.totals.orders.count},${data.totals.orders.totalLocal},${data.totals.orders.totalUSD}`,
    `invoices,${data.totals.invoices.count},${data.totals.invoices.totalLocal},${data.totals.invoices.totalUSD}`,
    `invoiceOutstanding,${data.totals.invoiceOutstanding.count},${data.totals.invoiceOutstanding.totalLocal},${data.totals.invoiceOutstanding.totalUSD}`,
    `purchaseBills,${data.totals.purchaseBills.count},${data.totals.purchaseBills.totalLocal},${data.totals.purchaseBills.totalUSD}`,
    `purchaseOutstanding,${data.totals.purchaseOutstanding.count},${data.totals.purchaseOutstanding.totalLocal},${data.totals.purchaseOutstanding.totalUSD}`,
    `shipments,${data.totals.shipments.count},${data.totals.shipments.totalLocal},${data.totals.shipments.totalUSD}`,
    `clearingJobs,${data.totals.clearingJobs.count},${data.totals.clearingJobs.totalLocal},${data.totals.clearingJobs.totalUSD}`,
  ];
  return lines.join("\n");
};

const buildCountryCsv = (data) => {
  const lines = [
    "module,countryId,countryName,currency,count,totalLocal,totalUSD",
  ];
  Object.entries(data.byCountry).forEach(([moduleName, rows]) => {
    rows.forEach((row) => {
      lines.push(
        `${moduleName},${row.countryId || ""},${row.countryName || ""},${row.currency || ""},${row.count},${row.totalLocal},${row.totalUSD}`,
      );
    });
  });
  return lines.join("\n");
};

const renderSummaryPdf = (data, res) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=summary-report.pdf");
  doc.pipe(res);
  doc.fontSize(18).text("Summary Report", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Scope: ${data.scope.level}`);
  doc.text(
    `Filters: ${data.filters.startDate || "all"} to ${data.filters.endDate || "all"}`,
  );
  doc.moveDown();
  Object.entries(data.totals).forEach(([key, value]) => {
    doc.text(
      `${key}: count=${value.count}, totalLocal=${value.totalLocal}, totalUSD=${value.totalUSD}`,
    );
  });
  doc.end();
};

const renderCountryPdf = (data, res) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=country-report.pdf",
  );
  doc.pipe(res);
  doc.fontSize(18).text("Country Consolidation Report", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Scope: ${data.scope.level}`);
  doc.text(
    `Filters: ${data.filters.startDate || "all"} to ${data.filters.endDate || "all"}`,
  );
  doc.moveDown();
  Object.entries(data.byCountry).forEach(([moduleName, rows]) => {
    doc.fontSize(14).text(moduleName.toUpperCase());
    rows.forEach((row) => {
      doc.fontSize(10).text(
        `${row.countryName || "Unknown"} (${row.currency || ""}) - count=${row.count}, totalLocal=${row.totalLocal}, totalUSD=${row.totalUSD}`,
      );
    });
    doc.moveDown();
  });
  doc.end();
};

module.exports.exportSummaryReport = async (req, res) => {
  try {
    const { format = "csv", startDate, endDate } = req.query;
    const user = req.user || {};
    const cacheKey = getCacheKey("summary", user, { startDate, endDate });
    const cached = getCached(cacheKey);
    const data = cached || (await (async () => {
      req.query.startDate = startDate;
      req.query.endDate = endDate;
      const scopeMatch = buildScopeMatch(user);
      const dateMatch = buildDateMatch(startDate, endDate);
      const salesTotals = await aggregateTotals(
        Sale,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const orderTotals = await aggregateTotals(
        Order,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const invoiceTotals = await aggregateTotals(
        Invoice,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const shipmentTotals = await aggregateTotals(
        Shipment,
        { ...scopeMatch, ...dateMatch, isActive: true },
        "totalCost",
        "totalCostUSD",
      );
      const purchaseTotals = await aggregateTotals(
        PurchaseBill,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const clearingTotals = await aggregateTotals(
        ClearingJob,
        { ...scopeMatch, ...dateMatch, isActive: true },
        "totalClearingCost",
        "totalClearingCostUSD",
      );
      const invoiceOutstanding = await Invoice.aggregate([
        {
          $match: {
            ...scopeMatch,
            ...dateMatch,
            status: { $in: ["draft", "sent", "approved", "overdue"] },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalLocal: { $sum: { $ifNull: ["$totalAmount", 0] } },
            totalUSD: { $sum: { $ifNull: ["$priceUSD", 0] } },
          },
        },
      ]);
      const purchaseOutstanding = await PurchaseBill.aggregate([
        {
          $match: {
            ...scopeMatch,
            ...dateMatch,
            status: { $in: ["draft", "approved"] },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalLocal: { $sum: { $ifNull: ["$totalAmount", 0] } },
            totalUSD: { $sum: { $ifNull: ["$priceUSD", 0] } },
          },
        },
      ]);
      return {
        scope: {
          level:
            user.role === "superadmin"
              ? "global"
              : user.role === "countryadmin"
              ? "country"
              : "branch",
          countryId: user.countryId || null,
          branchId: user.branchId || null,
        },
        filters: { startDate: startDate || null, endDate: endDate || null },
        totals: {
          sales: salesTotals,
          orders: orderTotals,
          invoices: invoiceTotals,
          invoiceOutstanding: invoiceOutstanding[0] || {
            count: 0,
            totalLocal: 0,
            totalUSD: 0,
          },
          purchaseBills: purchaseTotals,
          purchaseOutstanding: purchaseOutstanding[0] || {
            count: 0,
            totalLocal: 0,
            totalUSD: 0,
          },
          shipments: shipmentTotals,
          clearingJobs: clearingTotals,
        },
      };
    })());

    if (format === "pdf") {
      return renderSummaryPdf(data, res);
    }
    const csv = buildSummaryCsv(data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=summary-report.csv",
    );
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      message: "Error exporting summary report",
      error: error.message,
    });
  }
};

module.exports.exportCountryConsolidation = async (req, res) => {
  try {
    const { format = "csv", startDate, endDate } = req.query;
    const user = req.user || {};
    const cacheKey = getCacheKey("by-country", user, { startDate, endDate });
    const cached = getCached(cacheKey);
    const data = cached || (await (async () => {
      const scopeMatch = buildScopeMatch(user);
      const dateMatch = buildDateMatch(startDate, endDate);
      const sales = await aggregateByCountry(
        Sale,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const orders = await aggregateByCountry(
        Order,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const invoices = await aggregateByCountry(
        Invoice,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const purchaseBills = await aggregateByCountry(
        PurchaseBill,
        { ...scopeMatch, ...dateMatch },
        "totalAmount",
        "priceUSD",
      );
      const shipments = await aggregateByCountry(
        Shipment,
        { ...scopeMatch, ...dateMatch, isActive: true },
        "totalCost",
        "totalCostUSD",
      );
      const clearingJobs = await aggregateByCountry(
        ClearingJob,
        { ...scopeMatch, ...dateMatch, isActive: true },
        "totalClearingCost",
        "totalClearingCostUSD",
      );
      return {
        scope: {
          level:
            user.role === "superadmin"
              ? "global"
              : user.role === "countryadmin"
              ? "country"
              : "branch",
          countryId: user.countryId || null,
          branchId: user.branchId || null,
        },
        filters: { startDate: startDate || null, endDate: endDate || null },
        byCountry: {
          sales,
          orders,
          invoices,
          purchaseBills,
          shipments,
          clearingJobs,
        },
      };
    })());

    if (format === "pdf") {
      return renderCountryPdf(data, res);
    }
    const csv = buildCountryCsv(data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=country-report.csv",
    );
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      message: "Error exporting country report",
      error: error.message,
    });
  }
};
