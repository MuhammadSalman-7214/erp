const Order = require("../models/Ordermodel");
const logActivity = require("../libs/logger");
const ProductModel = require("../models/Productmodel");
const Invoice = require("../models/Invoicemodel");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const {
  createOrderDeliveredStockIn,
  rollbackOrderDeliveredStockIn,
} = require("../libs/stockLifecycle");

const createOrder = async (req, res) => {
  try {
    const { user, Description, Product, status, supplier, vendor } = req.body;

    if (!user) return res.status(400).json({ message: "User ID is required" });
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

    const vendorId = vendor || supplier || null;

    const newOrder = new Order({
      user,
      Description,
      Product,
      vendor: vendorId,
      supplier,
      totalAmount: totalOrderAmount,
      status,
    });

    await newOrder.save();

    if (newOrder.status === "delivered") {
      await createOrderDeliveredStockIn(newOrder);
      newOrder.stockInRecorded = true;
      await newOrder.save();
    }

    const invoiceNumber = await getNextInvoiceNumber("PI");
    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: "purchase",
      vendor: vendorId,
      items: [
        {
          name: productRecord.name,
          description: productRecord.Desciption || "-",
          quantity,
          unitPrice: price,
          total: totalOrderAmount,
        },
      ],
      taxRate: 0,
      discount: 0,
      currency: "USD",
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

    const Deletedorder = await Order.findById(OrdertId);

    if (!Deletedorder) {
      return res.status(404).json({ message: "Order is not found!" });
    }

    if (Deletedorder.status === "delivered" || Deletedorder.stockInRecorded) {
      await rollbackOrderDeliveredStockIn(Deletedorder._id);
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

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting Order", error: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("Product.product", "name")
      .populate("user", "name email")
      .populate("vendor", "name");
    // .populate("supplier", "name");

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
    const existingOrder = await Order.findById(OrderId);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = existingOrder.status;
    const nextStatus = updates.status || previousStatus;

    const updatedOrder = await Order.findByIdAndUpdate(OrderId, updates, {
      new: true,
    });

    if (
      nextStatus === "delivered" &&
      (previousStatus !== "delivered" || !existingOrder.stockInRecorded)
    ) {
      await createOrderDeliveredStockIn(updatedOrder);
      await Order.findByIdAndUpdate(OrderId, { stockInRecorded: true });
    }

    if (previousStatus === "delivered" && nextStatus !== "delivered") {
      await rollbackOrderDeliveredStockIn(OrderId);
      await Order.findByIdAndUpdate(OrderId, { stockInRecorded: false });
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

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const searchdata = await Order.find({
      $or: [
        { Desciption: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
        { "user.name": { $regex: query, $options: "i" } },
      ],
    });

    res.json(searchdata);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in search Orders", error: error.message });
  }
};

const getOrderStatistics = async (req, res) => {
  try {
    const orderStats = await Order.aggregate([
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
