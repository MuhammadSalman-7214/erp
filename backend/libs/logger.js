const query = require("./dbQuery.js");

const logActivity = async ({
  action,
  entity,
  entityId,
  userId,
  ipAddress,
}) => {
  try {
    await query(
      "INSERT INTO activity_logs (action, entity, entityId, userId, user_id, ipAddress) VALUES (?, ?, ?, ?, ?, ?)",
      [action, entity, entityId, userId, userId, ipAddress],
    );
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = logActivity;
