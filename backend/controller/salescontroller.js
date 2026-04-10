const query = require("../libs/dbQuery.js");
const db = require("../db");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const {
  validateSaleStockAvailability,
  createSaleCompletedStockOut,
  rollbackSaleCompletedStockOut,
} = require("../libs/stockLifecycle");

const normalizeText = (value = "") => String(value).trim().toLowerCase();

const formatCustomerKey = (code = "", name = "") => {
  const normalizedCode = normalizeText(code);
  const normalizedName = normalizeText(name);
  return normalizedCode || normalizedName
    ? `legacy:${normalizedCode}|${normalizedName}`
    : "";
};

const getSaleCustomerKeys = (sale) => {
  const keys = [];
  const customerId = sale?.customer?.id ?? sale?.customer ?? "";
  if (customerId) {
    keys.push(`id:${customerId}`);
  }

  const customerName = sale?.customer?.name || sale?.customerName || "";
  if (customerName) {
    keys.push(`name:${normalizeText(customerName)}`);
  }

  const customerCode = sale?.customer?.customerCode || sale?.customer_code || "";
  const legacyKey = formatCustomerKey(customerCode, customerName);
  if (legacyKey) {
    keys.push(legacyKey);
  }

  return [...new Set(keys)];
};

const getPaymentCustomerKeys = (payment) => {
  const keys = [];
  const customerId = payment?.customerId ?? "";
  if (customerId) {
    keys.push(`id:${customerId}`);
  }

  const customerName = payment?.customer_name || payment?.customer?.name || "";
  if (customerName) {
    keys.push(`name:${normalizeText(customerName)}`);
  }

  const customerCode = payment?.customer_code || payment?.customer?.code || "";
  const legacyKey = formatCustomerKey(customerCode, customerName);
  if (legacyKey) {
    keys.push(legacyKey);
  }

  return [...new Set(keys)];
};

const getPaymentStatus = (paidAmount, totalAmount) => {
  const total = Math.max(Number(totalAmount) || 0, 0);
  const paid = Math.max(Number(paidAmount) || 0, 0);

  if (total <= 0 || paid >= total) {
    return "paid";
  }
  if (paid <= 0) {
    return "unpaid";
  }
  return "partial";
};

const txQuery = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });

