const query = require("../libs/dbQuery.js");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const {
  validateSaleStockAvailability,
  createSaleCompletedStockOut,
  rollbackSaleCompletedStockOut,
} = require("../libs/stockLifecycle");

const hydrateSales = async (sales, userId) => {
  const hydrated = await Promise.all(
    sales.map(async (sale) => {
      let items = [];
      let customer = null;
      try {
        items = await query(
          "SELECT si.*, p.name AS product_name, p.description, p.company, p.brand, pc.code AS productCode_code, pc.variantName AS productCode_variantName FROM sale_items si LEFT JOIN products p ON p.id = si.product LEFT JOIN product_codes pc ON pc.id = si.productCode WHERE si.sale_id = ? AND si.user_id = ?",
          [sale.id, userId],
        );
        if (sale.customer) {
          const customerRows = await query(
            "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
            [sale.customer, userId],
          );
          const c = customerRows[0];
          customer = c
            ? {
                ...c,
                contactInfo: {
                  phone: c.contact_phone || "",
                  address: c.contact_address || "",
                },
              }
            : null;
        }
      } catch (err) {
        return { error: err };
      }

      const products = items.map((item) => ({
        product: item.product
          ? {
              id: item.product,
              name: item.product_name,
              description: item.description,
              company: item.company,
              brand: item.brand,
            }
          : null,
        productCode: item.productCode
          ? {
              id: item.productCode,
              code: item.productCode_code,
              variantName: item.productCode_variantName,
            }
          : null,
        quantity: item.quantity,
        price: item.price,
      }));

      return {
        ...sale,
        products,
        customer,
      };
    }),
  );

  return hydrated;
};

