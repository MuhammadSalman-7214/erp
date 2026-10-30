const query = require("./dbQuery");

const FULL_ACCESS_ROLES = ["admin", "super_admin", "manager"];

// Mirrors the one-time initDb.js migration backfill, but for tenants created
// AFTER server boot (i.e. every normal signup). Idempotent via the unique
// key on (user_id, code), so it's safe to call even if a warehouse already
// exists for this account.
const ensureDefaultWarehouse = async (accountId) => {
  await query(
    "INSERT IGNORE INTO warehouses (user_id, name, code, is_default, is_active) VALUES (?, 'Main Warehouse', 'MAIN', 1, 1)",
    [accountId],
  );

  const warehouseRows = await query(
    "SELECT id FROM warehouses WHERE user_id = ? AND code = 'MAIN' LIMIT 1",
    [accountId],
  );
  const warehouseId = warehouseRows[0]?.id;
  if (!warehouseId) return;

  await query(
    "INSERT IGNORE INTO warehouse_locations (user_id, warehouse_id, code, name, location_type) VALUES (?, ?, 'RECEIVING', 'Receiving Dock', 'receiving')",
    [accountId, warehouseId],
  );
  await query(
    "INSERT IGNORE INTO warehouse_locations (user_id, warehouse_id, code, name, location_type) VALUES (?, ?, 'GENERAL', 'General Storage', 'bin')",
    [accountId, warehouseId],
  );
};

// Admin/manager implicitly operate every warehouse in their own tenant.
// Staff must be explicitly assigned via `user_scope_access`
// (scope_type='warehouse') — the generalized form of what used to be a
// warehouse-only `user_warehouse_access` table, so the same mechanism can
// later carry other scope types (branch, zone, ...) without a new table or
// a new check anywhere that calls these two functions. Either way, the
// warehouse must belong to the caller's own tenant (accountId).
const hasWarehouseAccess = async ({ role, accountId, userId }, warehouseId) => {
  if (FULL_ACCESS_ROLES.includes(role)) {
    const rows = await query(
      "SELECT id FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [warehouseId, accountId],
    );
    return rows.length > 0;
  }

  const rows = await query(
    `SELECT id FROM user_scope_access
     WHERE user_id = ? AND staff_user_id = ? AND scope_type = 'warehouse' AND scope_id = ?
     LIMIT 1`,
    [accountId, userId, warehouseId],
  );
  return rows.length > 0;
};

// Warehouse ids this login may operate within, inside their own tenant.
const getAccessibleWarehouseIds = async ({ role, accountId, userId }) => {
  if (FULL_ACCESS_ROLES.includes(role)) {
    const rows = await query(
      "SELECT id FROM warehouses WHERE user_id = ? AND is_active = 1",
      [accountId],
    );
    return rows.map((row) => row.id);
  }

  const rows = await query(
    `SELECT usa.scope_id AS id FROM user_scope_access usa
     INNER JOIN warehouses w ON w.id = usa.scope_id
     WHERE usa.user_id = ? AND usa.staff_user_id = ? AND usa.scope_type = 'warehouse' AND w.is_active = 1`,
    [accountId, userId],
  );
  return rows.map((row) => row.id);
};

const requireWarehouseAccess = (getWarehouseId) => async (req, res, next) => {
  try {
    const warehouseId = getWarehouseId(req);
    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse is required" });
    }

    const allowed = await hasWarehouseAccess(req.user, warehouseId);
    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this warehouse",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      message: "Error checking warehouse access",
      error: error.message,
    });
  }
};

module.exports = {
  hasWarehouseAccess,
  getAccessibleWarehouseIds,
  requireWarehouseAccess,
  ensureDefaultWarehouse,
};
