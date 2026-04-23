// ==========================================
// Example: Routers/supplierrouter.js
// ==========================================
const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  supplierBody,
  supplierUpdateBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");

const {
  editSupplier,
  deleteSupplier,
  createSupplier,
  getAllSuppliers,
  searchSupplier,
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
  validateRequest({ body: supplierBody }),
  checkPermission("supplier", "write"),
  createSupplier,
);

// PUT - Admin and Manager only
router.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: supplierUpdateBody }),
  checkPermission("supplier", "write"),
  editSupplier,
);

// DELETE - Admin and Manager only
router.delete(
  "/:supplierId",
  authmiddleware,
  validateRequest({ params: idParam("supplierId") }),
  checkPermission("supplier", "delete"),
  deleteSupplier,
);
router.get(
  "/searchSupplier",
  authmiddleware,
  validateRequest({ query: queryParam() }),
  checkPermission("supplier", "read"),
  searchSupplier,
);

module.exports = router;
