// Routers/shipmentRouter.js - Complete Shipment Routes

const express = require("express");
const router = express.Router();
const {
  createShipment,
  getAllShipments,
  getShipmentById,
  updateShipment,
  updateShipmentStatus,
  addShipmentDocument,
  addShipmentExpense,
  calculateShipmentProfit,
  deleteShipment,
  getShipmentStatistics,
} = require("../controller/shipmentController.js");
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

// ==================== PUBLIC ROUTES (None - all require auth) ====================

// ==================== AUTHENTICATED ROUTES ====================

// Get all shipments (with hierarchy filtering)
router.get(
  "/",
  authmiddleware,
  checkPermission("shipment", "read"),
  getAllShipments,
);

// Get shipment statistics
router.get(
  "/statistics",
  authmiddleware,
  checkPermission("shipment", "read"),
  getShipmentStatistics,
);

// Get shipment by ID
router.get(
  "/:id",
  authmiddleware,
  checkPermission("shipment", "read"),
  getShipmentById,
);

// Create new shipment
router.post(
  "/",
  authmiddleware,
  checkPermission("shipment", "write"),
  createShipment,
);

// Update shipment
router.put(
  "/:id",
  authmiddleware,
  checkPermission("shipment", "write"),
  updateShipment,
);

// Update shipment status
router.patch(
  "/:id/status",
  authmiddleware,
  checkPermission("shipment", "write"),
  updateShipmentStatus,
);

// Add document to shipment
router.post(
  "/:id/document",
  authmiddleware,
  checkPermission("shipment", "write"),
  addShipmentDocument,
);

// Add expense to shipment
router.post(
  "/:id/expense",
  authmiddleware,
  checkPermission("shipment", "write"),
  addShipmentExpense,
);

// Calculate shipment profit
router.get(
  "/:id/profit",
  authmiddleware,
  checkPermission("shipment", "read"),
  calculateShipmentProfit,
);

// Delete shipment (soft delete)
router.delete(
  "/:id",
  authmiddleware,
  checkPermission("shipment", "delete"),
  deleteShipment,
);

module.exports = router;
