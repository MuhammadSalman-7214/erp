const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");
const {
  getDashboardSummary,
  getTodayBusinessInsight,
  getBusinessInsightsHistory,
  markTodayBusinessInsightSeen,
} = require("../controllers/dashboardController");

router.get(
  "/summary",
  authmiddleware,
  checkPermission("dashboard", "read"),
  getDashboardSummary,
);
router.get("/insights/today", authmiddleware, getTodayBusinessInsight);
router.get("/insights/history", authmiddleware, getBusinessInsightsHistory);
router.post("/insights/seen", authmiddleware, markTodayBusinessInsightSeen);

module.exports = router;
