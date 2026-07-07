const query = require("../libs/dbQuery");
const { buildAllTimeBusinessStats } = require("../services/analyticsService");
const {
  findInsightByUserAndDate,
  findInsightsForUser,
  getTodaysInsightStateForUser,
  getDateKey,
} = require("../models/BusinessInsight");
const { markInsightSeen } = require("../models/UserInsightView");

const getStartOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );

const getEndOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const getRangeConfig = (range, now = new Date()) => {
  const normalizedRange = String(range || "week").toLowerCase();

  if (normalizedRange === "today") {
    return {
      range: normalizedRange,
      startDate: getStartOfDay(now),
      endDate: getEndOfDay(now),
      bucketType: "hour",
      bucketCount: 24,
    };
  }

  if (normalizedRange === "month") {
    const start = getStartOfDay(new Date(now));
    start.setDate(start.getDate() - 29);
    return {
      range: normalizedRange,
      startDate: start,
      endDate: getEndOfDay(now),
      bucketType: "day",
      bucketCount: 30,
    };
  }

  if (normalizedRange === "year") {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      range: normalizedRange,
      startDate: start,
      endDate: end,
      bucketType: "month",
      bucketCount: 12,
    };
  }

  const start = getStartOfDay(new Date(now));
  start.setDate(start.getDate() - 6);
  return {
    range: "week",
    startDate: start,
    endDate: getEndOfDay(now),
    bucketType: "day",
    bucketCount: 7,
  };
};

