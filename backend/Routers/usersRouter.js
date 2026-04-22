const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  adminOrSuperAdminMiddleware,
} = require("../middleware/Authmiddleware");
const { getBanner } = require("../controller/subscriptionController");

router.get(
  "/:id/banner",
  authmiddleware,
  adminOrSuperAdminMiddleware,
  getBanner,
);

module.exports = router;
