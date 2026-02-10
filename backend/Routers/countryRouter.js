// Routers/countryRouter.js - NEW

const express = require("express");
const router = express.Router();
const {
  createCountry,
  getAllCountries,
  updateExchangeRate,
  assignCountryAdmin,
  updateCountry,
  deleteCountry,
  updateCountryLock,
} = require("../controller/countryController.js");
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");

// Super Admin only routes
router.post("/", authmiddleware, checkRole("superadmin"), createCountry);
router.put(
  "/:countryId/exchange-rate",
  authmiddleware,
  checkRole("superadmin"),
  updateExchangeRate,
);
router.post(
  "/assign-admin",
  authmiddleware,
  checkRole("superadmin"),
  assignCountryAdmin,
);
router.put(
  "/:countryId",
  authmiddleware,
  checkRole("superadmin"),
  updateCountry,
);
router.patch(
  "/:countryId/lock-period",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  updateCountryLock,
);
router.delete(
  "/:countryId",
  authmiddleware,
  checkRole("superadmin"),
  deleteCountry,
);

// Super Admin + Country Admin can view
router.get(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  getAllCountries,
);

module.exports = router;
