const Product = require("../models/Productmodel");
const StockTransaction = require("../models/StockTranscationmodel");
const { getCountryCurrencySnapshot } = require("../libs/currency.js");
const { assertNotLocked } = require("../libs/periodLock.js");

// Create a stock transaction
module.exports.createStockTransaction = async (req, res) => {
  try {
    const { product, type, quantity, supplier } = req.body;
    const { role, countryId, branchId } = req.user || {};

    if (!["branchadmin", "staff"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only branch staff can create stock transactions.",
      });
    }

    if (!product || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product, type, and quantity are required.",
      });
    }
    if (!branchId || !countryId) {
      return res.status(400).json({
        success: false,
        message: "Branch and country are required for stock transactions.",
      });
    }
    await assertNotLocked({ countryId, branchId, transactionDate: new Date() });
    const currencySnapshot = await getCountryCurrencySnapshot(countryId);
    const userCurrency = currencySnapshot.currency;
    const userCurrencyExchangeRate = currencySnapshot.exchangeRate;

    const productToUpdate = await Product.findById(product);

    if (!productToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    if (
      role === "countryadmin" &&
      productToUpdate.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this country",
      });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      productToUpdate.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch",
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

    // ✅ Save transaction only after validation
    const newTransaction = new StockTransaction({
      product,
      type,
      quantity,
      supplier,
      branchId,
      countryId,
      currency: userCurrency,
      exchangeRateUsed: userCurrencyExchangeRate,
      priceUSD: 0,
    });

    await newTransaction.save();

    const populatedTransaction = await StockTransaction.findById(
      newTransaction._id,
    )
      .populate("product")
      .populate("supplier");

    res.status(201).json({
      success: true,
      transaction: populatedTransaction,
    });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({
        success: false,
        message: error.message,
      });
    }
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
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }
    const transactions = await StockTransaction.find(query)
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
    const { role, countryId, branchId } = req.user || {};
    const query = { product: productId };
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }
    const transactions = await StockTransaction.find(query)
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
    const { role, countryId, branchId } = req.user || {};
    const query = { supplier: supplierId };
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }
    const transactions = await StockTransaction.find(query)
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
    const { role, countryId, branchId } = req.user || {};
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const scope = {};
    if (role === "countryadmin") {
      scope.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      scope.branchId = branchId;
      scope.countryId = countryId;
    }

    const transactions = await StockTransaction.find(scope)
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
