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
  checkPermission,
} = require("../middleware/Authmiddleware.js");

const stockController = require("../controller/stocktransaction.js");

// Admin/manager/super_admin have this by default; staff only if tagged
// `inventory_control` (see Authmiddleware's JOB_FUNCTION_PERMISSIONS).
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
  validateRequest({ body: stockTransactionBody }),
  stockController.createStockTransaction,
);
router.get(
  "/searchstocks",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  validateRequest({ query: stockSearchQuery }),
  stockController.searchStocks,
);
router.get(
  "/code/:productCodeId",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  validateRequest({ params: idParam("productCodeId") }),
  stockController.getStockTransactionsByProductCode,
);
router.get(
  "/supplier/:supplierId",
  authmiddleware,
  checkPermission("stockTransaction", "read"),
  validateRequest({ params: idParam("supplierId") }),
  stockController.getStockTransactionsBySupplier,
);

module.exports = router;
