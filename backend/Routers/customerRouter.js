const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controller/customercontroller.js");
const { getCustomerSummary } = require("../controller/ledgerController.js");

router.post("/", authmiddleware, checkPermission("customer", "write"), createCustomer);
router.get("/", authmiddleware, checkPermission("customer", "read"), getAllCustomers);
router.get("/:id", authmiddleware, checkPermission("customer", "read"), getCustomerById);
router.get(
  "/:customerId/summary",
  authmiddleware,
  checkPermission("customer", "read"),
  getCustomerSummary,
);
router.put("/:id", authmiddleware, checkPermission("customer", "write"), updateCustomer);
router.delete("/:id", authmiddleware, checkPermission("customer", "delete"), deleteCustomer);

module.exports = router;
