const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { subscriptionPaymentBody, idParam } = require("../validation/schemas");
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
  validateRequest({ params: idParam("userId") }),
  adminOrSuperAdminMiddleware,
  getUserRevenue,
);
router.get(
  "/:userId",
  authmiddleware,
  validateRequest({ params: idParam("userId") }),
  getUserPaymentHistory,
);
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: subscriptionPaymentBody }),
  adminOrSuperAdminMiddleware,
  addPayment,
);

module.exports = router;
