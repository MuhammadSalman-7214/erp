const query = require("./dbQuery.js");

const createStockInTransaction = async (order, userId) => {
  // Create stock transaction
  await query(
    "INSERT INTO stock_transactions (product, type, quantity, vendor, supplier, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      order.Product.product,
      "Stock-in",
      order.Product.quantity,
      order.vendor || order.supplier || null,
      order.supplier || null,
      userId,
    ],
  );

  // Increase product stock
  await query(
    "UPDATE products SET quantity = quantity + ? WHERE id = ? AND user_id = ?",
    [order.Product.quantity, order.Product.product, userId],
  );
};

const removeStockTransaction = async (order, userId) => {
  // Find the stock-in transaction for this order
  const stockRows = await query(
    "SELECT * FROM stock_transactions WHERE product = ? AND type = ? AND user_id = ? AND (vendor = ? OR supplier = ?) LIMIT 1",
    [
      order.Product.product,
      "Stock-in",
      userId,
      order.vendor || null,
      order.supplier || null,
    ],
  );
  const stock = stockRows[0];

  if (!stock) return;

  // Decrease product quantity
  await query(
    "UPDATE products SET quantity = quantity - ? WHERE id = ? AND user_id = ?",
    [stock.quantity, order.Product.product, userId],
  );

  // Remove the stock transaction
  await query("DELETE FROM stock_transactions WHERE id = ? AND user_id = ?", [
    stock.id,
    userId,
  ]);
};
module.exports = { createStockInTransaction, removeStockTransaction };
