const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");
const {
  createPriceListItem,
  getPriceListItems,
  updatePriceListItem,
  deletePriceListItem,
} = require("../controller/priceListController.js");

router.get("/", authmiddleware, checkRole("admin", "manager"), getPriceListItems);
router.post("/", authmiddleware, checkRole("admin", "manager"), createPriceListItem);
router.put("/:id", authmiddleware, checkRole("admin", "manager"), updatePriceListItem);
router.delete(
  "/:id",
  authmiddleware,
  checkRole("admin", "manager"),
  deletePriceListItem,
);

module.exports = router;
