const query = require("../libs/dbQuery");

const selectBillingUserById = async (id) => {
  const rows = await query(
    "SELECT id, name, email, role, isActive, billingDay, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
    [id],
  );

  return rows[0] || null;
};

const selectBillingUsers = async (role = null) => {
  if (role) {
    return query(
      "SELECT id, billingDay, createdAt, isActive, role FROM users WHERE role = ? ORDER BY id ASC",
      [role],
    );
  }

  return query(
    "SELECT id, billingDay, createdAt, isActive, role FROM users ORDER BY id ASC",
  );
};

const updateUserBillingDay = async (userId, billingDay) => {
  return query("UPDATE users SET billingDay = ? WHERE id = ?", [
    billingDay,
    userId,
  ]);
};

const updateUserStatus = async (userId, isActive) => {
  return query("UPDATE users SET isActive = ? WHERE id = ?", [
    isActive ? 1 : 0,
    userId,
  ]);
};

module.exports = {
  selectBillingUserById,
  selectBillingUsers,
  updateUserBillingDay,
  updateUserStatus,
};
