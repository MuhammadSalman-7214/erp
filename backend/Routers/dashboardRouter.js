const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");
const { getDashboardSummary } = require("../controller/dashboardController");

router.get("/summary", authmiddleware, checkPermission("dashboard", "read"), getDashboardSummary);

module.exports = router;
