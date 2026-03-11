const Product = require("../models/Productmodel");
const StockTransaction = require("../models/StockTranscationmodel");
const Vendor = require("../models/Suppliermodel");

// Create a stock transaction
module.exports.createStockTransaction = async (req, res) => {
  try {
    const { product, type, quantity, supplier, vendor } = req.body;
    const userId = req.user.userId;

    if (!product || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product, type, and quantity are required.",
      });
    }

    const productToUpdate = await Product.findOne({
      _id: product,
      user_id: userId,
    });

    if (!productToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (type === "Stock-out" && productToUpdate.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for Stock-out",
      });
    }

    // ✅ Update product quantity
    if (type === "Stock-in") {
      productToUpdate.quantity += Number(quantity);
    } else {
      productToUpdate.quantity -= Number(quantity);
    }

    await productToUpdate.save();

    const vendorId = vendor || supplier || null;
    if (vendorId) {
      const vendorRecord = await Vendor.findOne({
        _id: vendorId,
        user_id: userId,
      });
      if (!vendorRecord) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
    }

    // ✅ Save transaction only after validation
    const newTransaction = new StockTransaction({
      user_id: userId,
      product,
      type,
      quantity,
      vendor: vendorId,
      supplier,
    });

    await newTransaction.save();

    const populatedTransaction = await StockTransaction.findOne({
      _id: newTransaction._id,
      user_id: userId,
    })
      .populate("product")
      .populate("vendor")
      .populate("supplier");

    res.status(201).json({
      success: true,
      transaction: populatedTransaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating stock transaction",
      error: error.message,
    });
  }
};

// Get all stock transactions
module.exports.getAllStockTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactions = await StockTransaction.find({ user_id: userId })
      .populate("product")
      .populate("vendor")
      .populate("supplier")
      .sort({ transactionDate: -1 });

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Get All Stock Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stock transactions",
      error: error.message,
    });
  }
};

// Get transactions by product
module.exports.getStockTransactionsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;
    const transactions = await StockTransaction.find({
      product: productId,
      user_id: userId,
    })
      .populate("product")
      .populate("vendor")
      .populate("supplier")
      .sort({ transactionDate: -1 });

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this product.",
      });
    }

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Get Stock Transactions By Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions by product",
      error: error.message,
    });
  }
};

// Get transactions by supplier
module.exports.getStockTransactionsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const userId = req.user.userId;
    const transactions = await StockTransaction.find({
      user_id: userId,
      $or: [{ supplier: supplierId }, { vendor: supplierId }],
    })
      .populate("product")
      .populate("vendor")
      .populate("supplier")
      .sort({ transactionDate: -1 });

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this supplier.",
      });
    }

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Get Stock Transactions By Supplier Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions by supplier",
      error: error.message,
    });
  }
};

// Search stock transactions
module.exports.searchStocks = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const transactions = await StockTransaction.find({ user_id: userId })
      .populate("product")
      .populate("vendor")
      .populate("supplier");

    const filtered = transactions.filter((t) => {
      const typeMatch = t.type?.toLowerCase().includes(query.toLowerCase());
      const productMatch = t.product?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const supplierMatch = t.supplier?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const vendorMatch = t.vendor?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      return typeMatch || productMatch || supplierMatch || vendorMatch;
    });

    res.status(200).json({ success: true, transactions: filtered });
  } catch (error) {
    console.error("Search Stock Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching stock transactions",
      error: error.message,
    });
  }
};