module.exports.createSale = async (req, res) => {
  try {
    const { customerId, products, paymentMethod, status } = req.body;
    const userId = req.user.userId;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    let customer;
    try {
      const rows = await query(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [customerId, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    if (!customer.contact_address || !String(customer.contact_address).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer address is required",
      });
    }

    const customerName = customer.name;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and cannot be empty",
      });
    }

    for (const item of products) {
      if (!item.productCode || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product code id and quantity",
        });
      }
    }

    const resolvedProducts = [];
    let totalAmount = 0;
    for (const item of products) {
      let productCodeRecord;
      try {
        const rows = await query(
          "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
          [item.productCode, userId],
        );
        productCodeRecord = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!productCodeRecord) {
        return res.status(404).json({
          success: false,
          message: `Product code ${item.productCode} not found`,
        });
      }

      let productRecord;
      try {
        const rows = await query(
          "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
          [productCodeRecord.product, userId],
        );
        productRecord = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${productCodeRecord.product} not found`,
        });
      }

      if (item.product && Number(item.product) !== Number(productRecord.id)) {
        return res.status(400).json({
          success: false,
          message: "Product does not match selected product code",
        });
      }

      const defaultUnitPrice =
        Number(productRecord.salePrice) || Number(productRecord.Price) || 0;
      const requestedPrice = Number(item.price);
      const unitPrice =
        Number.isFinite(requestedPrice) && requestedPrice >= 0
          ? requestedPrice
          : defaultUnitPrice;
      totalAmount += unitPrice * item.quantity;
      resolvedProducts.push({
        product: productRecord.id,
        productCode: productCodeRecord.id,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    const resolvedSaleStatus = status || "pending";
    if (resolvedSaleStatus === "completed") {
      await validateSaleStockAvailability(resolvedProducts, [], userId);
    }

    let saleInsert;
    try {
      saleInsert = await query(
        "INSERT INTO sales (user_id, customer, customerName, paymentMethod, status, totalAmount, stockOutRecorded) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          customerId,
          customerName,
          paymentMethod || null,
          resolvedSaleStatus,
          totalAmount,
          false,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const saleId = saleInsert.insertId;

    const saleItemValues = resolvedProducts.map((item) => [
      saleId,
      userId,
      item.product,
      item.productCode,
      item.quantity,
      item.price,
    ]);
    try {
      await query(
        "INSERT INTO sale_items (sale_id, user_id, product, productCode, quantity, price) VALUES ?",
        [saleItemValues],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const invoiceItems = [];
    for (let i = 0; i < resolvedProducts.length; i += 1) {
      let productRecord;
      let productCodeRecord;
      try {
        const productRows = await query(
          "SELECT name FROM products WHERE id = ? AND user_id = ? LIMIT 1",
          [resolvedProducts[i].product, userId],
        );
        productRecord = productRows[0];
        const codeRows = await query(
          "SELECT code, variantName FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
          [resolvedProducts[i].productCode, userId],
        );
        productCodeRecord = codeRows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      const variantLabel = productCodeRecord?.variantName
        ? ` - ${productCodeRecord.variantName}`
        : "";
      invoiceItems.push({
        name: `${productRecord?.name || "Product"} (${productCodeRecord?.code || "code"})${variantLabel}`,
        quantity: resolvedProducts[i].quantity,
        unitPrice: resolvedProducts[i].price,
        total: resolvedProducts[i].price * resolvedProducts[i].quantity,
      });
    }

    const invoiceNumber = await getNextInvoiceNumber("SI", userId);
    const paymentMethodMap = {
      creditcard: "card",
      banktransfer: "bank_transfer",
      cash: "cash",
    };
    const resolvedPaymentMethod =
      paymentMethodMap[paymentMethod] || paymentMethod || "cash";

    let invoiceInsert;
    try {
      invoiceInsert = await query(
        "INSERT INTO invoices (user_id, invoiceNumber, invoiceType, customerId, customer_name, customer_phone, customer_address, taxRate, discount, currency, dueDate, paymentMethod, status, subTotal, taxAmount, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          invoiceNumber,
          "sales",
          customerId,
          customerName,
          customer.contact_phone || "",
          customer.contact_address || "",
          0,
          0,
          "Rs",
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          resolvedPaymentMethod,
          "sent",
          totalAmount,
          0,
          totalAmount,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const invoiceId = invoiceInsert.insertId;
    const invoiceItemValues = invoiceItems.map((item) => [
      invoiceId,
      item.name,
      item.quantity,
      item.unitPrice,
      item.total,
    ]);
    try {
      await query(
        "INSERT INTO invoice_items (invoice_id, name, quantity, unitPrice, total) VALUES ?",
        [invoiceItemValues],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (resolvedSaleStatus === "completed") {
      await createSaleCompletedStockOut(
        {
          id: saleId,
          products: resolvedProducts,
        },
        userId,
      );
      await query(
        "UPDATE sales SET stockOutRecorded = ? WHERE id = ? AND user_id = ?",
        [true, saleId, userId],
      );
    }

    try {
      await query("UPDATE sales SET invoice = ? WHERE id = ? AND user_id = ?", [
        invoiceId,
        saleId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const salesRows = await query(
      "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
      [saleId, userId],
    );
    const populatedSale = await hydrateSales(salesRows, userId);

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale: populatedSale[0],
    });
  } catch (error) {
    console.error("Create Sale Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating sale",
      error: error.message || error,
    });
  }
};

module.exports.getAllSales = async (req, res) => {
  try {
    const userId = req.user.userId;
    let sales;
    try {
      sales = await query("SELECT * FROM sales WHERE user_id = ? ORDER BY createdAt DESC", [
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const hydrated = await hydrateSales(sales, userId);
    const errorEntry = hydrated.find((s) => s?.error);
    if (errorEntry) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: errorEntry.error,
      });
    }
    res.status(200).json({ success: true, sales: hydrated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sales",
      error: error.message,
    });
  }
};

module.exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    let sale;
    try {
      const rows = await query(
        "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      sale = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    const hydrated = await hydrateSales([sale], userId);
    const errorEntry = hydrated.find((s) => s?.error);
    if (errorEntry) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: errorEntry.error,
      });
    }
    res.status(200).json({ success: true, sale: hydrated[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sale",
      error: error.message,
    });
  }
};

module.exports.updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    if (Object.prototype.hasOwnProperty.call(updatedData, "paymentStatus")) {
      delete updatedData.paymentStatus;
    }
    const userId = req.user.userId;

    if (!updatedData.customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    let customer;
    try {
      const rows = await query(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [updatedData.customerId, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    if (!customer.contact_address || !String(customer.contact_address).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer address is required",
      });
    }

    if (!updatedData.products || !updatedData.products.length) {
      return res.status(400).json({
        success: false,
        message: "Products are required.",
      });
    }

    let existingSale;
    try {
      const rows = await query(
        "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      existingSale = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!existingSale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    const resolvedStatus = updatedData.status || existingSale.status || "pending";

    let updatedTotalAmount = 0;
    const resolvedProducts = [];

    for (const item of updatedData.products) {
      if (!item.productCode || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product code id and quantity",
        });
      }

      let productCodeRecord;
      try {
        const rows = await query(
          "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
          [item.productCode, userId],
        );
        productCodeRecord = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!productCodeRecord) {
        return res.status(404).json({
          success: false,
          message: `Product code ${item.productCode} not found`,
        });
      }

      let productRecord;
      try {
        const rows = await query(
          "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
          [productCodeRecord.product, userId],
        );
        productRecord = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${productCodeRecord.product} not found`,
        });
      }

      const defaultUnitPrice =
        Number(productRecord.salePrice) || Number(productRecord.Price) || 0;
      const requestedPrice = Number(item.price);
      const unitPrice =
        Number.isFinite(requestedPrice) && requestedPrice >= 0
          ? requestedPrice
          : defaultUnitPrice;
      updatedTotalAmount += item.quantity * unitPrice;
      resolvedProducts.push({
        product: productRecord.id,
        productCode: productCodeRecord.id,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    if (resolvedStatus === "completed") {
      const oldCompletedItems = await query(
        "SELECT product, productCode, quantity, price FROM sale_items WHERE sale_id = ? AND user_id = ?",
        [id, userId],
      );
      await validateSaleStockAvailability(
        resolvedProducts,
        existingSale.status === "completed" ? oldCompletedItems : [],
        userId,
      );
    }

    if (existingSale.status === "completed") {
      await rollbackSaleCompletedStockOut(existingSale.id, userId);
    }

    try {
      await query(
        "UPDATE sales SET customer = ?, customerName = ?, paymentMethod = ?, status = ?, totalAmount = ?, stockOutRecorded = ? WHERE id = ? AND user_id = ?",
        [
          customer.id,
          customer.name,
          updatedData.paymentMethod || existingSale.paymentMethod,
          resolvedStatus,
          updatedTotalAmount,
          false,
          id,
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

    try {
      await query("DELETE FROM sale_items WHERE sale_id = ? AND user_id = ?", [
        id,
        userId,
      ]);
      const saleItemValues = resolvedProducts.map((item) => [
        id,
        userId,
        item.product,
        item.productCode,
        item.quantity,
        item.price,
      ]);
      await query(
        "INSERT INTO sale_items (sale_id, user_id, product, productCode, quantity, price) VALUES ?",
        [saleItemValues],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (existingSale.invoice) {
      const invoiceItems = [];
      for (const item of resolvedProducts) {
        const productRows = await query(
          "SELECT name FROM products WHERE id = ? AND user_id = ? LIMIT 1",
          [item.product, userId],
        );
        const codeRows = await query(
          "SELECT code, variantName FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
          [item.productCode, userId],
        );
        const productRecord = productRows[0];
        const productCodeRecord = codeRows[0];
        const variantLabel = productCodeRecord?.variantName
          ? ` - ${productCodeRecord.variantName}`
          : "";
        invoiceItems.push({
          name: `${productRecord?.name || "Product"} (${productCodeRecord?.code || "code"})${variantLabel}`,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        });
      }

      try {
        await query(
          "UPDATE invoices SET customerId = ?, customer_name = ?, customer_phone = ?, customer_address = ?, subTotal = ?, totalAmount = ? WHERE id = ? AND user_id = ?",
          [
            customer.id,
            customer.name,
            customer.contact_phone || "",
            customer.contact_address || "",
            updatedTotalAmount,
            updatedTotalAmount,
            existingSale.invoice,
            userId,
          ],
        );
        await query("DELETE FROM invoice_items WHERE invoice_id = ?", [
          existingSale.invoice,
        ]);
        const invoiceItemValues = invoiceItems.map((item) => [
          existingSale.invoice,
          item.name,
          item.quantity,
          item.unitPrice,
          item.total,
        ]);
        await query(
          "INSERT INTO invoice_items (invoice_id, name, quantity, unitPrice, total) VALUES ?",
          [invoiceItemValues],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
    }

    if (resolvedStatus === "completed") {
      await createSaleCompletedStockOut(
        { id, products: resolvedProducts },
        userId,
      );
      await query(
        "UPDATE sales SET stockOutRecorded = ? WHERE id = ? AND user_id = ?",
        [true, id, userId],
      );
    }

    const updatedRows = await query(
      "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId],
    );
    const populatedSale = await hydrateSales(updatedRows, userId);
    const errorEntry = populatedSale.find((s) => s?.error);
    if (errorEntry) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: errorEntry.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: populatedSale[0],
    });
  } catch (error) {
    console.error("Update Sale Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating sale",
      error: error.message,
    });
  }
};

module.exports.SearchSales = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    const userId = req.user.userId;

    let sales;
    if (!searchQuery || searchQuery.trim() === "") {
      sales = await query("SELECT * FROM sales WHERE user_id = ?", [userId]);
    } else {
      sales = await query(
        "SELECT * FROM sales WHERE user_id = ? AND (customerName LIKE ? OR paymentMethod LIKE ?)",
        [userId, `%${searchQuery}%`, `%${searchQuery}%`],
      );
    }

    const hydrated = await hydrateSales(sales, userId);
    const errorEntry = hydrated.find((s) => s?.error);
    if (errorEntry) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: errorEntry.error,
      });
    }
    res.status(200).json({ success: true, sales: hydrated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching sales",
      error: error.message,
    });
  }
};

