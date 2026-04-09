const { v4: uuidv4 } = require("uuid");
const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");

const toNumberOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const attachProductCodes = async (products, userId) => {
  const productList = Array.isArray(products) ? products : [];
  if (!productList.length) return [];

  const productIds = productList.map((product) => product.id);
  const placeholders = productIds.map(() => "?").join(", ");
  const codes = await query(
    `SELECT * FROM product_codes WHERE user_id = ? AND product IN (${placeholders})`,
    [userId, ...productIds],
  );

  const codesByProduct = codes.reduce((acc, code) => {
    const key = String(code.product);
    if (!acc[key]) acc[key] = [];
    acc[key].push(code);
    return acc;
  }, {});

  return productList.map((product) => {
    const productCodes = codesByProduct[String(product.id)] || [];
    const totalQuantity = productCodes.reduce(
      (sum, code) => sum + Number(code.quantity || 0),
      0,
    );

    return {
      ...product,
      pricing: safeJsonParse(product.pricing, undefined),
      priceHistory: safeJsonParse(product.priceHistory, []),
      productCodes,
      totalQuantity,
    };
  });
};

const resolveIncomingCodes = (body) => {
  if (Array.isArray(body.productCodes) && body.productCodes.length) {
    return body.productCodes;
  }

  if (body.productCode) {
    return [
      {
        code: body.productCode,
        variantName: body.variantName || "",
        quantity: body.quantity ?? 0,
      },
    ];
  }

  return [];
};

const ensureCategoryCodes = async ({ userId, categoryId, codes = [] }) => {
  if (!categoryId || !codes.length) return;

  const operations = codes.map((code) => {
    const normalizedCode = String(code.code || "").trim();
    const normalizedVariant = String(code.variantName || "").trim();
    if (!normalizedCode) return null;
    return query(
      "INSERT INTO category_codes (user_id, category, code, variantName) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE code = code",
      [userId, categoryId, normalizedCode, normalizedVariant],
    );
  });

  const filtered = operations.filter(Boolean);
  if (!filtered.length) return;
  await Promise.all(filtered);
};

