const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  customerBody,
  customerUpdateBody,
  customerOpeningBalanceBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
const {
  authmiddleware,
  checkPermission,
  adminmiddleware,
} = require("../middleware/Authmiddleware");
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  editCustomer,
  deleteCustomer,
  searchCustomer,
  addCustomerOpeningBalance,
  deleteCustomerOpeningBalance,
} = require("../controller/customercontroller");

router.get(
  "/",
  authmiddleware,
  checkPermission("customer", "read"),
  getAllCustomers,
);
router.get(
  "/searchCustomer",
  authmiddleware,
  validateRequest({ query: queryParam() }),
  checkPermission("customer", "read"),
  searchCustomer,
);
router.get(
  "/:customerId",
  authmiddleware,
  validateRequest({ params: idParam("customerId") }),
  checkPermission("customer", "read"),
  getCustomerById,
);
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: customerBody }),
  adminmiddleware,
  createCustomer,
);
router.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: customerUpdateBody }),
  adminmiddleware,
  editCustomer,
);
router.post(
  "/:id/opening-balance",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: customerOpeningBalanceBody }),
  adminmiddleware,
  addCustomerOpeningBalance,
);
router.delete(
  "/:id/opening-balance",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  adminmiddleware,
  deleteCustomerOpeningBalance,
);
router.delete(
  "/:customerId",
  authmiddleware,
  validateRequest({ params: idParam("customerId") }),
  adminmiddleware,
  deleteCustomer,
);

module.exports = router;
