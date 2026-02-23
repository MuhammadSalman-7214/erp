const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  getLedgerByParty,
  getOutstandingByParty,
  getLedgerByQuery,
  createSupplierPayment,
  createCustomerPayment,
} = require("../controller/ledgerController.js");

router.get(
  "/",
  authmiddleware,
  checkPermission("ledger", "read"),
  getLedgerByQuery,
);

router.get(
  "/:partyType/:partyId",
  authmiddleware,
  checkPermission("ledger", "read"),
  getLedgerByParty,
);

router.get(
  "/outstanding/:partyType",
  authmiddleware,
  checkPermission("ledger", "read"),
  getOutstandingByParty,
);

router.post(
  "/supplier-payment",
  authmiddleware,
  createSupplierPayment,
);

router.post(
  "/customer-payment",
  authmiddleware,
  createCustomerPayment,
);

module.exports = router;
