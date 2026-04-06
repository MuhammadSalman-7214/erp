const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middleware/Authmiddleware.js");
const {
  createSale,
  getAllSales,
  updateSale,
  deleteSale,
  getSaleById,
  SearchSales,
  getSalesByCustomer,
} = require("../controller/salescontroller.js");

router.get("/", authmiddleware, getAllSales);
router.get("/searchdata", authmiddleware, SearchSales); // frontend uses this
router.get("/customer/:customerId", authmiddleware, getSalesByCustomer);
router.get("/:id", authmiddleware, getSaleById);
router.post("/", authmiddleware, createSale);
router.put("/:id", authmiddleware, updateSale);
router.delete("/:id", authmiddleware, deleteSale);

module.exports = router;
