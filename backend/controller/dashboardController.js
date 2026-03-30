const query = require("../libs/dbQuery.js");

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
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

    const toTime = (value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      const time = date.getTime();
      return Number.isNaN(time) ? null : time;
    };

    let salesInvoices;
    let purchaseInvoices;
    let payments;
    try {
      [salesInvoices, purchaseInvoices, payments] = await Promise.all([
        query(
          "SELECT id, totalAmount, dueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ?",
          ["sales", userId],
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
      acc[key] = (acc[key] || 0) + payment.amount;
      return acc;
    }, {});

    const totalReceivable = salesInvoices.reduce((sum, inv) => {
      const paid = paymentByInvoice[String(inv.id)] || 0;
      return sum + Math.max(inv.totalAmount - paid, 0);
    }, 0);

    const totalPayable = purchaseInvoices.reduce((sum, inv) => {
      const paid = paymentByInvoice[String(inv.id)] || 0;
      return sum + Math.max(inv.totalAmount - paid, 0);
    }, 0);

    const todaysSales = salesInvoices
      .filter((inv) => {
        const createdAt =
          toTime(inv.createdAt) ?? toTime(inv.issueDate);
        return createdAt !== null && createdAt >= startMs && createdAt <= endMs;
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const todaysPurchases = purchaseInvoices
      .filter((inv) => {
        const createdAt =
          toTime(inv.createdAt) ?? toTime(inv.issueDate);
        return createdAt !== null && createdAt >= startMs && createdAt <= endMs;
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const todaysReceivedPayments = payments
      .filter((payment) => {
        const paidAt =
          toTime(payment.paidAt) ?? toTime(payment.createdAt);
        return (
          payment.type === "received" &&
          paidAt !== null &&
          paidAt >= startMs &&
          paidAt <= endMs
        );
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    const todaysPaidPayments = payments
      .filter((payment) => {
        const paidAt =
          toTime(payment.paidAt) ?? toTime(payment.createdAt);
        return (
          payment.type === "paid" &&
          paidAt !== null &&
          paidAt >= startMs &&
          paidAt <= endMs
        );
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    let overdueInvoices;
    let recentInvoices;
    let lowStockProducts;
    try {
      [overdueInvoices, recentInvoices, lowStockProducts] = await Promise.all([
        query(
          "SELECT * FROM invoices WHERE status NOT IN ('paid', 'cancelled') AND dueDate < ? AND user_id = ? ORDER BY dueDate ASC LIMIT 10",
          [startOfDay, userId],
        ),
        query(
          "SELECT * FROM invoices WHERE user_id = ? ORDER BY createdAt DESC LIMIT 8",
          [userId],
        ),
        query(
          "SELECT pc.*, p.name AS product_name FROM product_codes pc LEFT JOIN products p ON p.id = pc.product WHERE pc.quantity <= 50 AND pc.user_id = ? ORDER BY pc.quantity ASC LIMIT 8",
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

    lowStockProducts = lowStockProducts.map((pc) => ({
      ...pc,
      product: pc.product
        ? { id: pc.product, name: pc.product_name }
        : null,
    }));

    const cashBankBalance = todaysReceivedPayments - todaysPaidPayments;

    res.status(200).json({
      success: true,
      summary: {
        totalReceivable,
        totalPayable,
        todaysSales,
        todaysPurchases,
        cashBankBalance,
        todaysReceivedPayments,
        todaysPaidPayments,
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