const getBucketKey = (date, bucketType) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  if (bucketType === "hour") {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}-${String(value.getHours()).padStart(2, "0")}`;
  }

  if (bucketType === "month") {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const getBucketLabel = (date, bucketType, locale = "en-US") => {
  const value = new Date(date);

  if (bucketType === "hour") {
    return value.toLocaleString(locale, {
      hour: "numeric",
      hour12: true,
    });
  }

  if (bucketType === "month") {
    return value.toLocaleString(locale, {
      month: "short",
      year: "2-digit",
    });
  }

  return value.toLocaleDateString(locale, {
    month: "short",
    day: "2-digit",
  });
};

const buildTrendSummary = ({
  range,
  salesInvoices = [],
  purchaseInvoices = [],
  payments = [],
  now = new Date(),
}) => {
  const config = getRangeConfig(range, now);
  const buckets = new Map();

  for (let index = 0; index < config.bucketCount; index += 1) {
    const bucketDate = new Date(config.startDate);

    if (config.bucketType === "hour") {
      bucketDate.setHours(index, 0, 0, 0);
    } else if (config.bucketType === "month") {
      bucketDate.setMonth(bucketDate.getMonth() + index, 1);
      bucketDate.setHours(0, 0, 0, 0);
    } else {
      bucketDate.setDate(bucketDate.getDate() + index);
    }

    const bucketKey = getBucketKey(bucketDate, config.bucketType);
    buckets.set(bucketKey, {
      label: getBucketLabel(bucketDate, config.bucketType),
      sales: 0,
      purchases: 0,
      receivedPayments: 0,
      paidPayments: 0,
    });
  }

  const addToBucket = (dateValue, field, amount) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    if (date < config.startDate || date > config.endDate) {
      return;
    }

    const bucketKey = getBucketKey(date, config.bucketType);
    const bucket = buckets.get(bucketKey);

    if (!bucket) {
      return;
    }

    bucket[field] += Number(amount) || 0;
  };

  for (const invoice of salesInvoices) {
    addToBucket(invoice.createdAt || invoice.issueDate, "sales", invoice.totalAmount);
  }

  for (const invoice of purchaseInvoices) {
    addToBucket(invoice.createdAt || invoice.issueDate, "purchases", invoice.totalAmount);
  }

  for (const payment of payments) {
    const paymentDate = payment.paidAt || payment.createdAt;
    const paymentType = String(payment.type || "").toLowerCase();

    if (paymentType === "received") {
      addToBucket(paymentDate, "receivedPayments", payment.amount);
    } else if (paymentType === "paid") {
      addToBucket(paymentDate, "paidPayments", payment.amount);
    }
  }

  return {
    labels: Array.from(buckets.values()).map((bucket) => bucket.label),
    sales: Array.from(buckets.values()).map((bucket) => bucket.sales),
    purchases: Array.from(buckets.values()).map((bucket) => bucket.purchases),
    receivedPayments: Array.from(buckets.values()).map(
      (bucket) => bucket.receivedPayments,
    ),
    paidPayments: Array.from(buckets.values()).map((bucket) => bucket.paidPayments),
  };
};

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestedRange = String(req.query.range || "week").toLowerCase();
    const lowStockThreshold = 50;
    const now = new Date();
    const startOfDay = getStartOfDay(now);
    const endOfDay = getEndOfDay(now);
    const startMs = startOfDay.getTime();
    const endMs = endOfDay.getTime();
    const overdueThreshold = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0,
    );

    let salesInvoices;
    let completedSalesProfitRows;
    let purchaseInvoices;
    let vendors;
    let customers;
    let payments;
    let weeklySummary;
    try {
      [
        salesInvoices,
        completedSalesProfitRows,
        purchaseInvoices,
        vendors,
        payments,
        customers,
      ] = await Promise.all([
        query(
          "SELECT id, customerId, customer_name, customer_code, totalAmount, dueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ?",
          ["sales", userId],
        ),
        query(
          `SELECT COALESCE(SUM(s.totalAmount - IFNULL(costs.cost, 0)), 0) AS totalProfit
           FROM sales s
           LEFT JOIN (
             SELECT si.sale_id, SUM(si.quantity * COALESCE(p.purchasePrice, p.Price, 0)) AS cost
             FROM sale_items si
             LEFT JOIN products p ON p.id = si.product AND p.user_id = si.user_id
             WHERE si.user_id = ?
             GROUP BY si.sale_id
           ) costs ON costs.sale_id = s.id
           WHERE s.user_id = ? AND LOWER(COALESCE(s.status, '')) = 'completed'`,
          [userId, userId],
        ),
        query(
          "SELECT id, vendor, totalAmount, dueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ?",
          ["purchase", userId],
        ),
        query("SELECT id, name, openingBalance FROM vendors WHERE user_id = ?", [
          userId,
        ]),
        query(
          "SELECT amount, type, invoice, paidAt, invoiceType, partyType, vendor, customerId, customer_name, customer_code FROM payments WHERE user_id = ?",
          [userId],
        ),
        query(
          "SELECT id, name, customerCode, openingBalance FROM customers WHERE user_id = ?",
          [userId],
        ),
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    // Keep the existing summary logic intact.
    const normalizeText = (value = "") => String(value).trim().toLowerCase();

    const vendorLookup = new Map();
    const vendorMap = new Map();
    const purchaseInvoiceIdsWithPayments = new Set();
    const customerLookup = new Map();
    const customerMap = new Map();
    const salesInvoiceIdsWithPayments = new Set();

    for (const vendor of vendors || []) {
      const vendorId = String(vendor.id);
      vendorMap.set(vendorId, {
        vendorId,
        name: vendor.name || "Vendor",
        openingBalance: Number(vendor.openingBalance) || 0,
        totalAmount: Number(vendor.openingBalance) || 0,
        paidAmount: 0,
        remainingAmount: Number(vendor.openingBalance) || 0,
      });

      const nameKey = normalizeText(vendor.name);
      if (nameKey) {
        vendorLookup.set(`name:${nameKey}`, vendorId);
      }
    }

    const resolveVendorSummaryKey = (details) => {
      const vendorId = details?.vendor ? String(details.vendor) : "";
      if (vendorId && vendorMap.has(vendorId)) {
        return vendorId;
      }

      const vendorName = normalizeText(details?.vendor_name || details?.name);
      const matchedVendorId = vendorLookup.get(`name:${vendorName}`);
      if (matchedVendorId) return matchedVendorId;

      if (!vendorId) return "";

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          name: details?.vendor_name || details?.name || "Vendor",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
        });
      }
      return vendorId;
    };

    for (const payment of payments) {
      if (String(payment.partyType || "").toLowerCase() !== "vendor") {
        continue;
      }
      if (String(payment.type || "").toLowerCase() !== "paid") {
        continue;
      }

      const vendorKey = resolveVendorSummaryKey(payment);
      if (!vendorKey) continue;

      const current = vendorMap.get(vendorKey);
      if (!current) continue;
      current.paidAmount += Number(payment.amount) || 0;
      if (payment.invoice) {
        purchaseInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of purchaseInvoices) {
      const vendorKey = resolveVendorSummaryKey(invoice);
      if (!vendorKey) continue;

      const current = vendorMap.get(vendorKey);
      if (!current) continue;
      current.totalAmount += Number(invoice.totalAmount) || 0;
      if (
        String(invoice.status || "").toLowerCase() === "paid" &&
        !purchaseInvoiceIdsWithPayments.has(String(invoice.id))
      ) {
        current.paidAmount += Number(invoice.totalAmount) || 0;
      }
    }

    for (const customer of customers || []) {
      const customerId = String(customer.id);
      customerMap.set(customerId, {
        customerId,
        customerCode: customer.customerCode || "",
        customerName: customer.name || "Customer",
        openingBalance: Number(customer.openingBalance) || 0,
        totalAmount: Number(customer.openingBalance) || 0,
        paidAmount: 0,
        remainingAmount: Number(customer.openingBalance) || 0,
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
      const code = normalizeText(details?.customer_code);
      const name = normalizeText(details?.customer_name);
      const matchedCustomerId =
        customerLookup.get(`combo:${code}|${name}`) ||
        customerLookup.get(`code:${code}`) ||
        customerLookup.get(`name:${name}`);
      if (matchedCustomerId) return matchedCustomerId;

      const legacyKey = code || name ? `${code}|${name}` : "";
      if (!legacyKey) return "";
      if (!customerMap.has(legacyKey)) {
        customerMap.set(legacyKey, {
          customerId: "",
          customerCode: details?.customer_code || "",
          customerName: details?.customer_name || "Customer",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
        });
      }
      return legacyKey;
    };

    const resolveCustomerSummaryKey = (details) => {
      const customerId = details?.customerId ? String(details.customerId) : "";
      if (customerId && customerMap.has(customerId)) {
        return customerId;
      }

      const legacyKey = ensureLegacyCustomer(details);
      if (legacyKey) {
        return legacyKey;
      }

      if (customerId) {
        customerMap.set(customerId, {
          customerId,
          customerCode: details?.customer_code || "",
          customerName: details?.customer_name || "Customer",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
        });
        return customerId;
      }

      return "";
    };

    for (const payment of payments) {
      if (String(payment.partyType || "").toLowerCase() !== "customer") {
        continue;
      }
      if (String(payment.type || "").toLowerCase() !== "received") {
        continue;
      }

      const customerKey = resolveCustomerSummaryKey(payment);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
      if (!current) continue;
      current.paidAmount += Number(payment.amount) || 0;
      if (payment.invoice) {
        salesInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of salesInvoices) {
      const customerKey = resolveCustomerSummaryKey(invoice);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
      if (!current) continue;
      current.totalAmount += Number(invoice.totalAmount) || 0;
      if (
        String(invoice.status || "").toLowerCase() === "paid" &&
        !salesInvoiceIdsWithPayments.has(String(invoice.id))
      ) {
        current.paidAmount += Number(invoice.totalAmount) || 0;
      }
    }

    const paymentByInvoice = payments.reduce((acc, payment) => {
      if (!payment.invoice) return acc;
      const key = String(payment.invoice);
      acc[key] = (acc[key] || 0) + (Number(payment.amount) || 0);
      return acc;
    }, {});

    const unresolvedPurchasePayable = purchaseInvoices.reduce(
      (sum, invoice) => {
        const vendorKey = resolveVendorSummaryKey(invoice);
        if (vendorKey) {
          return sum;
        }
        const paid = paymentByInvoice[String(invoice.id)] || 0;
        return sum + Math.max((Number(invoice.totalAmount) || 0) - paid, 0);
      },
      0,
    );

    const unresolvedSalesReceivable = salesInvoices.reduce((sum, invoice) => {
      const customerKey = resolveCustomerSummaryKey(invoice);
      if (customerKey) {
        return sum;
      }
      const paid = paymentByInvoice[String(invoice.id)] || 0;
      return sum + Math.max((Number(invoice.totalAmount) || 0) - paid, 0);
    }, 0);

    const totalReceivable =
      Array.from(customerMap.values()).reduce(
        (sum, entry) => sum + Math.max(entry.totalAmount - entry.paidAmount, 0),
        0,
      ) + unresolvedSalesReceivable;

    const totalPayable =
      Array.from(vendorMap.values()).reduce(
        (sum, entry) => sum + Math.max(entry.totalAmount - entry.paidAmount, 0),
        0,
      ) + unresolvedPurchasePayable;

    const totalProfit = Number(completedSalesProfitRows?.[0]?.totalProfit || 0);

    const totalSales = salesInvoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount) || 0),
      0,
    );

    const totalPurchases = purchaseInvoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount) || 0),
      0,
    );

    const totalReceivedPayments = payments
      .filter(
        (payment) => String(payment.type || "").toLowerCase() === "received",
      )
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    const totalPaidPayments = payments
      .filter((payment) => String(payment.type || "").toLowerCase() === "paid")
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    const todaysSales = salesInvoices
      .filter((inv) => {
        const createdAt = new Date(inv.createdAt || inv.issueDate || 0).getTime();
        return createdAt >= startMs && createdAt <= endMs;
      })
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    const todaysPurchases = purchaseInvoices
      .filter((inv) => {
        const createdAt = new Date(inv.createdAt || inv.issueDate || 0).getTime();
        return createdAt >= startMs && createdAt <= endMs;
      })
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    const todaysReceivedPayments = payments
      .filter((payment) => {
        const paidAt = new Date(payment.paidAt || payment.createdAt || 0).getTime();
        return (
          String(payment.type || "").toLowerCase() === "received" &&
          paidAt >= startMs &&
          paidAt <= endMs
        );
      })
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    const todaysPaidPayments = payments
      .filter((payment) => {
        const paidAt = new Date(payment.paidAt || payment.createdAt || 0).getTime();
        return (
          String(payment.type || "").toLowerCase() === "paid" &&
          paidAt >= startMs &&
          paidAt <= endMs
        );
      })
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    let overdueInvoices;
    let recentInvoices;
    let lowStockProducts;
    try {
      [overdueInvoices, recentInvoices, lowStockProducts] = await Promise.all([
        query(
          "SELECT * FROM invoices WHERE status NOT IN ('paid', 'cancelled') AND dueDate < ? AND user_id = ? ORDER BY dueDate ASC LIMIT 10",
          [overdueThreshold, userId],
        ),
        query(
          "SELECT * FROM invoices WHERE user_id = ? ORDER BY createdAt DESC LIMIT 8",
          [userId],
        ),
        query(
          "SELECT pc.*, p.name AS product_name FROM product_codes pc LEFT JOIN products p ON p.id = pc.product WHERE pc.quantity < ? AND pc.user_id = ? ORDER BY pc.quantity ASC LIMIT 8",
          [lowStockThreshold, userId],
        ),
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    lowStockProducts = lowStockProducts.map((pc) => ({
      ...pc,
      product: pc.product ? { id: pc.product, name: pc.product_name } : null,
    }));

    weeklySummary = buildTrendSummary({
      range: requestedRange,
      salesInvoices,
      purchaseInvoices,
      payments,
      now,
    });

    const cashBankBalance = todaysReceivedPayments - todaysPaidPayments;

    res.status(200).json({
      success: true,
      summary: {
        totalReceivable,
        totalProfit,
        totalPayable,
        totalSales,
        totalPurchases,
        totalReceivedPayments,
        totalPaidPayments,
        todaysSales,
        todaysPurchases,
        cashBankBalance,
        todaysReceivedPayments,
        todaysPaidPayments,
        weeklySummary,
      },
      overdueInvoices,
      recentInvoices,
      lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayBusinessInsight = async (req, res) => {
  try {
    const userId = req.user.userId;
    const insightState = await getTodaysInsightStateForUser(userId);

    return res.status(200).json({
      success: true,
      showPopup: insightState.showPopup,
      seen: insightState.seen,
      insight: insightState.insight,
    });
  } catch (error) {
    console.error("[dashboardController] Failed to fetch insight state:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load today's business insight",
      error: error.message,
    });
  }
};

const getBusinessInsightsHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(Number(req.query.limit) || 14, 14);
    const insights = await findInsightsForUser(userId, limit);

    return res.status(200).json({
      success: true,
      count: insights.length,
      insights,
    });
  } catch (error) {
    console.error("[dashboardController] Failed to fetch business insight history:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load business insight history",
      error: error.message,
    });
  }
};

const markTodayBusinessInsightSeen = async (req, res) => {
  try {
    const userId = req.user.userId;
    const insightIdFromBody = req.body?.insightId;
    let insightId = insightIdFromBody;

    if (!insightId) {
      const todayInsight = await findInsightByUserAndDate(userId, getDateKey());
      insightId = todayInsight?.id;
    }

    if (!insightId) {
      return res.status(404).json({
        success: false,
        message: "Today's business insight is not available yet",
      });
    }

    const record = await markInsightSeen({
      userId,
      insightId,
    });

    return res.status(200).json({
      success: true,
      message: "Insight marked as seen",
      view: record,
    });
  } catch (error) {
    console.error("[dashboardController] Failed to mark insight seen:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update insight status",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardSummary,
  getTodayBusinessInsight,
  getBusinessInsightsHistory,
  markTodayBusinessInsightSeen,
  getTodaysInsightStateForUser,
  buildAllTimeBusinessStats,
};
