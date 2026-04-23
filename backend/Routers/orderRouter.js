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
} = require("../middleware/Authmiddleware.js");

router.post(
  "/createorder",
  authmiddleware,
  validateRequest({ body: orderBody }),
  createOrder,
);
router.get("/getorders", authmiddleware, getOrder);
router.delete(
  "/removeorder/:OrdertId",
  authmiddleware,
  validateRequest({ params: idParam("OrdertId") }),
  Removeorder,
);
router.put(
  "/updatestatusOrder/:OrderId",
  authmiddleware,
  validateRequest({ params: idParam("OrderId"), body: orderStatusBody }),
  updatestatusOrder,
);
router.get(
  "/Searchdata",
  authmiddleware,
  validateRequest({ query: queryParam() }),
  searchOrder,
);
router.get("/graphstatusorder", authmiddleware, getOrderStatistics);
router.get(
  "/vendor/:vendorId",
  authmiddleware,
  validateRequest({ params: idParam("vendorId") }),
  getOrdersByVendor,
);

module.exports = router;
