const Product = require("../models/Productmodel");
const StockTransaction = require("../models/StockTranscationmodel");

// Create a stock transaction
module.exports.createStockTransaction = async (req, res) => {
  try {
    const { product, type, quantity, supplier } = req.body;

    if (!product || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product, type, and quantity are required.",
      });
    }

    const newTransaction = new StockTransaction({
      product,
      type,
      quantity,
      supplier,
    });

    await newTransaction.save();
    const productToUpdate = await Product.findById(product);

    if (!productToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    if (type === "Stock-in") {
      productToUpdate.quantity += Number(quantity);
    } else if (type === "Stock-out") {
      if (productToUpdate.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock for Stock-out",
        });
      }
      productToUpdate.quantity -= Number(quantity);
    }

    await productToUpdate.save();
    // Populate product and supplier for response
    const populatedTransaction = await StockTransaction.findById(
      newTransaction._id,
    )
      .populate("product")
      .populate("supplier");

    res.status(201).json({ success: true, transaction: populatedTransaction });
  } catch (error) {
    console.error("Create Stock Transaction Error:", error);
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
    const transactions = await StockTransaction.find()
      .populate("product")
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
    const transactions = await StockTransaction.find({ product: productId })
      .populate("product")
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
    const transactions = await StockTransaction.find({ supplier: supplierId })
      .populate("product")
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
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const transactions = await StockTransaction.find()
      .populate("product")
      .populate("supplier");

    const filtered = transactions.filter((t) => {
      const typeMatch = t.type?.toLowerCase().includes(query.toLowerCase());
      const productMatch = t.product?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const supplierMatch = t.supplier?.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      return typeMatch || productMatch || supplierMatch;
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
