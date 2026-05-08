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

const createBillingDate = (year, monthIndex, billingDay) => {
  const lastDay = getLastDayOfMonth(year, monthIndex);
  const safeDay = Math.min(Math.max(Math.floor(billingDay) || 1, 1), lastDay);
  return new Date(year, monthIndex, safeDay, 0, 0, 0, 0);
};

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
  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;

  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return null;
  }

  const reference = normalizeDate(referenceDate);
  const billingDay = getBillingDay(user);

  let dueDate = createBillingDate(
    createdAt.getFullYear(),
    createdAt.getMonth() + 1,
    billingDay,
  );

  while (true) {
    const nextDueDate = createBillingDate(
      dueDate.getFullYear(),
      dueDate.getMonth() + 1,
      billingDay,
    );

    if (reference.getTime() < nextDueDate.getTime()) {
      return dueDate;
    }

    dueDate = nextDueDate;
  }
};

const getBillingCycleMonthKeyForUser = (user, referenceDate = new Date()) => {
  const dueDate = getDueDate(user, referenceDate);

  if (!dueDate) {
    return null;
  }

  return getMonthKey(dueDate);
};

const isPaid = async (userId, date = new Date()) => {
  const user = await userModel.selectBillingUserById(userId);

  if (!user) {
    return false;
  }

  const month = getBillingCycleMonthKeyForUser(user, date);

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

  const month = getBillingCycleMonthKeyForUser(user, paidAt || new Date());

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

  const dueDate = getDueDate(user, referenceDate);

  if (!dueDate) {
    return null;
  }

  const today = normalizeDate(referenceDate);
  if (today.getTime() < dueDate.getTime()) {
    return null;
  }

  const month = getMonthKey(dueDate);
  const paid = await paymentModel.findSubscriptionPayment(userId, month);

  if (paid) {
    return null;
  }

  const daysSinceDue = Math.floor(
    (today.getTime() - dueDate.getTime()) / MS_PER_DAY,
  );

  if (daysSinceDue < 1 || daysSinceDue > 2) {
    return null;
  }

  const daysLeftUntilInactive = 3 - daysSinceDue;
  return getBannerMessage(daysLeftUntilInactive);
};

const getPaymentHistory = async (userId) => {
  return paymentModel.findSubscriptionPaymentsByUser(userId);
};

const getRevenueByUser = async (userId) => {
  return paymentModel.sumSubscriptionRevenueByUser(userId);
};

const getUnpaidUsersForMonth = async (referenceDate = new Date()) => {
  const users = await userModel.selectBillingUsers("admin");
  const today = normalizeDate(referenceDate);
  const rows = [];

  for (const user of users) {
    const dueDate = getDueDate(user, referenceDate);

    if (!dueDate) {
      continue;
    }

    if (today.getTime() <= dueDate.getTime()) {
      continue;
    }

    const month = getMonthKey(dueDate);
    const paid = await paymentModel.findSubscriptionPayment(user.id, month);

    if (!paid) {
      rows.push(user);
    }
  }

  return rows.map((user) => {
    const dueDate = getDueDate(user, referenceDate);
    const today = normalizeDate(referenceDate);
    const daysSinceDue = Math.floor(
      (today.getTime() - dueDate.getTime()) / MS_PER_DAY,
    );

    return {
      ...user,
      month: getMonthKey(dueDate),
      dueDate,
      daysSinceDue,
    };
  });
};

const deactivateOverdueUsers = async (referenceDate = new Date()) => {
  const users = await userModel.selectBillingUsers("admin");
  const today = normalizeDate(referenceDate);

  const results = {
    checked: users.length,
    deactivated: 0,
    alreadyInactive: 0,
    skippedPaid: 0,
  };

  for (const user of users) {
    const dueDate = getDueDate(user, referenceDate);

    if (!dueDate) {
      continue;
    }

    if (today.getTime() < dueDate.getTime()) {
      continue;
    }

    const month = getMonthKey(dueDate);
    const payment = await paymentModel.findSubscriptionPayment(user.id, month);
    const hasPaid = Boolean(payment);

    if (hasPaid) {
      results.skippedPaid += 1;
      continue;
    }

    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + 2);

    if (today.getTime() <= graceEndDate.getTime()) {
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
