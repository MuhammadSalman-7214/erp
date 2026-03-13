const Sale = require("../models/Salesmodel.js");
const ProductModel = require("../models/Productmodel.js");
const ProductCode = require("../models/ProductCodemodel");
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
    const userId = req.user.userId;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      user_id: userId,
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customerName = customer.name;

    // Validation: Make sure products array is provided and has at least one item
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and cannot be empty",
      });
    }

    // Validate each product object
    for (const item of products) {
      if (!item.productCode || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product code id and quantity",
        });
      }
    }

    // Before creating the sale
    const resolvedProducts = [];
    let totalAmount = 0;
    for (const item of products) {
      const productCodeRecord = await ProductCode.findOne({
        _id: item.productCode,
        user_id: userId,
      });
      if (!productCodeRecord) {
        return res.status(404).json({
          success: false,
          message: `Product code ${item.productCode} not found`,
        });
      }

      const productRecord = await ProductModel.findOne({
        _id: productCodeRecord.product,
        user_id: userId,
      });
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${productCodeRecord.product} not found`,
        });
      }

      if (item.product && String(item.product) !== String(productRecord._id)) {
        return res.status(400).json({
          success: false,
          message: "Product does not match selected product code",
        });
      }

      const unitPrice =
        Number(productRecord.salePrice) ||
        productRecord.pricing?.currentSalesPrice ||
        productRecord.Price ||
        Number(productCodeRecord.salePrice) ||
        0;
      totalAmount += unitPrice * item.quantity;
      resolvedProducts.push({
        product: productRecord._id,
        productCode: productCodeRecord._id,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    const resolvedSaleStatus = status || "pending";
    if (resolvedSaleStatus === "completed") {
      await validateSaleStockAvailability(resolvedProducts, [], userId);
    }

    // Create sale
    const sale = await Sale.create({
      user_id: userId,
      customer: customer._id,
      customerName,
      products: resolvedProducts,
      paymentMethod,
      paymentStatus,
      status: resolvedSaleStatus,
      totalAmount,
      stockOutRecorded: false,
    });

    const invoiceItems = [];

    for (let i = 0; i < resolvedProducts.length; i += 1) {
      const productRecord = await ProductModel.findOne({
        _id: resolvedProducts[i].product,
        user_id: userId,
      });
      const productCodeRecord = await ProductCode.findOne({
        _id: resolvedProducts[i].productCode,
        user_id: userId,
      });
      const variantLabel = productCodeRecord?.variantName
        ? ` - ${productCodeRecord.variantName}`
        : "";
      invoiceItems.push({
        name: `${productRecord?.name || "Product"} (${productCodeRecord?.code || "code"})${variantLabel}`,
        quantity: resolvedProducts[i].quantity,
        unitPrice: resolvedProducts[i].price,
        total: resolvedProducts[i].price * resolvedProducts[i].quantity,
      });
    }

    const invoiceNumber = await getNextInvoiceNumber("SI", userId);
    const paymentMethodMap = {
      creditcard: "card",
      banktransfer: "bank_transfer",
      cash: "cash",
    };
    const resolvedPaymentMethod =
      paymentMethodMap[paymentMethod] || paymentMethod || "cash";

    const invoice = await Invoice.create({
      user_id: userId,
      invoiceNumber,
      invoiceType: "sales",
      customerId: customer._id,
      customer: {
        name: customerName,
        phone: customer.contactInfo?.phone || "",
        address: customer.contactInfo?.address || "",
      },
      items: invoiceItems,
      taxRate: 0,
      discount: 0,
      currency: "Rs",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: resolvedPaymentMethod,
      status: paymentStatus === "paid" ? "paid" : "sent",
      subTotal: totalAmount,
      taxAmount: 0,
      totalAmount,
    });

    sale.invoice = invoice._id;
    if (resolvedSaleStatus === "completed") {
      await createSaleCompletedStockOut(sale, userId);
      sale.stockOutRecorded = true;
    }
    await sale.save();
    const populatedSale = await Sale.findOne({
      _id: sale._id,
      user_id: userId,
    })
      .populate("products.product")
      .populate("products.productCode")
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
    const userId = req.user.userId;
    const sales = await Sale.find({ user_id: userId })
      .populate("products.product")
      .populate("products.productCode")
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
    const userId = req.user.userId;
    const sale = await Sale.findOne({ _id: id, user_id: userId })
      .populate("products.product")
      .populate("products.productCode")
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
    const userId = req.user.userId;

    if (!updatedData.customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    const customer = await Customer.findOne({
      _id: updatedData.customerId,
      user_id: userId,
    });
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
    const existingSale = await Sale.findOne({ _id: id, user_id: userId });
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
      if (!item.productCode || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product code id and quantity",
        });
      }

      const productCodeRecord = await ProductCode.findOne({
        _id: item.productCode,
        user_id: userId,
      });
      if (!productCodeRecord) {
        return res.status(404).json({
          success: false,
          message: `Product code ${item.productCode} not found`,
        });
      }

      const productRecord = await ProductModel.findOne({
        _id: productCodeRecord.product,
        user_id: userId,
      });
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${productCodeRecord.product} not found`,
        });
      }

      const unitPrice =
        Number(productRecord.salePrice) ||
        productRecord.pricing?.currentSalesPrice ||
        productRecord.Price ||
        Number(productCodeRecord.salePrice) ||
        0;
      updatedTotalAmount += item.quantity * unitPrice;
      resolvedProducts.push({
        product: productRecord._id,
        productCode: productCodeRecord._id,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    if (resolvedStatus === "completed") {
      await validateSaleStockAvailability(
        resolvedProducts,
        existingSale.status === "completed" ? existingSale.products : [],
        userId,
      );
    }

    if (existingSale.status === "completed") {
      await rollbackSaleCompletedStockOut(existingSale._id, userId);
    }

    // 3️⃣ Update sale
    const updatedSale = await Sale.findOneAndUpdate(
      { _id: id, user_id: userId },
      {
        ...updatedData,
        customer: customer._id,
        customerName: customer.name,
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
        const productRecord = await ProductModel.findOne({
          _id: item.product,
          user_id: userId,
        });
        const productCodeRecord = await ProductCode.findOne({
          _id: item.productCode,
          user_id: userId,
        });
        const variantLabel = productCodeRecord?.variantName
          ? ` - ${productCodeRecord.variantName}`
          : "";
        invoiceItems.push({
          name: `${productRecord?.name || "Product"} (${productCodeRecord?.code || "code"})${variantLabel}`,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        });
      }

      await Invoice.findOneAndUpdate(
        { _id: existingSale.invoice, user_id: userId },
        {
          customerId: customer._id,
          customer: {
            name: customer.name,
            phone: customer.contactInfo?.phone || "",
            address: customer.contactInfo?.address || "",
          },
          items: invoiceItems,
          subTotal: updatedTotalAmount,
          totalAmount: updatedTotalAmount,
        },
      );
    }

    if (resolvedStatus === "completed") {
      await createSaleCompletedStockOut(updatedSale, userId);
      updatedSale.stockOutRecorded = true;
      await updatedSale.save();
    }

    // 4️⃣ Populate for frontend
    const populatedSale = await Sale.findOne({ _id: id, user_id: userId })
      .populate("products.product")
      .populate("products.productCode")
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
    const userId = req.user.userId;

    if (!query || query.trim() === "") {
      const allSales = await Sale.find({ user_id: userId })
        .populate("products.product")
        .populate("products.productCode")
        .populate("customer");
      return res.status(200).json({ success: true, sales: allSales });
    }

    const searchdata = await Sale.find({
      user_id: userId,
      $or: [
        { customerName: { $regex: query, $options: "i" } },
        { paymentMethod: { $regex: query, $options: "i" } },
      ],
    })
      .populate("products.product")
      .populate("products.productCode")
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

// Get Sales By Customer
module.exports.getSalesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;

    const customer = await Customer.findOne({
      _id: customerId,
      user_id: userId,
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const sales = await Sale.find({ user_id: userId, customer: customerId })
      .populate("products.product")
      .populate("products.productCode")
      .populate("customer")
      .sort({ createdAt: -1 });

    const summary = sales.reduce(
      (acc, sale) => {
        const amount = Number(sale.totalAmount || 0);
        acc.total += amount;
        if (sale.paymentStatus === "paid") acc.paid += amount;
        acc.count += 1;
        return acc;
      },
      { total: 0, paid: 0, count: 0 },
    );
    summary.remaining = summary.total - summary.paid;

    return res.status(200).json({
      success: true,
      customer,
      sales,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching customer sales history",
      error: error.message,
    });
  }
};
