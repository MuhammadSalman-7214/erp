const express = require("express");
const invoiceRouter = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
  approveInvoice,
} = require("../controller/invoicecontroller");

invoiceRouter.post(
  "/",
  authmiddleware,
  checkPermission("invoice", "write"),
  createInvoice,
);
invoiceRouter.get(
  "/",
  authmiddleware,
  checkPermission("invoice", "read"),
  getAllInvoices,
);
invoiceRouter.get(
  "/:id",
  authmiddleware,
  checkPermission("invoice", "read"),
  getInvoiceById,
);
invoiceRouter.put(
  "/:id",
  authmiddleware,
  checkPermission("invoice", "write"),
  updateInvoice,
);
invoiceRouter.delete(
  "/:id",
  authmiddleware,
  checkPermission("invoice", "delete"),
  deleteInvoice,
);
invoiceRouter.patch(
  "/:id/pay",
  authmiddleware,
  checkPermission("invoice", "write"),
  markInvoiceAsPaid,
);
invoiceRouter.patch(
  "/:id/approve",
  authmiddleware,
  checkPermission("invoice", "write"),
  approveInvoice,
);

module.exports = invoiceRouter;
