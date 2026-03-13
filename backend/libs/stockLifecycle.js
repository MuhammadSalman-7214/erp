const ProductModel = require("../models/Productmodel");
const ProductCode = require("../models/ProductCodemodel");
const StockTransaction = require("../models/StockTranscationmodel");

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

    const existing = await StockTransaction.findOne({
      sourceModel: ORDER_SOURCE,
      sourceId: order._id,
      type: "Stock-in",
      product: item.product,
      productCode: item.productCode,
      user_id: userId,
    });

    if (existing) continue;

    await StockTransaction.create({
      product: item.product,
      productCode: item.productCode,
      type: "Stock-in",
      quantity: item.quantity,
      vendor: order.vendor || order.supplier || null,
      supplier: order.supplier || null,
      sourceModel: ORDER_SOURCE,
      sourceId: order._id,
      user_id: userId,
    });

    await ProductCode.findOneAndUpdate(
      { _id: item.productCode, user_id: userId },
      {
        $inc: { quantity: Number(item.quantity) },
      },
    );
  }
};

const rollbackOrderDeliveredStockIn = async (orderId, userId) => {
  const transactions = await StockTransaction.find({
    sourceModel: ORDER_SOURCE,
    sourceId: orderId,
    type: "Stock-in",
    user_id: userId,
  });

  for (const tx of transactions) {
    await ProductCode.findOneAndUpdate(
      { _id: tx.productCode, user_id: userId },
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
    const productCode = await ProductCode.findOne({
      _id: item.productCode,
      user_id: userId,
    }).select("quantity");
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
    const existing = await StockTransaction.findOne({
      sourceModel: SALE_SOURCE,
      sourceId: sale._id,
      type: "Stock-out",
      product: item.product,
      productCode: item.productCode,
      user_id: userId,
    });

    if (existing) continue;

    const updatedProductCode = await ProductCode.findOneAndUpdate(
      {
        _id: item.productCode,
        user_id: userId,
        quantity: { $gte: Number(item.quantity) },
      },
      { $inc: { quantity: -Number(item.quantity) } },
      { new: true },
    );

    if (!updatedProductCode) {
      const currentProductCode = await ProductCode.findOne({
        _id: item.productCode,
        user_id: userId,
      }).select("code quantity");
      const available = Number(currentProductCode?.quantity || 0);
      const currentProduct = await ProductModel.findOne({
        _id: item.product,
        user_id: userId,
      }).select("name");
      const error = new Error(
        `Only ${available} items available for ${currentProduct?.name || "product"} (${currentProductCode?.code || "code"}). You requested ${item.quantity}.`,
      );
      error.statusCode = 400;
      error.available = available;
      error.requested = Number(item.quantity);
      throw error;
    }

    await StockTransaction.create({
      product: item.product,
      productCode: item.productCode,
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
    await ProductCode.findOneAndUpdate(
      { _id: tx.productCode, user_id: userId },
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
