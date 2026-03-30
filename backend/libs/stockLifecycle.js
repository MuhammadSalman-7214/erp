const query = require("./dbQuery.js");

const ORDER_SOURCE = "order";
const SALE_SOURCE = "sale";

const createOrderDeliveredStockIn = async (order, userId) => {
  const items = Array.isArray(order?.products) && order.products.length
    ? order.products
    : order?.Product
      ? [order.Product]
      : [];

  if (!items.length) return;

  for (const item of items) {
    if (!item?.product || !item?.productCode || !item?.quantity) continue;

    const existing = await query(
      "SELECT id FROM stock_transactions WHERE sourceModel = ? AND sourceId = ? AND type = ? AND product = ? AND productCode = ? AND user_id = ? LIMIT 1",
      [
        ORDER_SOURCE,
        order.id,
        "Stock-in",
        item.product,
        item.productCode,
        userId,
      ],
    );

    if (existing.length) continue;

    await query(
      "INSERT INTO stock_transactions (product, productCode, type, quantity, vendor, supplier, sourceModel, sourceId, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        item.product,
        item.productCode,
        "Stock-in",
        item.quantity,
        order.vendor || order.supplier || null,
        order.supplier || null,
        ORDER_SOURCE,
        order.id,
        userId,
      ],
    );

    await query(
      "UPDATE product_codes SET quantity = quantity + ? WHERE id = ? AND user_id = ?",
      [Number(item.quantity), item.productCode, userId],
    );
  }
};

const rollbackOrderDeliveredStockIn = async (orderId, userId) => {
  const transactions = await query(
    "SELECT * FROM stock_transactions WHERE sourceModel = ? AND sourceId = ? AND type = ? AND user_id = ?",
    [ORDER_SOURCE, orderId, "Stock-in", userId],
  );

  for (const tx of transactions) {
    await query(
      "UPDATE product_codes SET quantity = quantity - ? WHERE id = ? AND user_id = ?",
      [Number(tx.quantity), tx.productCode, userId],
    );
  }

  if (transactions.length) {
    await query(
      "DELETE FROM stock_transactions WHERE sourceModel = ? AND sourceId = ? AND type = ? AND user_id = ?",
      [ORDER_SOURCE, orderId, "Stock-in", userId],
    );
  }
};

const validateSaleStockAvailability = async (
  saleProducts,
  oldCompletedProducts = [],
  userId,
) => {
  for (const item of saleProducts) {
    const productCodeRows = await query(
      "SELECT quantity FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
      [item.productCode, userId],
    );
    const productCode = productCodeRows[0];
    if (!productCode) {
      const error = new Error(`Product code ${item.productCode} not found`);
      error.statusCode = 404;
      throw error;
    }

    const previouslyReserved = oldCompletedProducts
      .filter(
        (oldItem) =>
          String(oldItem.productCode) === String(item.productCode),
      )
      .reduce((sum, oldItem) => sum + Number(oldItem.quantity || 0), 0);

    const available = Number(productCode.quantity || 0) + previouslyReserved;
    if (available < Number(item.quantity)) {
      const error = new Error(
        `Only ${available} items available for this product code. You requested ${item.quantity}.`,
      );
      error.statusCode = 400;
      error.available = available;
      error.requested = Number(item.quantity);
      throw error;
    }
  }
};

const createSaleCompletedStockOut = async (sale, userId) => {
  for (const item of sale.products || []) {
    const existing = await query(
      "SELECT id FROM stock_transactions WHERE sourceModel = ? AND sourceId = ? AND type = ? AND product = ? AND productCode = ? AND user_id = ? LIMIT 1",
      [
        SALE_SOURCE,
        sale.id,
        "Stock-out",
        item.product,
        item.productCode,
        userId,
      ],
    );

    if (existing.length) continue;

    const updatedProductCode = await query(
      "UPDATE product_codes SET quantity = quantity - ? WHERE id = ? AND user_id = ? AND quantity >= ?",
      [Number(item.quantity), item.productCode, userId, Number(item.quantity)],
    );

    if (updatedProductCode.affectedRows === 0) {
      const currentProductCodeRows = await query(
        "SELECT code, quantity FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
        [item.productCode, userId],
      );
      const currentProductCode = currentProductCodeRows[0];
      const available = Number(currentProductCode?.quantity || 0);
      const currentProductRows = await query(
        "SELECT name FROM products WHERE id = ? AND user_id = ? LIMIT 1",
        [item.product, userId],
      );
      const currentProduct = currentProductRows[0];
      const error = new Error(
        `Only ${available} items available for ${currentProduct?.name || "product"} (${currentProductCode?.code || "code"}). You requested ${item.quantity}.`,
      );
      error.statusCode = 400;
      error.available = available;
      error.requested = Number(item.quantity);
      throw error;
    }

    await query(
      "INSERT INTO stock_transactions (product, productCode, type, quantity, sourceModel, sourceId, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        item.product,
        item.productCode,
        "Stock-out",
        Number(item.quantity),
        SALE_SOURCE,
        sale.id,
        userId,
      ],
    );
  }
};

const rollbackSaleCompletedStockOut = async (saleId, userId) => {
  const transactions = await query(
    "SELECT * FROM stock_transactions WHERE sourceModel = ? AND sourceId = ? AND type = ? AND user_id = ?",
    [SALE_SOURCE, saleId, "Stock-out", userId],
  );

  for (const tx of transactions) {
    await query(
      "UPDATE product_codes SET quantity = quantity + ? WHERE id = ? AND user_id = ?",
      [Number(tx.quantity), tx.productCode, userId],
    );
  }

  if (transactions.length) {
    await query(
      "DELETE FROM stock_transactions WHERE sourceModel = ? AND sourceId = ? AND type = ? AND user_id = ?",
      [SALE_SOURCE, saleId, "Stock-out", userId],
    );
  }
};

module.exports = {
  createOrderDeliveredStockIn,
  rollbackOrderDeliveredStockIn,
  validateSaleStockAvailability,
  createSaleCompletedStockOut,
  rollbackSaleCompletedStockOut,
};
