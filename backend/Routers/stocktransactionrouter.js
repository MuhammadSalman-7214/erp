const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

const stockController = require("../controller/stocktransaction.js");

// Stock Transaction - Admin and Manager only
router.get(
  "/",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  stockController.getAllStockTransactions,
);
router.post(
  "/",
  authmiddleware,
  checkPermission("stockTransaction", "write"),
  stockController.createStockTransaction,
);
router.get(
  "/searchstocks",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  stockController.searchStocks,
);
router.get(
  "/product/:productId",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  stockController.getStockTransactionsByProduct,
);
router.get(
  "/supplier/:supplierId",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  stockController.getStockTransactionsBySupplier,
);

module.exports = router;
