let cron = null;

try {
  cron = require("node-cron");
} catch (error) {
  cron = null;
}

const { deactivateOverdueUsers } = require("../services/subscriptionService");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const runDailySweep = async () => {
  try {
    const result = await deactivateOverdueUsers();
    console.log("[subscriptionCron] Daily sweep completed:", result);
  } catch (error) {
    console.error("[subscriptionCron] Daily sweep failed:", error);
  }
};

const scheduleFallback = () => {
  const scheduleNextRun = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(24, 0, 0, 0);

    const timeoutMs = Math.max(nextRun.getTime() - now.getTime(), 0);
    setTimeout(async () => {
      await runDailySweep();
      setInterval(runDailySweep, MS_PER_DAY);
    }, timeoutMs);
  };

  scheduleNextRun();
};

const startSubscriptionCron = () => {
  const timezone = process.env.CRON_TIMEZONE || "Asia/Karachi";

  if (cron?.schedule) {
    cron.schedule("0 0 * * *", runDailySweep, {
      timezone,
    });
    return;
  }

  scheduleFallback();
};

module.exports = startSubscriptionCron;
