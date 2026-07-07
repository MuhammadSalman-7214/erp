const query = require("../libs/dbQuery");

const markInsightSeen = async ({ userId, insightId }) => {
  if (!userId || !insightId) {
    throw new Error("userId and insightId are required");
  }

  await query(
    `INSERT INTO user_insight_views (userId, insightId, seen, seenAt)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       seen = 1,
       seenAt = CURRENT_TIMESTAMP,
       updatedAt = CURRENT_TIMESTAMP`,
    [userId, insightId],
  );

  const rows = await query(
    `SELECT id, userId, insightId, seen, seenAt, createdAt, updatedAt
     FROM user_insight_views
     WHERE userId = ? AND insightId = ?
     LIMIT 1`,
    [userId, insightId],
  );

  return rows[0] || null;
};

const getInsightView = async ({ userId, insightId }) => {
  const rows = await query(
    `SELECT id, userId, insightId, seen, seenAt, createdAt, updatedAt
     FROM user_insight_views
     WHERE userId = ? AND insightId = ?
     LIMIT 1`,
    [userId, insightId],
  );

  return rows[0] || null;
};

module.exports = {
  markInsightSeen,
  getInsightView,
};
