const query = require("../libs/dbQuery.js");

const hydrateTransactions = (rows) =>
  rows.map((row) => ({
    ...row,
    product: row.product_id
      ? {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          company: row.product_company,
          brand: row.product_brand,
        }
      : null,
    productCode: row.productCode_id
      ? {
          id: row.productCode_id,
          code: row.productCode_code,
          variantName: row.productCode_variantName,
        }
      : null,
    vendor: row.vendor_id ? { id: row.vendor_id, name: row.vendor_name } : null,
    supplier: row.supplier_id
      ? { id: row.supplier_id, name: row.supplier_name }
      : null,
  }));

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

    let codeRecord;
    try {
      const rows = await query(
        "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
        [productCode, userId],
      );
      codeRecord = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!codeRecord) {
      return res.status(404).json({
        success: false,
        message: "Product code not found",
      });
    }

    let productRecord;
    try {
      const rows = await query(
        "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
        [codeRecord.product, userId],
      );
      productRecord = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!productRecord) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product && Number(product) !== Number(productRecord.id)) {
      return res.status(400).json({
        success: false,
        message: "Product does not match selected product code",
      });
    }

    if (type === "Stock-out" && Number(codeRecord.quantity) < Number(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for Stock-out",
      });
    }

    if (type === "Stock-in") {
      await query(
        "UPDATE product_codes SET quantity = quantity + ? WHERE id = ? AND user_id = ?",
        [Number(quantity), productCode, userId],
      );
    } else {
      await query(
        "UPDATE product_codes SET quantity = quantity - ? WHERE id = ? AND user_id = ?",
        [Number(quantity), productCode, userId],
      );
    }

    const vendorId = vendor || supplier || null;
    if (vendorId) {
      let vendorRecord;
      try {
        const rows = await query(
          "SELECT id FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
          [vendorId, userId],
        );
        vendorRecord = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!vendorRecord) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO stock_transactions (user_id, product, productCode, type, quantity, vendor, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          productRecord.id,
          productCode,
          type,
          quantity,
          vendorId,
          supplier || null,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    let transactionRows;
    try {
      transactionRows = await query(
        "SELECT st.*, p.id AS product_id, p.name AS product_name, p.description AS product_description, p.company AS product_company, p.brand AS product_brand, pc.id AS productCode_id, pc.code AS productCode_code, pc.variantName AS productCode_variantName, v.id AS vendor_id, v.name AS vendor_name, s.id AS supplier_id, s.name AS supplier_name FROM stock_transactions st LEFT JOIN products p ON p.id = st.product LEFT JOIN product_codes pc ON pc.id = st.productCode LEFT JOIN vendors v ON v.id = st.vendor LEFT JOIN vendors s ON s.id = st.supplier WHERE st.id = ? AND st.user_id = ? LIMIT 1",
        [insertResult.insertId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const populatedTransaction = hydrateTransactions(transactionRows)[0];

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

module.exports.getAllStockTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    let transactions;
    try {
      transactions = await query(
        "SELECT st.*, p.id AS product_id, p.name AS product_name, p.description AS product_description, p.company AS product_company, p.brand AS product_brand, pc.id AS productCode_id, pc.code AS productCode_code, pc.variantName AS productCode_variantName, v.id AS vendor_id, v.name AS vendor_name, s.id AS supplier_id, s.name AS supplier_name FROM stock_transactions st LEFT JOIN products p ON p.id = st.product LEFT JOIN product_codes pc ON pc.id = st.productCode LEFT JOIN vendors v ON v.id = st.vendor LEFT JOIN vendors s ON s.id = st.supplier WHERE st.user_id = ? ORDER BY st.transactionDate DESC",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({
      success: true,
      transactions: hydrateTransactions(transactions),
    });
  } catch (error) {
    console.error("Get All Stock Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stock transactions",
      error: error.message,
    });
  }
};

module.exports.getStockTransactionsByProductCode = async (req, res) => {
  try {
    const { productCodeId } = req.params;
    const userId = req.user.userId;
    let transactions;
    try {
      transactions = await query(
        "SELECT st.*, p.id AS product_id, p.name AS product_name, p.description AS product_description, p.company AS product_company, p.brand AS product_brand, pc.id AS productCode_id, pc.code AS productCode_code, pc.variantName AS productCode_variantName, v.id AS vendor_id, v.name AS vendor_name, s.id AS supplier_id, s.name AS supplier_name FROM stock_transactions st LEFT JOIN products p ON p.id = st.product LEFT JOIN product_codes pc ON pc.id = st.productCode LEFT JOIN vendors v ON v.id = st.vendor LEFT JOIN vendors s ON s.id = st.supplier WHERE st.productCode = ? AND st.user_id = ? ORDER BY st.transactionDate DESC",
        [productCodeId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this product code.",
      });
    }

    res.status(200).json({
      success: true,
      transactions: hydrateTransactions(transactions),
    });
  } catch (error) {
    console.error("Get Stock Transactions By Product Code Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions by product code",
      error: error.message,
    });
  }
};

module.exports.getStockTransactionsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const userId = req.user.userId;
    let transactions;
    try {
      transactions = await query(
        "SELECT st.*, p.id AS product_id, p.name AS product_name, p.description AS product_description, p.company AS product_company, p.brand AS product_brand, pc.id AS productCode_id, pc.code AS productCode_code, pc.variantName AS productCode_variantName, v.id AS vendor_id, v.name AS vendor_name, s.id AS supplier_id, s.name AS supplier_name FROM stock_transactions st LEFT JOIN products p ON p.id = st.product LEFT JOIN product_codes pc ON pc.id = st.productCode LEFT JOIN vendors v ON v.id = st.vendor LEFT JOIN vendors s ON s.id = st.supplier WHERE st.user_id = ? AND (st.supplier = ? OR st.vendor = ?) ORDER BY st.transactionDate DESC",
        [userId, supplierId, supplierId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this supplier.",
      });
    }

    res.status(200).json({
      success: true,
      transactions: hydrateTransactions(transactions),
    });
  } catch (error) {
    console.error("Get Stock Transactions By Supplier Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions by supplier",
      error: error.message,
    });
  }
};

module.exports.searchStocks = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    const userId = req.user.userId;
    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    let transactions;
    try {
      transactions = await query(
        "SELECT st.*, p.id AS product_id, p.name AS product_name, p.description AS product_description, p.company AS product_company, p.brand AS product_brand, pc.id AS productCode_id, pc.code AS productCode_code, pc.variantName AS productCode_variantName, v.id AS vendor_id, v.name AS vendor_name, s.id AS supplier_id, s.name AS supplier_name FROM stock_transactions st LEFT JOIN products p ON p.id = st.product LEFT JOIN product_codes pc ON pc.id = st.productCode LEFT JOIN vendors v ON v.id = st.vendor LEFT JOIN vendors s ON s.id = st.supplier WHERE st.user_id = ? AND (st.type LIKE ? OR p.name LIKE ? OR pc.code LIKE ? OR s.name LIKE ? OR v.name LIKE ?)",
        [
          userId,
          `%${searchQuery}%`,
          `%${searchQuery}%`,
          `%${searchQuery}%`,
          `%${searchQuery}%`,
          `%${searchQuery}%`,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({
      success: true,
      transactions: hydrateTransactions(transactions),
    });
  } catch (error) {
    console.error("Search Stock Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching stock transactions",
      error: error.message,
    });
  }
};
