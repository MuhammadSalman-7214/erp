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

    // Create sale
    const sale = await Sale.create({
      customerName,
      products,
      paymentMethod,
      paymentStatus,
      status,
      totalAmount,
    });

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale,
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
      return res
        .status(400)
        .json({ success: false, message: "Products are required." });
    }

    let updatedTotalAmount = 0;
    for (let p of updatedData.products) {
      updatedTotalAmount += p.quantity * p.price;
    }

    const sale = await Sale.findByIdAndUpdate(
      id,
      { ...updatedData, totalAmount: updatedTotalAmount },
      { new: true },
    );
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });

    res
      .status(200)
      .json({ success: true, message: "Sale updated successfully", sale });
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
