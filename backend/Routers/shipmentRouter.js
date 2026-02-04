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
  checkRole,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

// ==================== PUBLIC ROUTES (None - all require auth) ====================

// ==================== AUTHENTICATED ROUTES ====================

// Get all shipments (with hierarchy filtering)
router.get(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  getAllShipments,
);

// Get shipment statistics
router.get(
  "/statistics",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  getShipmentStatistics,
);

// Get shipment by ID
router.get(
  "/:id",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  getShipmentById,
);

// Create new shipment
router.post(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  checkPermission("shipment", "write"),
  createShipment,
);

// Update shipment
router.put(
  "/:id",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  checkPermission("shipment", "write"),
  updateShipment,
);

// Update shipment status
router.patch(
  "/:id/status",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  updateShipmentStatus,
);

// Add document to shipment
router.post(
  "/:id/document",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  addShipmentDocument,
);

// Add expense to shipment
router.post(
  "/:id/expense",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  addShipmentExpense,
);

// Calculate shipment profit
router.get(
  "/:id/profit",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  calculateShipmentProfit,
);

// Delete shipment (soft delete)
router.delete(
  "/:id",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  deleteShipment,
);

module.exports = router;
