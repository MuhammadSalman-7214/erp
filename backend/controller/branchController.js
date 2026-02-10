// controller/branchController.js - NEW

const Branch = require("../models/Branchmodel.js");
const User = require("../models/Usermodel.js");
const Country = require("../models/Countrymodel.js");
const logActivity = require("../libs/logger.js");

// Create Branch
exports.createBranch = async (req, res) => {
  try {
    const { name, branchCode, countryId, city, address, settings } = req.body;
    const creatorId = req.user._id;
    const { role, countryId: userCountryId } = req.user || {};

    if (role === "countryadmin" && countryId !== userCountryId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only create branches in your country.",
      });
    }

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    const existingBranch = await Branch.findOne({ branchCode });
    if (existingBranch) {
      return res.status(400).json({ message: "Branch code already exists" });
    }

    const newBranch = new Branch({
      name,
      branchCode: branchCode.toUpperCase(),
      countryId,
      city,
      address,
      settings,
      createdBy: creatorId,
    });

    const savedBranch = await newBranch.save();

    await logActivity({
      action: "Branch Created",
      description: `Branch ${name} (${branchCode}) created in ${city}.`,
      entity: "branch",
      entityId: savedBranch._id,
      userId: creatorId,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Branch created successfully",
      branch: savedBranch,
    });
  } catch (error) {
    console.error("Error creating branch:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get All Branches (with hierarchy filtering)
exports.getAllBranches = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { isActive: true };

    // Country admin sees only their country's branches
    if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    }

    // Branch admin/staff see only their branch
    if (currentUser.role === "agent") {
      return res.status(403).json({ message: "Access denied" });
    }
    if (["branchadmin", "staff"].includes(currentUser.role)) {
      query._id = currentUser.branchId;
    }

    const branches = await Branch.find(query)
      .populate("countryId", "name code currency")
      .populate("branchAdminId", "name email")
      .sort({ countryId: 1, city: 1 });

    res.status(200).json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get Branches by Country
exports.getBranchesByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const { role, branchId, countryId: userCountryId } = req.user || {};

    if (role === "countryadmin" && countryId !== userCountryId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only view branches in your country.",
      });
    }
    if (role === "agent") {
      return res.status(403).json({
        message: "Access denied. Agents cannot view branches.",
      });
    }
    if (["branchadmin", "staff"].includes(role)) {
      if (countryId !== userCountryId?.toString()) {
        return res.status(403).json({
          message: "Access denied. You can only view your country branches.",
        });
      }
      const branch = await Branch.find({ _id: branchId, isActive: true })
        .populate("branchAdminId", "name email")
        .sort({ city: 1 });
      return res.status(200).json(branch);
    }

    const branches = await Branch.find({ countryId, isActive: true })
      .populate("branchAdminId", "name email")
      .sort({ city: 1 });

    res.status(200).json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Assign Branch Admin
exports.assignBranchAdmin = async (req, res) => {
  try {
    const { branchId, userId } = req.body;
    const { role, countryId } = req.user || {};

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    if (
      role === "countryadmin" &&
      branch.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "branchadmin") {
      return res
        .status(400)
        .json({ message: "Invalid user or user is not a branch admin" });
    }

    branch.branchAdminId = userId;
    await branch.save();

    // Update user's branchId and countryId
    user.branchId = branchId;
    user.countryId = branch.countryId;
    await user.save();

    res.status(200).json({
      message: "Branch admin assigned successfully",
      branch,
    });
  } catch (error) {
    console.error("Error assigning branch admin:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Update Branch
exports.updateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const updates = req.body;
    const { role, countryId } = req.user || {};

    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    if (
      role === "countryadmin" &&
      existingBranch.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }

    const branch = await Branch.findByIdAndUpdate(
      branchId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.status(200).json({
      message: "Branch updated successfully",
      branch,
    });
  } catch (error) {
    console.error("Error updating branch:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Update Branch Accounting Lock (Branch Admin or higher)
exports.updateBranchLock = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { accountingLockUntil } = req.body;
    const { role, countryId, branchId: userBranchId } = req.user || {};

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    if (role === "branchadmin" && branchId !== userBranchId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only lock your own branch.",
      });
    }
    if (
      role === "countryadmin" &&
      branch.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }
    if (!["branchadmin", "countryadmin", "superadmin"].includes(role)) {
      return res.status(403).json({ message: "Access denied." });
    }

    branch.accountingLockUntil = accountingLockUntil;
    await branch.save();

    await logActivity({
      action: "Branch Accounting Lock Updated",
      description: `Branch accounting lock updated to ${accountingLockUntil}`,
      entity: "branch",
      entityId: branch._id,
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Branch accounting lock updated successfully",
      branch,
    });
  } catch (error) {
    console.error("Error updating branch lock:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete Branch (Soft delete)
exports.deleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { role, countryId } = req.user || {};

    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    if (
      role === "countryadmin" &&
      existingBranch.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }

    const branch = await Branch.findByIdAndUpdate(
      branchId,
      { isActive: false },
      { new: true },
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.status(200).json({
      message: "Branch deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
