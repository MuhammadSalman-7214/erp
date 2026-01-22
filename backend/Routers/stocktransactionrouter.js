const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");

const stockController = require("../controller/stocktransaction.js");

// Stock Transaction - Admin and Manager only
router.get(
  "/",
  authmiddleware,
  checkRole("admin", "manager"),
  stockController.getAllStockTransactions,
);
router.post(
  "/",
  authmiddleware,
  checkRole("admin", "manager"),
  stockController.createStockTransaction,
);
router.get(
  "/searchstocks",
  authmiddleware,
  checkRole("admin", "manager"),
  stockController.searchStocks,
);
router.get(
  "/product/:productId",
  authmiddleware,
  checkRole("admin", "manager"),
  stockController.getStockTransactionsByProduct,
);
router.get(
  "/supplier/:supplierId",
  authmiddleware,
  checkRole("admin", "manager"),
  stockController.getStockTransactionsBySupplier,
);

module.exports = router;
