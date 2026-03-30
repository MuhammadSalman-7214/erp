const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const {
  createOrderDeliveredStockIn,
  rollbackOrderDeliveredStockIn,
} = require("../libs/stockLifecycle");

const createOrder = async (req, res) => {
  try {
    const { Product, products, status, supplier, vendor } = req.body;
    const userId = req.user.userId;
    if (!status) return res.status(400).json({ message: "Status is required" });
    const incomingProducts = Array.isArray(products) ? products : null;
    if (!incomingProducts && !Product?.productCode) {
      return res.status(400).json({ message: "Product code ID is required" });
    }

    const orderItems = incomingProducts?.length ? incomingProducts : [Product];

    if (!orderItems.length) {
      return res.status(400).json({ message: "At least one product is required" });
    }

    const resolvedItems = [];
    let totalOrderAmount = 0;

    for (const item of orderItems) {
      if (!item?.productCode) {
        return res
          .status(400)
          .json({ message: "Product code ID is required" });
      }
      if (!item?.quantity) {
        return res.status(400).json({ message: "Quantity is required" });
      }

      const { product, productCode, price, quantity } = item;

      let productCodeRecord;
      try {
        const rows = await query(
          "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
          [productCode, userId],
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
        return res.status(404).json({ message: "Product code not found" });
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
        return res.status(404).json({ message: "Product not found" });
      }

      if (product && Number(product) !== Number(productRecord.id)) {
        return res
          .status(400)
          .json({ message: "Product does not match selected product code" });
      }

      const resolvedUnitPrice =
        price !== undefined && price !== null
          ? Number(price)
          : Number(productRecord.purchasePrice ?? 0);

      if (Number.isNaN(resolvedUnitPrice)) {
        return res.status(400).json({ message: "Price is required" });
      }

      totalOrderAmount += resolvedUnitPrice * Number(quantity);
      resolvedItems.push({
        product: productRecord.id,
        productCode: productCodeRecord.id,
        quantity: Number(quantity),
        price: resolvedUnitPrice,
        name: productRecord.name,
        code: productCodeRecord.code,
        variantName: productCodeRecord.variantName,
      });
    }

    const vendorId = vendor || supplier || null;
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor is required" });
    }

    let vendorRecord;
    try {
      const rows = await query(
        "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
        [vendorId, userId],
      );
      vendorRecord = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!vendorRecord) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    let orderInsert;
    try {
      orderInsert = await query(
        "INSERT INTO orders (user_id, user, vendor, supplier, totalAmount, status, stockInRecorded) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          userId,
          vendorId,
          supplier || null,
          totalOrderAmount,
          status,
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

    const orderId = orderInsert.insertId;
    const itemValues = resolvedItems.map((item) => [
      orderId,
      userId,
      item.product,
      item.productCode,
      item.quantity,
      item.price,
    ]);
    try {
      await query(
        "INSERT INTO order_items (order_id, user_id, product, productCode, quantity, price) VALUES ?",
        [itemValues],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const orderPayload = {
      id: orderId,
      user_id: userId,
      user: userId,
      products: resolvedItems.map((item) => ({
        product: item.product,
        productCode: item.productCode,
        price: item.price,
        quantity: item.quantity,
      })),
      Product: resolvedItems[0]
        ? {
            product: resolvedItems[0].product,
            productCode: resolvedItems[0].productCode,
            price: resolvedItems[0].price,
            quantity: resolvedItems[0].quantity,
          }
        : undefined,
      vendor: vendorId,
      supplier,
      totalAmount: totalOrderAmount,
      status,
      stockInRecorded: false,
    };

    if (status === "delivered") {
      await createOrderDeliveredStockIn(orderPayload, userId);
      orderPayload.stockInRecorded = true;
      try {
        await query(
          "UPDATE orders SET stockInRecorded = ? WHERE id = ? AND user_id = ?",
          [true, orderId, userId],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
    }

    const invoiceNumber = await getNextInvoiceNumber("PI", userId);
    const invoiceItems = resolvedItems.map((item) => {
      const variantLabel = item.variantName ? ` - ${item.variantName}` : "";
      return {
        name: `${item.name} (${item.code})${variantLabel}`,
        quantity: item.quantity,
        unitPrice: item.price,
        total: Number(item.price) * Number(item.quantity),
      };
    });

    let invoiceInsert;
    try {
      invoiceInsert = await query(
        "INSERT INTO invoices (user_id, invoiceNumber, invoiceType, vendor, taxRate, discount, currency, dueDate, paymentMethod, status, subTotal, taxAmount, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          invoiceNumber,
          "purchase",
          vendorId,
          0,
          0,
          "Rs",
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          "bank_transfer",
          "sent",
          totalOrderAmount,
          0,
          totalOrderAmount,
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

    orderPayload.invoice = invoiceId;
    try {
      await query("UPDATE orders SET invoice = ? WHERE id = ? AND user_id = ?", [
        invoiceId,
        orderId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: orderPayload,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Error in creating order",
      error: error.message,
      validationErrors: error.errors,
    });
  }
};

const Removeorder = async (req, res) => {
  try {
    const { OrdertId } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;

    let Deletedorder;
    try {
      const rows = await query(
        "SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1",
        [OrdertId, userId],
      );
      Deletedorder = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!Deletedorder) {
      return res.status(404).json({ message: "Order is not found!" });
    }

    if (Deletedorder.status === "delivered" || Deletedorder.stockInRecorded) {
      await rollbackOrderDeliveredStockIn(Deletedorder.id, userId);
    }

    try {
      await query("DELETE FROM order_items WHERE order_id = ? AND user_id = ?", [
        OrdertId,
        userId,
      ]);
      await query("DELETE FROM orders WHERE id = ? AND user_id = ?", [
        OrdertId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    await logActivity({
      action: "Delete order",
      description: `Order was deleted.`,
      entity: "order",
      entityId: Deletedorder.id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting Order", error: error.message });
  }
};

const hydrateOrderRows = async (orders, userId) => {
  const hydrated = await Promise.all(
    orders.map(async (order) => {
      let items = [];
      let userDoc = null;
      let vendorDoc = null;
      try {
        items = await query(
          "SELECT oi.*, p.name, p.description, p.company, p.brand, pc.code, pc.variantName FROM order_items oi LEFT JOIN products p ON p.id = oi.product LEFT JOIN product_codes pc ON pc.id = oi.productCode WHERE oi.order_id = ? AND oi.user_id = ?",
          [order.id, userId],
        );
        const userRows = await query(
          "SELECT id, name, email FROM users WHERE id = ? LIMIT 1",
          [order.user],
        );
        userDoc = userRows[0] || null;
        if (order.vendor) {
          const vendorRows = await query(
            "SELECT id, name FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
            [order.vendor, userId],
          );
          vendorDoc = vendorRows[0] || null;
        }
      } catch (err) {
        return {
          error: err,
        };
      }

      const products = items.map((item) => ({
        product: item.product
          ? {
              id: item.product,
              name: item.name,
              description: item.description,
              company: item.company,
              brand: item.brand,
            }
          : null,
        productCode: item.productCode
          ? {
              id: item.productCode,
              code: item.code,
              variantName: item.variantName,
            }
          : null,
        quantity: item.quantity,
        price: item.price,
      }));

      return {
        ...order,
        Product: products[0] || null,
        products,
        user: userDoc,
        vendor: vendorDoc,
      };
    }),
  );

  return hydrated;
};

const getOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    let orders;
    try {
      orders = await query("SELECT * FROM orders WHERE user_id = ?", [userId]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const hydrated = await hydrateOrderRows(orders, userId);
    if (hydrated.some((o) => o.error)) {
      const err = hydrated.find((o) => o.error)?.error;
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json(hydrated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error getting orders", error: error.message });
  }
};

const updatestatusOrder = async (req, res) => {
  try {
    const { OrderId } = req.params;
    const updates = req.body;
    const userId = req.user.userId;
    let existingOrder;
    try {
      const rows = await query(
        "SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1",
        [OrderId, userId],
      );
      existingOrder = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = existingOrder.status;
    const nextStatus = updates.status || previousStatus;

    try {
      await query(
        "UPDATE orders SET status = ? WHERE id = ? AND user_id = ?",
        [nextStatus, OrderId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const orderRows = await query(
      "SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1",
      [OrderId, userId],
    );
    const updatedOrder = orderRows[0];

    const items = await query(
      "SELECT product, productCode, quantity, price FROM order_items WHERE order_id = ? AND user_id = ?",
      [OrderId, userId],
    );
    const orderPayload = {
      ...updatedOrder,
      products: items.map((item) => ({
        product: item.product,
        productCode: item.productCode,
        quantity: item.quantity,
        price: item.price,
      })),
      Product: items[0] || null,
    };

    if (
      nextStatus === "delivered" &&
      (previousStatus !== "delivered" || !existingOrder.stockInRecorded)
    ) {
      await createOrderDeliveredStockIn(orderPayload, userId);
      await query(
        "UPDATE orders SET stockInRecorded = ? WHERE id = ? AND user_id = ?",
        [true, OrderId, userId],
      );
    }

    if (previousStatus === "delivered" && nextStatus !== "delivered") {
      await rollbackOrderDeliveredStockIn(OrderId, userId);
      await query(
        "UPDATE orders SET stockInRecorded = ? WHERE id = ? AND user_id = ?",
        [false, OrderId, userId],
      );
    }

    res.status(200).json({
      message: "Order successfully updated",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating order",
      error: error.message,
    });
  }
};

const searchOrder = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    const userId = req.user.userId;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    let orders;
    try {
      orders = await query(
        "SELECT o.* FROM orders o LEFT JOIN users u ON u.id = o.user WHERE o.user_id = ? AND (o.status LIKE ? OR u.name LIKE ?)",
        [userId, `%${searchQuery}%`, `%${searchQuery}%`],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const hydrated = await hydrateOrderRows(orders, userId);
    if (hydrated.some((o) => o.error)) {
      const err = hydrated.find((o) => o.error)?.error;
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.json(hydrated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in search Orders", error: error.message });
  }
};

const getOrderStatistics = async (req, res) => {
  try {
    const userId = req.user.userId;
    let rows;
    try {
      rows = await query(
        "SELECT status, COUNT(*) as count FROM orders WHERE user_id = ? GROUP BY status",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const orderStats = rows.map((row) => ({
      _id: row.status,
      count: row.count,
    }));

    res.status(200).json(orderStats);
  } catch (error) {}
};

const getOrdersByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = req.user.userId;

    let vendor;
    try {
      const rows = await query(
        "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
        [vendorId, userId],
      );
      vendor = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    let orders;
    try {
      orders = await query(
        "SELECT * FROM orders WHERE user_id = ? AND vendor = ? ORDER BY createdAt DESC",
        [userId, vendorId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const hydrated = await hydrateOrderRows(orders, userId);

    const summary = hydrated.reduce(
      (acc, order) => {
        acc.total += Number(order.totalAmount || 0);
        acc.count += 1;
        return acc;
      },
      { total: 0, paid: 0, remaining: 0, count: 0 },
    );

    let payments;
    try {
      payments = await query(
        "SELECT amount, invoice FROM payments WHERE user_id = ? AND partyType = ? AND type = ? AND vendor = ?",
        [userId, "vendor", "paid", vendorId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    let paidAmount = 0;
    const paidInvoiceIds = new Set();
    payments.forEach((payment) => {
      paidAmount += Number(payment.amount) || 0;
      if (payment.invoice) {
        paidInvoiceIds.add(String(payment.invoice));
      }
    });

    let invoices;
    try {
      invoices = await query(
        "SELECT id, totalAmount, status FROM invoices WHERE invoiceType = ? AND user_id = ? AND vendor = ?",
        ["purchase", userId, vendorId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    invoices.forEach((invoice) => {
      if (invoice.status === "paid" && !paidInvoiceIds.has(String(invoice.id))) {
        paidAmount += Number(invoice.totalAmount) || 0;
      }
    });

    summary.paid = paidAmount;
    summary.remaining = Math.max(summary.total - summary.paid, 0);

    return res.status(200).json({
      success: true,
      vendor,
      orders: hydrated,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching vendor purchase history",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  searchOrder,
  updatestatusOrder,
  getOrder,
  Removeorder,
  getOrderStatistics,
  getOrdersByVendor,
};
