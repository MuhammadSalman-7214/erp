const Sale = require("../models/Salesmodel.js");
const ProductModel = require("../models/Productmodel.js");

// Create Sale
// controller/salescontroller.js

module.exports.createSale = async (req, res) => {
  try {
    const { customerName, products, paymentMethod, paymentStatus, status } =
      req.body;

    // Validation: Make sure products array is provided and has at least one item
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and cannot be empty",
      });
    }

    // Validate each product object
    for (const item of products) {
      if (!item.product || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product id, quantity, and price",
        });
      }
    }

    // Calculate totalAmount
    const totalAmount = products.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    // Before creating the sale
    for (const item of products) {
      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      if (productRecord.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${productRecord.quantity} items available for ${productRecord.name}. You requested ${item.quantity}.`,
          available: productRecord.quantity,
          requested: item.quantity,
        });
      }
    }

    // After validation, decrement stock
    for (const item of products) {
      const productRecord = await ProductModel.findById(item.product);
      productRecord.quantity -= item.quantity;
      await productRecord.save();
    }

    // Create sale
    const sale = await Sale.create({
      customerName,
      products,
      paymentMethod,
      paymentStatus,
      status,
      totalAmount,
    });
    const populatedSale = await Sale.findById(sale._id).populate(
      "products.product",
    );
    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale: populatedSale,
    });
  } catch (error) {
    console.error("Create Sale Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating sale",
      error: error.message || error,
    });
  }
};

// Get All Sales
module.exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("products.product")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, sales });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sales",
      error: error.message,
    });
  }
};

// Get Sale By ID
module.exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id).populate("products.product");
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    res.status(200).json({ success: true, sale });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sale",
      error: error.message,
    });
  }
};

// Update Sale
module.exports.updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (!updatedData.products || !updatedData.products.length) {
      return res.status(400).json({
        success: false,
        message: "Products are required.",
      });
    }

    // 1️⃣ Fetch existing sale
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    // 2️⃣ Rollback OLD stock
    for (const oldItem of existingSale.products) {
      const product = await ProductModel.findById(oldItem.product);
      if (product) {
        product.quantity += oldItem.quantity;
        await product.save();
      }
    }

    // 3️⃣ Validate NEW products & availability
    let updatedTotalAmount = 0;

    for (const item of updatedData.products) {
      if (!item.product || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product id, quantity, and price",
        });
      }

      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      if (productRecord.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${productRecord.quantity} items available for ${productRecord.name}. You requested ${item.quantity}.`,
          available: productRecord.quantity,
          requested: item.quantity,
        });
      }

      updatedTotalAmount += item.quantity * item.price;
    }

    // 4️⃣ Deduct NEW stock
    for (const item of updatedData.products) {
      const product = await ProductModel.findById(item.product);
      product.quantity -= item.quantity;
      await product.save();
    }

    // 5️⃣ Update sale
    await Sale.findByIdAndUpdate(
      id,
      { ...updatedData, totalAmount: updatedTotalAmount },
      { new: true },
    );

    // 6️⃣ Populate for frontend
    const populatedSale = await Sale.findById(id).populate("products.product");

    res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: populatedSale,
    });
  } catch (error) {
    console.error("Update Sale Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating sale",
      error: error.message,
    });
  }
};

// Search Sales
module.exports.SearchSales = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      const allSales = await Sale.find().populate("products.product");
      return res.status(200).json({ success: true, sales: allSales });
    }

    const searchdata = await Sale.find({
      $or: [
        { customerName: { $regex: query, $options: "i" } },
        { paymentMethod: { $regex: query, $options: "i" } },
      ],
    }).populate("products.product");

    res.status(200).json({ success: true, sales: searchdata });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching sales",
      error: error.message,
    });
  }
};
