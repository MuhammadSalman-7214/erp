const query = require("../libs/dbQuery.js");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");

/**
 * Utility: Calculate invoice totals
 */
const calculateTotals = (items, taxRate = 0, discount = 0, carage = 0) => {
  const subTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const taxAmount = (subTotal * taxRate) / 100;
  const carageAmount = Math.max(Number(carage) || 0, 0);
  const totalAmount = subTotal + taxAmount - discount + carageAmount;

  return {
    subTotal,
    taxAmount,
    carage: carageAmount,
    totalAmount,
  };
};

const resolveCustomerPayload = async ({
  invoiceType,
  customerId,
  customer,
  userId,
}) => {
  if (invoiceType !== "sales") {
    return {
      resolvedCustomerId: undefined,
      resolvedCustomerSnapshot: undefined,
    };
  }

  if (customerId) {
    const rows = await query(
      "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
      [customerId, userId],
    );
    const customerDoc = rows[0];
    if (!customerDoc) {
      const error = new Error("Customer not found");
      error.statusCode = 404;
      throw error;
    }

    return {
      resolvedCustomerId: customerDoc.id,
      resolvedCustomerSnapshot: {
        code: customerDoc.customerCode || "",
        name: customerDoc.name,
        phone: customerDoc.contact_phone || "",
        address: customerDoc.contact_address || "",
      },
    };
  }

  return {
    resolvedCustomerId: undefined,
    resolvedCustomerSnapshot: customer,
  };
};

