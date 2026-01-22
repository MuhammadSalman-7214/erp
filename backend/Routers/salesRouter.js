const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middleware/Authmiddleware.js");
const {
  createSale,
  getAllSales,
  updateSale,
  getSaleById,
  SearchSales,
} = require("../controller/salescontroller.js");

router.get("/", authmiddleware, getAllSales);
router.get("/searchdata", authmiddleware, SearchSales); // frontend uses this
router.get("/:id", authmiddleware, getSaleById);
router.post("/", authmiddleware, createSale);
router.put("/:id", authmiddleware, updateSale);

module.exports = router;
