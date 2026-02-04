const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  getSummaryReport,
  getCountryConsolidation,
  exportSummaryReport,
  exportCountryConsolidation,
  getShipmentPnlReport,
} = require("../controller/reportController.js");

router.get(
  "/summary",
  authmiddleware,
  checkPermission("reports", "read"),
  getSummaryReport,
);

router.get(
  "/summary/export",
  authmiddleware,
  checkPermission("reports", "read"),
  exportSummaryReport,
);

router.get(
  "/by-country",
  authmiddleware,
  checkPermission("reports", "read"),
  getCountryConsolidation,
);

router.get(
  "/by-country/export",
  authmiddleware,
  checkPermission("reports", "read"),
  exportCountryConsolidation,
);

router.get(
  "/shipment-pnl",
  authmiddleware,
  checkPermission("reports", "read"),
  getShipmentPnlReport,
);

module.exports = router;
