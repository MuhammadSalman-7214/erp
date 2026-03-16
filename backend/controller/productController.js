const Product = require("../models/Productmodel");
const ProductCode = require("../models/ProductCodemodel");
const CategoryCode = require("../models/CategoryCodemodel");
const CategoryModel = require("../models/ Categorymodel");
const logActivity = require("../libs/logger");

const toNumberOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const attachProductCodes = async (products, userId) => {
  const productList = Array.isArray(products) ? products : [];
  if (!productList.length) return [];

  const productIds = productList.map((product) => product._id);
  const codes = await ProductCode.find({
    user_id: userId,
    product: { $in: productIds },
  }).lean();

  const codesByProduct = codes.reduce((acc, code) => {
    const key = String(code.product);
    if (!acc[key]) acc[key] = [];
    acc[key].push(code);
    return acc;
  }, {});

  return productList.map((product) => {
    const base = product.toObject ? product.toObject() : product;
    const productCodes = codesByProduct[String(product._id)] || [];
    const totalQuantity = productCodes.reduce(
      (sum, code) => sum + Number(code.quantity || 0),
      0,
    );

    return { ...base, productCodes, totalQuantity };
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

const ensureCategoryCodes = async ({
  userId,
  categoryId,
  codes = [],
}) => {
  if (!categoryId || !codes.length) return;

  const operations = codes.map((code) => {
    const normalizedCode = String(code.code || "").trim();
    const normalizedVariant = String(code.variantName || "").trim();
    if (!normalizedCode) return null;
    return CategoryCode.updateOne(
      {
        user_id: userId,
        category: categoryId,
        code: normalizedCode,
        variantName: normalizedVariant,
      },
      {
        $setOnInsert: {
          user_id: userId,
          category: categoryId,
          code: normalizedCode,
          variantName: normalizedVariant,
        },
      },
      { upsert: true },
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

    if (Category) {
      const categoryRecord = await CategoryModel.findOne({
        _id: Category,
        user_id: userId,
      });
      if (!categoryRecord) {
        return res.status(404).json({ error: "Category not found" });
      }
    }

    const resolvedSalePrice = toNumberOrUndefined(
      salePrice ?? salesPrice ?? Price,
    );
    const resolvedPurchasePrice = toNumberOrUndefined(purchasePrice);
    const resolvedTradePrice = toNumberOrUndefined(tradePrice);

    const createdProduct = new Product({
      user_id: userId,
      name,
      description: description || "",
      company: resolvedCompany,
      brand: brand || resolvedCompany,
      Category,
      purchasePrice: resolvedPurchasePrice ?? 0,
      tradePrice: resolvedTradePrice ?? 0,
      salePrice: resolvedSalePrice ?? 0,
      pricing:
        resolvedSalePrice === undefined &&
        resolvedPurchasePrice === undefined &&
        resolvedTradePrice === undefined
          ? undefined
          : {
              currentPurchasePrice: resolvedPurchasePrice,
              currentSalesPrice: resolvedSalePrice,
              currentTradePrice: resolvedTradePrice,
            },
      priceHistory:
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
            ],
      Price: resolvedSalePrice === undefined ? undefined : resolvedSalePrice,
      // sku will be auto-generated
    });

    await createdProduct.save();

    const createdCodes = hasCodes
      ? await ProductCode.insertMany(
          normalizedCodes.map((code) => ({
            user_id: userId,
            product: createdProduct._id,
            code: code.code,
            variantName: code.variantName,
            quantity: Number(code.quantity || 0),
          })),
        )
      : [];

    if (Category && createdCodes.length) {
      await ensureCategoryCodes({
        userId,
        categoryId: Category,
        codes: createdCodes,
      });
    }

    await logActivity({
      action: "Add Product",
      description: `Product ${name} was added`,
      entity: "product",
      entityId: createdProduct._id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(201).json({
      message: "Product created successfully",
      product: {
        ...(createdProduct.toObject?.() || createdProduct),
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
    const Products = await Product.find({ user_id: userId }).populate(
      "Category",
    );

    const enrichedProducts = await attachProductCodes(Products, userId);
    const totalProduct = await Product.countDocuments({ user_id: userId });
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
    const deletedProduct = await Product.findOneAndDelete({
      _id: productId,
      user_id: userId,
    });

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

    await ProductCode.deleteMany({ product: productId, user_id: userId });

    await logActivity({
      action: "Delete Product",
      description: `Product ${deletedProduct.name}" was deleted.`,
      entity: "product",
      entityId: deletedProduct._id,
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
    const userId = req.user.userId; // or _id if that's how your token stores it
    const ipAddress = req.ip;
    if (!name) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (Category) {
      const categoryRecord = await CategoryModel.findOne({
        _id: Category,
        user_id: userId,
      });
      if (!categoryRecord) {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    const existingProduct = await Product.findOne({
      _id: id,
      user_id: userId,
    });
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

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
      Category: Category ?? existingProduct.Category,
    };

    if (hasSalePrice && resolvedSalePrice !== undefined) {
      updates.pricing = {
        ...existingProduct.pricing,
        currentSalesPrice: resolvedSalePrice,
      };
      updates.salePrice = resolvedSalePrice;
      updates.Price = resolvedSalePrice;
    }

    if (hasPurchasePrice && resolvedPurchasePrice !== undefined) {
      updates.pricing = {
        ...updates.pricing,
        currentPurchasePrice: resolvedPurchasePrice,
      };
      updates.purchasePrice = resolvedPurchasePrice;
    }

    if (hasTradePrice && resolvedTradePrice !== undefined) {
      updates.pricing = {
        ...updates.pricing,
        currentTradePrice: resolvedTradePrice,
      };
      updates.tradePrice = resolvedTradePrice;
    }

    if (
      hasSalePrice &&
      resolvedSalePrice !== undefined &&
      resolvedSalePrice !== existingProduct.pricing?.currentSalesPrice
    ) {
      updates.priceHistory = [
        ...(existingProduct.priceHistory || []),
        { type: "sales", price: resolvedSalePrice },
      ];
    }

    if (
      hasPurchasePrice &&
      resolvedPurchasePrice !== undefined &&
      resolvedPurchasePrice !== existingProduct.pricing?.currentPurchasePrice
    ) {
      updates.priceHistory = [
        ...(updates.priceHistory || existingProduct.priceHistory || []),
        { type: "purchase", price: resolvedPurchasePrice },
      ];
    }

    if (
      hasTradePrice &&
      resolvedTradePrice !== undefined &&
      resolvedTradePrice !== existingProduct.pricing?.currentTradePrice
    ) {
      updates.priceHistory = [
        ...(updates.priceHistory || existingProduct.priceHistory || []),
        { type: "trade", price: resolvedTradePrice },
      ];
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, user_id: userId },
      updates,
      { new: true },
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (updatedProduct.Category) {
      const productCodes = await ProductCode.find({
        user_id: userId,
        product: updatedProduct._id,
      }).select("code variantName");

      await ensureCategoryCodes({
        userId,
        categoryId: updatedProduct.Category,
        codes: productCodes,
      });
    }

    await logActivity({
      action: "Update Product",
      description: `Product "${updatedProduct.name}" was updated.`,
      entity: "product",
      entityId: updatedProduct._id,
      userId,
      ipAddress,
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ message: "Error updating product", error: error.message });
  }
};

module.exports.SearchProduct = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const productCodeMatches = await ProductCode.find({
      user_id: userId,
      $or: [
        { code: { $regex: query, $options: "i" } },
        { variantName: { $regex: query, $options: "i" } },
      ],
    }).select("product");

    const productIds = productCodeMatches.map((code) => code.product);

    const products = await Product.find({
      user_id: userId,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { _id: { $in: productIds } },
      ],
    }).populate("Category");

    const enrichedProducts = await attachProductCodes(products, userId);

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
    const topProducts = await ProductCode.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: "$product",
          quantity: { $sum: "$quantity" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
    ]);

    const productIds = topProducts.map((item) => item._id);
    const products = await Product.find({
      _id: { $in: productIds },
      user_id: userId,
    }).select("name");
    const productById = products.reduce((acc, product) => {
      acc[String(product._id)] = product;
      return acc;
    }, {});

    const resolved = topProducts.map((item) => ({
      _id: item._id,
      name: productById[String(item._id)]?.name || "Product",
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

    const product = await Product.findOne({
      _id: productId,
      user_id: userId,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const codes = await ProductCode.find({
      product: productId,
      user_id: userId,
    }).sort({ createdAt: -1 });

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

    const product = await Product.findOne({
      _id: productId,
      user_id: userId,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = await ProductCode.findOne({
      user_id: userId,
      product: productId,
      code,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Product code already exists for this product" });
    }

    const created = await ProductCode.create({
      user_id: userId,
      product: productId,
      code,
      variantName: variantName || "",
      quantity: Number(quantity || 0),
    });

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

    const currentRecord = await ProductCode.findOne({
      _id: codeId,
      user_id: userId,
    }).select("product code variantName");

    if (!currentRecord) {
      return res.status(404).json({ message: "Product code not found" });
    }

    if (code) {
      const existing = await ProductCode.findOne({
        _id: { $ne: codeId },
        user_id: userId,
        product: currentRecord.product,
        code,
      });
      if (existing) {
        return res.status(400).json({
          message: "Product code already exists for this product",
        });
      }
    }

    const updates = {};
    if (code !== undefined) updates.code = code;
    if (variantName !== undefined) updates.variantName = variantName;
    if (quantity !== undefined) updates.quantity = Number(quantity);

    const updated = await ProductCode.findOneAndUpdate(
      { _id: codeId, user_id: userId },
      {
        ...updates,
      },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Product code not found" });
    }

    const productRecord = await Product.findOne({
      _id: updated.product,
      user_id: userId,
    }).select("Category");

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

    const deleted = await ProductCode.findOneAndDelete({
      _id: codeId,
      user_id: userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Product code not found" });
    }

    res.status(200).json({ success: true, message: "Product code deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting product code", error: error.message });
  }
};
