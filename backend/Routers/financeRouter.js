const express = require("express");
const router = express.Router();
const { authmiddleware, checkPermission } = require("../middleware/Authmiddleware.js");
const { createPurchaseBill } = require("../controller/purchaseBillController.js");
const {
  createSupplierPayment,
  createCustomerPayment,
} = require("../controller/ledgerController.js");

router.post(
  "/purchases",
  authmiddleware,
  checkPermission("purchase", "write"),
  createPurchaseBill,
);

router.post("/supplier-payment", authmiddleware, createSupplierPayment);
router.post("/customer-payment", authmiddleware, createCustomerPayment);

module.exports = router;

