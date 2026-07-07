const query = require("../libs/dbQuery");

const getTimezone = () =>
  process.env.BUSINESS_INSIGHT_TIMEZONE || process.env.TZ || "Asia/Karachi";

const getDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: getTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const parseJson = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const mapInsightRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    stats: parseJson(row.stats, {}),
    aiSummary: row.aiSummary || "",
    aiRecommendations: parseJson(row.aiRecommendations, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const findInsightByUserAndDate = async (userId, date = new Date()) => {
  const dateKey = typeof date === "string" ? date : getDateKey(date);
  const rows = await query(
    `SELECT id, user_id, \`date\`, stats, aiSummary, aiRecommendations, createdAt, updatedAt
     FROM business_insights
     WHERE user_id = ? AND \`date\` = ?
     LIMIT 1`,
    [userId, dateKey],
  );

  return mapInsightRow(rows[0]);
};

const findLatestInsightForUser = async (userId) => {
  const rows = await query(
    `SELECT id, user_id, \`date\`, stats, aiSummary, aiRecommendations, createdAt, updatedAt
     FROM business_insights
     WHERE user_id = ?
     ORDER BY \`date\` DESC, id DESC
     LIMIT 1`,
    [userId],
  );

  return mapInsightRow(rows[0]);
};

const findInsightsForUser = async (userId, limit = 30) => {
  const rows = await query(
    `SELECT id, user_id, \`date\`, stats, aiSummary, aiRecommendations, createdAt, updatedAt
     FROM business_insights
     WHERE user_id = ?
     ORDER BY \`date\` DESC, id DESC
     LIMIT ?`,
    [userId, Number(limit) || 30],
  );

  return rows.map(mapInsightRow).filter(Boolean);
};

const createOrUpdateInsight = async ({
  userId,
  date = new Date(),
  stats,
  aiSummary,
  aiRecommendations,
}) => {
  const dateKey = typeof date === "string" ? date : getDateKey(date);
  const serializedStats = JSON.stringify(stats || {});
  const serializedRecommendations = JSON.stringify(aiRecommendations || []);

  await query(
    `INSERT INTO business_insights (user_id, \`date\`, stats, aiSummary, aiRecommendations)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       stats = VALUES(stats),
       aiSummary = VALUES(aiSummary),
       aiRecommendations = VALUES(aiRecommendations),
       updatedAt = CURRENT_TIMESTAMP`,
    [userId, dateKey, serializedStats, aiSummary || "", serializedRecommendations],
  );

  return findInsightByUserAndDate(userId, dateKey);
};

const getTodaysInsightStateForUser = async (userId) => {
  const insight = await findInsightByUserAndDate(userId);

  if (!insight) {
    return {
      showPopup: false,
      insight: null,
      seen: false,
    };
  }

  const rows = await query(
    `SELECT id, userId, insightId, seen, seenAt, createdAt, updatedAt
     FROM user_insight_views
     WHERE userId = ? AND insightId = ?
     LIMIT 1`,
    [userId, insight.id],
  );

  const view = rows[0];

  return {
    showPopup: !view?.seen,
    seen: !!view?.seen,
    insight: {
      ...insight,
      aiRecommendations: Array.isArray(insight.aiRecommendations)
        ? insight.aiRecommendations
        : [],
    },
  };
};

module.exports = {
  getDateKey,
  findInsightByUserAndDate,
  findLatestInsightForUser,
  findInsightsForUser,
  createOrUpdateInsight,
  getTodaysInsightStateForUser,
};
