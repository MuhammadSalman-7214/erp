const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  createPurchaseBill,
  getAllPurchaseBills,
  updatePurchaseBill,
  deletePurchaseBill,
  markPurchaseBillPaid,
  approvePurchaseBill,
} = require("../controller/purchaseBillController.js");

router.post(
  "/",
  authmiddleware,
  checkPermission("purchase", "write"),
  createPurchaseBill,
);
router.get(
  "/",
  authmiddleware,
  checkPermission("purchase", "read"),
  getAllPurchaseBills,
);
router.put(
  "/:id",
  authmiddleware,
  checkPermission("purchase", "write"),
  updatePurchaseBill,
);
router.delete(
  "/:id",
  authmiddleware,
  checkPermission("purchase", "delete"),
  deletePurchaseBill,
);
router.patch(
  "/:id/pay",
  authmiddleware,
  checkPermission("purchase", "write"),
  markPurchaseBillPaid,
);
router.patch(
  "/:id/approve",
  authmiddleware,
  checkPermission("purchase", "write"),
  approvePurchaseBill,
);

module.exports = router;