const withTransaction = async (work) => {
  await txQuery("START TRANSACTION");
  try {
    const result = await work(txQuery);
    await txQuery("COMMIT");
    return result;
  } catch (error) {
    try {
      await txQuery("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    throw error;
  }
};

const syncSalePayment = async ({
  executor = query,
  sale,
  customer,
  paymentMethod,
  receivedAmount,
  userId,
}) => {
  if (!sale?.invoice) {
    return;
  }

  const totalAmount = Math.max(Number(sale.totalAmount) || 0, 0);
  const normalizedReceived = Math.max(
    0,
    Math.min(Number(receivedAmount) || 0, totalAmount),
  );

  const paymentRows = await executor(
    "SELECT * FROM payments WHERE invoice = ? AND user_id = ? AND partyType = ? AND type = ? ORDER BY id ASC",
    [sale.invoice, userId, "customer", "received"],
  );

  const primaryRow = paymentRows[0];
  const method = paymentMethod || sale.paymentMethod || "cash";
  const notes = "Received against sales order";

  if (normalizedReceived > 0) {
    if (primaryRow) {
      await executor(
        "UPDATE payments SET amount = ?, method = ?, customerId = ?, customer_code = ?, customer_name = ?, paidAt = ?, notes = ? WHERE id = ? AND user_id = ?",
        [
          normalizedReceived,
          method,
          customer?.id || sale.customer || null,
          customer?.customerCode || "",
          customer?.name || sale.customerName || "",
          new Date(),
          notes,
          primaryRow.id,
          userId,
        ],
      );

      if (paymentRows.length > 1) {
        const extraIds = paymentRows.slice(1).map((row) => row.id);
        await executor(
          `DELETE FROM payments WHERE id IN (${extraIds.map(() => "?").join(",")}) AND user_id = ?`,
          [...extraIds, userId],
        );
      }
    } else {
      await executor(
        "INSERT INTO payments (user_id, type, amount, method, invoice, invoiceType, partyType, customerId, customer_code, customer_name, vendor, paidAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          "received",
          normalizedReceived,
          method,
          sale.invoice,
          "sales",
          "customer",
          customer?.id || sale.customer || null,
          customer?.customerCode || "",
          customer?.name || sale.customerName || "",
          null,
          new Date(),
          notes,
        ],
      );
    }
  } else if (paymentRows.length) {
    const ids = paymentRows.map((row) => row.id);
    await executor(
      `DELETE FROM payments WHERE id IN (${ids.map(() => "?").join(",")}) AND user_id = ?`,
      [...ids, userId],
    );
  }

  const [paymentTotalRows, invoiceRows] = await Promise.all([
    executor(
      "SELECT SUM(amount) AS total FROM payments WHERE invoice = ? AND user_id = ?",
      [sale.invoice, userId],
    ),
    executor(
      "SELECT totalAmount FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
      [sale.invoice, userId],
    ),
  ]);

  const paymentTotal = Number(paymentTotalRows?.[0]?.total || 0);
  const invoiceTotal = Number(invoiceRows?.[0]?.totalAmount || totalAmount || 0);
  const invoiceStatus =
    paymentTotal >= invoiceTotal && invoiceTotal > 0
      ? "paid"
      : paymentTotal > 0
        ? "partial"
        : "sent";

  await executor(
    "UPDATE invoices SET status = ?, paidAt = ? WHERE id = ? AND user_id = ?",
    [
      invoiceStatus,
      paymentTotal >= invoiceTotal && invoiceTotal > 0 ? new Date() : null,
      sale.invoice,
      userId,
    ],
  );
};

const deleteSaleCascade = async ({ executor = query, saleId, userId }) => {
  const saleRows = await executor(
    "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
    [saleId, userId],
  );
  const sale = saleRows[0];

  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  const saleItems = await executor(
    "SELECT product, productCode, quantity, price FROM sale_items WHERE sale_id = ? AND user_id = ?",
    [saleId, userId],
  );

  if (sale.status === "completed" || sale.stockOutRecorded) {
    await rollbackSaleCompletedStockOut(saleId, userId);
  }

  if (sale.invoice) {
    await executor(
      "DELETE FROM payments WHERE invoice = ? AND user_id = ? AND partyType = ? AND type = ?",
      [sale.invoice, userId, "customer", "received"],
    );
    await executor("DELETE FROM invoice_items WHERE invoice_id = ?", [
      sale.invoice,
    ]);
    await executor(
      "DELETE FROM invoices WHERE id = ? AND user_id = ?",
      [sale.invoice, userId],
    );
  }

  await executor("DELETE FROM sale_items WHERE sale_id = ? AND user_id = ?", [
    saleId,
    userId,
  ]);
  await executor("DELETE FROM sales WHERE id = ? AND user_id = ?", [
    saleId,
    userId,
  ]);

  return { sale, saleItems };
};

const attachCustomerPaymentStatus = async (sales, userId) => {
  if (!Array.isArray(sales) || sales.length === 0) {
    return sales;
  }

  const [payments, invoices] = await Promise.all([
    query(
      "SELECT amount, invoice, customerId, customer_code, customer_name FROM payments WHERE user_id = ? AND partyType = ? AND type = ?",
      [userId, "customer", "received"],
    ),
    query(
      "SELECT id, totalAmount, status FROM invoices WHERE invoiceType = ? AND user_id = ?",
      ["sales", userId],
    ),
  ]);

  const invoiceById = new Map(
    invoices.map((invoice) => [String(invoice.id), invoice]),
  );
  const invoicePaymentTotals = new Map();
  const customerBuckets = new Map();
  const customerAliases = new Map();

  const ensureBucket = (sale) => {
    const keys = getSaleCustomerKeys(sale);
    const matchedBucketKey = keys.find((key) => customerAliases.has(key));
    const bucketKey = matchedBucketKey || keys[0];

    if (!bucketKey) {
      return null;
    }

    if (!customerBuckets.has(bucketKey)) {
      customerBuckets.set(bucketKey, {
        sales: [],
        pool: 0,
      });
    }

    const bucket = customerBuckets.get(bucketKey);
    bucket.sales.push(sale);

    keys.forEach((key) => {
      customerAliases.set(key, bucketKey);
    });

    return bucketKey;
  };

  sales.forEach((sale) => {
    ensureBucket(sale);
  });

  payments.forEach((payment) => {
    const amount = Number(payment.amount) || 0;
    if (!amount) {
      return;
    }

    if (payment.invoice) {
      const invoiceKey = String(payment.invoice);
      invoicePaymentTotals.set(
        invoiceKey,
        (invoicePaymentTotals.get(invoiceKey) || 0) + amount,
      );
      return;
    }

    const paymentKeys = getPaymentCustomerKeys(payment);
    const bucketKey = paymentKeys
      .map((key) => customerAliases.get(key))
      .find(Boolean);

    if (!bucketKey || !customerBuckets.has(bucketKey)) {
      return;
    }

    const bucket = customerBuckets.get(bucketKey);
    bucket.pool += amount;
  });

  const statusBySaleId = new Map();

  for (const bucket of customerBuckets.values()) {
    let customerPool = bucket.pool;
    const sortedSales = [...bucket.sales].sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return Number(a?.id || 0) - Number(b?.id || 0);
    });

    sortedSales.forEach((sale) => {
      const totalAmount = Number(sale.totalAmount) || 0;
      const invoiceId = sale.invoice ? String(sale.invoice) : "";
      const invoiceRecord = invoiceId ? invoiceById.get(invoiceId) : null;
      const invoicePaid = invoiceId
        ? Math.min(Number(invoicePaymentTotals.get(invoiceId) || 0), totalAmount)
        : 0;

      let paidAmount = invoicePaid;
      if (invoiceRecord && normalizeText(invoiceRecord.status) === "paid") {
        paidAmount = Math.max(paidAmount, totalAmount);
      }

      let remainingAmount = Math.max(totalAmount - paidAmount, 0);

      if (!invoiceId && remainingAmount > 0 && customerPool > 0) {
        const applied = Math.min(customerPool, remainingAmount);
        paidAmount += applied;
        remainingAmount -= applied;
        customerPool -= applied;
      }

      statusBySaleId.set(String(sale.id), {
        paymentStatus: getPaymentStatus(paidAmount, totalAmount),
        paidAmount,
        remainingAmount,
      });
    });
  }

  return sales.map((sale) => ({
    ...sale,
    ...(statusBySaleId.get(String(sale.id)) || {
      paymentStatus: getPaymentStatus(0, sale.totalAmount),
      paidAmount: 0,
      remainingAmount: Math.max(Number(sale.totalAmount) || 0, 0),
    }),
  }));
};

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

  const errorEntry = hydrated.find((sale) => sale?.error);
  if (errorEntry) {
    return hydrated;
  }

  return attachCustomerPaymentStatus(hydrated, userId);
};

