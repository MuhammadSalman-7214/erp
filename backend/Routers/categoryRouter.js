const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkRole,
  checkPermission,
  validateHierarchyScope,
} = require("../middleware/Authmiddleware.js");

const {
  createCategory,
  getCategory,
  updateCategory,
  RemoveCategory,
  Searchcategory,
} = require("../controller/categorycontroller.js");

// GET all categories - Accessible to all authenticated users
router.get(
  "/",
  authmiddleware,
  checkPermission("category", "read"),
  getCategory,
);

// SEARCH category - Accessible to all authenticated users
router.get(
  "/search",
  authmiddleware,
  checkPermission("category", "read"),
  Searchcategory,
);

// CREATE category - Only superadmin, countryadmin, branchadmin
router.post(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  checkPermission("category", "write"),
  validateHierarchyScope,
  createCategory,
);

// UPDATE category - Only superadmin, countryadmin, branchadmin
router.put(
  "/:CategoryId",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  checkPermission("category", "write"),
  validateHierarchyScope,
  updateCategory,
);

// DELETE category - Only superadmin, countryadmin, branchadmin
router.delete(
  "/:CategoryId",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  checkPermission("category", "delete"),
  validateHierarchyScope,
  RemoveCategory,
);

module.exports = router;
