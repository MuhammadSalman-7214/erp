const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");
const { getAccessibleWarehouseIds } = require("../libs/warehouseAccess");

const isFullAccessRole = (role) =>
  ["admin", "super_admin", "manager"].includes(role);

module.exports.createWarehouse = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { name, code } = req.body;
    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await query(
      "SELECT id FROM warehouses WHERE user_id = ? AND code = ? LIMIT 1",
      [accountId, normalizedCode],
    );
    if (existing.length) {
      return res.status(400).json({ message: "A warehouse with this code already exists" });
    }

    const result = await query(
      "INSERT INTO warehouses (user_id, name, code, is_default, is_active) VALUES (?, ?, ?, 0, 1)",
      [accountId, name.trim(), normalizedCode],
    );

    await logActivity({
      action: "Create Warehouse",
      description: `Warehouse "${name}" was created.`,
      entity: "warehouse",
      entityId: result.insertId,
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    const rows = await query("SELECT * FROM warehouses WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);
    res.status(201).json({ success: true, warehouse: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error creating warehouse", error: error.message });
  }
};

module.exports.getWarehouses = async (req, res) => {
  try {
    const accountId = req.user.accountId;

    let warehouses = await query(
      "SELECT * FROM warehouses WHERE user_id = ? ORDER BY is_default DESC, name ASC",
      [accountId],
    );

    if (!isFullAccessRole(req.user.role)) {
      const accessibleIds = new Set(
        await getAccessibleWarehouseIds(req.user),
      );
      warehouses = warehouses.filter((w) => accessibleIds.has(w.id));
    }

    res.status(200).json({ success: true, warehouses });
  } catch (error) {
    res.status(500).json({ message: "Error fetching warehouses", error: error.message });
  }
};

module.exports.updateWarehouse = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;
    const { name, code, is_active } = req.body;

    const rows = await query(
      "SELECT * FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const warehouse = rows[0];
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const nextName = name !== undefined ? String(name).trim() : warehouse.name;
    const nextCode =
      code !== undefined ? String(code).trim().toUpperCase() : warehouse.code;
    const nextIsActive =
      is_active !== undefined ? (is_active ? 1 : 0) : warehouse.is_active;

    if (nextCode !== warehouse.code) {
      const duplicate = await query(
        "SELECT id FROM warehouses WHERE user_id = ? AND code = ? AND id <> ? LIMIT 1",
        [accountId, nextCode, id],
      );
      if (duplicate.length) {
        return res.status(400).json({ message: "A warehouse with this code already exists" });
      }
    }

    await query(
      "UPDATE warehouses SET name = ?, code = ?, is_active = ? WHERE id = ? AND user_id = ?",
      [nextName, nextCode, nextIsActive, id, accountId],
    );

    const updatedRows = await query("SELECT * FROM warehouses WHERE id = ? LIMIT 1", [id]);
    res.status(200).json({ success: true, warehouse: updatedRows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error updating warehouse", error: error.message });
  }
};

module.exports.deleteWarehouse = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const rows = await query(
      "SELECT * FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const warehouse = rows[0];
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }
    if (Number(warehouse.is_default) === 1) {
      return res.status(400).json({
        message: "The default warehouse cannot be deleted",
      });
    }

    const batchRows = await query(
      "SELECT id FROM inventory_batches WHERE warehouse_id = ? AND user_id = ? AND quantity > 0 LIMIT 1",
      [id, accountId],
    );
    if (batchRows.length) {
      return res.status(400).json({
        message: "Cannot delete a warehouse that still holds inventory",
      });
    }

    await query("DELETE FROM warehouse_locations WHERE warehouse_id = ? AND user_id = ?", [
      id,
      accountId,
    ]);
    await query(
      "DELETE FROM user_scope_access WHERE scope_type = 'warehouse' AND scope_id = ? AND user_id = ?",
      [id, accountId],
    );
    await query("DELETE FROM warehouses WHERE id = ? AND user_id = ?", [id, accountId]);

    res.status(200).json({ success: true, message: "Warehouse deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting warehouse", error: error.message });
  }
};

const buildLocationTree = (locations) => {
  const byId = new Map(locations.map((loc) => [loc.id, { ...loc, children: [] }]));
  const roots = [];

  for (const loc of byId.values()) {
    if (loc.parent_location_id && byId.has(loc.parent_location_id)) {
      byId.get(loc.parent_location_id).children.push(loc);
    } else {
      roots.push(loc);
    }
  }

  return roots;
};

module.exports.createLocation = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { warehouseId } = req.params;
    const { code, name, location_type, parent_location_id } = req.body;

    const warehouseRows = await query(
      "SELECT id FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [warehouseId, accountId],
    );
    if (!warehouseRows.length) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    if (parent_location_id) {
      const parentRows = await query(
        "SELECT id FROM warehouse_locations WHERE id = ? AND warehouse_id = ? AND user_id = ? LIMIT 1",
        [parent_location_id, warehouseId, accountId],
      );
      if (!parentRows.length) {
        return res.status(400).json({ message: "Parent location not found in this warehouse" });
      }
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const existing = await query(
      "SELECT id FROM warehouse_locations WHERE user_id = ? AND warehouse_id = ? AND code = ? LIMIT 1",
      [accountId, warehouseId, normalizedCode],
    );
    if (existing.length) {
      return res.status(400).json({ message: "A location with this code already exists in this warehouse" });
    }

    const result = await query(
      "INSERT INTO warehouse_locations (user_id, warehouse_id, parent_location_id, code, name, location_type) VALUES (?, ?, ?, ?, ?, ?)",
      [
        accountId,
        warehouseId,
        parent_location_id || null,
        normalizedCode,
        name.trim(),
        location_type || "bin",
      ],
    );

    const rows = await query("SELECT * FROM warehouse_locations WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);
    res.status(201).json({ success: true, location: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error creating location", error: error.message });
  }
};

module.exports.getLocations = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { warehouseId } = req.params;

    const warehouseRows = await query(
      "SELECT id FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [warehouseId, accountId],
    );
    if (!warehouseRows.length) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const locations = await query(
      "SELECT * FROM warehouse_locations WHERE warehouse_id = ? AND user_id = ? ORDER BY code ASC",
      [warehouseId, accountId],
    );

    const tree = req.query.flat === "true" ? locations : buildLocationTree(locations);
    res.status(200).json({ success: true, locations: tree });
  } catch (error) {
    res.status(500).json({ message: "Error fetching locations", error: error.message });
  }
};

module.exports.updateLocation = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;
    const { code, name, location_type, is_active } = req.body;

    const rows = await query(
      "SELECT * FROM warehouse_locations WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const location = rows[0];
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    const nextCode = code !== undefined ? String(code).trim().toUpperCase() : location.code;
    const nextName = name !== undefined ? String(name).trim() : location.name;
    const nextType = location_type !== undefined ? location_type : location.location_type;
    const nextIsActive = is_active !== undefined ? (is_active ? 1 : 0) : location.is_active;

    if (nextCode !== location.code) {
      const duplicate = await query(
        "SELECT id FROM warehouse_locations WHERE user_id = ? AND warehouse_id = ? AND code = ? AND id <> ? LIMIT 1",
        [accountId, location.warehouse_id, nextCode, id],
      );
      if (duplicate.length) {
        return res.status(400).json({ message: "A location with this code already exists in this warehouse" });
      }
    }

    await query(
      "UPDATE warehouse_locations SET code = ?, name = ?, location_type = ?, is_active = ? WHERE id = ? AND user_id = ?",
      [nextCode, nextName, nextType, nextIsActive, id, accountId],
    );

    const updatedRows = await query(
      "SELECT * FROM warehouse_locations WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(200).json({ success: true, location: updatedRows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error updating location", error: error.message });
  }
};

