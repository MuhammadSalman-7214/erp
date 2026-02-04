const express = require("express");
const router = express.Router();
const {
  addOrUpdateInventory,
  getAllInventory,
  getInventoryByProduct,
  deleteInventory,
} = require("../controller/inventorycontroller.js");
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

router.post(
  "/inventory",
  authmiddleware,
  checkPermission("product", "write"),
  addOrUpdateInventory,
);
router.get(
  "/inventory",
  authmiddleware,
  checkPermission("product", "read"),
  getAllInventory,
);
router.get(
  "/inventory/:productId",
  authmiddleware,
  checkPermission("product", "read"),
  getInventoryByProduct,
);
router.delete(
  "/inventory/:productId",
  authmiddleware,
  checkPermission("product", "write"),
  deleteInventory,
);

module.exports = router;
