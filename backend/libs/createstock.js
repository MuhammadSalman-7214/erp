// const StockTransaction = require("../models/StockTranscationmodel");
// const createStockInTransaction = async (order) => {
//   await StockTransaction.create({
//     product: order.Product.product,
//     type: "Stock-in",
//     quantity: order.Product.quantity,
//     supplier: order.supplier || null,
//   });
// };

// module.exports = createStockInTransaction;

const StockTransaction = require("../models/StockTranscationmodel");
const ProductModel = require("../models/Productmodel");

const createStockInTransaction = async (order, userId) => {
  // 1️⃣ Create stock transaction
  await StockTransaction.create({
    product: order.Product.product,
    type: "Stock-in",
    quantity: order.Product.quantity,
    vendor: order.vendor || order.supplier || null,
    supplier: order.supplier || null,
    user_id: userId,
  });

  // 2️⃣ Increase product stock
  await ProductModel.findOneAndUpdate(
    { _id: order.Product.product, user_id: userId },
    { $inc: { quantity: order.Product.quantity } },
    { new: true },
  );
};
const removeStockTransaction = async (order, userId) => {
  // 1️⃣ Find the stock-in transaction for this order
  const stock = await StockTransaction.findOne({
    product: order.Product.product,
    type: "Stock-in",
    $or: [
      { vendor: order.vendor || null },
      { supplier: order.supplier || null },
    ],
    user_id: userId,
  });

  if (!stock) return;

  // 2️⃣ Decrease product quantity
  await ProductModel.findOneAndUpdate(
    { _id: order.Product.product, user_id: userId },
    { $inc: { quantity: -stock.quantity } },
    { new: true },
  );

  // 3️⃣ Remove the stock transaction
  await StockTransaction.findOneAndDelete({ _id: stock._id, user_id: userId });
};
module.exports = { createStockInTransaction, removeStockTransaction };
