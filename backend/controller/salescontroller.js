const Sale = require("../models/Salesmodel.js");
const ProductModel = require("../models/Productmodel.js");
const Invoice = require("../models/Invoicemodel");
const Customer = require("../models/Customermodel");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const {
  validateSaleStockAvailability,
  createSaleCompletedStockOut,
  rollbackSaleCompletedStockOut,
} = require("../libs/stockLifecycle");

// Create Sale
// controller/salescontroller.js

module.exports.createSale = async (req, res) => {
  try {
    const {
      customerId,
      products,
      paymentMethod,
      paymentStatus,
      status,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customerName = customer.name;
    const customerCode = customer.customerCode || "";

    // Validation: Make sure products array is provided and has at least one item
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and cannot be empty",
      });
    }

    // Validate each product object
    for (const item of products) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product id and quantity",
        });
      }
    }

    // Before creating the sale
    const resolvedProducts = [];
    let totalAmount = 0;
    for (const item of products) {
      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      const unitPrice =
        productRecord.pricing?.currentSalesPrice ?? productRecord.Price ?? 0;
      totalAmount += unitPrice * item.quantity;
      resolvedProducts.push({
        product: item.product,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    const resolvedSaleStatus = status || "pending";
    if (resolvedSaleStatus === "completed") {
      await validateSaleStockAvailability(resolvedProducts);
    }

    // Create sale
    const sale = await Sale.create({
      customer: customer._id,
      customerName,
      customerCode,
      products: resolvedProducts,
      paymentMethod,
      paymentStatus,
      status: resolvedSaleStatus,
      totalAmount,
      stockOutRecorded: false,
    });

    const invoiceItems = resolvedProducts.map((item) => ({
      name: "",
      description: "",
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity,
    }));

    for (let i = 0; i < resolvedProducts.length; i += 1) {
      const productRecord = await ProductModel.findById(
        resolvedProducts[i].product,
      );
      invoiceItems[i].name = productRecord?.name || "Product";
      invoiceItems[i].description = productRecord?.Desciption || "-";
    }

    const invoiceNumber = await getNextInvoiceNumber("SI");
    const paymentMethodMap = {
      creditcard: "card",
      banktransfer: "bank_transfer",
      cash: "cash",
    };
    const resolvedPaymentMethod =
      paymentMethodMap[paymentMethod] || paymentMethod || "cash";

    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: "sales",
      customerId: customer._id,
      customer: {
        code: customerCode,
        name: customerName,
        email: customer.contactInfo?.email || "",
        phone: customer.contactInfo?.phone || "",
        address: customer.contactInfo?.address || "",
      },
      items: invoiceItems,
      taxRate: 0,
      discount: 0,
      currency: "USD",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: resolvedPaymentMethod,
      status: paymentStatus === "paid" ? "paid" : "sent",
      subTotal: totalAmount,
      taxAmount: 0,
      totalAmount,
    });

    sale.invoice = invoice._id;
    if (resolvedSaleStatus === "completed") {
      await createSaleCompletedStockOut(sale);
      sale.stockOutRecorded = true;
    }
    await sale.save();
    const populatedSale = await Sale.findById(sale._id)
      .populate("products.product")
      .populate("customer");
    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale: populatedSale,
    });
  } catch (error) {
    console.error("Create Sale Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested,
      });
    }
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
      .populate("customer")
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
    const sale = await Sale.findById(id)
      .populate("products.product")
      .populate("customer");
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

    if (!updatedData.customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    const customer = await Customer.findById(updatedData.customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

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

    const resolvedStatus = updatedData.status || existingSale.status || "pending";

    // 2️⃣ Validate NEW products & availability
    let updatedTotalAmount = 0;
    const resolvedProducts = [];

    for (const item of updatedData.products) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product id and quantity",
        });
      }

      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      const unitPrice =
        productRecord.pricing?.currentSalesPrice ?? productRecord.Price ?? 0;
      updatedTotalAmount += item.quantity * unitPrice;
      resolvedProducts.push({
        product: item.product,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    if (resolvedStatus === "completed") {
      await validateSaleStockAvailability(
        resolvedProducts,
        existingSale.status === "completed" ? existingSale.products : [],
      );
    }

    if (existingSale.status === "completed") {
      await rollbackSaleCompletedStockOut(existingSale._id);
    }

    // 3️⃣ Update sale
    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      {
        ...updatedData,
        customer: customer._id,
        customerName: customer.name,
        customerCode: customer.customerCode || "",
        products: resolvedProducts,
        totalAmount: updatedTotalAmount,
        status: resolvedStatus,
        stockOutRecorded: false,
      },
      { new: true },
    );

    if (existingSale.invoice) {
      const invoiceItems = [];
      for (const item of resolvedProducts) {
        const productRecord = await ProductModel.findById(item.product);
        invoiceItems.push({
          name: productRecord?.name || "Product",
          description: productRecord?.Desciption || "-",
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        });
      }

      await Invoice.findByIdAndUpdate(existingSale.invoice, {
        customerId: customer._id,
        customer: {
          code: customer.customerCode || "",
          name: customer.name,
          email: customer.contactInfo?.email || "",
          phone: customer.contactInfo?.phone || "",
          address: customer.contactInfo?.address || "",
        },
        items: invoiceItems,
        subTotal: updatedTotalAmount,
        totalAmount: updatedTotalAmount,
      });
    }

    if (resolvedStatus === "completed") {
      await createSaleCompletedStockOut(updatedSale);
      updatedSale.stockOutRecorded = true;
      await updatedSale.save();
    }

    // 4️⃣ Populate for frontend
    const populatedSale = await Sale.findById(id)
      .populate("products.product")
      .populate("customer");

    res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: populatedSale,
    });
  } catch (error) {
    console.error("Update Sale Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested,
      });
    }
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
      const allSales = await Sale.find()
        .populate("products.product")
        .populate("customer");
      return res.status(200).json({ success: true, sales: allSales });
    }

    const searchdata = await Sale.find({
      $or: [
        { customerName: { $regex: query, $options: "i" } },
        { paymentMethod: { $regex: query, $options: "i" } },
      ],
    })
      .populate("products.product")
      .populate("customer");

    res.status(200).json({ success: true, sales: searchdata });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching sales",
      error: error.message,
    });
  }
};
