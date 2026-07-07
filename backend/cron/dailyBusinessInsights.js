const cron = require("node-cron");
const query = require("../libs/dbQuery");
const { buildAllTimeBusinessStats } = require("../services/analyticsService");
const { generateBusinessAnalysis } = require("../services/aiService");
const {
  createOrUpdateInsight,
  findInsightByUserAndDate,
  getDateKey,
} = require("../models/BusinessInsight");

const cronExpression =
  process.env.BUSINESS_INSIGHT_CRON_SCHEDULE || "5 0 * * *";
const timezone =
  process.env.BUSINESS_INSIGHT_TIMEZONE || process.env.TZ || "Asia/Karachi";

let cronStarted = false;

const processBusinessInsightForUser = async (userId) => {
  const today = getDateKey();
  console.info("[dailyBusinessInsights] Processing user", {
    userId,
    date: today,
  });

  const existingInsight = await findInsightByUserAndDate(userId, today);

  if (existingInsight) {
    console.info(
      "[dailyBusinessInsights] Skipping user because insight already exists",
      {
        userId,
        insightId: existingInsight.id,
        date: today,
      },
    );
    return existingInsight;
  }

  const stats = await buildAllTimeBusinessStats(userId);
  console.info("[dailyBusinessInsights] Statistics built", {
    userId,
    totalRevenue: Number(stats?.totalRevenue || 0),
    totalOrders: Number(stats?.totalOrders || 0),
    bestProduct: stats?.overallBestSellingProduct?.name || "n/a",
  });

  const aiAnalysis = await generateBusinessAnalysis(stats);
  console.info("[dailyBusinessInsights] AI analysis ready", {
    userId,
    summaryLength: String(aiAnalysis?.summary || "").length,
    recommendationsCount: Array.isArray(aiAnalysis?.recommendations)
      ? aiAnalysis.recommendations.length
      : 0,
  });

  return createOrUpdateInsight({
    userId,
    date: today,
    stats,
    aiSummary: aiAnalysis.summary,
    aiRecommendations: aiAnalysis.recommendations,
  });
};

const generateDailyBusinessInsights = async () => {
  console.info("[dailyBusinessInsights] Daily generation started", {
    cronExpression,
    timezone,
  });

  const users = await query(
    "SELECT id FROM users WHERE isActive = 1 AND role IS NOT NULL",
  );

  console.info("[dailyBusinessInsights] Active users loaded", {
    count: users.length,
  });

  const results = [];
  for (const user of users) {
    try {
      const insight = await processBusinessInsightForUser(user.id);
      results.push(insight);
    } catch (error) {
      console.error(
        `[dailyBusinessInsights] Failed for user ${user.id}:`,
        error.message,
      );
    }
  }

  console.info("[dailyBusinessInsights] Daily generation finished", {
    processed: results.length,
  });

  return results;
};

const startDailyBusinessInsightsCron = () => {
  if (cronStarted) {
    return;
  }

  cronStarted = true;
  cron.schedule(
    cronExpression,
    async () => {
      try {
        console.info("[dailyBusinessInsights] Scheduled cron fired");
        await generateDailyBusinessInsights();
      } catch (error) {
        console.error(
          "[dailyBusinessInsights] Scheduled run failed:",
          error.message,
        );
      }
    },
    { timezone },
  );

  // Warm up missing insights on boot without re-running for dates that already exist.
  setImmediate(() => {
    console.info("[dailyBusinessInsights] Bootstrap run started");
    generateDailyBusinessInsights().catch((error) => {
      console.error(
        "[dailyBusinessInsights] Initial bootstrap run failed:",
        error.message,
      );
    });
  });
};

module.exports = startDailyBusinessInsightsCron;
module.exports.generateDailyBusinessInsights = generateDailyBusinessInsights;
module.exports.processBusinessInsightForUser = processBusinessInsightForUser;
