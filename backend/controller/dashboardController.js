const Invoice = require("../models/Invoicemodel");
const Payment = require("../models/Paymentmodel");
const Product = require("../models/Productmodel");

const getDashboardSummary = async (req, res) => {
  try {
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

    const [salesInvoices, purchaseInvoices, payments] = await Promise.all([
      Invoice.find({ invoiceType: "sales" }).select("totalAmount dueDate status createdAt").lean(),
      Invoice.find({ invoiceType: "purchase" }).select("totalAmount dueDate status createdAt").lean(),
      Payment.find().select("amount type invoice paidAt invoiceType").lean(),
    ]);

    const paymentByInvoice = payments.reduce((acc, payment) => {
      if (!payment.invoice) return acc;
      const key = payment.invoice.toString();
      acc[key] = (acc[key] || 0) + payment.amount;
      return acc;
    }, {});

    const totalReceivable = salesInvoices.reduce((sum, inv) => {
      const paid = paymentByInvoice[inv._id.toString()] || 0;
      return sum + Math.max(inv.totalAmount - paid, 0);
    }, 0);

    const totalPayable = purchaseInvoices.reduce((sum, inv) => {
      const paid = paymentByInvoice[inv._id.toString()] || 0;
      return sum + Math.max(inv.totalAmount - paid, 0);
    }, 0);

    const todaysSales = salesInvoices
      .filter((inv) => inv.createdAt >= startOfDay && inv.createdAt <= endOfDay)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const todaysPurchases = purchaseInvoices
      .filter((inv) => inv.createdAt >= startOfDay && inv.createdAt <= endOfDay)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const todaysReceivedPayments = payments
      .filter(
        (payment) =>
          payment.type === "received" &&
          payment.paidAt >= startOfDay &&
          payment.paidAt <= endOfDay,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    const todaysPaidPayments = payments
      .filter(
        (payment) =>
          payment.type === "paid" &&
          payment.paidAt >= startOfDay &&
          payment.paidAt <= endOfDay,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    const overdueInvoices = await Invoice.find({
      status: { $nin: ["paid", "cancelled"] },
      dueDate: { $lt: startOfDay },
    })
      .sort({ dueDate: 1 })
      .limit(10)
      .lean();

    const recentInvoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const lowStockProducts = await Product.find({ quantity: { $lte: 5 } })
      .sort({ quantity: 1 })
      .limit(8)
      .lean();

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
