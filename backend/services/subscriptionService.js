const userModel = require("../models/userModel");
const paymentModel = require("../models/subscriptionPaymentModel");

const SUBSCRIPTION_DUE_DAY = 8;
const SUBSCRIPTION_BANNER_END_DAY = 9;
const SUBSCRIPTION_DEACTIVATION_DAY = 10;

const getBannerMessage = (diffDays) => {
  if (diffDays === 2) {
    return "Subscription payment for this month is due. Please pay before the 10th to keep your account active.";
  }

  if (diffDays === 1) {
    return "Payment is due today. Please pay now to avoid deactivation on the 10th.";
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

const getBillingCycleMonthKeyForUser = (referenceDate = new Date()) =>
  getMonthKey(referenceDate);

const getSubscriptionDay = (referenceDate = new Date()) =>
  normalizeDate(referenceDate).getDate();

const getSubscriptionDueDate = (referenceDate = new Date()) => {
  const normalized = normalizeDate(referenceDate);
  return new Date(
    normalized.getFullYear(),
    normalized.getMonth(),
    SUBSCRIPTION_DUE_DAY,
    0,
    0,
    0,
    0,
  );
};

const isWithinBannerWindow = (referenceDate = new Date()) => {
  const day = getSubscriptionDay(referenceDate);
  return day >= SUBSCRIPTION_DUE_DAY && day <= SUBSCRIPTION_BANNER_END_DAY;
};

const isPaid = async (userId, date = new Date()) => {
  const user = await userModel.selectBillingUserById(userId);

  if (!user) {
    return false;
  }

  const month = getBillingCycleMonthKeyForUser(date);

  if (!month) {
    return false;
  }

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

  const month = getBillingCycleMonthKeyForUser(paidAt || new Date());

  if (!month) {
    const error = new Error("Unable to resolve billing month for user");
    error.statusCode = 400;
    throw error;
  }

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

  if (!isWithinBannerWindow(referenceDate)) {
    return null;
  }

  const month = getMonthKey(referenceDate);
  const paid = await paymentModel.findSubscriptionPayment(userId, month);

  if (paid) {
    return null;
  }

  const today = getSubscriptionDay(referenceDate);
  const daysLeftUntilInactive = SUBSCRIPTION_DEACTIVATION_DAY - today;
  return getBannerMessage(daysLeftUntilInactive);
};

const getPaymentHistory = async (userId) => {
  return paymentModel.findSubscriptionPaymentsByUser(userId);
};

const getRevenueByUser = async (userId) => {
  return paymentModel.sumSubscriptionRevenueByUser(userId);
};

const getUnpaidUsersForMonth = async (referenceDate = new Date()) => {
  const today = normalizeDate(referenceDate);
  const currentDay = today.getDate();

  if (currentDay < SUBSCRIPTION_DUE_DAY) {
    return [];
  }

  const users = await userModel.selectBillingUsers("admin");
  const month = getMonthKey(referenceDate);
  const dueDate = getSubscriptionDueDate(referenceDate);
  const rows = [];

  for (const user of users) {
    const paid = await paymentModel.findSubscriptionPayment(user.id, month);

    if (!paid) {
      rows.push(user);
    }
  }

  return rows.map((user) => {
    return {
      ...user,
      month,
      dueDate,
      daysSinceDue: Math.max(currentDay - SUBSCRIPTION_DUE_DAY, 0),
    };
  });
};

const deactivateOverdueUsers = async (referenceDate = new Date()) => {
  const users = await userModel.selectBillingUsers("admin");
  const today = normalizeDate(referenceDate);
  const currentDay = today.getDate();
  const month = getMonthKey(referenceDate);

  const results = {
    checked: users.length,
    deactivated: 0,
    alreadyInactive: 0,
    skippedPaid: 0,
  };

  if (currentDay < SUBSCRIPTION_DEACTIVATION_DAY) {
    return results;
  }

  for (const user of users) {
    const payment = await paymentModel.findSubscriptionPayment(user.id, month);
    const hasPaid = Boolean(payment);

    if (hasPaid) {
      results.skippedPaid += 1;
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
  isPaid,
  createMonthlyPayment,
  buildBannerForUser,
  getPaymentHistory,
  getRevenueByUser,
  getUnpaidUsersForMonth,
  deactivateOverdueUsers,
};
