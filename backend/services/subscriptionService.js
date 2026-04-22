const userModel = require("../models/userModel");
const paymentModel = require("../models/subscriptionPaymentModel");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getBannerMessage = (diffDays) => {
  if (diffDays === 2) {
    return "2 days left. Please pay before subscription end or your account will be deactivated";
  }

  if (diffDays === 1) {
    return "1 day left. Please pay before subscription end or your account will be deactivated";
  }

  if (diffDays === 0) {
    return "Last day. Please pay before subscription end or your account will be deactivated";
  }

  return null;
};

const normalizeDate = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getLastDayOfMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const getBillingDay = (user) => {
  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  const fallbackDay =
    createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.getDate() : 1;
  const billingDay = Number(user?.billingDay || fallbackDay || 1);

  if (!Number.isFinite(billingDay) || billingDay < 1) {
    return 1;
  }

  return Math.floor(billingDay);
};

const getDueDate = (user, referenceDate = new Date()) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = getLastDayOfMonth(year, month);
  const billingDay = Math.min(getBillingDay(user), lastDay);

  return new Date(year, month, billingDay, 0, 0, 0, 0);
};

const isPaid = async (userId, date = new Date()) => {
  const month = getMonthKey(date);
  const payment = await paymentModel.findSubscriptionPayment(userId, month);
  return Boolean(payment);
};

const createMonthlyPayment = async ({ userId, amount, addedBy, paidAt }) => {
  const user = await userModel.selectBillingUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "admin") {
    const error = new Error("Billing is only enabled for admin users");
    error.statusCode = 400;
    throw error;
  }

  const month = getMonthKey(paidAt || new Date());
  const existingPayment = await paymentModel.findSubscriptionPayment(
    userId,
    month,
  );

  if (existingPayment) {
    const error = new Error("Payment already exists for this user and month");
    error.statusCode = 409;
    throw error;
  }

  let insertResult;
  try {
    insertResult = await paymentModel.createSubscriptionPayment({
      userId,
      month,
      amount,
      addedBy,
      paidAt: paidAt || new Date(),
    });
  } catch (error) {
    if (error?.errno === 1062) {
      const duplicateError = new Error(
        "Payment already exists for this user and month",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }

  await userModel.updateUserStatus(userId, 1);

  return {
    id: insertResult.insertId,
    userId,
    month,
    amount,
    paidAt: paidAt || new Date(),
    addedBy: addedBy || null,
  };
};

const buildBannerForUser = async (userId, referenceDate = new Date()) => {
  const user = await userModel.selectBillingUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "admin") {
    return null;
  }

  const month = getMonthKey(referenceDate);
  const paid = await paymentModel.findSubscriptionPayment(userId, month);

  if (paid) {
    return null;
  }

  const dueDate = getDueDate(user, referenceDate);
  const today = normalizeDate(referenceDate);
  const diffDays = Math.round(
    (dueDate.getTime() - today.getTime()) / MS_PER_DAY,
  );

  if (diffDays > 2 || diffDays < 0) {
    return null;
  }

  return getBannerMessage(diffDays);
};

const getPaymentHistory = async (userId) => {
  return paymentModel.findSubscriptionPaymentsByUser(userId);
};

const getRevenueByUser = async (userId) => {
  return paymentModel.sumSubscriptionRevenueByUser(userId);
};

const getUnpaidUsersForMonth = async (referenceDate = new Date()) => {
  const month = getMonthKey(referenceDate);
  const rows = await paymentModel.findUnpaidUsersForMonth(month);

  return rows.map((user) => {
    const dueDate = getDueDate(user, referenceDate);
    const today = normalizeDate(referenceDate);
    const daysUntilDue = Math.round(
      (dueDate.getTime() - today.getTime()) / MS_PER_DAY,
    );

    return {
      ...user,
      month,
      dueDate,
      daysUntilDue,
    };
  });
};

const deactivateOverdueUsers = async (referenceDate = new Date()) => {
  const month = getMonthKey(referenceDate);
  const users = await userModel.selectBillingUsers("admin");
  const paidRows = await paymentModel.findPaidUserIdsForMonth(month);
  const paidUserIdSet = new Set(paidRows.map((row) => Number(row.userId)));
  const today = normalizeDate(referenceDate);

  const results = {
    checked: users.length,
    deactivated: 0,
    alreadyInactive: 0,
    skippedPaid: 0,
  };

  for (const user of users) {
    const dueDate = getDueDate(user, referenceDate);
    const hasPaid = paidUserIdSet.has(Number(user.id));

    if (hasPaid) {
      results.skippedPaid += 1;
      continue;
    }

    if (today.getTime() < dueDate.getTime()) {
      continue;
    }

    if (Number(user.isActive) === 0) {
      results.alreadyInactive += 1;
      continue;
    }

    await userModel.updateUserStatus(user.id, 0);
    results.deactivated += 1;
  }

  return results;
};

module.exports = {
  getBannerMessage,
  getMonthKey,
  getDueDate,
  isPaid,
  createMonthlyPayment,
  buildBannerForUser,
  getPaymentHistory,
  getRevenueByUser,
  getUnpaidUsersForMonth,
  deactivateOverdueUsers,
};
