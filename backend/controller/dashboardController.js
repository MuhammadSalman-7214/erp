const query = require("../libs/dbQuery.js");

const buildWeeklySummary = async (userId) => {
  const now = new Date();
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0,
    0,
  );
  const weekEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const startMs = weekStart.getTime();
  const endMs = weekEnd.getTime();

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

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
      return {
        key: toDateKey(day),
        label: day.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
  });

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

  const buckets = weekDays.map((day) => ({
    label: day.label,
    sales: 0,
    purchases: 0,
    receivedPayments: 0,
    paidPayments: 0,
  }));

  const bucketIndexByKey = weekDays.reduce((acc, day, index) => {
    acc[day.key] = index;
    return acc;
  }, {});

  const addToBucket = (value, dateValue, field) => {
    const time = toTime(dateValue);
    if (time === null || time < startMs || time > endMs) return;

    const date = new Date(time);
    const bucketIndex = bucketIndexByKey[toDateKey(date)];
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
    if (payment.type === "received") {
      addToBucket(payment.amount, paymentDate, "receivedPayments");
    }
    if (payment.type === "paid") {
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

    let salesInvoices;
    let completedSalesProfitRows;
    let purchaseInvoices;
    let payments;
    let weeklySummary;
    try {
      [salesInvoices, completedSalesProfitRows, purchaseInvoices, payments] =
        await Promise.all([
          query(
            "SELECT id, totalAmount, dueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ?",
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
            "SELECT id, totalAmount, dueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ?",
            ["purchase", userId],
          ),
          query(
            "SELECT amount, type, invoice, paidAt, invoiceType FROM payments WHERE user_id = ?",
            [userId],
          ),
        ]);
      try {
        weeklySummary = await buildWeeklySummary(userId);
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

    const paymentByInvoice = payments.reduce((acc, payment) => {
      if (!payment.invoice) return acc;
      const key = String(payment.invoice);
      acc[key] = (acc[key] || 0) + toMoney(payment.amount);
      return acc;
    }, {});

    const totalReceivable = salesInvoices.reduce((sum, inv) => {
      const paid = paymentByInvoice[String(inv.id)] || 0;
      return sum + Math.max(toMoney(inv.totalAmount) - paid, 0);
    }, 0);

    const totalPayable = purchaseInvoices.reduce((sum, inv) => {
      const paid = paymentByInvoice[String(inv.id)] || 0;
      return sum + Math.max(toMoney(inv.totalAmount) - paid, 0);
    }, 0);

    const totalProfit = Number(completedSalesProfitRows?.[0]?.totalProfit || 0);

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
