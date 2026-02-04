const express = require("express");
const router = express.Router();
const {
  createOrder,
  searchOrder,
  updatestatusOrder,
  getOrder,
  getOrderStatistics,
  Removeorder,
} = require("../controller/orderController.js");
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

router.post(
  "/createorder",
  authmiddleware,
  checkPermission("order", "write"),
  createOrder,
);
router.get(
  "/getorders",
  authmiddleware,
  checkPermission("order", "read"),
  getOrder,
);
router.delete(
  "/removeorder/:OrdertId",
  authmiddleware,
  checkPermission("order", "delete"),
  Removeorder,
);
router.put(
  "/updatestatusOrder/:OrderId",
  authmiddleware,
  checkPermission("order", "write"),
  updatestatusOrder,
);
router.get(
  "/Searchdata",
  authmiddleware,
  checkPermission("order", "read"),
  searchOrder,
);
router.get(
  "/graphstatusorder",
  authmiddleware,
  checkPermission("order", "read"),
  getOrderStatistics,
);

module.exports = router;
