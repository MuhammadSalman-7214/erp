// Routers/branchRouter.js - NEW

const express = require("express");
const router = express.Router();
const {
  createBranch,
  getAllBranches,
  getBranchesByCountry,
  assignBranchAdmin,
  updateBranch,
  deleteBranch,
} = require("../controller/branchController.js");
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");

// Super Admin + Country Admin can create branches
router.post(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  createBranch,
);
router.post(
  "/assign-admin",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  assignBranchAdmin,
);

// View branches (with hierarchy filtering)
router.get("/", authmiddleware, getAllBranches);
router.get("/country/:countryId", authmiddleware, getBranchesByCountry);

// Update/Delete (Super Admin + Country Admin)
router.put(
  "/:branchId",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  updateBranch,
);
router.delete(
  "/:branchId",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  deleteBranch,
);

module.exports = router;
