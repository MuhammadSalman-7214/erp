const express = require("express");
const Joi = require("joi");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { authmiddleware, checkPermission } = require("../middleware/Authmiddleware");
const {
  idParam,
  createReceiptBody,
  updateReceiptLineBody,
} = require("../validation/schemas");
const {
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceiptLine,
  completeReceipt,
} = require("../controller/receivingController");

const lineParam = Joi.object({
  receiptId: Joi.number().integer().positive().required(),
  lineId: Joi.number().integer().positive().required(),
});

router.use(authmiddleware);

router.get("/", checkPermission("receiving", "read"), getReceipts);
router.post(
  "/",
  checkPermission("receiving", "write"),
  validateRequest({ body: createReceiptBody }),
  createReceipt,
);
router.get(
  "/:id",
  checkPermission("receiving", "read"),
  validateRequest({ params: idParam("id") }),
  getReceiptById,
);
router.patch(
  "/:receiptId/lines/:lineId",
  checkPermission("receiving", "write"),
  validateRequest({ params: lineParam, body: updateReceiptLineBody }),
  updateReceiptLine,
);
router.post(
  "/:id/complete",
  checkPermission("receiving", "write"),
  validateRequest({ params: idParam("id") }),
  completeReceipt,
);

module.exports = router;
