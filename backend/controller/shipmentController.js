// controller/shipmentController.js - Complete Shipment Controller

const Shipment = require("../models/Shipmentmodel.js");
const Branch = require("../models/Branchmodel.js");
const Product = require("../models/Productmodel.js");
const logActivity = require("../libs/logger.js");
const { invalidateReportCache } = require("./reportController.js");

// ==================== CREATE SHIPMENT ====================
exports.createShipment = async (req, res) => {
  try {
    const currentUser = req.user;
    const shipmentData = req.body;
    const {
      userCurrency,
      userCurrencyExchangeRate,
      countryId: userCountryId,
      branchId: userBranchId,
    } = currentUser || {};

    // Validate hierarchy access
    if (!shipmentData.countryId || !shipmentData.branchId) {
      return res.status(400).json({
        message: "Country ID and Branch ID are required",
      });
    }

    // Verify branch belongs to country
    const branch = await Branch.findById(shipmentData.branchId);
    if (!branch || branch.countryId.toString() !== shipmentData.countryId) {
      return res.status(400).json({
        message: "Invalid branch or country combination",
      });
    }

    // Check user permissions based on hierarchy
    if (currentUser.role === "countryadmin") {
      if (userCountryId.toString() !== shipmentData.countryId) {
        return res.status(403).json({
          message: "Cannot create shipment in another country",
        });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (userBranchId.toString() !== shipmentData.branchId) {
        return res.status(403).json({
          message: "Cannot create shipment in another branch",
        });
      }
    }

    if (!userCurrency || !userCurrencyExchangeRate) {
      return res.status(400).json({
        message: "Currency configuration is missing for this user",
      });
    }

    // Generate shipment number
    const shipmentCount = await Shipment.countDocuments({
      branchId: shipmentData.branchId,
    });
    const shipmentNumber = `SHP-${branch.branchCode}-${String(shipmentCount + 1).padStart(5, "0")}`;

    // Prepare shipment data
    const newShipment = new Shipment({
      ...shipmentData,
      shipmentNumber,
      currency: userCurrency,
      exchangeRate: userCurrencyExchangeRate,
      createdBy: currentUser.userId,
      lastUpdatedBy: currentUser.userId,
    });

    // Add initial status to history
    newShipment.statusHistory.push({
      status: shipmentData.status || "Booking",
      note: "Shipment created",
      updatedBy: currentUser.userId,
      updatedAt: new Date(),
    });

    await newShipment.save();

    // Populate references
    await newShipment.populate([
      { path: "countryId", select: "name code currency" },
      { path: "branchId", select: "name branchCode city" },
      { path: "supplierId", select: "name contact" },
      { path: "createdBy", select: "name email" },
    ]);

    // Log activity
    await logActivity({
      action: "Shipment Created",
      description: `Shipment ${shipmentNumber} created`,
      entity: "shipment",
      entityId: newShipment._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    invalidateReportCache();
    res.status(201).json({
      message: "Shipment created successfully",
      shipment: newShipment,
    });
  } catch (error) {
    console.error("Error creating shipment:", error);
    res.status(500).json({
      message: "Error creating shipment",
      error: error.message,
    });
  }
};

// ==================== GET ALL SHIPMENTS ====================
exports.getAllShipments = async (req, res) => {
  try {
    const currentUser = req.user;
    const {
      status,
      shipmentType,
      transportMode,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    // Build query based on user role
    let query = { isActive: true };

    if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      query.branchId = currentUser.branchId;
      query.countryId = currentUser.countryId;
    }

    // Apply filters
    if (status) query.status = status;
    if (shipmentType) query.shipmentType = shipmentType;
    if (transportMode) query.transportMode = transportMode;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const shipments = await Shipment.find(query)
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("supplierId", "name contact")
      .populate("clearingJobId", "jobNumber status")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Shipment.countDocuments(query);

    res.status(200).json({
      shipments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    res.status(500).json({
      message: "Error fetching shipments",
      error: error.message,
    });
  }
};

// ==================== GET SHIPMENT BY ID ====================
exports.getShipmentById = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const shipment = await Shipment.findById(id)
      .populate("countryId", "name code currency exchangeRate")
      .populate("branchId", "name branchCode city address")
      .populate("supplierId", "name contact email address")
      .populate("items.productId", "name sku")
      .populate("clearingJobId", "jobNumber status agentName")
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .populate("statusHistory.updatedBy", "name")
      .populate("documents.uploadedBy", "name")
      .populate("expenses.addedBy", "name");

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check access permissions
    if (currentUser.role === "countryadmin") {
      if (
        shipment.countryId._id.toString() !== currentUser.countryId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (
        shipment.branchId._id.toString() !== currentUser.branchId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.status(200).json(shipment);
  } catch (error) {
    console.error("Error fetching shipment:", error);
    res.status(500).json({
      message: "Error fetching shipment",
      error: error.message,
    });
  }
};

// ==================== UPDATE SHIPMENT ====================
exports.updateShipment = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const shipment = await Shipment.findById(id);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check if locked
    if (shipment.isLocked) {
      return res.status(403).json({
        message: "Shipment is locked and cannot be edited",
      });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (
        key !== "_id" &&
        key !== "shipmentNumber" &&
        key !== "createdBy" &&
        key !== "countryId" &&
        key !== "branchId" &&
        key !== "currency" &&
        key !== "exchangeRate"
      ) {
        shipment[key] = updateData[key];
      }
    });

    shipment.lastUpdatedBy = currentUser.userId;

    await shipment.save();

    // Populate references
    await shipment.populate([
      { path: "countryId", select: "name code currency" },
      { path: "branchId", select: "name branchCode city" },
      { path: "supplierId", select: "name contact" },
      { path: "lastUpdatedBy", select: "name email" },
    ]);

    await logActivity({
      action: "Shipment Updated",
      description: `Shipment ${shipment.shipmentNumber} updated`,
      entity: "shipment",
      entityId: shipment._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    invalidateReportCache();
    res.status(200).json({
      message: "Shipment updated successfully",
      shipment,
    });
  } catch (error) {
    console.error("Error updating shipment:", error);
    res.status(500).json({
      message: "Error updating shipment",
      error: error.message,
    });
  }
};

// ==================== UPDATE SHIPMENT STATUS ====================
exports.updateShipmentStatus = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const shipment = await Shipment.findById(id);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Add status to history
    shipment.addStatusHistory(status, note, currentUser.userId);

    // Auto-lock if delivered
    if (status === "Delivered") {
      shipment.isLocked = true;
      shipment.deliveryDate = new Date();
    }

    await shipment.save();

    await logActivity({
      action: "Shipment Status Updated",
      description: `Shipment ${shipment.shipmentNumber} status changed to ${status}`,
      entity: "shipment",
      entityId: shipment._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    invalidateReportCache();
    res.status(200).json({
      message: "Status updated successfully",
      shipment,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      message: "Error updating status",
      error: error.message,
    });
  }
};

// ==================== ADD SHIPMENT DOCUMENT ====================
exports.addShipmentDocument = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const { documentType, documentName, documentUrl } = req.body;

    if (!documentType || !documentName || !documentUrl) {
      return res.status(400).json({
        message: "Document type, name, and URL are required",
      });
    }

    const shipment = await Shipment.findById(id);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    shipment.documents.push({
      documentType,
      documentName,
      documentUrl,
      uploadedBy: currentUser.userId,
      uploadedAt: new Date(),
    });

    shipment.lastUpdatedBy = currentUser.userId;
    await shipment.save();

    await logActivity({
      action: "Shipment Document Added",
      description: `Document ${documentName} added to shipment ${shipment.shipmentNumber}`,
      entity: "shipment",
      entityId: shipment._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Document added successfully",
      shipment,
    });
  } catch (error) {
    console.error("Error adding document:", error);
    res.status(500).json({
      message: "Error adding document",
      error: error.message,
    });
  }
};

// ==================== ADD SHIPMENT EXPENSE ====================
exports.addShipmentExpense = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const expenseData = req.body;

    const shipment = await Shipment.findById(id);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    shipment.expenses.push({
      ...expenseData,
      addedBy: currentUser.userId,
      addedAt: new Date(),
    });

    shipment.lastUpdatedBy = currentUser.userId;
    await shipment.save();

    await logActivity({
      action: "Shipment Expense Added",
      description: `Expense ${expenseData.expenseType} added to shipment ${shipment.shipmentNumber}`,
      entity: "shipment",
      entityId: shipment._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    invalidateReportCache();
    res.status(200).json({
      message: "Expense added successfully",
      shipment,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({
      message: "Error adding expense",
      error: error.message,
    });
  }
};

// ==================== CALCULATE SHIPMENT PROFIT ====================
exports.calculateShipmentProfit = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const shipment = await Shipment.findById(id);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const profitAnalysis = {
      shipmentNumber: shipment.shipmentNumber,
      currency: shipment.currency,
      revenue: {
        sellingPrice: shipment.sellingPrice,
        sellingPriceUSD: shipment.sellingPriceUSD,
      },
      costs: {
        goodsValue: shipment.goodsValue,
        freightCharges: shipment.freightCharges,
        insuranceCharges: shipment.insuranceCharges,
        customsDuty: shipment.customsDuty,
        otherExpenses: shipment.otherExpenses,
        totalCost: shipment.totalCost,
        totalCostUSD: shipment.totalCostUSD,
      },
      expensesByType: shipment.getExpensesByType(),
      profitLoss: {
        amount: shipment.profitLoss,
        amountUSD: shipment.profitLossUSD,
        margin: shipment.profitMargin,
      },
    };

    res.status(200).json(profitAnalysis);
  } catch (error) {
    console.error("Error calculating profit:", error);
    res.status(500).json({
      message: "Error calculating profit",
      error: error.message,
    });
  }
};

// ==================== DELETE SHIPMENT (SOFT DELETE) ====================
exports.deleteShipment = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const shipment = await Shipment.findById(id);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Only superadmin, countryadmin, and branchadmin can delete
    if (
      !["superadmin", "countryadmin", "branchadmin"].includes(currentUser.role)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check hierarchy permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (currentUser.role === "branchadmin") {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Soft delete
    shipment.isActive = false;
    shipment.lastUpdatedBy = currentUser.userId;
    await shipment.save();

    await logActivity({
      action: "Shipment Deleted",
      description: `Shipment ${shipment.shipmentNumber} deleted`,
      entity: "shipment",
      entityId: shipment._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    invalidateReportCache();
    res.status(200).json({
      message: "Shipment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    res.status(500).json({
      message: "Error deleting shipment",
      error: error.message,
    });
  }
};

// ==================== GET SHIPMENT STATISTICS ====================
exports.getShipmentStatistics = async (req, res) => {
  try {
    const currentUser = req.user;

    let matchQuery = { isActive: true };

    if (currentUser.role === "countryadmin") {
      matchQuery.countryId = currentUser.countryId;
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      matchQuery.branchId = currentUser.branchId;
      matchQuery.countryId = currentUser.countryId;
    }

    const stats = await Shipment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalValueUSD: { $sum: "$totalCostUSD" },
          totalProfitUSD: { $sum: "$profitLossUSD" },
          inTransit: {
            $sum: { $cond: [{ $eq: ["$status", "In Transit"] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] },
          },
          pending: {
            $sum: {
              $cond: [{ $in: ["$status", ["Booking", "Confirmed"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.status(200).json(stats[0] || {});
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};
