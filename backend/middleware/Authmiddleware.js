// middleware/Authmiddleware.js - ENTERPRISE VERSION
const jwt = require("jsonwebtoken");

// Authentication middleware
const authmiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ FIXED: Role-based middleware with new hierarchy
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        requiredRole: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// ✅ NEW: Enterprise-level permission matrix
const checkPermission = (resource, action = "read") => {
  return (req, res, next) => {
    const { role, countryId, branchId } = req.user;

    // Define hierarchical permissions
    const permissions = {
      superadmin: {
        // Full global access
        dashboard: ["read", "write", "delete"],
        country: ["read", "write", "delete"],
        branch: ["read", "write", "delete"],
        exchangeRate: ["read", "write"],
        product: ["read", "write", "delete"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        supplier: ["read", "write", "delete"],
        shipment: ["read", "write", "delete"],
        clearingJob: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        category: ["read", "write", "delete"],
        notification: ["read", "write", "delete"],
        activityLog: ["read"],
        user: ["read", "write", "delete"],
        reports: ["read"],
      },
      countryadmin: {
        // Country-level access
        dashboard: ["read", "write"],
        branch: ["read", "write", "delete"], // Within their country
        product: ["read", "write", "delete"], // Country scope
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        supplier: ["read", "write", "delete"],
        shipment: ["read", "write", "delete"],
        clearingJob: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        category: ["read", "write", "delete"],
        notification: ["read", "write"],
        activityLog: ["read"],
        user: ["read", "write", "delete"], // Within their country
        reports: ["read"],
      },
      branchadmin: {
        // Branch-level access
        dashboard: ["read", "write"],
        product: ["read", "write", "delete"], // Branch scope
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        supplier: ["read", "write", "delete"],
        shipment: ["read", "write", "delete"],
        clearingJob: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        category: ["read", "write"],
        notification: ["read"],
        activityLog: ["read"],
        user: ["read", "write"], // Staff and agents only
        reports: ["read"],
      },
      staff: {
        // Limited operational access
        dashboard: ["read"],
        product: ["read", "write"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        supplier: ["read"],
        shipment: ["read", "write"],
        invoice: ["read", "write"],
        stockTransaction: ["read", "write"],
        notification: ["read"],
        activityLog: ["read"],
      },
      agent: {
        // Clearing agent - very limited
        dashboard: ["read"],
        clearingJob: ["read", "write"], // Only assigned jobs
        notification: ["read"],
      },
    };

    const userPermissions = permissions[role]?.[resource];

    if (!userPermissions || !userPermissions.includes(action)) {
      return res.status(403).json({
        message: `Access denied. You don't have ${action} permission for ${resource}`,
        hasReadOnly: userPermissions?.includes("read") && action !== "read",
      });
    }

    // Attach permission info to request
    req.userPermissions = {
      resource,
      action,
      isReadOnly:
        userPermissions.includes("read") && !userPermissions.includes("write"),
      scope: {
        isGlobal: role === "superadmin",
        isCountryLevel: role === "countryadmin",
        isBranchLevel: ["branchadmin", "staff", "agent"].includes(role),
        countryId,
        branchId,
      },
    };

    next();
  };
};

const ROLE_HIERARCHY = [
  "agent",
  "staff",
  "branchadmin",
  "countryadmin",
  "superadmin",
];

const canOverrideOwner = (requesterRole, creatorRole) => {
  const requesterRank = ROLE_HIERARCHY.indexOf(requesterRole);
  const creatorRank = ROLE_HIERARCHY.indexOf(creatorRole);
  if (requesterRank === -1 || creatorRank === -1) return false;
  return requesterRank > creatorRank;
};

// ✅ NEW: Hierarchy scope validation middleware
const validateHierarchyScope = (req, res, next) => {
  const { role, countryId, branchId } = req.user;
  const { countryId: reqCountryId, branchId: reqBranchId } = req.body;

  // Super admin can access anything
  if (role === "superadmin") {
    return next();
  }

  // Country admin can only access their country
  if (role === "countryadmin") {
    if (reqCountryId && reqCountryId !== countryId?.toString()) {
      return res.status(403).json({
        message:
          "Access denied. You can only manage resources in your country.",
      });
    }
    return next();
  }

  // Branch admin can only access their branch
  if (role === "branchadmin") {
    if (reqBranchId && reqBranchId !== branchId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only manage resources in your branch.",
      });
    }
    if (reqCountryId && reqCountryId !== countryId?.toString()) {
      return res.status(403).json({
        message: "Access denied. Country mismatch.",
      });
    }
    return next();
  }

  // Staff and agents - most restrictive
  if (["staff", "agent"].includes(role)) {
    if (reqBranchId && reqBranchId !== branchId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only work within your branch.",
      });
    }
    return next();
  }

  next();
};

// Legacy middleware (for backward compatibility)
const adminmiddleware = checkRole("superadmin");
const managermiddleware = checkRole(
  "superadmin",
  "countryadmin",
  "branchadmin",
);

module.exports = {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
  checkRole,
  checkPermission,
  canOverrideOwner,
  validateHierarchyScope,
};
