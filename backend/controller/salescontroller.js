const Sale = require("../models/Salesmodel.js");
const ProductModel = require("../models/Productmodel.js");
const Customer = require("../models/Customermodel.js");
const LedgerEntry = require("../models/LedgerEntrymodel.js");
const Branch = require("../models/Branchmodel.js");
const {
  createStockOutForSale,
  removeStockOutForSale,
} = require("../libs/createstock.js");
const { invalidateReportCache } = require("./reportController.js");
const { getCountryCurrencySnapshot } = require("../libs/currency.js");
const { assertNotLocked } = require("../libs/periodLock.js");

// Create Sale
// controller/salescontroller.js

module.exports.createSale = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only branch staff can create sales invoices",
      });
    }
    const {
      customerName,
      customerId,
      products,
      paymentMethod,
      paymentStatus,
      status,
    } = req.body;
    const { branchId, countryId, userId } = req.user || {};

    if (!branchId || !countryId) {
      return res.status(400).json({
        success: false,
        message: "Branch and country are required for sale creation",
      });
    }
    await assertNotLocked({ countryId, branchId, transactionDate: new Date() });
    const currencySnapshot = await getCountryCurrencySnapshot(countryId);
    const userCurrency = currencySnapshot.currency;
    const userCurrencyExchangeRate = currencySnapshot.exchangeRate;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Validation: Make sure products array is provided and has at least one item
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and cannot be empty",
      });
    }

    // Validate each product object
    const normalizedProducts = [];
    for (const item of products) {
      const lineUnitSalePrice = Number(item.salePrice ?? item.price);
      if (!item.product || !item.quantity || !lineUnitSalePrice) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product id, quantity, and price",
        });
      }
      normalizedProducts.push({
        product: item.product,
        quantity: Number(item.quantity),
        price: lineUnitSalePrice,
        salePrice: lineUnitSalePrice,
      });
    }

    // Calculate totalAmount
    const totalAmount = normalizedProducts.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    // Validate customer scope if provided
    let resolvedCustomerName = customerName;
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
      if (
        customer.countryId?.toString() !== countryId?.toString() ||
        customer.branchId?.toString() !== branchId?.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Customer does not belong to your branch/country",
        });
      }
      resolvedCustomerName = customer.name;
    }

    // Create sale
    const priceUSD = Number(
      (totalAmount / userCurrencyExchangeRate).toFixed(2),
    );
    const saleCount = await Sale.countDocuments({ branchId });
    const saleNumber = `SAL-${branch.branchCode}-${String(saleCount + 1).padStart(5, "0")}`;
    const sale = await Sale.create({
      saleNumber,
      customerName: resolvedCustomerName,
      customerId: customerId || null,
      products: normalizedProducts,
      paymentMethod,
      paymentStatus,
      status,
      totalAmount,
      currency: userCurrency,
      exchangeRateUsed: userCurrencyExchangeRate,
      priceUSD,
      branchId,
      countryId,
      workflowStatus: "Draft",
      createdBy: userId,
      lastUpdatedBy: userId,
    });
    if (status === "completed") {
      try {
        await createStockOutForSale(sale);
      } catch (stockError) {
        await Sale.findByIdAndDelete(sale._id);
        return res.status(stockError.statusCode || 500).json({
          success: false,
          message: stockError.message || "Failed to process stock-out",
          available: stockError.available,
          requested: stockError.requested,
        });
      }
    }
    if (customerId) {
      await LedgerEntry.create({
        partyType: "customer",
        partyId: customerId,
        entryType: "invoice",
        debit: totalAmount,
        credit: 0,
        currency: userCurrency,
        amountUSD: priceUSD,
        exchangeRateUsed: userCurrencyExchangeRate,
        branchId,
        countryId,
        referenceType: "sale",
        referenceId: sale._id,
        createdBy: req.user.userId,
      });
      if (paymentStatus === "paid") {
        await LedgerEntry.create({
          partyType: "customer",
          partyId: customerId,
          entryType: "payment",
          debit: 0,
          credit: totalAmount,
          currency: userCurrency,
          amountUSD: priceUSD,
          exchangeRateUsed: userCurrencyExchangeRate,
          branchId,
          countryId,
          referenceType: "sale",
          referenceId: sale._id,
          createdBy: req.user.userId,
        });
      }
    }
    const populatedSale = await Sale.findById(sale._id).populate(
      "products.product",
    );
    invalidateReportCache();
    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale: populatedSale,
    });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({
        success: false,
        message: error.message,
      });
    }
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
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }

    const sales = await Sale.find(query)
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
    const { role, countryId, branchId } = req.user || {};
    const sale = await Sale.findById(id).populate("products.product");
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    if (
      role === "countryadmin" &&
      sale.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      sale.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
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
    const { role, countryId, branchId, userCurrencyExchangeRate } =
      req.user || {};

    // 1️⃣ Fetch existing sale
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }
    await assertNotLocked({
      countryId: existingSale.countryId,
      branchId: existingSale.branchId,
      transactionDate: existingSale.createdAt,
    });
    if (existingSale.workflowStatus === "Locked") {
      return res.status(403).json({
        success: false,
        message: "Sale is locked and cannot be edited",
      });
    }
    if (
      role === "countryadmin" &&
      existingSale.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      existingSale.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const workflowOnly =
      updatedData.workflowStatus &&
      !updatedData.products &&
      Object.keys(updatedData).every((key) =>
        ["workflowStatus", "note", "revisionReason"].includes(key),
      );

    if (workflowOnly) {
      const nextStatus = updatedData.workflowStatus;
      const currentStatus = existingSale.workflowStatus;

      if (nextStatus === "Submitted" && currentStatus === "Draft") {
        if (!["branchadmin", "staff"].includes(role)) {
          return res.status(403).json({
            success: false,
            message: "Only branch staff can submit sales",
          });
        }
        existingSale.workflowStatus = "Submitted";
        existingSale.submittedBy = req.user.userId;
        existingSale.submittedAt = new Date();
      } else if (nextStatus === "Draft" && currentStatus === "Submitted") {
        if (!["branchadmin", "countryadmin"].includes(role)) {
          return res.status(403).json({
            success: false,
            message: "Only branch or country admin can reject submissions",
          });
        }
        existingSale.workflowStatus = "Draft";
      } else if (nextStatus === "Approved" && currentStatus === "Submitted") {
        if (!["branchadmin", "countryadmin"].includes(role)) {
          return res.status(403).json({
            success: false,
            message: "Only branch or country admin can approve sales",
          });
        }
        existingSale.workflowStatus = "Approved";
        existingSale.approvedBy = req.user.userId;
        existingSale.approvedAt = new Date();
      } else if (nextStatus === "Locked" && currentStatus === "Approved") {
        if (role !== "branchadmin") {
          return res.status(403).json({
            success: false,
            message: "Only branch admin can lock sales",
          });
        }
        existingSale.workflowStatus = "Locked";
        existingSale.lockedBy = req.user.userId;
        existingSale.lockedAt = new Date();
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid workflow transition",
        });
      }

      existingSale.lastUpdatedBy = req.user.userId;
      await existingSale.save();
      invalidateReportCache();
      return res.status(200).json({
        success: true,
        message: "Workflow status updated",
        sale: existingSale,
      });
    }

    if (!updatedData.products || !updatedData.products.length) {
      return res.status(400).json({
        success: false,
        message: "Products are required.",
      });
    }

    if (existingSale.workflowStatus === "Submitted" && role !== "branchadmin") {
      return res.status(403).json({
        success: false,
        message: "Only branch admin can edit submitted sales",
      });
    }
    if (existingSale.workflowStatus === "Approved") {
      if (role !== "branchadmin") {
        return res.status(403).json({
          success: false,
          message: "Only branch admin can edit approved sales",
        });
      }
      if (!updatedData.revisionReason) {
        return res.status(400).json({
          success: false,
          message: "Revision reason is required for approved sales edits",
        });
      }
    }

    // 2️⃣ Validate and normalize new products
    let updatedTotalAmount = 0;
    const normalizedProducts = [];
    const nextStatus = updatedData.status || existingSale.status;
    const oldWasCompleted = existingSale.status === "completed";
    const newIsCompleted = nextStatus === "completed";

    for (const item of updatedData.products) {
      const lineUnitSalePrice = Number(item.salePrice ?? item.price);
      if (!item.product || !item.quantity || !lineUnitSalePrice) {
        return res.status(400).json({
          success: false,
          message: "Each product must have product id, quantity, and price",
        });
      }

      const normalizedItem = {
        product: item.product,
        quantity: Number(item.quantity),
        price: lineUnitSalePrice,
        salePrice: lineUnitSalePrice,
      };
      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      normalizedProducts.push(normalizedItem);
      updatedTotalAmount += normalizedItem.quantity * normalizedItem.price;
    }

    if (oldWasCompleted) {
      await removeStockOutForSale(existingSale);
    }

    if (newIsCompleted) {
      for (const item of normalizedProducts) {
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
    }

    // 3️⃣ Update sale
    const rate = existingSale.exchangeRateUsed || userCurrencyExchangeRate || 1;
    const priceUSD = Number((updatedTotalAmount / rate).toFixed(2));
    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      {
        ...updatedData,
        products: normalizedProducts,
        totalAmount: updatedTotalAmount,
        priceUSD,
        lastUpdatedBy: req.user.userId,
      },
      { new: true },
    );

    if (newIsCompleted) {
      try {
        await createStockOutForSale(updatedSale);
      } catch (stockError) {
        if (!oldWasCompleted) {
          // Sale newly marked completed failed due to stock; keep updated sale but report failure
          return res.status(stockError.statusCode || 500).json({
            success: false,
            message: stockError.message || "Failed to process stock-out",
            available: stockError.available,
            requested: stockError.requested,
          });
        }
        throw stockError;
      }
    }

    // 4️⃣ Populate for frontend
    const populatedSale = await Sale.findById(id).populate("products.product");

    if (
      existingSale.workflowStatus === "Approved" &&
      updatedData.revisionReason
    ) {
      const changes = Object.keys(updatedData)
        .filter((key) => !["revisionReason", "workflowStatus"].includes(key))
        .map((key) => ({
          field: key,
          from: existingSale[key],
          to: updatedSale[key],
        }));
      updatedSale.revisions.push({
        changes,
        reason: updatedData.revisionReason,
        updatedBy: req.user.userId,
      });
      await updatedSale.save();
    }

    // Ledger adjustment if customer linked
    if (updatedSale?.customerId) {
      const diff = updatedTotalAmount - (existingSale.totalAmount || 0);
      if (diff !== 0) {
        await LedgerEntry.create({
          partyType: "customer",
          partyId: updatedSale.customerId,
          entryType: "adjustment",
          debit: diff > 0 ? diff : 0,
          credit: diff < 0 ? Math.abs(diff) : 0,
          currency: updatedSale.currency,
          amountUSD: Math.abs(diff) / rate,
          exchangeRateUsed: rate,
          branchId: updatedSale.branchId,
          countryId: updatedSale.countryId,
          referenceType: "sale",
          referenceId: updatedSale._id,
          createdBy: req.user.userId,
        });
      }

      if (
        updatedSale.paymentStatus === "paid" &&
        existingSale.paymentStatus !== "paid"
      ) {
        await LedgerEntry.create({
          partyType: "customer",
          partyId: updatedSale.customerId,
          entryType: "payment",
          debit: 0,
          credit: updatedSale.totalAmount,
          currency: updatedSale.currency,
          amountUSD: updatedSale.priceUSD,
          exchangeRateUsed: rate,
          branchId: updatedSale.branchId,
          countryId: updatedSale.countryId,
          referenceType: "sale",
          referenceId: updatedSale._id,
          createdBy: req.user.userId,
        });
      }
    }

    invalidateReportCache();
    res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: populatedSale,
    });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({
        success: false,
        message: error.message,
      });
    }
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
    const { role, countryId, branchId } = req.user || {};

    if (!query || query.trim() === "") {
      const allQuery = {};
      if (role === "countryadmin") {
        allQuery.countryId = countryId;
      } else if (["branchadmin", "staff"].includes(role)) {
        allQuery.branchId = branchId;
        allQuery.countryId = countryId;
      }
      const allSales = await Sale.find(allQuery).populate("products.product");
      return res.status(200).json({ success: true, sales: allSales });
    }

    const searchQuery = {
      $or: [
        { customerName: { $regex: query, $options: "i" } },
        { paymentMethod: { $regex: query, $options: "i" } },
        { saleNumber: { $regex: query, $options: "i" } },
      ],
    };
    if (role === "countryadmin") {
      searchQuery.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      searchQuery.branchId = branchId;
      searchQuery.countryId = countryId;
    }

    const searchdata =
      await Sale.find(searchQuery).populate("products.product");

    res.status(200).json({ success: true, sales: searchdata });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching sales",
      error: error.message,
    });
  }
};