module.exports.createSale = async (req, res) => {
  try {
    const {
      customerId,
      products,
      paymentMethod,
      status,
      receivedAmount,
      carage,
    } = req.body;
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
    const resolvedCarage = Math.max(Number(carage) || 0, 0);
    const grandTotalAmount = totalAmount + resolvedCarage;
    const parsedReceivedAmount = Math.max(Number(receivedAmount) || 0, 0);
    if (parsedReceivedAmount > grandTotalAmount) {
      return res.status(400).json({
        success: false,
        message: "Received amount cannot be greater than the sale total",
      });
    }

    if (resolvedSaleStatus === "completed") {
      await validateSaleStockAvailability(resolvedProducts, [], userId);
    }

    const saleInvoiceNumber = await getNextInvoiceNumber("SI", userId);
    const salePaymentStatus = getPaymentStatus(
      parsedReceivedAmount,
      grandTotalAmount,
    );
    const paymentMethodMap = {
      cash: "cash",
      banktransfer: "bank_transfer",
    };
    const resolvedPaymentMethod =
      parsedReceivedAmount <= 0
        ? "credit"
        : paymentMethodMap[String(paymentMethod || "").toLowerCase()] || "";

    if (parsedReceivedAmount > 0 && !resolvedPaymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Please select Cash or Bank Transfer when received amount is entered",
      });
    }

    let saleInsert;
    try {
      saleInsert = await query(
        "INSERT INTO sales (user_id, invoiceNumber, customer, customerName, paymentMethod, status, paymentStatus, carage, totalAmount, stockOutRecorded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          saleInvoiceNumber,
          customerId,
          customerName,
          resolvedPaymentMethod,
          resolvedSaleStatus,
          salePaymentStatus,
          resolvedCarage,
          grandTotalAmount,
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

    let invoiceInsert;
    try {
      invoiceInsert = await query(
        "INSERT INTO invoices (user_id, invoiceNumber, invoiceType, customerId, customer_name, customer_phone, customer_address, carage, taxRate, discount, currency, dueDate, paymentMethod, status, subTotal, taxAmount, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          saleInvoiceNumber,
          "sales",
          customerId,
          customerName,
          customer.contact_phone || "",
          customer.contact_address || "",
          resolvedCarage,
          0,
          0,
          "Rs",
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          resolvedPaymentMethod,
          "sent",
          totalAmount,
          0,
          grandTotalAmount,
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

    if (parsedReceivedAmount > 0) {
      try {
        await query(
          "INSERT INTO payments (user_id, type, amount, method, invoice, invoiceType, partyType, customerId, customer_code, customer_name, vendor, paidAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            userId,
            "received",
            parsedReceivedAmount,
            resolvedPaymentMethod,
            invoiceId,
            "sales",
            "customer",
            customerId,
            customer.customerCode || "",
            customerName,
            null,
            new Date(),
            "Received against sales order",
          ],
        );
        await query(
          "UPDATE invoices SET status = ?, paidAt = ? WHERE id = ? AND user_id = ?",
          [
            parsedReceivedAmount >= grandTotalAmount ? "paid" : "partial",
            parsedReceivedAmount >= grandTotalAmount ? new Date() : null,
            invoiceId,
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
      sales = await query("SELECT * FROM sales WHERE user_id = ? ORDER BY createdAt ASC", [
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
    const hasReceivedAmount = Object.prototype.hasOwnProperty.call(
      updatedData,
      "receivedAmount",
    );

    const result = await withTransaction(async (executor) => {
      const existingRows = await executor(
        "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      const existingSale = existingRows[0];
      if (!existingSale) {
        const error = new Error("Sale not found");
        error.statusCode = 404;
        throw error;
      }

      if (normalizeText(updatedData.status) === "cancelled") {
        await deleteSaleCascade({ executor, saleId: id, userId });
        return { canceled: true };
      }

      if (!updatedData.customerId) {
        const error = new Error("Customer is required");
        error.statusCode = 400;
        throw error;
      }

      const customerRows = await executor(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [updatedData.customerId, userId],
      );
      const customer = customerRows[0];
      if (!customer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
      }
      if (!customer.contact_address || !String(customer.contact_address).trim()) {
        const error = new Error("Customer address is required");
        error.statusCode = 400;
        throw error;
      }

      if (!updatedData.products || !updatedData.products.length) {
        const error = new Error("Products are required.");
        error.statusCode = 400;
        throw error;
      }

      let updatedTotalAmount = 0;
      const resolvedProducts = [];

      for (const item of updatedData.products) {
        if (!item.productCode || !item.quantity) {
          const error = new Error(
            "Each product must have product code id and quantity",
          );
          error.statusCode = 400;
          throw error;
        }

        const codeRows = await executor(
          "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
          [item.productCode, userId],
        );
        const productCodeRecord = codeRows[0];
        if (!productCodeRecord) {
          const error = new Error(`Product code ${item.productCode} not found`);
          error.statusCode = 404;
          throw error;
        }

        const productRows = await executor(
          "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
          [productCodeRecord.product, userId],
        );
        const productRecord = productRows[0];
        if (!productRecord) {
          const error = new Error(`Product ${productCodeRecord.product} not found`);
          error.statusCode = 404;
          throw error;
        }

        const defaultUnitPrice =
          Number(productRecord.salePrice) || Number(productRecord.Price) || 0;
        const requestedPrice = Number(item.price);
        const unitPrice =
          Number.isFinite(requestedPrice) && requestedPrice >= 0
            ? requestedPrice
            : defaultUnitPrice;

        updatedTotalAmount += Number(item.quantity) * unitPrice;
        resolvedProducts.push({
          product: productRecord.id,
          productCode: productCodeRecord.id,
          quantity: Number(item.quantity),
          price: unitPrice,
        });
      }

      const resolvedCarage = Math.max(
        Number(
          Object.prototype.hasOwnProperty.call(updatedData, "carage")
            ? updatedData.carage
            : existingSale.carage,
        ) || 0,
        0,
      );
      const grandTotalAmount = updatedTotalAmount + resolvedCarage;
      const resolvedStatus = normalizeText(updatedData.status)
        ? updatedData.status
        : existingSale.status || "pending";

      const existingSaleWasStocked =
        normalizeText(existingSale.status) === "completed" ||
        Boolean(existingSale.stockOutRecorded);
      const nextSaleWillBeStocked = resolvedStatus === "completed";

      if (existingSaleWasStocked) {
        await rollbackSaleCompletedStockOut(existingSale.id, userId);
      }

      if (nextSaleWillBeStocked) {
        await validateSaleStockAvailability(resolvedProducts, [], userId);
      }

      await executor(
        "UPDATE sales SET customer = ?, customerName = ?, paymentMethod = ?, status = ?, carage = ?, totalAmount = ?, stockOutRecorded = ? WHERE id = ? AND user_id = ?",
        [
          customer.id,
          customer.name,
          updatedData.paymentMethod || existingSale.paymentMethod,
          resolvedStatus,
          resolvedCarage,
          grandTotalAmount,
          nextSaleWillBeStocked,
          id,
          userId,
        ],
      );

      await executor("DELETE FROM sale_items WHERE sale_id = ? AND user_id = ?", [
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
      if (saleItemValues.length) {
        await executor(
          "INSERT INTO sale_items (sale_id, user_id, product, productCode, quantity, price) VALUES ?",
          [saleItemValues],
        );
      }

      if (existingSale.invoice) {
        const invoiceItems = [];
        for (const item of resolvedProducts) {
          const productRows = await executor(
            "SELECT name FROM products WHERE id = ? AND user_id = ? LIMIT 1",
            [item.product, userId],
          );
          const codeRows = await executor(
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

        await executor(
          "UPDATE invoices SET customerId = ?, customer_name = ?, customer_phone = ?, customer_address = ?, carage = ?, subTotal = ?, totalAmount = ? WHERE id = ? AND user_id = ?",
          [
            customer.id,
            customer.name,
            customer.contact_phone || "",
            customer.contact_address || "",
            resolvedCarage,
            updatedTotalAmount,
            grandTotalAmount,
            existingSale.invoice,
            userId,
          ],
        );
        await executor("DELETE FROM invoice_items WHERE invoice_id = ?", [
          existingSale.invoice,
        ]);
        const invoiceItemValues = invoiceItems.map((item) => [
          existingSale.invoice,
          item.name,
          item.quantity,
          item.unitPrice,
          item.total,
        ]);
        if (invoiceItemValues.length) {
          await executor(
            "INSERT INTO invoice_items (invoice_id, name, quantity, unitPrice, total) VALUES ?",
            [invoiceItemValues],
          );
        }

        const targetReceivedAmount = hasReceivedAmount
          ? updatedData.receivedAmount
          : Number(
              (
                await executor(
                  "SELECT SUM(amount) AS total FROM payments WHERE invoice = ? AND user_id = ? AND partyType = ? AND type = ?",
                  [existingSale.invoice, userId, "customer", "received"],
                )
              )?.[0]?.total || 0,
            );

        const resolvedPaymentStatus = getPaymentStatus(
          targetReceivedAmount,
          grandTotalAmount,
        );

        await executor(
          "UPDATE sales SET paymentStatus = ? WHERE id = ? AND user_id = ?",
          [resolvedPaymentStatus, id, userId],
        );

        await syncSalePayment({
          executor,
          sale: {
            ...existingSale,
            invoice: existingSale.invoice,
            totalAmount: grandTotalAmount,
            carage: resolvedCarage,
            paymentMethod: updatedData.paymentMethod || existingSale.paymentMethod,
            customer: customer.id,
            customerName: customer.name,
          },
          customer,
          paymentMethod: updatedData.paymentMethod || existingSale.paymentMethod,
          receivedAmount: targetReceivedAmount,
          userId,
        });
      }

      if (nextSaleWillBeStocked) {
        await createSaleCompletedStockOut(
          { id, products: resolvedProducts },
          userId,
        );
        await executor(
          "UPDATE sales SET stockOutRecorded = ? WHERE id = ? AND user_id = ?",
          [true, id, userId],
        );
      }

      const updatedRows = await executor(
        "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      const populatedSale = await hydrateSales(updatedRows, userId);
      const errorEntry = populatedSale.find((s) => s?.error);
      if (errorEntry) {
        const error = new Error("Database error");
        error.statusCode = 500;
        error.details = errorEntry.error;
        throw error;
      }

      return { canceled: false, sale: populatedSale[0] };
    });

    if (result?.canceled) {
      return res.status(200).json({
        success: true,
        message: "Sale cancelled and removed successfully",
        deletedSaleId: Number(id),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: result.sale,
    });
  } catch (error) {
    console.error("Update Sale Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested,
        details: error.details,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating sale",
      error: error.message,
    });
  }
};

module.exports.deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await withTransaction(async (executor) => {
      await deleteSaleCascade({ executor, saleId: id, userId });
      return true;
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sale deleted successfully",
      deletedSaleId: Number(id),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error deleting sale",
      error: error.message,
    });
  }
};

module.exports.SearchSales = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    const userId = req.user.userId;
    const likeQuery = `%${String(searchQuery || "").trim()}%`;

    let sales;
    if (!searchQuery || searchQuery.trim() === "") {
      sales = await query("SELECT * FROM sales WHERE user_id = ? ORDER BY createdAt ASC", [userId]);
    } else {
      sales = await query(
        `SELECT * FROM sales s
         WHERE s.user_id = ?
           AND (
             s.invoiceNumber LIKE ?
             OR s.customerName LIKE ?
             OR s.paymentMethod LIKE ?
             OR EXISTS (
               SELECT 1
               FROM sale_items si
               LEFT JOIN products p ON p.id = si.product
               LEFT JOIN product_codes pc ON pc.id = si.productCode
               WHERE si.sale_id = s.id
                 AND si.user_id = s.user_id
                 AND (
                   p.name LIKE ?
                   OR pc.code LIKE ?
                 )
             )
           )`,
        [userId, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery],
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
      "SELECT * FROM sales WHERE user_id = ? AND customer = ? ORDER BY createdAt ASC",
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

    const paidPayments = await query(
      "SELECT amount, customer_name, customer_code, customerId, invoice FROM payments WHERE user_id = ? AND partyType = ? AND type = ? ORDER BY createdAt ASC, id ASC",
      [userId, "customer", "received"],
    );

    let paidAmount = 0;
    const paidInvoiceIds = new Set();
    paidPayments.forEach((payment) => {
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
    const openingBalance = Number(customer?.openingBalance) || 0;
    summary.remaining = Math.max(summary.total - summary.paid + openingBalance, 0);

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
