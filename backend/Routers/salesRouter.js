const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  saleBody,
  saleUpdateBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
const { authmiddleware, checkPermission } = require("../middleware/Authmiddleware.js");
const {
  createSale,
  getAllSales,
  updateSale,
  deleteSale,
  getSaleById,
  SearchSales,
  getSalesByCustomer,
} = require("../controller/salescontroller.js");

router.get("/", authmiddleware, checkPermission("sales", "read"), getAllSales);
router.get(
  "/searchdata",
  authmiddleware,
  checkPermission("sales", "read"),
  validateRequest({ query: queryParam() }),
  SearchSales,
); // frontend uses this
router.get(
  "/customer/:customerId",
  authmiddleware,
  checkPermission("sales", "read"),
  validateRequest({ params: idParam("customerId") }),
  getSalesByCustomer,
);
router.get(
  "/:id",
  authmiddleware,
  checkPermission("sales", "read"),
  validateRequest({ params: idParam("id") }),
  getSaleById,
);
router.post(
  "/",
  authmiddleware,
  checkPermission("sales", "write"),
  validateRequest({ body: saleBody }),
  createSale,
);
router.put(
  "/:id",
  authmiddleware,
  checkPermission("sales", "write"),
  validateRequest({ params: idParam("id"), body: saleUpdateBody }),
  updateSale,
);
router.delete(
  "/:id",
  authmiddleware,
  checkPermission("sales", "delete"),
  validateRequest({ params: idParam("id") }),
  deleteSale,
);

module.exports = router;
