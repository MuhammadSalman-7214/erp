const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  createSale,
  getAllSales,
  updateSale,
  getSaleById,
  SearchSales,
} = require("../controller/salescontroller.js");

router.get(
  "/",
  authmiddleware,
  checkPermission("sales", "read"),
  getAllSales,
);
router.get(
  "/searchdata",
  authmiddleware,
  checkPermission("sales", "read"),
  SearchSales,
); // frontend uses this
router.get(
  "/:id",
  authmiddleware,
  checkPermission("sales", "read"),
  getSaleById,
);
router.post(
  "/",
  authmiddleware,
  checkPermission("sales", "write"),
  createSale,
);
router.put(
  "/:id",
  authmiddleware,
  checkPermission("sales", "write"),
  updateSale,
);

module.exports = router;
