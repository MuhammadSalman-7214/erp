const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");
const {
  createPayment,
  getPayments,
  getPartyBalances,
  getVendorLedger,
} = require("../controller/paymentController");

router.get(
  "/summary",
  authmiddleware,
  checkPermission("payment", "read"),
  getPartyBalances,
);
router.get(
  "/vendor-ledger/:vendorId",
  authmiddleware,
  checkPermission("payment", "read"),
  getVendorLedger,
);
router.get("/", authmiddleware, checkPermission("payment", "read"), getPayments);
router.post("/", authmiddleware, checkPermission("payment", "write"), createPayment);

module.exports = router;
