const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  adminOrSuperAdminMiddleware,
} = require("../middleware/Authmiddleware");
const {
  addPayment,
  getUserPaymentHistory,
  getUnpaidUsers,
  getUserRevenue,
} = require("../controller/subscriptionController");

router.get(
  "/unpaid-users",
  authmiddleware,
  adminOrSuperAdminMiddleware,
  getUnpaidUsers,
);
router.get(
  "/:userId/revenue",
  authmiddleware,
  adminOrSuperAdminMiddleware,
  getUserRevenue,
);
router.get("/:userId", authmiddleware, getUserPaymentHistory);
router.post("/", authmiddleware, adminOrSuperAdminMiddleware, addPayment);

module.exports = router;
