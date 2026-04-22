const {
  createMonthlyPayment,
  buildBannerForUser,
  getPaymentHistory,
  getRevenueByUser,
  getUnpaidUsersForMonth,
} = require("../services/subscriptionService");
const userModel = require("../models/userModel");

const canAccessUserScopedResource = (req, userId) => {
  const requesterId = Number(req.user?.userId);
  const requesterRole = req.user?.role;
  const targetId = Number(userId);

  return (
    ["admin", "super_admin"].includes(requesterRole) || requesterId === targetId
  );
};

const addPayment = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || amount === undefined || amount === null) {
      return res.status(400).json({
        message: "userId and amount are required",
      });
    }

    if (!Number.isFinite(Number(userId)) || Number(userId) <= 0) {
      return res.status(400).json({
        message: "userId must be a valid positive number",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "amount must be a valid positive number",
      });
    }

    const payment = await createMonthlyPayment({
      userId: Number(userId),
      amount: Number(amount),
      addedBy: req.user?.userId || null,
      paidAt: new Date(),
    });

    return res.status(201).json({
      message: "Subscription payment recorded successfully",
      payment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to add payment",
    });
  }
};

const getUserPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!canAccessUserScopedResource(req, userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await userModel.selectBillingUserById(Number(userId));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payments = await getPaymentHistory(Number(userId));
    const totalRevenue = await getRevenueByUser(Number(userId));

    return res.status(200).json({
      userId: Number(userId),
      totalRevenue,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch payment history",
    });
  }
};

const getBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!canAccessUserScopedResource(req, id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const banner = await buildBannerForUser(Number(id));

    return res.status(200).json({ banner });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch banner",
    });
  }
};

const getUnpaidUsers = async (req, res) => {
  try {
    const users = await getUnpaidUsersForMonth();

    return res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch unpaid users",
    });
  }
};

const getUserRevenue = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!["admin", "super_admin"].includes(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await userModel.selectBillingUserById(Number(userId));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const totalRevenue = await getRevenueByUser(Number(userId));

    return res.status(200).json({
      userId: Number(userId),
      totalRevenue,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch revenue",
    });
  }
};

module.exports = {
  addPayment,
  getUserPaymentHistory,
  getBanner,
  getUnpaidUsers,
  getUserRevenue,
};
