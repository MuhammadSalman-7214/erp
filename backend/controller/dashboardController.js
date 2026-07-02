const query = require("../libs/dbQuery.js");

const toTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
};

const toMoney = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const getRangeConfig = (range = "week") => {
  const now = new Date();
  const normalizedRange = ["today", "week", "month", "year"].includes(range)
    ? range
    : "week";

  const startOfDay = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

  const endOfDay = (date) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );

  let startDate;
  let endDate;
  if (normalizedRange === "today") {
    startDate = startOfDay(now);
    endDate = endOfDay(now);
  } else if (normalizedRange === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = endOfDay(now);
  } else if (normalizedRange === "year") {
    startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 this year
    endDate = endOfDay(now); // through today
  } else {
    const currentDay = now.getDay();
    const offsetFromMonday = (currentDay + 6) % 7;
    startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offsetFromMonday,
      0,
      0,
      0,
      0,
    );
    endDate = endOfDay(now);
  }

  return {
    normalizedRange,
    startDate,
    endDate,
    startMs: startDate.getTime(),
    endMs: endDate.getTime(),
  };
};

const formatRangeLabel = (date, range) => {
  if (range === "today") return "Today";
  if (range === "year")
    return date.toLocaleDateString("en-US", { month: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const toMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getBucketGranularity = (range) => (range === "year" ? "month" : "day");

const buildRangeSummary = async (userId, range = "week") => {
  const { normalizedRange, startDate, endDate, startMs, endMs } =
    getRangeConfig(range);
  const granularity = getBucketGranularity(normalizedRange);

  const bucketDates = [];
  if (granularity === "month") {
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor.getTime() <= endDate.getTime()) {
      bucketDates.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(startDate);
    while (cursor.getTime() <= endDate.getTime()) {
      bucketDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const buckets = bucketDates.map((date) => ({
    key: granularity === "month" ? toMonthKey(date) : toDateKey(date),
    label: formatRangeLabel(date, normalizedRange),
    sales: 0,
    purchases: 0,
    receivedPayments: 0,
    paidPayments: 0,
  }));
  const bucketIndexByKey = buckets.reduce((acc, bucket, index) => {
    acc[bucket.key] = index;
    return acc;
  }, {});

  const [salesInvoices, purchaseInvoices, payments] = await Promise.all([
    query(
      "SELECT id, totalAmount, createdAt, issueDate FROM invoices WHERE invoiceType = ? AND user_id = ?",
      ["sales", userId],
    ),
    query(
      "SELECT id, totalAmount, createdAt, issueDate FROM invoices WHERE invoiceType = ? AND user_id = ?",
      ["purchase", userId],
    ),
    query(
      "SELECT amount, type, paidAt, createdAt FROM payments WHERE user_id = ?",
      [userId],
    ),
  ]);

  const addToBucket = (value, dateValue, field) => {
    const time = toTime(dateValue);
    if (time === null || time < startMs || time > endMs) return;
    const date = new Date(time);
    const key = granularity === "month" ? toMonthKey(date) : toDateKey(date);
    const bucketIndex = bucketIndexByKey[key];
    if (bucketIndex === undefined) return;
    buckets[bucketIndex][field] += toMoney(value);
  };

  salesInvoices.forEach((invoice) => {
    addToBucket(
      invoice.totalAmount,
      invoice.createdAt ?? invoice.issueDate,
      "sales",
    );
  });

  purchaseInvoices.forEach((invoice) => {
    addToBucket(
      invoice.totalAmount,
      invoice.createdAt ?? invoice.issueDate,
      "purchases",
    );
  });

  payments.forEach((payment) => {
    const paymentDate = payment.paidAt ?? payment.createdAt;
    const type = String(payment.type || "").toLowerCase();
    if (type === "received") {
      addToBucket(payment.amount, paymentDate, "receivedPayments");
    }
    if (type === "paid") {
      addToBucket(payment.amount, paymentDate, "paidPayments");
    }
  });

  return {
    labels: buckets.map((bucket) => bucket.label),
    sales: buckets.map((bucket) => bucket.sales),
    purchases: buckets.map((bucket) => bucket.purchases),
    receivedPayments: buckets.map((bucket) => bucket.receivedPayments),
    paidPayments: buckets.map((bucket) => bucket.paidPayments),
  };
};

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestedRange = String(req.query.range || "week").toLowerCase();
    const lowStockThreshold = 50;
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
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
        query(
          "SELECT id, name, openingBalance FROM vendors WHERE user_id = ?",
          [userId],
        ),
        query(
          "SELECT amount, type, invoice, paidAt, invoiceType, partyType, vendor, customerId, customer_name, customer_code FROM payments WHERE user_id = ?",
          [userId],
        ),
        query(
          "SELECT id, name, customerCode, openingBalance FROM customers WHERE user_id = ?",
          [userId],
        ),
      ]);
      try {
        weeklySummary = await buildRangeSummary(userId, requestedRange);
      } catch (weeklyError) {
        weeklySummary = null;
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

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
      current.paidAmount += toMoney(payment.amount);
      if (payment.invoice) {
        purchaseInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of purchaseInvoices) {
      const vendorKey = resolveVendorSummaryKey(invoice);
      if (!vendorKey) continue;

      const current = vendorMap.get(vendorKey);
      if (!current) continue;
      current.totalAmount += toMoney(invoice.totalAmount);
      if (
        String(invoice.status || "").toLowerCase() === "paid" &&
        !purchaseInvoiceIdsWithPayments.has(String(invoice.id))
      ) {
        current.paidAmount += toMoney(invoice.totalAmount);
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
      current.paidAmount += toMoney(payment.amount);
      if (payment.invoice) {
        salesInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of salesInvoices) {
      const customerKey = resolveCustomerSummaryKey(invoice);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
      if (!current) continue;
      current.totalAmount += toMoney(invoice.totalAmount);
      if (
        String(invoice.status || "").toLowerCase() === "paid" &&
        !salesInvoiceIdsWithPayments.has(String(invoice.id))
      ) {
        current.paidAmount += toMoney(invoice.totalAmount);
      }
    }

    const paymentByInvoice = payments.reduce((acc, payment) => {
      if (!payment.invoice) return acc;
      const key = String(payment.invoice);
      acc[key] = (acc[key] || 0) + toMoney(payment.amount);
      return acc;
    }, {});

    const unresolvedPurchasePayable = purchaseInvoices.reduce(
      (sum, invoice) => {
        const vendorKey = resolveVendorSummaryKey(invoice);
        if (vendorKey) {
          return sum;
        }
        const paid = paymentByInvoice[String(invoice.id)] || 0;
        return sum + Math.max(toMoney(invoice.totalAmount) - paid, 0);
      },
      0,
    );

    const unresolvedSalesReceivable = salesInvoices.reduce((sum, invoice) => {
      const customerKey = resolveCustomerSummaryKey(invoice);
      if (customerKey) {
        return sum;
      }
      const paid = paymentByInvoice[String(invoice.id)] || 0;
      return sum + Math.max(toMoney(invoice.totalAmount) - paid, 0);
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
      (sum, inv) => sum + toMoney(inv.totalAmount),
      0,
    );

    const totalPurchases = purchaseInvoices.reduce(
      (sum, inv) => sum + toMoney(inv.totalAmount),
      0,
    );

    const totalReceivedPayments = payments
      .filter(
        (payment) => String(payment.type || "").toLowerCase() === "received",
      )
      .reduce((sum, payment) => sum + toMoney(payment.amount), 0);

    const totalPaidPayments = payments
      .filter((payment) => String(payment.type || "").toLowerCase() === "paid")
      .reduce((sum, payment) => sum + toMoney(payment.amount), 0);

    const todaysSales = salesInvoices
      .filter((inv) => {
        const createdAt = toTime(inv.createdAt) ?? toTime(inv.issueDate);
        return createdAt !== null && createdAt >= startMs && createdAt <= endMs;
      })
      .reduce((sum, inv) => sum + toMoney(inv.totalAmount), 0);

    const todaysPurchases = purchaseInvoices
      .filter((inv) => {
        const createdAt = toTime(inv.createdAt) ?? toTime(inv.issueDate);
        return createdAt !== null && createdAt >= startMs && createdAt <= endMs;
      })
      .reduce((sum, inv) => sum + toMoney(inv.totalAmount), 0);

    const todaysReceivedPayments = payments
      .filter((payment) => {
        const paidAt = toTime(payment.paidAt) ?? toTime(payment.createdAt);
        return (
          payment.type === "received" &&
          paidAt !== null &&
          paidAt >= startMs &&
          paidAt <= endMs
        );
      })
      .reduce((sum, payment) => sum + toMoney(payment.amount), 0);

    const todaysPaidPayments = payments
      .filter((payment) => {
        const paidAt = toTime(payment.paidAt) ?? toTime(payment.createdAt);
        return (
          payment.type === "paid" &&
          paidAt !== null &&
          paidAt >= startMs &&
          paidAt <= endMs
        );
      })
      .reduce((sum, payment) => sum + toMoney(payment.amount), 0);

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

module.exports = { getDashboardSummary };
