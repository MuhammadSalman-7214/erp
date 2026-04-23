const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  saleBody,
  saleUpdateBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
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
router.get(
  "/searchdata",
  authmiddleware,
  validateRequest({ query: queryParam() }),
  SearchSales,
); // frontend uses this
router.get(
  "/customer/:customerId",
  authmiddleware,
  validateRequest({ params: idParam("customerId") }),
  getSalesByCustomer,
);
router.get(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  getSaleById,
);
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: saleBody }),
  createSale,
);
router.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: saleUpdateBody }),
  updateSale,
);
router.delete(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  deleteSale,
);

module.exports = router;
