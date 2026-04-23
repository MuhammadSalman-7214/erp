const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { idParam } = require("../validation/schemas");
const {
  authmiddleware,
  adminOrSuperAdminMiddleware,
} = require("../middleware/Authmiddleware");
const { getBanner } = require("../controller/subscriptionController");

router.get(
  "/:id/banner",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  adminOrSuperAdminMiddleware,
  getBanner,
);

module.exports = router;
