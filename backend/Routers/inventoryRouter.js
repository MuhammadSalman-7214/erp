const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middleware/Authmiddleware");
const {
  addOrUpdateInventory,
  getAllInventory,
  getInventoryByProduct,
  deleteInventory,
} = require("../controller/inventorycontroller.js");

router.post("/inventory", authmiddleware, addOrUpdateInventory);
router.get("/inventory", authmiddleware, getAllInventory);
router.get("/inventory/:productId", authmiddleware, getInventoryByProduct);
router.delete("/inventory/:productId", authmiddleware, deleteInventory);

module.exports = router;
