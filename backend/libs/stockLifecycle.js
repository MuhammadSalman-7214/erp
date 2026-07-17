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

    // Plain addition here also reconciles any negative (backordered) balance
    // left over from prior sales — e.g. -10 + 50 = 40 — with no extra logic needed.
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

    // Always deduct the full requested quantity, even past zero — a shortfall
    // becomes a negative product_codes.quantity (backorder) instead of blocking the sale.
    await query(
      "UPDATE product_codes SET quantity = quantity - ? WHERE id = ? AND user_id = ?",
      [Number(item.quantity), item.productCode, userId],
    );

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
  createSaleCompletedStockOut,
  rollbackSaleCompletedStockOut,
};
