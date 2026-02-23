// controller/authcontroller.js - COMPLETE USER MANAGEMENT CONTROLLERS

const User = require("../models/Usermodel.js");
const Country = require("../models/Countrymodel.js");
const Branch = require("../models/Branchmodel.js");
const bcrypt = require("bcryptjs");
const generateToken = require("../libs/Tokengenerator.js");
const Cloundinary = require("../libs/Cloundinary.js");
const logActivity = require("../libs/logger.js");
const { default: mongoose } = require("mongoose");

// ==================== GET USERS BY ROLE ====================

/**
 * Get Staff Users with Hierarchy Filtering
 */
module.exports.staffuser = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { role: "staff", isActive: true };

    // Apply hierarchy filtering
    if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    } else if (currentUser.role === "branchadmin") {
      query.branchId = currentUser.branchId;
    }
    // superadmin sees all staff users

    const staffusers = await User.find(query)
      .select("-password")
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (staffusers.length === 0) {
      return res.status(200).json({
        message: "There are no staff users available.",
        data: [],
      });
    }

    res.status(200).json(staffusers);
  } catch (error) {
    console.log("Error in get staff Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Manager Users (LEGACY - for backward compatibility)
 * In new system, this maps to Branch Admins
 */
module.exports.manageruser = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { role: "branchadmin", isActive: true };

    // Apply hierarchy filtering
    if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    } else if (currentUser.role === "branchadmin") {
      // Branch admin can only see themselves and their subordinates
      query.branchId = currentUser.branchId;
    }
    // superadmin sees all branch admins

    const branchadmins = await User.find(query)
      .select("-password")
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (branchadmins.length === 0) {
      return res.status(200).json({
        message: "There are no branch admin users available.",
        data: [],
      });
    }

    res.status(200).json(branchadmins);
  } catch (error) {
    console.log("Error in get branch admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Admin Users (LEGACY - for backward compatibility)
 * In new system, this maps to Country Admins
 */

module.exports.adminuser = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { role: "countryadmin", isActive: true };

    // Only superadmin can see country admins
    if (currentUser.role !== "superadmin") {
      return res.status(403).json({
        message: "Access denied. Only Super Admin can view Country Admins.",
      });
    }

    const countryadmins = await User.find(query)
      .select("-password")
      .populate("countryId", "name code currency exchangeRate")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (countryadmins.length === 0) {
      return res.status(200).json({
        message: "There are no country admin users available.",
        data: [],
      });
    }

    res.status(200).json(countryadmins);
  } catch (error) {
    console.log("Error in get country admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// ==================== NEW CONTROLLERS FOR NEW HIERARCHY ====================

/**
 * Get Branch Admin Users
 */
module.exports.branchadminuser = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { role: "branchadmin", isActive: true };

    // Apply hierarchy filtering
    if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    } else if (currentUser.role === "branchadmin") {
      // Branch admin can see themselves
      query._id = currentUser._id;
    }

    const branchadmins = await User.find(query)
      .select("-password")
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(branchadmins);
  } catch (error) {
    console.log("Error in get branch admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Country Admin Users (Super Admin only)
 */
module.exports.countryadminuser = async (req, res) => {
  try {
    const currentUser = req.user;

    // Only superadmin can view country admins
    if (currentUser.role !== "superadmin") {
      return res.status(403).json({
        message: "Access denied. Only Super Admin can view Country Admins.",
      });
    }

    const countryadmins = await User.find({
      role: "countryadmin",
      isActive: true,
    })
      .select("-password")
      .populate("countryId", "name code currency exchangeRate")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(countryadmins);
  } catch (error) {
    console.log("Error in get country admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Super Admin Users (Super Admin only)
 */
module.exports.superadminuser = async (req, res) => {
  try {
    const currentUser = req.user;

    // Only superadmin can view other superadmins
    if (currentUser.role !== "superadmin") {
      return res.status(403).json({
        message: "Access denied. Only Super Admin can view Super Admins.",
      });
    }

    const superadmins = await User.find({ role: "superadmin", isActive: true })
      .select("-password")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(superadmins);
  } catch (error) {
    console.log("Error in get super admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Agent Users (Clearing Agents)
 */
module.exports.agentuser = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { role: "agent", isActive: true };

    // Apply hierarchy filtering
    if (currentUser.role === "countryadmin") {
      query.countryId = currentUser.countryId;
    } else if (currentUser.role === "branchadmin") {
      query.branchId = currentUser.branchId;
    }

    const agents = await User.find(query)
      .select("-password")
      .populate("countryId", "name code")
      .populate("branchId", "name branchCode city")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(agents);
  } catch (error) {
    console.log("Error in get agent Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get All Users (with hierarchy filtering)
 * Unified endpoint to get all users with filters
 */
module.exports.getAllUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const { role, countryId, branchId, isActive } = req.query;

    let query = {};

    // Filter by role if specified
    if (role) {
      query.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Apply hierarchy-based filtering
    if (currentUser.role === "superadmin") {
      // Super admin can filter by any country/branch
      if (countryId) query.countryId = countryId;
      if (branchId) query.branchId = branchId;
    } else if (currentUser.role === "countryadmin") {
      // Country admin can only see users in their country
      query.countryId = currentUser.countryId;
      if (branchId) query.branchId = branchId;
    } else if (currentUser.role === "branchadmin") {
      // Branch admin can only see users in their branch
      query.branchId = currentUser.branchId;
      query.countryId = currentUser.countryId;
    } else {
      // Other roles cannot access this endpoint
      return res.status(403).json({
        message: "Access denied.",
      });
    }

    const users = await User.find(query)
      .select("-password")
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.log("Error in get all users Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Users by Branch
 */
module.exports.getUsersByBranch = async (req, res) => {
  try {
    const currentUser = req.user;
    const { branchId } = req.params;

    // Verify access
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Check permissions
    if (
      currentUser.role === "countryadmin" &&
      branch.countryId.toString() !== currentUser.countryId.toString()
    ) {
      return res.status(403).json({
        message: "Access denied. You can only view users from your country.",
      });
    }

    if (
      currentUser.role === "branchadmin" &&
      branchId !== currentUser.branchId.toString()
    ) {
      return res.status(403).json({
        message: "Access denied. You can only view users from your branch.",
      });
    }

    const users = await User.find({ branchId, isActive: true })
      .select("-password")
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .sort({ role: 1, createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.log("Error in get users by branch Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get Users by Country
 */
module.exports.getUsersByCountry = async (req, res) => {
  try {
    const currentUser = req.user;
    const { countryId } = req.params;

    // Verify access
    if (
      currentUser.role === "countryadmin" &&
      countryId !== currentUser.countryId.toString()
    ) {
      return res.status(403).json({
        message: "Access denied. You can only view users from your country.",
      });
    }

    if (currentUser.role === "branchadmin") {
      return res.status(403).json({
        message: "Access denied. Branch admins cannot view country-level data.",
      });
    }

    const users = await User.find({ countryId, isActive: true })
      .select("-password")
      .populate("countryId", "name code currency")
      .populate("branchId", "name branchCode city")
      .sort({ role: 1, createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.log("Error in get users by country Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/**
 * Get User Statistics
 */

module.exports.getUserStats = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { isActive: true };

    // ============================
    // APPLY HIERARCHY FILTER
    // ============================
    // Only fetch users under the current user's scope
    if (currentUser.role === "countryadmin") {
      query.countryId = new mongoose.Types.ObjectId(currentUser.countryId);
    } else if (currentUser.role === "branchadmin") {
      query.branchId = new mongoose.Types.ObjectId(currentUser.branchId);
    }

    // ============================
    // DEFINE CHILD ROLES TO INCLUDE
    // ============================
    let childRoles = [];

    switch (currentUser.role) {
      case "superadmin":
        childRoles = ["countryadmin", "branchadmin", "staff", "agent"];
        break;
      case "countryadmin":
        childRoles = ["branchadmin", "staff", "agent"];
        break;
      case "branchadmin":
        childRoles = ["staff", "agent"];
        break;
      case "staff":
      case "agent":
        childRoles = []; // No child roles
        break;
      default:
        childRoles = [];
    }

    // Include current user's role too
    const rolesToFetch = [...childRoles];

    // ============================
    // AGGREGATE USER STATS
    // ============================

    const stats = await User.aggregate([
      { $match: { ...query, role: { $in: rolesToFetch } } },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // ============================
    // FORMAT RESPONSE
    // ============================
    const formattedStats = {
      superadmin: 0,
      countryadmin: 0,
      branchadmin: 0,
      staff: 0,
      agent: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });
    res.status(200).json(formattedStats);
  } catch (error) {
    console.log("Error in getUserStats Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// ==================== KEEP YOUR EXISTING CONTROLLERS ====================

module.exports.signup = async (req, res) => {
  try {
    const { name, email, password, ProfilePic, role, countryId, branchId } =
      req.body;
    const creatorUser = req.user;
    // Validation: Check if email exists
    if (!creatorUser) {
      return res
        .status(401)
        .json({ message: "Authentication required to create users" });
    }

    const canCreate = {
      superadmin: [
        "superadmin",
        "countryadmin",
        "branchadmin",
        "staff",
        "agent",
      ],
      countryadmin: ["branchadmin", "staff", "agent"],
      branchadmin: ["staff", "agent"],
    };
    if (!canCreate[creatorUser.role]?.includes(role)) {
      return res.status(403).json({
        message: `${creatorUser.role} cannot create ${role} users`,
      });
    }
    if (creatorUser.role === "countryadmin") {
      if (countryId?.toString() !== creatorUser.countryId?.toString()) {
        return res.status(403).json({
          message: "You can only create users in your country",
        });
      }
    }

    if (creatorUser.role === "branchadmin") {
      if (branchId !== creatorUser.branchId?.toString()) {
        return res.status(403).json({
          message: "You can only create users in your branch",
        });
      }
    }
    const duplicatedUser = await User.findOne({ email: email.toLowerCase() });
    if (duplicatedUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Role-based validation
    if (role === "superadmin") {
      const existingSuperAdmin = await User.findOne({ role: "superadmin" });
      if (existingSuperAdmin && creatorUser?.role !== "superadmin") {
        return res.status(403).json({
          message:
            "Super Admin already exists. Only Super Admin can create another.",
        });
      }
    }

    // Validate hierarchy requirements
    if (role === "countryadmin") {
      if (!countryId) {
        return res
          .status(400)
          .json({ message: "Country ID required for Country Admin" });
      }
      const country = await Country.findById(countryId);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
    }

    if (role === "branchadmin" || role === "staff" || role === "agent") {
      if (!branchId || !countryId) {
        return res.status(400).json({
          message: "Both Country ID and Branch ID required for this role",
        });
      }
      const branch = await Branch.findById(branchId);
      if (
        !branch ||
        branch.countryId.toString() !== creatorUser.countryId?.toString()
      ) {
        return res.status(404).json({ message: "Invalid branch or country" });
      }
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedpassword,
      ProfilePic: "",
      role,
      countryId: countryId || null,
      branchId: branchId || null,
      createdBy: creatorUser?._id || null,
    });

    const savedUser = await newUser.save();
    if (role === "countryadmin" && countryId) {
      await Country.findByIdAndUpdate(countryId, {
        countryAdminId: savedUser._id,
      });
    }
    const token = await generateToken(savedUser, res);

    res.status(201).json({
      message: "Signup successful",
      savedUser: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email.toLowerCase(),
        role: savedUser.role,
        countryId: savedUser.countryId,
        branchId: savedUser.branchId,
        ProfilePic: savedUser.ProfilePic,
        staffCanEdit: savedUser.staffCanEdit || false,
        token,
      },
    });

    await logActivity({
      action: "User Signup",
      description: `User ${name} (${role}) signed up.`,
      entity: "user",
      entityId: savedUser._id,
      userId: savedUser._id,
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error("Error during signup:", error.message);
    res.status(400).json({ message: "Error during signup: " + error.message });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate("countryId", "name code currency currencySymbol exchangeRate")
      .populate("branchId", "name branchCode city");

    if (!user) {
      return res.status(400).json({
        message: "Please provide a valid email address and password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = await generateToken(user, res);

    await logActivity({
      action: "User Login",
      description: `User ${user.name} logged in.`,
      entity: "user",
      entityId: user._id,
      userId: user._id,
      ipAddress: ipAddress,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email.toLowerCase(),
        role: user.role,
        countryId: user.countryId,
        branchId: user.branchId,
        country: user.countryId,
        branch: user.branchId,
        ProfilePic: user.ProfilePic,
        staffCanEdit: user.staffCanEdit || false,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      message: "Error in login to the page",
    });
  }
};

module.exports.logout = async (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred during logout. Please try again.",
      error: error.message,
    });
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { ProfilePic } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (ProfilePic) {
      const uploadResponse = await Cloundinary.uploader.upload(ProfilePic, {
        folder: "profile_inventory_system",
        upload_preset: "upload",
      });

      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { ProfilePic: uploadResponse.secure_url },
        { new: true },
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        message: "Profile updated successfully",
        updatedUser,
      });
    } else {
      return res.status(400).json({ message: "No profile picture provided" });
    }
  } catch (error) {
    console.error("Error in update profile Controller", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.removeuser = async (req, res) => {
  try {
    const { UserId } = req.params;
    const currentUser = req.user;

    if (!UserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userToDelete = await User.findById(UserId);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }
    if (currentUser.userId?.toString() === UserId.toString()) {
      return res.status(403).json({
        message: "You cannot delete your own account",
      });
    }

    // Hierarchy check: Can only delete users in your scope
    if (currentUser.role === "countryadmin") {
      if (
        userToDelete.countryId?.toString() !== currentUser.countryId?.toString()
      ) {
        return res.status(403).json({
          message: "Cannot delete user from another country",
        });
      }
      // Country admin cannot delete other country admins or super admins
      if (["countryadmin", "superadmin"].includes(userToDelete.role)) {
        return res.status(403).json({
          message: "Cannot delete country admin or super admin",
        });
      }
    }

    if (currentUser.role === "branchadmin") {
      if (
        userToDelete.branchId?.toString() !== currentUser.branchId?.toString()
      ) {
        return res.status(403).json({
          message: "Cannot delete user from another branch",
        });
      }
      // Branch admin can only delete staff and agents
      if (!["staff", "agent"].includes(userToDelete.role)) {
        return res.status(403).json({
          message: "Cannot delete users with higher privileges",
        });
      }
    }

    // Soft delete (deactivate) instead of hard delete
    userToDelete.isActive = false;
    await userToDelete.save();

    await logActivity({
      action: "User Deleted",
      description: `User ${userToDelete.name} (${userToDelete.role}) was deactivated.`,
      entity: "user",
      entityId: userToDelete._id,
      userId: currentUser.userId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Toggle User Active Status (Activate/Deactivate)
 */
module.exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Apply same hierarchy checks as delete
    if (currentUser.role === "countryadmin") {
      if (user.countryId?.toString() !== currentUser.countryId?.toString()) {
        return res.status(403).json({
          message: "Cannot modify user from another country",
        });
      }
      if (["countryadmin", "superadmin"].includes(user.role)) {
        return res.status(403).json({
          message: "Cannot modify country admin or super admin",
        });
      }
    }

    if (currentUser.role === "branchadmin") {
      if (user.branchId?.toString() !== currentUser.branchId?.toString()) {
        return res.status(403).json({
          message: "Cannot modify user from another branch",
        });
      }
      if (!["staff", "agent"].includes(user.role)) {
        return res.status(403).json({
          message: "Cannot modify users with higher privileges",
        });
      }
    }

    user.isActive = !user.isActive;
    await user.save();

    await logActivity({
      action: user.isActive ? "User Activated" : "User Deactivated",
      description: `User ${user.name} was ${user.isActive ? "activated" : "deactivated"}.`,
      entity: "user",
      entityId: user._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update Staff Edit Permission (Branch Admin/Country Admin/Super Admin)
 */
module.exports.updateStaffEditPermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { staffCanEdit } = req.body;
    const currentUser = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "staff") {
      return res
        .status(400)
        .json({ message: "Only staff users can be updated" });
    }

    if (currentUser.role === "countryadmin") {
      if (user.countryId?.toString() !== currentUser.countryId?.toString()) {
        return res.status(403).json({
          message: "Cannot modify staff from another country",
        });
      }
    }

    if (currentUser.role === "branchadmin") {
      if (user.branchId?.toString() !== currentUser.branchId?.toString()) {
        return res.status(403).json({
          message: "Cannot modify staff from another branch",
        });
      }
    }

    if (
      !["superadmin", "countryadmin", "branchadmin"].includes(currentUser.role)
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    user.staffCanEdit = Boolean(staffCanEdit);
    await user.save();

    await logActivity({
      action: "Staff Permission Updated",
      description: `Staff ${user.name} edit permission set to ${user.staffCanEdit}`,
      entity: "user",
      entityId: user._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Staff permissions updated",
      user: {
        id: user._id,
        name: user.name,
        staffCanEdit: user.staffCanEdit,
      },
    });
  } catch (error) {
    console.error("Error updating staff permissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// authcontroller.js - Add new controller
module.exports.setupInitialAdmin = async (req, res) => {
  try {
    // Check if any super admin exists
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });

    if (existingSuperAdmin) {
      return res.status(403).json({
        message: "Initial setup already completed",
      });
    }

    const { name, email, password } = req.body;
    const hashedpassword = await bcrypt.hash(password, 10);

    const superAdmin = new User({
      name,
      email: email.toLowerCase(),
      password: hashedpassword,
      role: "superadmin",
      isActive: true,
    });

    await superAdmin.save();

    res.status(201).json({
      message: "Super Admin created successfully. Please login.",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// In authcontroller.js
module.exports.checkSetup = async (req, res) => {
  try {
    const superAdminExists = await User.findOne({ role: "superadmin" });
    res.status(200).json({ setupComplete: !!superAdminExists });
  } catch (error) {
    res.status(500).json({ message: "Error checking setup status" });
  }
};

// In authRouter.js
