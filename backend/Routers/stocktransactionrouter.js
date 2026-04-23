const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  stockTransactionBody,
  stockSearchQuery,
  idParam,
} = require("../validation/schemas");
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
  validateRequest({ body: stockTransactionBody }),
  checkRole("admin", "manager"),
  stockController.createStockTransaction,
);
router.get(
  "/searchstocks",
  authmiddleware,
  validateRequest({ query: stockSearchQuery }),
  checkRole("admin", "manager"),
  stockController.searchStocks,
);
router.get(
  "/code/:productCodeId",
  authmiddleware,
  validateRequest({ params: idParam("productCodeId") }),
  checkRole("admin", "manager"),
  stockController.getStockTransactionsByProductCode,
);
router.get(
  "/supplier/:supplierId",
  authmiddleware,
  validateRequest({ params: idParam("supplierId") }),
  checkRole("admin", "manager"),
  stockController.getStockTransactionsBySupplier,
);

module.exports = router;