module.exports.getSalesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;

    let customer;
    try {
      const rows = await query(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [customerId, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const salesRows = await query(
      "SELECT * FROM sales WHERE user_id = ? AND customer = ? ORDER BY createdAt DESC",
      [userId, customerId],
    );
    const sales = await hydrateSales(salesRows, userId);
    const errorEntry = sales.find((s) => s?.error);
    if (errorEntry) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: errorEntry.error,
      });
    }

    const summary = sales.reduce(
      (acc, sale) => {
        const amount = Number(sale.totalAmount || 0);
        acc.total += amount;
        acc.count += 1;
        return acc;
      },
      { total: 0, paid: 0, count: 0 },
    );

    const normalizeText = (value = "") => String(value).trim().toLowerCase();
    const normalizedCustomerName = normalizeText(customer?.name);
    const normalizedCustomerCode = normalizeText(customer?.customerCode);

    const payments = await query(
      "SELECT amount, customer_name, customer_code, customerId, invoice FROM payments WHERE user_id = ? AND partyType = ? AND type = ?",
      [userId, "customer", "received"],
    );

    let paidAmount = 0;
    const paidInvoiceIds = new Set();
    payments.forEach((payment) => {
      const paymentCustomerId = payment.customerId ? String(payment.customerId) : "";
      const paymentName = normalizeText(payment.customer_name);
      const paymentCode = normalizeText(payment.customer_code);

      const matchesCustomer =
        paymentCustomerId === String(customerId) ||
        (paymentCustomerId === "" &&
          (paymentName === normalizedCustomerName ||
            paymentCode === normalizedCustomerCode));

      if (!matchesCustomer) return;
      paidAmount += Number(payment.amount) || 0;
      if (payment.invoice) {
        paidInvoiceIds.add(String(payment.invoice));
      }
    });

    const invoices = await query(
      "SELECT id, totalAmount, status FROM invoices WHERE invoiceType = ? AND user_id = ? AND (customerId = ? OR customer_name = ? OR customer_code = ?)",
      ["sales", userId, customerId, customer?.name || "", customer?.customerCode || ""],
    );

    invoices.forEach((invoice) => {
      if (invoice.status === "paid" && !paidInvoiceIds.has(String(invoice.id))) {
        paidAmount += Number(invoice.totalAmount) || 0;
      }
    });

    summary.paid = paidAmount;
    summary.remaining = Math.max(summary.total - summary.paid, 0);

    return res.status(200).json({
      success: true,
      customer: {
        ...customer,
        contactInfo: {
          phone: customer.contact_phone || "",
          address: customer.contact_address || "",
        },
      },
      sales,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching customer sales history",
      error: error.message,
    });
  }
};
