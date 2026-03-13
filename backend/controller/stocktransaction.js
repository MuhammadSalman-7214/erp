const Product = require("../models/Productmodel");
const ProductCode = require("../models/ProductCodemodel");
const StockTransaction = require("../models/StockTranscationmodel");
const Vendor = require("../models/Suppliermodel");

// Create a stock transaction
module.exports.createStockTransaction = async (req, res) => {
  try {
    const { productCode, type, quantity, supplier, vendor, product } = req.body;
    const userId = req.user.userId;

    if (!productCode || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product code, type, and quantity are required.",
      });
    }

    const codeRecord = await ProductCode.findOne({
      _id: productCode,
      user_id: userId,
    });

    if (!codeRecord) {
      return res.status(404).json({
        success: false,
        message: "Product code not found",
      });
    }

    const productRecord = await Product.findOne({
      _id: codeRecord.product,
      user_id: userId,
    });

    if (!productRecord) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product && String(product) !== String(productRecord._id)) {
      return res.status(400).json({
        success: false,
        message: "Product does not match selected product code",
      });
    }

    if (type === "Stock-out" && codeRecord.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for Stock-out",
      });
    }

    // ✅ Update product code quantity
    if (type === "Stock-in") {
      codeRecord.quantity += Number(quantity);
    } else {
      codeRecord.quantity -= Number(quantity);
    }

    await codeRecord.save();

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
      product: productRecord._id,
      productCode,
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
      .populate("productCode")
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
      .populate("productCode")
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

// Get transactions by product code
module.exports.getStockTransactionsByProductCode = async (req, res) => {
  try {
    const { productCodeId } = req.params;
    const userId = req.user.userId;
    const transactions = await StockTransaction.find({
      productCode: productCodeId,
      user_id: userId,
    })
      .populate("product")
      .populate("productCode")
      .populate("vendor")
      .populate("supplier")
      .sort({ transactionDate: -1 });

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this product code.",
      });
    }

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Get Stock Transactions By Product Code Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions by product code",
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
      .populate("productCode")
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
      .populate("productCode")
      .populate("vendor")
      .populate("supplier");

    const filtered = transactions.filter((t) => {
      const typeMatch = t.type?.toLowerCase().includes(query.toLowerCase());
      const productMatch = t.product?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const codeMatch = t.productCode?.code
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const supplierMatch = t.supplier?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const vendorMatch = t.vendor?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      return typeMatch || productMatch || codeMatch || supplierMatch || vendorMatch;
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
