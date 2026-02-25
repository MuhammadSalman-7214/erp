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
  const unitPrice = Number(
    order?.Product?.purchasePrice ?? order?.Product?.unitPrice ?? 0,
  );
  const totalPrice =
    Number(order?.Product?.price) ||
    Number(order?.totalAmount) ||
    unitPrice * Number(order?.Product?.quantity || 0);
  // 1️⃣ Create stock transaction
  await StockTransaction.create({
    product: order.Product.product,
    type: "Stock-in",
    quantity: order.Product.quantity,
    supplier: order.supplier || null,
    unitPrice,
    totalPrice,
    referenceType: "order",
    referenceId: order._id,
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
  // 1️⃣ Find stock-in transaction(s) for this order
  const stocks = await StockTransaction.find({
    type: "Stock-in",
    referenceType: "order",
    referenceId: order._id,
  });
  if (!stocks.length) {
    const legacyStock = await StockTransaction.findOne({
      product: order.Product.product,
      type: "Stock-in",
      supplier: order.supplier || null,
    });
    if (legacyStock) {
      stocks.push(legacyStock);
    }
  }

  if (!stocks.length) return;

  for (const stock of stocks) {
    // 2️⃣ Decrease product quantity
    await ProductModel.findByIdAndUpdate(
      stock.product,
      { $inc: { quantity: -stock.quantity } },
      { new: true },
    );
    // 3️⃣ Remove the stock transaction
    await StockTransaction.findByIdAndDelete(stock._id);
  }
};

const createStockOutForSale = async (sale) => {
  const products = Array.isArray(sale?.products) ? sale.products : [];
  for (const item of products) {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.salePrice ?? item.price ?? 0);
    const product = await ProductModel.findById(item.product);
    if (!product) {
      const err = new Error(`Product ${item.product} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (product.quantity < quantity) {
      const err = new Error(
        `Only ${product.quantity} items available for ${product.name}. You requested ${quantity}.`,
      );
      err.statusCode = 400;
      err.available = product.quantity;
      err.requested = quantity;
      throw err;
    }
    product.quantity -= quantity;
    await product.save();

    await StockTransaction.create({
      product: item.product,
      type: "Stock-out",
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      referenceType: "sale",
      referenceId: sale._id,
      branchId: sale.branchId,
      countryId: sale.countryId,
      currency: sale.currency,
      exchangeRateUsed: sale.exchangeRateUsed,
      priceUSD: 0,
    });
  }
};

const removeStockOutForSale = async (sale) => {
  const stockOutRows = await StockTransaction.find({
    referenceType: "sale",
    referenceId: sale._id,
    type: "Stock-out",
  });

  for (const row of stockOutRows) {
    await ProductModel.findByIdAndUpdate(
      row.product,
      { $inc: { quantity: row.quantity } },
      { new: true },
    );
    await StockTransaction.findByIdAndDelete(row._id);
  }
};

module.exports = {
  createStockInTransaction,
  removeStockTransaction,
  createStockOutForSale,
  removeStockOutForSale,
};
