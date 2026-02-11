const Product = require("../models/Productmodel");
const logActivity = require("../libs/logger");
module.exports.Addproduct = async (req, res) => {
  const userId = req.user.userId;
  const ipAddress = req.ip;

  try {
    const {
      productCode,
      name,
      brand,
      grade,
      Desciption,
      Category,
      purchasePrice,
      salesPrice,
      Price,
    } = req.body;

    const resolvedSalesPrice = Number(salesPrice ?? Price);
    const resolvedPurchasePrice = Number(purchasePrice);

    if (
      !productCode ||
      !name ||
      !brand ||
      !grade ||
      !Category ||
      !Desciption ||
      Number.isNaN(resolvedSalesPrice) ||
      Number.isNaN(resolvedPurchasePrice)
    ) {
      return res
        .status(400)
        .json({ error: "Please provide all product details." });
    }

    const createdProduct = new Product({
      productCode,
      name,
      brand,
      grade,
      Desciption,
      Category,
      pricing: {
        currentPurchasePrice: resolvedPurchasePrice,
        currentSalesPrice: resolvedSalesPrice,
      },
      priceHistory: [
        { type: "purchase", price: resolvedPurchasePrice },
        { type: "sales", price: resolvedSalesPrice },
      ],
      Price: resolvedSalesPrice,
      // sku will be auto-generated
    });

    await createdProduct.save();

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
      product: createdProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating product", error: error.message });
  }
};

module.exports.getProduct = async (req, res) => {
  try {
    const Products = await Product.find({}).populate("Category");

    const totalProduct = await Product.countDocuments({});
    res.status(200).json({ Products, totalProduct });
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
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

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
      productCode,
      name,
      brand,
      grade,
      Category,
      purchasePrice,
      salesPrice,
      Price,
      quantity,
      Desciption,
      dateAdded,
    } = req.body;
    const { id } = req.params;
    const userId = req.user.userId; // or _id if that's how your token stores it
    const ipAddress = req.ip;
    // No need to check updatedData, instead check fields if needed
    if (!name || !Category) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    const resolvedSalesPrice =
      salesPrice !== undefined ? Number(salesPrice) : Number(Price);
    const resolvedPurchasePrice =
      purchasePrice !== undefined
        ? Number(purchasePrice)
        : existingProduct.pricing?.currentPurchasePrice;

    const updates = {
      productCode: productCode || existingProduct.productCode,
      name,
      brand: brand || existingProduct.brand,
      grade: grade || existingProduct.grade,
      Category,
      Desciption,
      quantity,
      dateAdded,
    };

    if (!Number.isNaN(resolvedSalesPrice)) {
      updates.pricing = {
        ...existingProduct.pricing,
        currentSalesPrice: resolvedSalesPrice,
      };
      updates.Price = resolvedSalesPrice;
    }

    if (!Number.isNaN(resolvedPurchasePrice)) {
      updates.pricing = {
        ...updates.pricing,
        currentPurchasePrice: resolvedPurchasePrice,
      };
    }

    if (
      resolvedSalesPrice !== undefined &&
      resolvedSalesPrice !== existingProduct.pricing?.currentSalesPrice
    ) {
      updates.priceHistory = [
        ...(existingProduct.priceHistory || []),
        { type: "sales", price: resolvedSalesPrice },
      ];
    }

    if (
      resolvedPurchasePrice !== undefined &&
      resolvedPurchasePrice !== existingProduct.pricing?.currentPurchasePrice
    ) {
      updates.priceHistory = [
        ...(updates.priceHistory || existingProduct.priceHistory || []),
        { type: "purchase", price: resolvedPurchasePrice },
      ];
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found." });
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

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Search by productCode only
    const products = await Product.find({
      productCode: { $regex: query, $options: "i" },
    }).populate("Category"); // populate Category if needed

    res.json(products);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error finding product", error: error.message });
  }
};

module.exports.getTopProductsByQuantity = async (req, res) => {
  try {
    const topProducts = await Product.find({}).sort({ quantity: -1 }).limit(10);
    res.status(200).json({ success: true, topProducts });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching products for chart",
      error: error.message,
    });
  }
};
