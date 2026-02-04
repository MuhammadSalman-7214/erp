const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  getLedgerByParty,
  getOutstandingByParty,
} = require("../controller/ledgerController.js");

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

module.exports = router;