module.exports.Addproduct = async (req, res) => {
  const userId = req.user.userId;
  const ipAddress = req.ip;

  try {
    const {
      name,
      description,
      company,
      brand,
      Category,
      purchasePrice,
      tradePrice,
      salePrice,
      salesPrice,
      Price,
    } = req.body;

    const resolvedCompany = (company || brand || "").trim();

    if (!name || !resolvedCompany) {
      return res
        .status(400)
        .json({ error: "Product name and company are required." });
    }

    const codesPayload = resolveIncomingCodes(req.body);
    const hasCodes = codesPayload.length > 0;

    const normalizedCodes = codesPayload.map((code) => ({
      code: String(code.code || "").trim(),
      variantName: String(code.variantName || "").trim(),
      quantity: Number(code.quantity ?? 0),
    }));

    if (hasCodes && normalizedCodes.some((code) => !code.code)) {
      return res
        .status(400)
        .json({ error: "Each product code requires a code value." });
    }

    const duplicateCodes = new Set();
    const seenCodes = new Set();
    for (const code of normalizedCodes) {
      if (seenCodes.has(code.code.toLowerCase())) {
        duplicateCodes.add(code.code);
      }
      seenCodes.add(code.code.toLowerCase());
    }

    if (hasCodes && duplicateCodes.size) {
      return res.status(400).json({
        error: `Duplicate product codes in request: ${Array.from(duplicateCodes).join(", ")}`,
      });
    }

    let resolvedCategoryId = Category || null;
    if (Category) {
      if (typeof Category === "string" && Category.trim() !== "") {
        const numericId = Number(Category);
        if (!Number.isNaN(numericId) && String(numericId) === Category.trim()) {
          resolvedCategoryId = numericId;
        } else {
          try {
            const rows = await query(
              "SELECT id FROM categories WHERE name = ? AND user_id = ? LIMIT 1",
              [Category.trim(), userId],
            );
            resolvedCategoryId = rows[0]?.id || null;
          } catch (err) {
            return res.status(500).json({
              success: false,
              message: "Database error",
              error: err,
            });
          }
        }
      }
      if (!resolvedCategoryId) {
        return res.status(404).json({ error: "Category not found" });
      }
    }

    const resolvedSalePrice = toNumberOrUndefined(
      salePrice ?? salesPrice ?? Price,
    );
    const resolvedPurchasePrice = toNumberOrUndefined(purchasePrice);
    const resolvedTradePrice = toNumberOrUndefined(tradePrice);

    const pricing =
      resolvedSalePrice === undefined &&
      resolvedPurchasePrice === undefined &&
      resolvedTradePrice === undefined
        ? undefined
        : {
            currentPurchasePrice: resolvedPurchasePrice,
            currentSalesPrice: resolvedSalePrice,
            currentTradePrice: resolvedTradePrice,
          };

    const priceHistory =
      resolvedSalePrice === undefined &&
      resolvedPurchasePrice === undefined &&
      resolvedTradePrice === undefined
        ? []
        : [
            ...(resolvedPurchasePrice === undefined
              ? []
              : [{ type: "purchase", price: resolvedPurchasePrice }]),
            ...(resolvedTradePrice === undefined
              ? []
              : [{ type: "trade", price: resolvedTradePrice }]),
            ...(resolvedSalePrice === undefined
              ? []
              : [{ type: "sales", price: resolvedSalePrice }]),
          ];

    let createdProductId;
    try {
      const result = await query(
        "INSERT INTO products (user_id, name, description, company, brand, Category, purchasePrice, tradePrice, salePrice, pricing, priceHistory, Price, sku, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          name,
          description || "",
          resolvedCompany,
          brand || resolvedCompany,
          resolvedCategoryId || null,
          resolvedPurchasePrice ?? 0,
          resolvedTradePrice ?? 0,
          resolvedSalePrice ?? 0,
          pricing ? JSON.stringify(pricing) : null,
          JSON.stringify(priceHistory || []),
          resolvedSalePrice === undefined ? null : resolvedSalePrice,
          uuidv4(),
          new Date(),
        ],
      );
      createdProductId = result.insertId;
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    let createdCodes = [];
    if (hasCodes) {
      const values = normalizedCodes.map((code) => [
        userId,
        createdProductId,
        code.code,
        code.variantName,
        Number(code.quantity || 0),
      ]);
      try {
        await query(
          "INSERT INTO product_codes (user_id, product, code, variantName, quantity) VALUES ?",
          [values],
        );
        createdCodes = await query(
          "SELECT * FROM product_codes WHERE user_id = ? AND product = ?",
          [userId, createdProductId],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
    }

    if (resolvedCategoryId && createdCodes.length) {
      await ensureCategoryCodes({
        userId,
        categoryId: resolvedCategoryId,
        codes: createdCodes,
      });
    }

    await logActivity({
      action: "Add Product",
      description: `Product ${name} was added`,
      entity: "product",
      entityId: createdProductId,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(201).json({
      message: "Product created successfully",
      product: {
        id: createdProductId,
        user_id: userId,
        name,
        description: description || "",
        company: resolvedCompany,
        brand: brand || resolvedCompany,
        Category: resolvedCategoryId,
        purchasePrice: resolvedPurchasePrice ?? 0,
        tradePrice: resolvedTradePrice ?? 0,
        salePrice: resolvedSalePrice ?? 0,
        pricing,
        priceHistory,
        Price: resolvedSalePrice === undefined ? undefined : resolvedSalePrice,
        productCodes: createdCodes,
        totalQuantity: createdCodes.reduce(
          (sum, code) => sum + Number(code.quantity || 0),
          0,
        ),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating product", error: error.message });
  }
};

module.exports.getProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    let Products;
    try {
      Products = await query(
        "SELECT p.*, c.id AS category_id, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.Category WHERE p.user_id = ?",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const productsWithCategory = Products.map((p) => ({
      ...p,
      Category: p.category_id ? { id: p.category_id, name: p.category_name } : null,
    }));

    const enrichedProducts = await attachProductCodes(productsWithCategory, userId);
    let totalProduct;
    try {
      const rows = await query(
        "SELECT COUNT(*) as count FROM products WHERE user_id = ?",
        [userId],
      );
      totalProduct = rows[0]?.count || 0;
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    res.status(200).json({ Products: enrichedProducts, totalProduct });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error getting products", error: error.message });
  }
};

module.exports.RemoveProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;
    let deletedProduct;
    try {
      const rows = await query(
        "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
        [productId, userId],
      );
      deletedProduct = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

    try {
      await query("DELETE FROM product_codes WHERE product = ? AND user_id = ?", [
        productId,
        userId,
      ]);
      await query("DELETE FROM products WHERE id = ? AND user_id = ?", [
        productId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    await logActivity({
      action: "Delete Product",
      description: `Product ${deletedProduct.name}" was deleted.`,
      entity: "product",
      entityId: deletedProduct.id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting product", error: error.message });
  }
};

module.exports.EditProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      company,
      brand,
      Category,
      purchasePrice,
      tradePrice,
      salePrice,
      salesPrice,
      Price,
    } = req.body;
    const { id } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;
    if (!name) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    let resolvedCategoryId = Category ?? null;
    if (Category) {
      if (typeof Category === "string" && Category.trim() !== "") {
        const numericId = Number(Category);
        if (!Number.isNaN(numericId) && String(numericId) === Category.trim()) {
          resolvedCategoryId = numericId;
        } else {
          try {
            const rows = await query(
              "SELECT id FROM categories WHERE name = ? AND user_id = ? LIMIT 1",
              [Category.trim(), userId],
            );
            resolvedCategoryId = rows[0]?.id || null;
          } catch (err) {
            return res.status(500).json({
              success: false,
              message: "Database error",
              error: err,
            });
          }
        }
      }
      if (!resolvedCategoryId) {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    let existingProduct;
    try {
      const rows = await query(
        "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      existingProduct = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    const currentPricing = safeJsonParse(existingProduct.pricing, {});
    const currentHistory = safeJsonParse(existingProduct.priceHistory, []);

    const hasSalePrice =
      salePrice !== undefined || salesPrice !== undefined || Price !== undefined;
    const hasPurchasePrice = purchasePrice !== undefined;
    const hasTradePrice = tradePrice !== undefined;

    const resolvedSalePrice = hasSalePrice
      ? toNumberOrUndefined(salePrice ?? salesPrice ?? Price)
      : undefined;
    const resolvedPurchasePrice = hasPurchasePrice
      ? toNumberOrUndefined(purchasePrice)
      : undefined;
    const resolvedTradePrice = hasTradePrice
      ? toNumberOrUndefined(tradePrice)
      : undefined;

    const updates = {
      name,
      description: description ?? existingProduct.description,
      company:
        (company || "").trim() ||
        existingProduct.company ||
        existingProduct.brand,
      brand: brand || existingProduct.brand,
      Category: resolvedCategoryId ?? existingProduct.Category,
      salePrice:
        resolvedSalePrice !== undefined ? resolvedSalePrice : existingProduct.salePrice,
      purchasePrice:
        resolvedPurchasePrice !== undefined
          ? resolvedPurchasePrice
          : existingProduct.purchasePrice,
      tradePrice:
        resolvedTradePrice !== undefined
          ? resolvedTradePrice
          : existingProduct.tradePrice,
      Price:
        resolvedSalePrice !== undefined ? resolvedSalePrice : existingProduct.Price,
    };

    let nextPricing = { ...currentPricing };
    if (hasSalePrice && resolvedSalePrice !== undefined) {
      nextPricing = { ...nextPricing, currentSalesPrice: resolvedSalePrice };
    }
    if (hasPurchasePrice && resolvedPurchasePrice !== undefined) {
      nextPricing = { ...nextPricing, currentPurchasePrice: resolvedPurchasePrice };
    }
    if (hasTradePrice && resolvedTradePrice !== undefined) {
      nextPricing = { ...nextPricing, currentTradePrice: resolvedTradePrice };
    }

    let nextHistory = [...currentHistory];
    if (
      hasSalePrice &&
      resolvedSalePrice !== undefined &&
      resolvedSalePrice !== currentPricing?.currentSalesPrice
    ) {
      nextHistory = [...nextHistory, { type: "sales", price: resolvedSalePrice }];
    }
    if (
      hasPurchasePrice &&
      resolvedPurchasePrice !== undefined &&
      resolvedPurchasePrice !== currentPricing?.currentPurchasePrice
    ) {
      nextHistory = [
        ...nextHistory,
        { type: "purchase", price: resolvedPurchasePrice },
      ];
    }
    if (
      hasTradePrice &&
      resolvedTradePrice !== undefined &&
      resolvedTradePrice !== currentPricing?.currentTradePrice
    ) {
      nextHistory = [...nextHistory, { type: "trade", price: resolvedTradePrice }];
    }

    try {
      await query(
        "UPDATE products SET name = ?, description = ?, company = ?, brand = ?, Category = ?, purchasePrice = ?, tradePrice = ?, salePrice = ?, pricing = ?, priceHistory = ?, Price = ? WHERE id = ? AND user_id = ?",
        [
          updates.name,
          updates.description,
          updates.company,
          updates.brand,
          updates.Category || null,
          updates.purchasePrice,
          updates.tradePrice,
          updates.salePrice,
          JSON.stringify(nextPricing || {}),
          JSON.stringify(nextHistory || []),
          updates.Price,
          id,
          userId,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (updates.Category) {
      const productCodes = await query(
        "SELECT code, variantName FROM product_codes WHERE user_id = ? AND product = ?",
        [userId, id],
      );

      await ensureCategoryCodes({
        userId,
        categoryId: updates.Category,
        codes: productCodes,
      });
    }

    await logActivity({
      action: "Update Product",
      description: `Product "${updates.name}" was updated.`,
      entity: "product",
      entityId: id,
      userId,
      ipAddress,
    });

    res.status(200).json({
      ...existingProduct,
      ...updates,
      pricing: nextPricing,
      priceHistory: nextHistory,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ message: "Error updating product", error: error.message });
  }
};

module.exports.SearchProduct = async (req, res) => {
  try {
    const { query: searchQueryRaw } = req.query;
    const userId = req.user.userId;
    const searchQuery = String(searchQueryRaw || "").trim();

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    let products;
    try {
      products = await query(
        `SELECT DISTINCT p.*, c.id AS category_id, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.Category
         WHERE p.user_id = ?
           AND (
             p.name LIKE ?
             OR p.company LIKE ?
             OR p.brand LIKE ?
             OR c.name LIKE ?
             OR EXISTS (
               SELECT 1
               FROM product_codes pc
               WHERE pc.user_id = p.user_id
                 AND pc.product = p.id
                 AND (pc.code LIKE ? OR pc.variantName LIKE ?)
             )
           )`,
        [
          userId,
          `%${searchQuery}%`,
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

    const productsWithCategory = products.map((p) => ({
      ...p,
      Category: p.category_id ? { id: p.category_id, name: p.category_name } : null,
    }));
    const enrichedProducts = await attachProductCodes(productsWithCategory, userId);

    res.json(enrichedProducts);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error finding product", error: error.message });
  }
};

module.exports.getTopProductsByQuantity = async (req, res) => {
  try {
    const userId = req.user.userId;
    let topProducts;
    try {
      topProducts = await query(
        "SELECT product, SUM(quantity) as quantity FROM product_codes WHERE user_id = ? GROUP BY product ORDER BY quantity DESC LIMIT 10",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const productIds = topProducts.map((item) => item.product);
    const placeholders = productIds.map(() => "?").join(", ");
    const products = productIds.length
      ? await query(
          `SELECT id, name FROM products WHERE id IN (${placeholders}) AND user_id = ?`,
          [...productIds, userId],
        )
      : [];
    const productById = products.reduce((acc, product) => {
      acc[String(product.id)] = product;
      return acc;
    }, {});

    const resolved = topProducts.map((item) => ({
      _id: item.product,
      name: productById[String(item.product)]?.name || "Product",
      quantity: item.quantity,
    }));

    res.status(200).json({ success: true, topProducts: resolved });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching products for chart",
      error: error.message,
    });
  }
};

module.exports.getProductCodesByProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    let product;
    try {
      const rows = await query(
        "SELECT id FROM products WHERE id = ? AND user_id = ? LIMIT 1",
        [productId, userId],
      );
      product = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let codes;
    try {
      codes = await query(
        "SELECT * FROM product_codes WHERE product = ? AND user_id = ? ORDER BY createdAt DESC",
        [productId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({ success: true, productCodes: codes });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product codes", error: error.message });
  }
};

module.exports.addProductCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { code, variantName, quantity } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Product code is required" });
    }

    let product;
    try {
      const rows = await query(
        "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
        [productId, userId],
      );
      product = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let existing;
    try {
      const rows = await query(
        "SELECT id FROM product_codes WHERE user_id = ? AND product = ? AND code = ? LIMIT 1",
        [userId, productId, code],
      );
      existing = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (existing) {
      return res
        .status(400)
        .json({ message: "Product code already exists for this product" });
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO product_codes (user_id, product, code, variantName, quantity) VALUES (?, ?, ?, ?, ?)",
        [userId, productId, code, variantName || "", Number(quantity || 0)],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const created = {
      id: insertResult.insertId,
      user_id: userId,
      product: Number(productId),
      code,
      variantName: variantName || "",
      quantity: Number(quantity || 0),
    };

    if (product.Category) {
      await ensureCategoryCodes({
        userId,
        categoryId: product.Category,
        codes: [created],
      });
    }

    res.status(201).json({ success: true, productCode: created });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating product code", error: error.message });
  }
};

module.exports.updateProductCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { codeId } = req.params;
    const { code, variantName, quantity } = req.body || {};

    let currentRecord;
    try {
      const rows = await query(
        "SELECT product, code, variantName FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
        [codeId, userId],
      );
      currentRecord = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!currentRecord) {
      return res.status(404).json({ message: "Product code not found" });
    }

    if (code) {
      let existing;
      try {
        const rows = await query(
          "SELECT id FROM product_codes WHERE id <> ? AND user_id = ? AND product = ? AND code = ? LIMIT 1",
          [codeId, userId, currentRecord.product, code],
        );
        existing = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (existing) {
        return res.status(400).json({
          message: "Product code already exists for this product",
        });
      }
    }

    const updates = {
      code: code !== undefined ? code : currentRecord.code,
      variantName:
        variantName !== undefined ? variantName : currentRecord.variantName,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
    };

    try {
      await query(
        "UPDATE product_codes SET code = ?, variantName = ?, quantity = COALESCE(?, quantity) WHERE id = ? AND user_id = ?",
        [updates.code, updates.variantName, updates.quantity, codeId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const updatedRows = await query(
      "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
      [codeId, userId],
    );
    const updated = updatedRows[0];

    const productRecordRows = await query(
      "SELECT Category FROM products WHERE id = ? AND user_id = ? LIMIT 1",
      [updated.product, userId],
    );
    const productRecord = productRecordRows[0];

    if (productRecord?.Category) {
      await ensureCategoryCodes({
        userId,
        categoryId: productRecord.Category,
        codes: [updated],
      });
    }

    res.status(200).json({ success: true, productCode: updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating product code", error: error.message });
  }
};

module.exports.deleteProductCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { codeId } = req.params;

    let deleted;
    try {
      const rows = await query(
        "SELECT id FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
        [codeId, userId],
      );
      deleted = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!deleted) {
      return res.status(404).json({ message: "Product code not found" });
    }

    try {
      await query("DELETE FROM product_codes WHERE id = ? AND user_id = ?", [
        codeId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({ success: true, message: "Product code deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting product code", error: error.message });
  }
};
