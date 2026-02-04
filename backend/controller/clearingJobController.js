// controller/clearingJobController.js - Complete Clearing Job Controller

const ClearingJob = require("../models/ClearingJobmodel.js");
const Shipment = require("../models/Shipmentmodel.js");
const User = require("../models/Usermodel.js");
const Country = require("../models/Countrymodel.js");
const Branch = require("../models/Branchmodel.js");
const logActivity = require("../libs/logger.js");

// ==================== CREATE CLEARING JOB ====================
exports.createClearingJob = async (req, res) => {
  try {
    const currentUser = req.user;
    const jobData = req.body;

    // Validate required fields
    if (!jobData.shipmentId) {
      return res.status(400).json({ message: "Shipment ID is required" });
    }

    // Get shipment
    const shipment = await Shipment.findById(jobData.shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (shipment.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(403).json({
          message: "Cannot create clearing job for shipment in another country",
        });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (shipment.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({
          message: "Cannot create clearing job for shipment in another branch",
        });
      }
    }

    // Get country for currency
    const country = await Country.findById(shipment.countryId);
    const branch = await Branch.findById(shipment.branchId);

    // Generate job number
    const jobCount = await ClearingJob.countDocuments({
      branchId: shipment.branchId,
    });
    const jobNumber = `CLR-${branch.branchCode}-${String(jobCount + 1).padStart(5, "0")}`;

    // Determine job type based on shipment type
    let jobType = "Import Clearance";
    if (shipment.shipmentType === "Export") {
      jobType = "Export Clearance";
    }

    // Create clearing job
    const newJob = new ClearingJob({
      ...jobData,
      jobNumber,
      jobType,
      countryId: shipment.countryId,
      branchId: shipment.branchId,
      currency: country.currency,
      exchangeRate: country.exchangeRate,
      createdBy: currentUser._id,
      lastUpdatedBy: currentUser._id,
    });

    // Add initial status to history
    newJob.statusHistory.push({
      status: "Pending",
      note: "Clearing job created",
      updatedBy: currentUser._id,
      updatedAt: new Date(),
    });

    await newJob.save();

    // Update shipment with clearing job reference
    shipment.clearingJobId = newJob._id;
    await shipment.save();

    // Populate references
    await newJob.populate([
      { path: "countryId", select: "name code currency" },
      { path: "branchId", select: "name branchCode city" },
      { path: "shipmentId", select: "shipmentNumber containerNumber" },
      { path: "createdBy", select: "name email" },
    ]);

    await logActivity({
      action: "Clearing Job Created",
      description: `Clearing job ${jobNumber} created for shipment ${shipment.shipmentNumber}`,
      entity: "clearingJob",
      entityId: newJob._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Clearing job created successfully",
      clearingJob: newJob,
    });
  } catch (error) {
    console.error("Error creating clearing job:", error);
    res.status(500).json({
      message: "Error creating clearing job",
      error: error.message,
    });
  }
};

// ==================== GET ALL CLEARING JOBS ====================
exports.getAllClearingJobs = async (req, res) => {
  try {
    const currentUser = req.user;
    const {
      status,
      jobType,
      agentId,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    // Build query based on user role
    let query = { isActive: true };

    if (currentUser.role === "agent") {
      // Agents only see jobs assigned to them
      query.agentId = currentUser._id;
    } else if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      query.branchId = currentUser.branchId;
    }

    // Apply filters
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;
    if (agentId) query.agentId = agentId;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const clearingJobs = await ClearingJob.find(query)
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("shipmentId", "shipmentNumber shipmentType containerNumber")
      .populate("agentId", "name email contact")
      .populate("createdBy", "name email")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ClearingJob.countDocuments(query);

    res.status(200).json({
      clearingJobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching clearing jobs:", error);
    res.status(500).json({
      message: "Error fetching clearing jobs",
      error: error.message,
    });
  }
};

// ==================== GET CLEARING JOB BY ID ====================
exports.getClearingJobById = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const clearingJob = await ClearingJob.findById(id)
      .populate("countryId", "name code currency exchangeRate")
      .populate("branchId", "name branchCode city address")
      .populate("shipmentId")
      .populate("agentId", "name email contact")
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .populate("statusHistory.updatedBy", "name")
      .populate("notes.addedBy", "name")
      .populate("documents.uploadedBy", "name")
      .populate("expenses.addedBy", "name");

    if (!clearingJob) {
      return res.status(404).json({ message: "Clearing job not found" });
    }

    // Check access permissions
    if (currentUser.role === "agent") {
      if (
        !clearingJob.agentId ||
        clearingJob.agentId._id.toString() !== currentUser._id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied. This job is not assigned to you.",
        });
      }
    } else if (currentUser.role === "countryadmin") {
      if (
        clearingJob.countryId._id.toString() !==
        currentUser.countryId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (
        clearingJob.branchId._id.toString() !== currentUser.branchId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.status(200).json(clearingJob);
  } catch (error) {
    console.error("Error fetching clearing job:", error);
    res.status(500).json({
      message: "Error fetching clearing job",
      error: error.message,
    });
  }
};

// ==================== UPDATE CLEARING JOB ====================
exports.updateClearingJob = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const clearingJob = await ClearingJob.findById(id);

    if (!clearingJob) {
      return res.status(404).json({ message: "Clearing job not found" });
    }

    // Agents can only update specific fields
    if (currentUser.role === "agent") {
      if (
        !clearingJob.agentId ||
        clearingJob.agentId.toString() !== currentUser._id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied. This job is not assigned to you.",
        });
      }

      // Agents can only update certain fields
      const allowedFields = [
        "declarationNumber",
        "declarationDate",
        "customsOfficer",
        "assessedValue",
        "customsDuty",
        "vatAmount",
        "otherTaxes",
        "agentFee",
        "documentationFee",
        "otherCharges",
        "submissionDate",
        "inspectionDate",
        "assessmentDate",
        "paymentDate",
        "releaseDate",
        "specialInstructions",
      ];

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          clearingJob[key] = updateData[key];
        }
      });
    } else {
      // Check permissions for other roles
      if (currentUser.role === "countryadmin") {
        if (
          clearingJob.countryId.toString() !== currentUser.countryId.toString()
        ) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (["branchadmin", "staff"].includes(currentUser.role)) {
        if (
          clearingJob.branchId.toString() !== currentUser.branchId.toString()
        ) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Update all fields for non-agent users
      Object.keys(updateData).forEach((key) => {
        if (key !== "_id" && key !== "jobNumber" && key !== "createdBy") {
          clearingJob[key] = updateData[key];
        }
      });
    }

    clearingJob.lastUpdatedBy = currentUser._id;
    await clearingJob.save();

    await clearingJob.populate([
      { path: "countryId", select: "name code currency" },
      { path: "branchId", select: "name branchCode city" },
      { path: "shipmentId", select: "shipmentNumber" },
      { path: "agentId", select: "name email" },
    ]);

    await logActivity({
      action: "Clearing Job Updated",
      description: `Clearing job ${clearingJob.jobNumber} updated`,
      entity: "clearingJob",
      entityId: clearingJob._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Clearing job updated successfully",
      clearingJob,
    });
  } catch (error) {
    console.error("Error updating clearing job:", error);
    res.status(500).json({
      message: "Error updating clearing job",
      error: error.message,
    });
  }
};

