// ==========================================
// Example: Routers/supplierrouter.js
// ==========================================
const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");

const {
  editSupplier,
  deleteSupplier,
  createSupplier,
  getAllSuppliers,
} = require("../controller/suppliercontroller");

// GET - All roles (Admin, Manager can write; Staff read-only)
router.get(
  "/",
  authmiddleware,
  checkPermission("supplier", "read"),
  getAllSuppliers,
);

// POST - Admin and Manager only
router.post(
  "/",
  authmiddleware,
  checkPermission("supplier", "write"),
  createSupplier,
);

// PUT - Admin and Manager only
router.put(
  "/:id",
  authmiddleware,
  checkPermission("supplier", "write"),
  editSupplier,
);

// DELETE - Admin and Manager only
router.delete(
  "/:supplierId",
  authmiddleware,
  checkPermission("supplier", "delete"),
  deleteSupplier,
);

module.exports = router;
