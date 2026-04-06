const express = require("express");
const router = express.Router();
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
  checkPermission("customer", "read"),
  searchCustomer,
);
router.get(
  "/:customerId",
  authmiddleware,
  checkPermission("customer", "read"),
  getCustomerById,
);
router.post("/", authmiddleware, adminmiddleware, createCustomer);
router.put("/:id", authmiddleware, adminmiddleware, editCustomer);
router.post(
  "/:id/opening-balance",
  authmiddleware,
  adminmiddleware,
  addCustomerOpeningBalance,
);
router.delete(
  "/:id/opening-balance",
  authmiddleware,
  adminmiddleware,
  deleteCustomerOpeningBalance,
);
router.delete("/:customerId", authmiddleware, adminmiddleware, deleteCustomer);

module.exports = router;
