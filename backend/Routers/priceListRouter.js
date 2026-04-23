const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  priceListBody,
  priceListUpdateBody,
  idParam,
} = require("../validation/schemas");
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");
const {
  createPriceListItem,
  getPriceListItems,
  updatePriceListItem,
  deletePriceListItem,
} = require("../controller/priceListController.js");

router.get("/", authmiddleware, checkRole("admin", "manager"), getPriceListItems);
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: priceListBody }),
  checkRole("admin", "manager"),
  createPriceListItem,
);
router.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: priceListUpdateBody }),
  checkRole("admin", "manager"),
  updatePriceListItem,
);
router.delete(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  checkRole("admin", "manager"),
  deletePriceListItem,
);

module.exports = router;