// ==================== UPDATE CLEARING JOB STATUS ====================
exports.updateClearingJobStatus = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const clearingJob = await ClearingJob.findById(id);

    if (!clearingJob) {
      return res.status(404).json({ message: "Clearing job not found" });
    }

    // Check permissions
    if (currentUser.role === "agent") {
      if (
        !clearingJob.agentId ||
        clearingJob.agentId.toString() !== currentUser._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (currentUser.role === "countryadmin") {
      if (
        clearingJob.countryId.toString() !== currentUser.countryId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (clearingJob.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Update status
    clearingJob.addStatusHistory(status, note, currentUser._id);

    await clearingJob.save();

    await logActivity({
      action: "Clearing Job Status Updated",
      description: `Clearing job ${clearingJob.jobNumber} status changed to ${status}`,
      entity: "clearingJob",
      entityId: clearingJob._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Status updated successfully",
      clearingJob,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      message: "Error updating status",
      error: error.message,
    });
  }
};

// ==================== ADD NOTE TO CLEARING JOB ====================
exports.addClearingJobNote = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const { message, isInternal } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const clearingJob = await ClearingJob.findById(id);

    if (!clearingJob) {
      return res.status(404).json({ message: "Clearing job not found" });
    }

    // Check permissions
    if (currentUser.role === "agent") {
      if (
        !clearingJob.agentId ||
        clearingJob.agentId.toString() !== currentUser._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (currentUser.role === "countryadmin") {
      if (
        clearingJob.countryId.toString() !== currentUser.countryId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      if (clearingJob.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Agents cannot add internal notes
    const noteIsInternal =
      currentUser.role === "agent" ? false : isInternal || false;

    clearingJob.addNote(message, currentUser._id, noteIsInternal);

    await clearingJob.save();

    await clearingJob.populate("notes.addedBy", "name");

    res.status(200).json({
      message: "Note added successfully",
      clearingJob,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({
      message: "Error adding note",
      error: error.message,
    });
  }
};

// ==================== ASSIGN AGENT TO CLEARING JOB ====================
exports.assignAgentToClearingJob = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const { agentId } = req.body;

    // Only admin roles can assign agents
    if (
      !["superadmin", "countryadmin", "branchadmin"].includes(currentUser.role)
    ) {
      return res.status(403).json({
        message: "Only admins can assign agents to clearing jobs",
      });
    }

    if (!agentId) {
      return res.status(400).json({ message: "Agent ID is required" });
    }

    const clearingJob = await ClearingJob.findById(id);

    if (!clearingJob) {
      return res.status(404).json({ message: "Clearing job not found" });
    }

    // Verify agent exists and has correct role
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "agent") {
      return res.status(400).json({ message: "Invalid agent" });
    }

    // Check hierarchy permissions
    if (currentUser.role === "countryadmin") {
      if (
        clearingJob.countryId.toString() !== currentUser.countryId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (agent.countryId.toString() !== currentUser.countryId.toString()) {
        return res.status(400).json({
          message: "Agent must be from the same country",
        });
      }
    } else if (currentUser.role === "branchadmin") {
      if (clearingJob.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (agent.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(400).json({
          message: "Agent must be from the same branch",
        });
      }
    }

    // Assign agent
    clearingJob.assignAgent(
      agentId,
      agent.name,
      agent.contact,
      currentUser._id,
    );

    await clearingJob.save();

    await logActivity({
      action: "Agent Assigned to Clearing Job",
      description: `Agent ${agent.name} assigned to clearing job ${clearingJob.jobNumber}`,
      entity: "clearingJob",
      entityId: clearingJob._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Agent assigned successfully",
      clearingJob,
    });
  } catch (error) {
    console.error("Error assigning agent:", error);
    res.status(500).json({
      message: "Error assigning agent",
      error: error.message,
    });
  }
};

// ==================== GET MY CLEARING JOBS (AGENT VIEW) ====================
exports.getMyClearingJobs = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== "agent") {
      return res.status(403).json({
        message: "This endpoint is only for agents",
      });
    }

    const { status, page = 1, limit = 50 } = req.query;

    let query = {
      agentId: currentUser._id,
      isActive: true,
    };

    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const clearingJobs = await ClearingJob.find(query)
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("shipmentId", "shipmentNumber shipmentType containerNumber")
      .populate("createdBy", "name email")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ClearingJob.countDocuments(query);

    res.status(200).json({
      clearingJobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching my clearing jobs:", error);
    res.status(500).json({
      message: "Error fetching clearing jobs",
      error: error.message,
    });
  }
};

// ==================== DELETE CLEARING JOB (SOFT DELETE) ====================
exports.deleteClearingJob = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    // Only admins can delete
    if (
      !["superadmin", "countryadmin", "branchadmin"].includes(currentUser.role)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const clearingJob = await ClearingJob.findById(id);

    if (!clearingJob) {
      return res.status(404).json({ message: "Clearing job not found" });
    }

    // Check permissions
    if (currentUser.role === "countryadmin") {
      if (
        clearingJob.countryId.toString() !== currentUser.countryId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (currentUser.role === "branchadmin") {
      if (clearingJob.branchId.toString() !== currentUser.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Soft delete
    clearingJob.isActive = false;
    clearingJob.lastUpdatedBy = currentUser._id;
    await clearingJob.save();

    await logActivity({
      action: "Clearing Job Deleted",
      description: `Clearing job ${clearingJob.jobNumber} deleted`,
      entity: "clearingJob",
      entityId: clearingJob._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Clearing job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting clearing job:", error);
    res.status(500).json({
      message: "Error deleting clearing job",
      error: error.message,
    });
  }
};

// ==================== GET CLEARING JOB STATISTICS ====================
exports.getClearingJobStatistics = async (req, res) => {
  try {
    const currentUser = req.user;

    let matchQuery = { isActive: true };

    if (currentUser.role === "agent") {
      matchQuery.agentId = currentUser._id;
    } else if (currentUser.role === "countryadmin") {
      matchQuery.countryId = currentUser.countryId;
    } else if (["branchadmin", "staff"].includes(currentUser.role)) {
      matchQuery.branchId = currentUser.branchId;
    }

    const stats = await ClearingJob.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          totalCostUSD: { $sum: "$totalClearingCostUSD" },
          pending: {
            $sum: {
              $cond: [{ $in: ["$status", ["Pending", "Assigned"]] }, 1, 0],
            },
          },
          inProgress: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      "Documents Submitted",
                      "Under Inspection",
                      "Duties Assessed",
                      "Payment Pending",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
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
