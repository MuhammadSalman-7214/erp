const express = require("express");
const invoiceRouter = express.Router();
const { authmiddleware, checkPermission } = require("../middleware/Authmiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  invoiceBody,
  invoiceUpdateBody,
  idParam,
} = require("../validation/schemas");
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
} = require("../controller/invoicecontroller");

invoiceRouter.post(
  "/",
  authmiddleware,
  validateRequest({ body: invoiceBody }),
  checkPermission("invoice", "write"),
  createInvoice,
);
invoiceRouter.get("/", authmiddleware, checkPermission("invoice", "read"), getAllInvoices);
invoiceRouter.get(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  checkPermission("invoice", "read"),
  getInvoiceById,
);
invoiceRouter.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: invoiceUpdateBody }),
  checkPermission("invoice", "write"),
  updateInvoice,
);
invoiceRouter.delete(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  checkPermission("invoice", "delete"),
  deleteInvoice,
);
invoiceRouter.patch(
  "/:id/pay",
  authmiddleware,
  validateRequest({ params: idParam("id") }),
  checkPermission("invoice", "write"),
  markInvoiceAsPaid,
);

module.exports = invoiceRouter;
