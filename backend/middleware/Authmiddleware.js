// middleware/Authmiddleware.js
const jwt = require("jsonwebtoken");
const query = require("../libs/dbQuery");
const { isPaid } = require("../services/subscriptionService");

const getInactiveAccountMessage = async (userId) => {
  const paid = await isPaid(userId);

  if (paid) {
    return "Account inactive. Please contact admin to restore access.";
  }

  return "Account inactive. Your subscription is unpaid. Please pay before contacting admin.";
};

// Authentication middleware
const authmiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rows = await query(
      "SELECT id, role, isActive FROM users WHERE id = ? LIMIT 1",
      [decoded.userId],
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const currentUser = rows[0];
    req.user = {
      userId: currentUser.id,
      role: currentUser.role,
      isActive: currentUser.isActive,
    };

    if (Number(currentUser.isActive) === 0) {
      const message = await getInactiveAccountMessage(currentUser.id);
      return res
        .status(403)
        .json({
          message,
        });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Role-based middleware
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

// Permission-based middleware for read-only access
const checkPermission = (resource, action = "read") => {
  return (req, res, next) => {
    const { role } = req.user;

    // Define permissions matrix
    const permissions = {
      super_admin: {
        dashboard: ["read", "write"],
        product: ["read", "write", "delete"],
        activityLog: ["read", "write", "delete"],
        supplier: ["read", "write", "delete"],
        customer: ["read", "write", "delete"],
        payment: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        notification: ["read", "write", "delete"],
        category: ["read", "write", "delete"],
      },
      admin: {
        dashboard: ["read", "write"],
        product: ["read", "write", "delete"],
        activityLog: ["read"],
        supplier: ["read", "write", "delete"],
        customer: ["read", "write", "delete"],
        payment: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        notification: ["read", "write", "delete"],
        category: ["read", "write", "delete"],
      },
      manager: {
        dashboard: ["read", "write"],
        product: ["read", "write", "delete"],
        supplier: ["read", "write", "delete"],
        customer: ["read"],
        payment: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        category: ["read", "write", "delete"],
        notification: ["read"],
      },
      staff: {
        dashboard: ["read"],
        product: ["read"],
        supplier: ["read"],
        customer: ["read"],
        payment: ["read", "write"],
        invoice: ["read"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
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
    };

    next();
  };
};

// Admin only middleware
const adminmiddleware = checkRole("admin");

// Admin or super admin middleware
const adminOrSuperAdminMiddleware = checkRole("admin", "super_admin");

// Manager or Admin middleware
const managermiddleware = checkRole("admin", "manager");

const superadminmiddleware = checkRole("super_admin");

// All authenticated users middleware (already covered by authmiddleware)

module.exports = {
  authmiddleware,
  adminmiddleware,
  adminOrSuperAdminMiddleware,
  managermiddleware,
  superadminmiddleware,
  checkRole,
  checkPermission,
};
