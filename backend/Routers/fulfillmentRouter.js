const express = require("express");
const Joi = require("joi");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { authmiddleware, checkPermission } = require("../middleware/Authmiddleware");
const { idParam, createFulfillmentBody } = require("../validation/schemas");
const {
  createFulfillment,
  getFulfillments,
  getFulfillmentById,
  confirmPickLine,
  dispatchFulfillment,
  cancelFulfillment,
} = require("../controller/fulfillmentController");

const lineParam = Joi.object({
  fulfillmentId: Joi.number().integer().positive().required(),
  lineId: Joi.number().integer().positive().required(),
});

router.use(authmiddleware);

router.get("/", checkPermission("fulfillment", "read"), getFulfillments);
router.post(
  "/",
  checkPermission("fulfillment", "write"),
  validateRequest({ body: createFulfillmentBody }),
  createFulfillment,
);
router.get(
  "/:id",
  checkPermission("fulfillment", "read"),
  validateRequest({ params: idParam("id") }),
  getFulfillmentById,
);
router.patch(
  "/:fulfillmentId/lines/:lineId/pick",
  checkPermission("fulfillment", "write"),
  validateRequest({ params: lineParam }),
  confirmPickLine,
);
router.post(
  "/:id/dispatch",
  checkPermission("fulfillment", "write"),
  validateRequest({ params: idParam("id") }),
  dispatchFulfillment,
);
router.post(
  "/:id/cancel",
  checkPermission("fulfillment", "write"),
  validateRequest({ params: idParam("id") }),
  cancelFulfillment,
);

module.exports = router;
