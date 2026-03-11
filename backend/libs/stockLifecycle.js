const ProductModel = require("../models/Productmodel");
const StockTransaction = require("../models/StockTranscationmodel");

const ORDER_SOURCE = "order";
const SALE_SOURCE = "sale";

const createOrderDeliveredStockIn = async (order, userId) => {
  if (!order?.Product?.product || !order?.Product?.quantity) return;

  const existing = await StockTransaction.findOne({
    sourceModel: ORDER_SOURCE,
    sourceId: order._id,
    type: "Stock-in",
    product: order.Product.product,
    user_id: userId,
  });

  if (existing) return;

  await StockTransaction.create({
    product: order.Product.product,
    type: "Stock-in",
    quantity: order.Product.quantity,
    vendor: order.vendor || order.supplier || null,
    supplier: order.supplier || null,
    sourceModel: ORDER_SOURCE,
    sourceId: order._id,
    user_id: userId,
  });

  await ProductModel.findOneAndUpdate(
    { _id: order.Product.product, user_id: userId },
    {
      $inc: { quantity: Number(order.Product.quantity) },
    },
  );
};

const rollbackOrderDeliveredStockIn = async (orderId, userId) => {
  const transactions = await StockTransaction.find({
    sourceModel: ORDER_SOURCE,
    sourceId: orderId,
    type: "Stock-in",
    user_id: userId,
  });

  for (const tx of transactions) {
    await ProductModel.findOneAndUpdate(
      { _id: tx.product, user_id: userId },
      {
      $inc: { quantity: -Number(tx.quantity) },
      },
    );
  }

  if (transactions.length) {
    await StockTransaction.deleteMany({
      sourceModel: ORDER_SOURCE,
      sourceId: orderId,
      type: "Stock-in",
      user_id: userId,
    });
  }
};

const validateSaleStockAvailability = async (
  saleProducts,
  oldCompletedProducts = [],
  userId,
) => {
  for (const item of saleProducts) {
    const product = await ProductModel.findOne({
      _id: item.product,
      user_id: userId,
    }).select("quantity");
    if (!product) {
      const error = new Error(`Product ${item.product} not found`);
      error.statusCode = 404;
      throw error;
    }

    const previouslyReserved = oldCompletedProducts
      .filter((oldItem) => String(oldItem.product) === String(item.product))
      .reduce((sum, oldItem) => sum + Number(oldItem.quantity || 0), 0);

    const available = Number(product.quantity || 0) + previouslyReserved;
    if (available < Number(item.quantity)) {
      const error = new Error(
        `Only ${available} items available for this product. You requested ${item.quantity}.`,
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
    const existing = await StockTransaction.findOne({
      sourceModel: SALE_SOURCE,
      sourceId: sale._id,
      type: "Stock-out",
      product: item.product,
      user_id: userId,
    });

    if (existing) continue;

    const updatedProduct = await ProductModel.findOneAndUpdate(
      {
        _id: item.product,
        user_id: userId,
        quantity: { $gte: Number(item.quantity) },
      },
      { $inc: { quantity: -Number(item.quantity) } },
      { new: true },
    );

    if (!updatedProduct) {
      const currentProduct = await ProductModel.findOne({
        _id: item.product,
        user_id: userId,
      }).select(
        "name quantity",
      );
      const available = Number(currentProduct?.quantity || 0);
      const error = new Error(
        `Only ${available} items available for ${currentProduct?.name || "product"}. You requested ${item.quantity}.`,
      );
      error.statusCode = 400;
      error.available = available;
      error.requested = Number(item.quantity);
      throw error;
    }

    await StockTransaction.create({
      product: item.product,
      type: "Stock-out",
      quantity: Number(item.quantity),
      sourceModel: SALE_SOURCE,
      sourceId: sale._id,
      user_id: userId,
    });
  }
};

const rollbackSaleCompletedStockOut = async (saleId, userId) => {
  const transactions = await StockTransaction.find({
    sourceModel: SALE_SOURCE,
    sourceId: saleId,
    type: "Stock-out",
    user_id: userId,
  });

  for (const tx of transactions) {
    await ProductModel.findOneAndUpdate(
      { _id: tx.product, user_id: userId },
      {
      $inc: { quantity: Number(tx.quantity) },
      },
    );
  }

  if (transactions.length) {
    await StockTransaction.deleteMany({
      sourceModel: SALE_SOURCE,
      sourceId: saleId,
      type: "Stock-out",
      user_id: userId,
    });
  }
};

module.exports = {
  createOrderDeliveredStockIn,
  rollbackOrderDeliveredStockIn,
  validateSaleStockAvailability,
  createSaleCompletedStockOut,
  rollbackSaleCompletedStockOut,
};
