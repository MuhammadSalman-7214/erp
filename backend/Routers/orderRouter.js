const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  orderBody,
  orderStatusBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
const {
  createOrder,
  searchOrder,
  updatestatusOrder,
  getOrder,
  getOrderStatistics,
  Removeorder,
  getOrdersByVendor,
} = require("../controller/orderController.js");
const {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

router.post(
  "/createorder",
  authmiddleware,
  checkPermission("order", "write"),
  validateRequest({ body: orderBody }),
  createOrder,
);
router.get("/getorders", authmiddleware, checkPermission("order", "read"), getOrder);
router.delete(
  "/removeorder/:OrdertId",
  authmiddleware,
  checkPermission("order", "delete"),
  validateRequest({ params: idParam("OrdertId") }),
  Removeorder,
);
router.put(
  "/updatestatusOrder/:OrderId",
  authmiddleware,
  checkPermission("order", "write"),
  validateRequest({ params: idParam("OrderId"), body: orderStatusBody }),
  updatestatusOrder,
);
router.get(
  "/Searchdata",
  authmiddleware,
  checkPermission("order", "read"),
  validateRequest({ query: queryParam() }),
  searchOrder,
);
router.get(
  "/graphstatusorder",
  authmiddleware,
  checkPermission("order", "read"),
  getOrderStatistics,
);
router.get(
  "/vendor/:vendorId",
  authmiddleware,
  checkPermission("order", "read"),
  validateRequest({ params: idParam("vendorId") }),
  getOrdersByVendor,
);

module.exports = router;
