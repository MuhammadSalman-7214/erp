const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { paymentBody, paymentUpdateBody, idParam } = require("../validation/schemas");
const {
  authmiddleware,
} = require("../middleware/Authmiddleware");
const {
  createPayment,
  updatePayment,
  deletePayment,
  getPayments,
  getPartyBalances,
  getVendorLedger,
  getCustomerLedger,
} = require("../controller/paymentController");

router.get(
  "/summary",
  authmiddleware,
  getPartyBalances,
);
router.get(
  "/vendor-ledger/:vendorId",
  authmiddleware,
  validateRequest({ params: idParam("vendorId") }),
  getVendorLedger,
);
router.get(
  "/customer-ledger/:customerId",
  authmiddleware,
  validateRequest({ params: idParam("customerId") }),
  getCustomerLedger,
);
router.get("/", authmiddleware, getPayments);
router.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: paymentUpdateBody }),
  updatePayment,
);
router.delete(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  deletePayment,
);
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: paymentBody }),
  createPayment,
);

module.exports = router;
