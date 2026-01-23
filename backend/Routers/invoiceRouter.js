const express = require("express");
const invoiceRouter = express.Router();
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
} = require("../controller/invoicecontroller");

invoiceRouter.post("/", createInvoice);
invoiceRouter.get("/", getAllInvoices);
invoiceRouter.get("/:id", getInvoiceById);
invoiceRouter.put("/:id", updateInvoice);
invoiceRouter.delete("/:id", deleteInvoice);
invoiceRouter.patch("/:id/pay", markInvoiceAsPaid);

module.exports = invoiceRouter;
