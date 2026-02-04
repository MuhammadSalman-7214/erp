const Order = require("../models/Ordermodel");
const logActivity = require("../libs/logger");
const ProductModel = require("../models/Productmodel");
const StockTransaction = require("../models/StockTranscationmodel");
const Branch = require("../models/Branchmodel.js");

const {
  createStockInTransaction,
  removeStockTransaction,
} = require("../libs/createstock");
const { invalidateReportCache } = require("./reportController.js");

const createOrder = async (req, res) => {
  try {
    const { Description, Product, status, supplier } = req.body;
    const {
      userId,
      branchId,
      countryId,
      userCurrency,
      userCurrencyExchangeRate,
    } = req.user || {};

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });
    if (!branchId || !countryId) {
      return res
        .status(400)
        .json({ message: "Branch and country are required" });
    }
    if (!userCurrency || !userCurrencyExchangeRate) {
      return res
        .status(400)
        .json({ message: "Currency configuration is missing for this user" });
    }
    if (!Description)
      return res.status(400).json({ message: "Description is required" });
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (!Product?.product)
      return res.status(400).json({ message: "Product ID is required" });
    if (!Product?.price)
      return res.status(400).json({ message: "Price is required" });
    if (!Product?.quantity)
      return res.status(400).json({ message: "Quantity is required" });

    const { product, price, quantity } = Product;

    const totalOrderAmount = price * quantity;

    const productRecord = await ProductModel.findById(product);
    if (!productRecord) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (
      productRecord.countryId?.toString() !== countryId?.toString()
      // ||productRecord.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({
        message: "Product does not belong to your branch/country",
      });
    }

    const priceUSD = Number(
      (totalOrderAmount / userCurrencyExchangeRate).toFixed(2),
    );
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    const orderCount = await Order.countDocuments({ branchId });
    const orderNumber = `ORD-${branch.branchCode}-${String(orderCount + 1).padStart(5, "0")}`;
    const newOrder = new Order({
      orderNumber,
      user: userId,
      Description,
      Product,
      supplier,
      totalAmount: totalOrderAmount,
      status,
      branchId,
      countryId,
      currency: userCurrency,
      exchangeRateUsed: userCurrencyExchangeRate,
      priceUSD,
    });

    await newOrder.save();
    if (status === "delivered") {
      await createStockInTransaction(newOrder);
    }
    invalidateReportCache();
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

    const { role, countryId, branchId } = req.user || {};
    const Deletedorder = await Order.findById(OrdertId);

    if (!Deletedorder) {
      return res.status(404).json({ message: "Order is not found!" });
    }
    if (
      role === "countryadmin" &&
      Deletedorder.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      Deletedorder.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }

    await Order.findByIdAndDelete(OrdertId);

    await logActivity({
      action: "Delete order",
      description: `Order was deleted.`,
      entity: "order",
      entityId: Deletedorder._id,
      userId: userId,
      ipAddress: ipAddress,
    });

    invalidateReportCache();
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting Order", error: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }

    const orders = await Order.find(query)
      .populate("Product.product", "name ProductModelrice ")
      .populate("user", "name email")
      .populate("supplier", "name");

    // if (!orders || orders.length === 0) {
    //   return res.status(404).json({ message: "No orders found" });
    // }

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
    const { role, countryId, branchId } = req.user || {};

    // 1️⃣ Get old order
    const oldOrder = await Order.findById(OrderId);
    if (!oldOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (
      role === "countryadmin" &&
      oldOrder.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      oldOrder.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }

    // 2️⃣ Update order
    const updatedOrder = await Order.findByIdAndUpdate(OrderId, updates, {
      new: true,
    });

    // 3️⃣ Stock logic
    if (
      oldOrder.status !== "delivered" &&
      updatedOrder.status === "delivered"
    ) {
      // Order became delivered ➜ add stock
      await createStockInTransaction(updatedOrder);
    } else if (
      oldOrder.status === "delivered" &&
      updatedOrder.status !== "delivered"
    ) {
      // Order was delivered but now changed to pending/shipped ➜ remove stock
      await removeStockTransaction(updatedOrder);
    }

    invalidateReportCache();
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
    const { role, countryId, branchId } = req.user || {};

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const searchQuery = {
      $or: [
        { Description: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
        { orderNumber: { $regex: query, $options: "i" } },
        { "user.name": { $regex: query, $options: "i" } },
      ],
    };
    if (role === "countryadmin") {
      searchQuery.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      searchQuery.branchId = branchId;
      searchQuery.countryId = countryId;
    }

    const searchdata = await Order.find(searchQuery);

    res.json(searchdata);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in search Orders", error: error.message });
  }
};

const getOrderStatistics = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};
    const match = {};
    if (role === "countryadmin") {
      match.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      match.branchId = branchId;
      match.countryId = countryId;
    }
    const orderStats = await Order.aggregate([
      { $match: match },
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

module.exports = {
  createOrder,
  searchOrder,
  updatestatusOrder,
  getOrder,
  Removeorder,
  getOrderStatistics,
};
