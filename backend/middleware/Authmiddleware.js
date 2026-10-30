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
      "SELECT id, role, isActive, account_id FROM users WHERE id = ? LIMIT 1",
      [decoded.userId],
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const currentUser = rows[0];

    // Job functions (inbound/outbound/quality/inventory_control/finance/
    // procurement/sales/audit) are an opt-in NARROWING of whatever the
    // role already allows — a staff/manager with no tags behaves exactly
    // as before. Fetched once here (not per permission check) to keep
    // checkPermission a synchronous, in-memory lookup.
    const jobFunctionRows = await query(
      "SELECT job_function FROM user_job_functions WHERE staff_user_id = ?",
      [currentUser.id],
    );

    req.user = {
      userId: currentUser.id,
      role: currentUser.role,
      isActive: currentUser.isActive,
      // The tenant/business this login belongs to. Business-data queries
      // (products, sales, customers, ...) must scope by accountId, not
      // userId, so staff/manager logins share their admin's data instead
      // of each being their own isolated, empty business. `userId` still
      // means "this specific logged-in person" (audit/activity logging,
      // profile self-updates, etc).
      accountId: currentUser.account_id || currentUser.id,
      jobFunctions: jobFunctionRows.map((row) => row.job_function),
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

// Roles that are always full-access within their own tenant and are never
// narrowed by job function tags, even if one happens to be assigned.
const NON_NARROWABLE_ROLES = ["admin", "super_admin"];

// What each job function additionally RESTRICTS a tagged manager/staff to,
// on top of (never beyond) what their role already allows. A user with no
// tags at all is unaffected — this is opt-in narrowing, not a parallel
// grant system. A user with multiple tags gets the union of their tags.
const JOB_FUNCTION_PERMISSIONS = {
  inbound: {
    receiving: ["read", "write"],
    warehouse: ["read"],
    product: ["read"],
    order: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  outbound: {
    fulfillment: ["read", "write"],
    warehouse: ["read"],
    product: ["read"],
    sales: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  quality: {
    receiving: ["read", "write"],
    warehouse: ["read"],
    product: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  inventory_control: {
    stockTransaction: ["read", "write"],
    warehouse: ["read"],
    product: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  finance: {
    payment: ["read", "write", "delete"],
    invoice: ["read", "write"],
    customer: ["read"],
    supplier: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  procurement: {
    order: ["read", "write", "delete"],
    supplier: ["read", "write", "delete"],
    product: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  sales: {
    sales: ["read", "write", "delete"],
    customer: ["read", "write"],
    product: ["read"],
    invoice: ["read"],
    dashboard: ["read"],
    notification: ["read"],
  },
  audit: {
    dashboard: ["read"],
    activityLog: ["read"],
    product: ["read"],
    supplier: ["read"],
    customer: ["read"],
    payment: ["read"],
    invoice: ["read"],
    sales: ["read"],
    order: ["read"],
    stockTransaction: ["read"],
    receiving: ["read"],
    fulfillment: ["read"],
    warehouse: ["read"],
    notification: ["read"],
    category: ["read"],
  },
};

// Only the quality job function may flag received goods as damaged,
// rejected, or quarantined — everyone else (incl. untagged staff, who keep
// today's unrestricted behavior) can only accept. Exported for
// receivingController to enforce at the specific line-condition decision,
// since that's a business rule narrower than plain resource/action CRUD.
const canDecideReceivingCondition = ({ role, jobFunctions = [] }) => {
  if (NON_NARROWABLE_ROLES.includes(role) || role === "manager") return true;
  if (!jobFunctions.length) return true; // untagged: unchanged behavior
  return jobFunctions.includes("quality");
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
        warehouse: ["read", "write", "delete"],
        receiving: ["read", "write", "delete"],
        fulfillment: ["read", "write", "delete"],
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
        warehouse: ["read", "write", "delete"],
        receiving: ["read", "write", "delete"],
        fulfillment: ["read", "write", "delete"],
      },
      manager: {
        dashboard: ["read", "write"],
        product: ["read", "write", "delete"],
        // Matches the existing /activitylogs/recent route, which already
        // let managers in via a role check — this just lets checkPermission
        // (and the audit job function tag) see the same reality.
        activityLog: ["read"],
        supplier: ["read", "write", "delete"],
        customer: ["read"],
        payment: ["read", "write", "delete"],
        invoice: ["read", "write", "delete"],
        sales: ["read", "write", "delete"],
        order: ["read", "write", "delete"],
        stockTransaction: ["read", "write", "delete"],
        category: ["read", "write", "delete"],
        notification: ["read"],
        warehouse: ["read", "write", "delete"],
        receiving: ["read", "write", "delete"],
        fulfillment: ["read", "write", "delete"],
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
        warehouse: ["read"],
        receiving: ["read", "write"],
        fulfillment: ["read", "write"],
      },
    };

    const roleBasePermissions = permissions[role]?.[resource];

    // The moment ANY job function tag is assigned, it becomes the user's
    // COMPLETE access definition — not a patch applied on top of the role
    // default. A resource no assigned tag mentions is simply not granted,
    // even if the plain role would normally allow it. This is what makes
    // the floor tags (inbound/outbound/quality) actually exclusive — an
    // "inbound"-tagged staff member must lose fulfillment access, not
    // silently keep it because staff's own base happens to allow it — and
    // what lets department tags (procurement/finance/sales) grant MORE
    // than plain staff for the resources they do cover (e.g. supplier
    // write), while an "audit" tag locks every resource it lists to
    // read-only. Untagged users, and admin/super_admin regardless of any
    // tag, are unaffected — this block only runs when tags are present.
    let effectivePermissions = roleBasePermissions;
    const jobFunctions = req.user.jobFunctions || [];
    const isTagged = !NON_NARROWABLE_ROLES.includes(role) && jobFunctions.length > 0;

    if (isTagged) {
      const allowedByTags = new Set();
      jobFunctions.forEach((fn) => {
        (JOB_FUNCTION_PERMISSIONS[fn]?.[resource] || []).forEach((a) =>
          allowedByTags.add(a),
        );
      });
      effectivePermissions = Array.from(allowedByTags);
    }

    if (!effectivePermissions || !effectivePermissions.includes(action)) {
      return res.status(403).json({
        message: `Access denied. ${isTagged ? "Your assigned job function(s) don't" : "You don't"} have ${action} permission for ${resource}`,
        hasReadOnly: effectivePermissions?.includes("read") && action !== "read",
      });
    }

    // Attach permission info to request
    req.userPermissions = {
      resource,
      action,
      isReadOnly:
        effectivePermissions.includes("read") &&
        !effectivePermissions.includes("write"),
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
  canDecideReceivingCondition,
  JOB_FUNCTION_TAGS: Object.keys(JOB_FUNCTION_PERMISSIONS),
};
