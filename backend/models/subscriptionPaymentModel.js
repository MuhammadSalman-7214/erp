const query = require("../libs/dbQuery");

const findSubscriptionPayment = async (userId, month) => {
  const rows = await query(
    "SELECT id, user_id AS userId, month, amount, paidAt, addedBy, createdAt, updatedAt FROM subscription_payments WHERE user_id = ? AND month = ? LIMIT 1",
    [userId, month],
  );

  return rows[0] || null;
};

const createSubscriptionPayment = async ({
  userId,
  month,
  amount,
  paidAt = new Date(),
  addedBy = null,
}) => {
  return query(
    "INSERT INTO subscription_payments (user_id, month, amount, paidAt, addedBy) VALUES (?, ?, ?, ?, ?)",
    [userId, month, amount, paidAt, addedBy],
  );
};

const findSubscriptionPaymentsByUser = async (userId) => {
  return query(
    "SELECT id, user_id AS userId, month, amount, paidAt, addedBy, createdAt, updatedAt FROM subscription_payments WHERE user_id = ? ORDER BY paidAt ASC, createdAt ASC, id ASC",
    [userId],
  );
};

const sumSubscriptionRevenueByUser = async (userId) => {
  const rows = await query(
    "SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM subscription_payments WHERE user_id = ?",
    [userId],
  );

  return Number(rows[0]?.totalRevenue || 0);
};

const findPaidUserIdsForMonth = async (month) => {
  return query(
    "SELECT DISTINCT user_id AS userId FROM subscription_payments WHERE month = ?",
    [month],
  );
};

const findUnpaidUsersForMonth = async (month) => {
  return query(
    `SELECT u.id, u.name, u.email, u.role, u.isActive, u.billingDay, u.createdAt
     FROM users u
     LEFT JOIN subscription_payments sp
       ON sp.user_id = u.id AND sp.month = ?
     WHERE sp.id IS NULL AND u.role = 'admin'
     ORDER BY u.id ASC`,
    [month],
  );
};

module.exports = {
  findSubscriptionPayment,
  createSubscriptionPayment,
  findSubscriptionPaymentsByUser,
  sumSubscriptionRevenueByUser,
  findPaidUserIdsForMonth,
  findUnpaidUsersForMonth,
};
