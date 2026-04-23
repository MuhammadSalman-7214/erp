const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middleware/Authmiddleware");
const validateRequest = require("../middleware/validateRequest");
const { inventoryBody, idParam } = require("../validation/schemas");
const {
  addOrUpdateInventory,
  getAllInventory,
  getInventoryByProduct,
  deleteInventory,
} = require("../controller/inventorycontroller.js");

router.post(
  "/inventory",
  authmiddleware,
  validateRequest({ body: inventoryBody }),
  addOrUpdateInventory,
);
router.get("/inventory", authmiddleware, getAllInventory);
router.get(
  "/inventory/:productCodeId",
  authmiddleware,
  validateRequest({ params: idParam("productCodeId") }),
  getInventoryByProduct,
);
router.delete(
  "/inventory/:productCodeId",
  authmiddleware,
  validateRequest({ params: idParam("productCodeId") }),
  deleteInventory,
);

module.exports = router;