module.exports.deleteLocation = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const rows = await query(
      "SELECT * FROM warehouse_locations WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Location not found" });
    }

    const childRows = await query(
      "SELECT id FROM warehouse_locations WHERE parent_location_id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    if (childRows.length) {
      return res.status(400).json({ message: "Cannot delete a location that has child locations" });
    }

    const batchRows = await query(
      "SELECT id FROM inventory_batches WHERE location_id = ? AND user_id = ? AND quantity > 0 LIMIT 1",
      [id, accountId],
    );
    if (batchRows.length) {
      return res.status(400).json({ message: "Cannot delete a location that still holds inventory" });
    }

    await query("DELETE FROM warehouse_locations WHERE id = ? AND user_id = ?", [id, accountId]);
    res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting location", error: error.message });
  }
};

module.exports.assignWarehouseAccess = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { warehouseId } = req.params;
    const { staffUserId } = req.body;

    const warehouseRows = await query(
      "SELECT id FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [warehouseId, accountId],
    );
    if (!warehouseRows.length) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const staffRows = await query(
      "SELECT id, name, role FROM users WHERE id = ? AND account_id = ? LIMIT 1",
      [staffUserId, accountId],
    );
    if (!staffRows.length) {
      return res.status(404).json({ message: "Team member not found in your business" });
    }

    await query(
      "INSERT IGNORE INTO user_scope_access (user_id, staff_user_id, scope_type, scope_id) VALUES (?, ?, 'warehouse', ?)",
      [accountId, staffUserId, warehouseId],
    );

    res.status(201).json({ success: true, message: "Warehouse access granted" });
  } catch (error) {
    res.status(500).json({ message: "Error granting warehouse access", error: error.message });
  }
};

module.exports.listWarehouseAccess = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { warehouseId } = req.params;

    const rows = await query(
      `SELECT usa.id, usa.staff_user_id, u.name, u.email, u.role
       FROM user_scope_access usa
       INNER JOIN users u ON u.id = usa.staff_user_id
       WHERE usa.user_id = ? AND usa.scope_type = 'warehouse' AND usa.scope_id = ?
       ORDER BY u.name ASC`,
      [accountId, warehouseId],
    );

    res.status(200).json({ success: true, access: rows });
  } catch (error) {
    res.status(500).json({ message: "Error fetching warehouse access", error: error.message });
  }
};

module.exports.removeWarehouseAccess = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { warehouseId, staffUserId } = req.params;

    const result = await query(
      "DELETE FROM user_scope_access WHERE user_id = ? AND scope_type = 'warehouse' AND scope_id = ? AND staff_user_id = ?",
      [accountId, warehouseId, staffUserId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Access grant not found" });
    }

    res.status(200).json({ success: true, message: "Warehouse access removed" });
  } catch (error) {
    res.status(500).json({ message: "Error removing warehouse access", error: error.message });
  }
};
