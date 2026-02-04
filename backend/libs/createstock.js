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

const createStockInTransaction = async (order) => {
  // 1️⃣ Create stock transaction
  await StockTransaction.create({
    product: order.Product.product,
    type: "Stock-in",
    quantity: order.Product.quantity,
    supplier: order.supplier || null,
    branchId: order.branchId,
    countryId: order.countryId,
    currency: order.currency,
    exchangeRateUsed: order.exchangeRateUsed,
    priceUSD: 0,
  });

  // 2️⃣ Increase product stock
  await ProductModel.findByIdAndUpdate(
    order.Product.product,
    { $inc: { quantity: order.Product.quantity } },
    { new: true },
  );
};
const removeStockTransaction = async (order) => {
  // 1️⃣ Find the stock-in transaction for this order
  const stock = await StockTransaction.findOne({
    product: order.Product.product,
    type: "Stock-in",
    supplier: order.supplier || null,
  });

  if (!stock) return;

  // 2️⃣ Decrease product quantity
  await ProductModel.findByIdAndUpdate(
    order.Product.product,
    { $inc: { quantity: -stock.quantity } },
    { new: true },
  );

  // 3️⃣ Remove the stock transaction
  await StockTransaction.findByIdAndDelete(stock._id);
};
module.exports = { createStockInTransaction, removeStockTransaction };
