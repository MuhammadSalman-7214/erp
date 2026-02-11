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
} = require("../controller/paymentController");

router.get(
  "/summary",
  authmiddleware,
  checkPermission("payment", "read"),
  getPartyBalances,
);
router.get("/", authmiddleware, checkPermission("payment", "read"), getPayments);
router.post("/", authmiddleware, checkPermission("payment", "write"), createPayment);

module.exports = router;