module.exports.createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceType,
      customer,
      customerId,
      client,
      vendor,
      items,
      taxRate,
      discount,
      currency,
      dueDate,
      notes,
      paymentMethod,
      status,
      carage,
    } = req.body;
    const userId = req.user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Invoice must have items" });
    }
    if (!invoiceType) {
      return res.status(400).json({ message: "Invoice type is required" });
    }

    const totals = calculateTotals(items, taxRate, discount, carage);

    const resolvedInvoiceNumber =
      invoiceNumber ||
      (invoiceType === "sales"
        ? await getNextInvoiceNumber("SI", userId)
        : await getNextInvoiceNumber("PI", userId));

    const { resolvedCustomerId, resolvedCustomerSnapshot } =
      await resolveCustomerPayload({
        invoiceType,
        customerId,
        customer: customer || client,
        userId,
      });

    if (vendor) {
      let vendorDoc;
      try {
        const rows = await query(
          "SELECT id FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
          [vendor, userId],
        );
        vendorDoc = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!vendorDoc) {
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO invoices (user_id, invoiceNumber, invoiceType, customerId, customer_code, customer_name, customer_phone, customer_address, vendor, subTotal, carage, taxRate, taxAmount, discount, totalAmount, currency, status, issueDate, dueDate, paymentMethod, paidAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          resolvedInvoiceNumber,
          invoiceType,
          resolvedCustomerId || null,
          resolvedCustomerSnapshot?.code || "",
          resolvedCustomerSnapshot?.name || "",
          resolvedCustomerSnapshot?.phone || "",
          resolvedCustomerSnapshot?.address || "",
          vendor || null,
          totals.subTotal,
          totals.carage,
          taxRate ?? 0,
          totals.taxAmount,
          discount ?? 0,
          totals.totalAmount,
          currency || "Rs",
          status || "draft",
          new Date(),
          dueDate,
          paymentMethod || null,
          null,
          notes || "",
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const invoiceId = insertResult.insertId;
    const itemValues = items.map((item) => [
      invoiceId,
      item.name,
      item.quantity,
      item.unitPrice,
      item.quantity * item.unitPrice,
    ]);
    try {
      await query(
        "INSERT INTO invoice_items (invoice_id, name, quantity, unitPrice, total) VALUES ?",
        [itemValues],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: invoiceId,
        user_id: userId,
        invoiceNumber: resolvedInvoiceNumber,
        invoiceType,
        customerId: resolvedCustomerId,
        customer: resolvedCustomerSnapshot,
        vendor,
        items: itemValues.map((v) => ({
          name: v[1],
          quantity: v[2],
          unitPrice: v[3],
          total: v[4],
        })),
        taxRate: taxRate ?? 0,
        discount: discount ?? 0,
        currency: currency || "Rs",
        dueDate,
        notes: notes || "",
        paymentMethod: paymentMethod || null,
        status: status || "draft",
        ...totals,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.getAllInvoices = async (req, res) => {
  try {
    const userId = req.user.userId;
    let invoices;
    try {
      invoices = await query("SELECT * FROM invoices WHERE user_id = ? ORDER BY createdAt ASC", [
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const invoicesWithDetails = await Promise.all(
      invoices.map(async (inv) => {
        let vendorDoc = null;
        let customerDoc = null;
        let items = [];
        try {
          if (inv.vendor) {
            const vendorRows = await query(
              "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
              [inv.vendor, userId],
            );
            vendorDoc = vendorRows[0] || null;
          }
          if (inv.customerId) {
            const customerRows = await query(
              "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
              [inv.customerId, userId],
            );
            const customerRow = customerRows[0];
            customerDoc = customerRow
              ? {
                  ...customerRow,
                  contactInfo: {
                    phone: customerRow.contact_phone || "",
                    address: customerRow.contact_address || "",
                  },
                }
              : null;
          }
          items = await query(
            "SELECT name, quantity, unitPrice, total FROM invoice_items WHERE invoice_id = ?",
            [inv.id],
          );
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });
        }

        return {
          ...inv,
          customer: {
            code: inv.customer_code || "",
            name: inv.customer_name || "",
            phone: inv.customer_phone || "",
            address: inv.customer_address || "",
          },
          customerId: customerDoc,
          vendor: vendorDoc,
          items,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: invoicesWithDetails.length,
      data: invoicesWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.getInvoiceById = async (req, res) => {
  try {
    const userId = req.user.userId;
    let invoice;
    try {
      const rows = await query(
        "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
        [req.params.id, userId],
      );
      invoice = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    let vendorDoc = null;
    let customerDoc = null;
    let items = [];
    try {
      if (invoice.vendor) {
        const vendorRows = await query(
          "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
          [invoice.vendor, userId],
        );
        vendorDoc = vendorRows[0] || null;
      }
      if (invoice.customerId) {
        const customerRows = await query(
          "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
          [invoice.customerId, userId],
        );
        const customerRow = customerRows[0];
        customerDoc = customerRow
          ? {
              ...customerRow,
              contactInfo: {
                phone: customerRow.contact_phone || "",
                address: customerRow.contact_address || "",
              },
            }
          : null;
      }
      items = await query(
        "SELECT name, quantity, unitPrice, total FROM invoice_items WHERE invoice_id = ?",
        [invoice.id],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...invoice,
        customer: {
          code: invoice.customer_code || "",
          name: invoice.customer_name || "",
          phone: invoice.customer_phone || "",
          address: invoice.customer_address || "",
        },
        customerId: customerDoc,
        vendor: vendorDoc,
        items,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.updateInvoice = async (req, res) => {
  try {
    const userId = req.user.userId;
    let invoice;
    try {
      const rows = await query(
        "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
        [req.params.id, userId],
      );
      invoice = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    let items = req.body.items;
    if (!Array.isArray(items)) {
      try {
        items = await query(
          "SELECT name, quantity, unitPrice, total FROM invoice_items WHERE invoice_id = ?",
          [req.params.id],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
    }
    const taxRate = req.body.taxRate ?? invoice.taxRate;
    const discount = req.body.discount ?? invoice.discount;
    const resolvedCarage = Math.max(
      Number(
        Object.prototype.hasOwnProperty.call(req.body, "carage")
          ? req.body.carage
          : invoice.carage,
      ) || 0,
      0,
    );

    const totals = calculateTotals(
      items.length ? items : [],
      taxRate,
      discount,
      resolvedCarage,
    );

    const { resolvedCustomerId, resolvedCustomerSnapshot } =
      await resolveCustomerPayload({
        invoiceType: req.body.invoiceType || invoice.invoiceType,
        customerId: req.body.customerId || invoice.customerId,
        customer: req.body.customer || {
          code: invoice.customer_code || "",
          name: invoice.customer_name || "",
          phone: invoice.customer_phone || "",
          address: invoice.customer_address || "",
        },
        userId,
      });

    if (req.body.vendor) {
      let vendorDoc;
      try {
        const rows = await query(
          "SELECT id FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
          [req.body.vendor, userId],
        );
        vendorDoc = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!vendorDoc) {
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    try {
      await query(
        "UPDATE invoices SET invoiceNumber = ?, invoiceType = ?, customerId = ?, customer_code = ?, customer_name = ?, customer_phone = ?, customer_address = ?, vendor = ?, subTotal = ?, carage = ?, taxRate = ?, taxAmount = ?, discount = ?, totalAmount = ?, currency = ?, dueDate = ?, notes = ?, paymentMethod = ?, status = ? WHERE id = ? AND user_id = ?",
        [
          req.body.invoiceNumber || invoice.invoiceNumber,
          req.body.invoiceType || invoice.invoiceType,
          resolvedCustomerId || null,
          resolvedCustomerSnapshot?.code || "",
          resolvedCustomerSnapshot?.name || "",
          resolvedCustomerSnapshot?.phone || "",
          resolvedCustomerSnapshot?.address || "",
          req.body.vendor ?? invoice.vendor ?? null,
          totals.subTotal,
          totals.carage,
          taxRate ?? 0,
          totals.taxAmount,
          discount ?? 0,
          totals.totalAmount,
          req.body.currency || invoice.currency || "Rs",
          req.body.dueDate || invoice.dueDate,
          req.body.notes ?? invoice.notes ?? "",
          req.body.paymentMethod ?? invoice.paymentMethod ?? null,
          req.body.status ?? invoice.status ?? "draft",
          req.params.id,
          userId,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (Array.isArray(req.body.items)) {
      try {
        await query("DELETE FROM invoice_items WHERE invoice_id = ?", [
          req.params.id,
        ]);
        if (req.body.items.length) {
          const itemValues = req.body.items.map((item) => [
            req.params.id,
            item.name,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice,
          ]);
          await query(
            "INSERT INTO invoice_items (invoice_id, name, quantity, unitPrice, total) VALUES ?",
            [itemValues],
          );
        }
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
    }

    const updatedRows = await query(
      "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
      [req.params.id, userId],
    );
    const updated = updatedRows[0];
    const updatedItems = await query(
      "SELECT name, quantity, unitPrice, total FROM invoice_items WHERE invoice_id = ?",
      [req.params.id],
    );

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        customer: {
          code: updated.customer_code || "",
          name: updated.customer_name || "",
          phone: updated.customer_phone || "",
          address: updated.customer_address || "",
        },
        items: updatedItems,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.deleteInvoice = async (req, res) => {
  try {
    const userId = req.user.userId;
    let invoice;
    try {
      const rows = await query(
        "SELECT id FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
        [req.params.id, userId],
      );
      invoice = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    try {
      await query("DELETE FROM invoice_items WHERE invoice_id = ?", [
        req.params.id,
      ]);
      await query("DELETE FROM invoices WHERE id = ? AND user_id = ?", [
        req.params.id,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.markInvoiceAsPaid = async (req, res) => {
  try {
    const userId = req.user.userId;
    let updateResult;
    try {
      updateResult = await query(
        "UPDATE invoices SET status = ?, paidAt = ? WHERE id = ? AND user_id = ?",
        ["paid", new Date(), req.params.id, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const rows = await query(
      "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
      [req.params.id, userId],
    );
    const invoice = rows[0];

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
