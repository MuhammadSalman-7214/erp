const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { paymentBody, idParam } = require("../validation/schemas");
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");
const {
  createPayment,
  getPayments,
  getPartyBalances,
  getVendorLedger,
  getCustomerLedger,
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
  validateRequest({ params: idParam("vendorId") }),
  checkPermission("payment", "read"),
  getVendorLedger,
);
router.get(
  "/customer-ledger/:customerId",
  authmiddleware,
  validateRequest({ params: idParam("customerId") }),
  checkPermission("payment", "read"),
  getCustomerLedger,
);
router.get("/", authmiddleware, checkPermission("payment", "read"), getPayments);
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: paymentBody }),
  checkPermission("payment", "write"),
  createPayment,
);

module.exports = router;
