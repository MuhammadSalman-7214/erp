const ProductModel = require("../models/Productmodel");
const StockTransaction = require("../models/StockTranscationmodel");

const ORDER_SOURCE = "order";
const SALE_SOURCE = "sale";

const createOrderDeliveredStockIn = async (order) => {
  if (!order?.Product?.product || !order?.Product?.quantity) return;

  const existing = await StockTransaction.findOne({
    sourceModel: ORDER_SOURCE,
    sourceId: order._id,
    type: "Stock-in",
    product: order.Product.product,
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
  });

  await ProductModel.findByIdAndUpdate(order.Product.product, {
    $inc: { quantity: Number(order.Product.quantity) },
  });
};

const rollbackOrderDeliveredStockIn = async (orderId) => {
  const transactions = await StockTransaction.find({
    sourceModel: ORDER_SOURCE,
    sourceId: orderId,
    type: "Stock-in",
  });

  for (const tx of transactions) {
    await ProductModel.findByIdAndUpdate(tx.product, {
      $inc: { quantity: -Number(tx.quantity) },
    });
  }

  if (transactions.length) {
    await StockTransaction.deleteMany({
      sourceModel: ORDER_SOURCE,
      sourceId: orderId,
      type: "Stock-in",
    });
  }
};

const validateSaleStockAvailability = async (
  saleProducts,
  oldCompletedProducts = [],
) => {
  for (const item of saleProducts) {
    const product = await ProductModel.findById(item.product).select("quantity");
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

const createSaleCompletedStockOut = async (sale) => {
  for (const item of sale.products || []) {
    const existing = await StockTransaction.findOne({
      sourceModel: SALE_SOURCE,
      sourceId: sale._id,
      type: "Stock-out",
      product: item.product,
    });

    if (existing) continue;

    const updatedProduct = await ProductModel.findOneAndUpdate(
      {
        _id: item.product,
        quantity: { $gte: Number(item.quantity) },
      },
      { $inc: { quantity: -Number(item.quantity) } },
      { new: true },
    );

    if (!updatedProduct) {
      const currentProduct = await ProductModel.findById(item.product).select(
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
    });
  }
};

const rollbackSaleCompletedStockOut = async (saleId) => {
  const transactions = await StockTransaction.find({
    sourceModel: SALE_SOURCE,
    sourceId: saleId,
    type: "Stock-out",
  });

  for (const tx of transactions) {
    await ProductModel.findByIdAndUpdate(tx.product, {
      $inc: { quantity: Number(tx.quantity) },
    });
  }

  if (transactions.length) {
    await StockTransaction.deleteMany({
      sourceModel: SALE_SOURCE,
      sourceId: saleId,
      type: "Stock-out",
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
