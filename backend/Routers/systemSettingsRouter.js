const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");
const {
  getSystemSettings,
  updateSystemSettings,
} = require("../controller/systemSettingsController.js");

router.get("/", authmiddleware, checkRole("superadmin"), getSystemSettings);
router.put("/", authmiddleware, checkRole("superadmin"), updateSystemSettings);

module.exports = router;
