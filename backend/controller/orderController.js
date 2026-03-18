const Order = require("../models/Ordermodel");
const logActivity = require("../libs/logger");
const ProductModel = require("../models/Productmodel");
const ProductCode = require("../models/ProductCodemodel");
const Vendor = require("../models/Suppliermodel");
const Invoice = require("../models/Invoicemodel");
const Payment = require("../models/Paymentmodel");
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

    const orderItems = incomingProducts?.length
      ? incomingProducts
      : [Product];

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

      const productCodeRecord = await ProductCode.findOne({
        _id: productCode,
        user_id: userId,
      });
      if (!productCodeRecord) {
        return res.status(404).json({ message: "Product code not found" });
      }

      const productRecord = await ProductModel.findOne({
        _id: productCodeRecord.product,
        user_id: userId,
      });
      if (!productRecord) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product && String(product) !== String(productRecord._id)) {
        return res
          .status(400)
          .json({ message: "Product does not match selected product code" });
      }

      const resolvedUnitPrice =
        price !== undefined && price !== null
          ? Number(price)
          : Number(
              productRecord.purchasePrice ??
                productRecord.pricing?.currentPurchasePrice ??
                productCodeRecord.purchasePrice ??
                0,
            );

      if (Number.isNaN(resolvedUnitPrice)) {
        return res.status(400).json({ message: "Price is required" });
      }

      totalOrderAmount += resolvedUnitPrice * Number(quantity);
      resolvedItems.push({
        product: productRecord._id,
        productCode: productCodeRecord._id,
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

    const vendorRecord = await Vendor.findOne({
      _id: vendorId,
      user_id: userId,
    });
    if (!vendorRecord) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const firstItem = resolvedItems[0];
    const newOrder = new Order({
      user_id: userId,
      user: userId,
      Product: firstItem
        ? {
            product: firstItem.product,
            productCode: firstItem.productCode,
            price: firstItem.price,
            quantity: firstItem.quantity,
          }
        : undefined,
      products: resolvedItems.map((item) => ({
        product: item.product,
        productCode: item.productCode,
        price: item.price,
        quantity: item.quantity,
      })),
      vendor: vendorId,
      supplier,
      totalAmount: totalOrderAmount,
      status,
    });

    await newOrder.save();

    if (newOrder.status === "delivered") {
      await createOrderDeliveredStockIn(newOrder, userId);
      newOrder.stockInRecorded = true;
      await newOrder.save();
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

    const invoice = await Invoice.create({
      user_id: userId,
      invoiceNumber,
      invoiceType: "purchase",
      vendor: vendorId,
      items: invoiceItems,
      taxRate: 0,
      discount: 0,
      currency: "Rs",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: "bank_transfer",
      status: "sent",
      subTotal: totalOrderAmount,
      taxAmount: 0,
      totalAmount: totalOrderAmount,
    });

    newOrder.invoice = invoice._id;
    await newOrder.save();
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: newOrder,
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

    const Deletedorder = await Order.findOne({
      _id: OrdertId,
      user_id: userId,
    });

    if (!Deletedorder) {
      return res.status(404).json({ message: "Order is not found!" });
    }

    if (Deletedorder.status === "delivered" || Deletedorder.stockInRecorded) {
      await rollbackOrderDeliveredStockIn(Deletedorder._id, userId);
    }

    await Order.findOneAndDelete({ _id: OrdertId, user_id: userId });

    await logActivity({
      action: "Delete order",
      description: `Order was deleted.`,
      entity: "order",
      entityId: Deletedorder._id,
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

const getOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ user_id: userId })
      .populate("Product.product", "name description company brand")
      .populate("Product.productCode")
      .populate("products.product", "name description company brand")
      .populate("products.productCode")
      .populate("user", "name email")
      .populate("vendor", "name");
    // .populate("supplier", "name");

    res.status(200).json(orders);
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
    const existingOrder = await Order.findOne({
      _id: OrderId,
      user_id: userId,
    });

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = existingOrder.status;
    const nextStatus = updates.status || previousStatus;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: OrderId, user_id: userId },
      updates,
      { new: true },
    );

    if (
      nextStatus === "delivered" &&
      (previousStatus !== "delivered" || !existingOrder.stockInRecorded)
    ) {
      await createOrderDeliveredStockIn(updatedOrder, userId);
      await Order.findOneAndUpdate(
        { _id: OrderId, user_id: userId },
        { stockInRecorded: true },
      );
    }

    if (previousStatus === "delivered" && nextStatus !== "delivered") {
      await rollbackOrderDeliveredStockIn(OrderId, userId);
      await Order.findOneAndUpdate(
        { _id: OrderId, user_id: userId },
        { stockInRecorded: false },
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
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const searchdata = await Order.find({
      user_id: userId,
      $or: [
        { status: { $regex: query, $options: "i" } },
        { "user.name": { $regex: query, $options: "i" } },
      ],
    })
      .populate("Product.product", "name description company brand")
      .populate("Product.productCode")
      .populate("products.product", "name description company brand")
      .populate("products.productCode")
      .populate("user", "name email")
      .populate("vendor", "name");

    res.json(searchdata);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in search Orders", error: error.message });
  }
};

const getOrderStatistics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderStats = await Order.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json(orderStats);
  } catch (error) {}
};

const getOrdersByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = req.user.userId;

    const vendor = await Vendor.findOne({ _id: vendorId, user_id: userId });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const orders = await Order.find({ user_id: userId, vendor: vendorId })
      .populate("products.product")
      .populate("products.productCode")
      .sort({ createdAt: -1 });

    const summary = orders.reduce(
      (acc, order) => {
        acc.total += Number(order.totalAmount || 0);
        acc.count += 1;
        return acc;
      },
      { total: 0, paid: 0, remaining: 0, count: 0 },
    );

    const payments = await Payment.find({
      user_id: userId,
      partyType: "vendor",
      type: "paid",
      vendor: vendorId,
    }).select("amount invoice");

    let paidAmount = 0;
    const paidInvoiceIds = new Set();
    payments.forEach((payment) => {
      paidAmount += Number(payment.amount) || 0;
      if (payment.invoice) {
        paidInvoiceIds.add(String(payment.invoice));
      }
    });

    const invoices = await Invoice.find({
      invoiceType: "purchase",
      user_id: userId,
      vendor: vendorId,
    }).select("_id totalAmount status");

    invoices.forEach((invoice) => {
      if (
        invoice.status === "paid" &&
        !paidInvoiceIds.has(String(invoice._id))
      ) {
        paidAmount += Number(invoice.totalAmount) || 0;
      }
    });

    summary.paid = paidAmount;
    summary.remaining = Math.max(summary.total - summary.paid, 0);

    return res.status(200).json({
      success: true,
      vendor,
      orders,
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
