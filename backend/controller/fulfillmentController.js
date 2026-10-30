const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const {
  reserveStock,
  confirmPick,
  confirmDispatch,
  moveReservationBucket,
} = require("../services/inventoryEngine");
const {
  hasWarehouseAccess,
  getAccessibleWarehouseIds,
} = require("../libs/warehouseAccess");

const FULL_ACCESS_ROLES = ["admin", "super_admin", "manager"];
const TERMINAL_FULFILLMENT_STATUSES = ["DISPATCHED", "CANCELLED"];

const getHydratedLines = async (accountId, fulfillmentId) =>
  query(
    `SELECT fl.*, pc.code AS productCodeValue, pc.variantName, p.name AS productName,
            si.quantity AS saleItemQuantity
     FROM fulfillment_lines fl
     INNER JOIN product_codes pc ON pc.id = fl.product_code_id AND pc.user_id = fl.user_id
     INNER JOIN products p ON p.id = pc.product AND p.user_id = fl.user_id
     LEFT JOIN sale_items si ON si.id = fl.sale_item_id
     WHERE fl.fulfillment_id = ? AND fl.user_id = ?
     ORDER BY fl.id ASC`,
    [fulfillmentId, accountId],
  );

// Best-effort compensation: if a later line fails to reserve, undo the
// lines that already succeeded rather than leaving a half-reserved
// fulfillment. Each release is its own atomic operation (inventoryEngine),
// so a failure here is logged, not thrown — the caller still reports the
// original reservation error to the client.
const releaseLines = async (accountId, warehouseId, lines) => {
  for (const line of lines) {
    try {
      await moveReservationBucket({
        accountId,
        productCodeId: line.productCodeId,
        warehouseId,
        fromStatus: "RESERVED",
        toStatus: "AVAILABLE",
        referenceType: "fulfillment_line",
        referenceId: line.lineId,
        reason: "Rolled back — fulfillment could not be fully reserved",
        transactionType: "RELEASE",
      });
    } catch (releaseError) {
      console.error(
        `Failed to roll back reservation for fulfillment_line ${line.lineId}:`,
        releaseError.message,
      );
    }
  }
};

module.exports.createFulfillment = async (req, res) => {
  const accountId = req.user.accountId;
  const { saleId, warehouseId } = req.body;
  let fulfillmentId = null;

  try {
    const saleRows = await query(
      "SELECT * FROM sales WHERE id = ? AND user_id = ? LIMIT 1",
      [saleId, accountId],
    );
    const sale = saleRows[0];
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Cannot fulfill a cancelled sale" });
    }
    if (sale.status === "completed") {
      return res.status(400).json({ message: "This sale is already completed" });
    }

    const activeRows = await query(
      "SELECT id FROM fulfillments WHERE sale_id = ? AND user_id = ? AND status NOT IN ('DISPATCHED', 'CANCELLED') LIMIT 1",
      [saleId, accountId],
    );
    if (activeRows.length) {
      return res.status(400).json({
        message: "A fulfillment is already in progress for this sale",
      });
    }

    const warehouseRows = await query(
      "SELECT id FROM warehouses WHERE id = ? AND user_id = ? LIMIT 1",
      [warehouseId, accountId],
    );
    if (!warehouseRows.length) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const allowed = await hasWarehouseAccess(req.user, warehouseId);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const saleItems = await query(
      "SELECT * FROM sale_items WHERE sale_id = ? AND user_id = ?",
      [saleId, accountId],
    );
    if (!saleItems.length) {
      return res.status(400).json({ message: "This sale has no line items to fulfill" });
    }

    const fulfillmentNo = await getNextInvoiceNumber("FUL", accountId);
    const fulfillmentResult = await query(
      "INSERT INTO fulfillments (user_id, warehouse_id, sale_id, fulfillment_no, status, created_by) VALUES (?, ?, ?, ?, 'RESERVED', ?)",
      [accountId, warehouseId, saleId, fulfillmentNo, req.user.userId],
    );
    fulfillmentId = fulfillmentResult.insertId;

    const lines = [];
    for (const item of saleItems) {
      const lineResult = await query(
        "INSERT INTO fulfillment_lines (user_id, fulfillment_id, sale_item_id, product_code_id, quantity, status) VALUES (?, ?, ?, ?, ?, 'RESERVED')",
        [accountId, fulfillmentId, item.id, item.productCode, item.quantity],
      );
      lines.push({
        lineId: lineResult.insertId,
        productCodeId: item.productCode,
        quantity: item.quantity,
      });
    }

    const reservedLines = [];
    for (const line of lines) {
      try {
        await reserveStock({
          accountId,
          productCodeId: line.productCodeId,
          warehouseId,
          quantity: line.quantity,
          referenceType: "fulfillment_line",
          referenceId: line.lineId,
          performedBy: req.user.userId,
          reason: `Reserved for ${fulfillmentNo}`,
          idempotencyKey: `fl-reserve-${line.lineId}`,
        });
        reservedLines.push(line);
      } catch (reservationError) {
        await releaseLines(accountId, warehouseId, reservedLines);
        await query(
          "DELETE FROM fulfillment_lines WHERE fulfillment_id = ? AND user_id = ?",
          [fulfillmentId, accountId],
        );
        await query("DELETE FROM fulfillments WHERE id = ? AND user_id = ?", [
          fulfillmentId,
          accountId,
        ]);

        return res.status(reservationError.statusCode || 500).json({
          message:
            reservationError.message || "Could not reserve stock for this fulfillment",
        });
      }
    }

    await logActivity({
      action: "Create Fulfillment",
      description: `Fulfillment ${fulfillmentNo} started for sale #${saleId}.`,
      entity: "fulfillment",
      entityId: fulfillmentId,
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    const fulfillmentRows = await query(
      "SELECT * FROM fulfillments WHERE id = ? LIMIT 1",
      [fulfillmentId],
    );
    const hydratedLines = await getHydratedLines(accountId, fulfillmentId);

    res.status(201).json({ success: true, fulfillment: fulfillmentRows[0], lines: hydratedLines });
  } catch (error) {
    res.status(500).json({ message: "Error creating fulfillment", error: error.message });
  }
};

module.exports.getFulfillments = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { status, warehouseId } = req.query;

    const conditions = ["f.user_id = ?"];
    const params = [accountId];
    if (status) {
      conditions.push("f.status = ?");
      params.push(status);
    }
    if (warehouseId) {
      conditions.push("f.warehouse_id = ?");
      params.push(warehouseId);
    }

    if (!FULL_ACCESS_ROLES.includes(req.user.role)) {
      const accessibleIds = await getAccessibleWarehouseIds(req.user);
      if (!accessibleIds.length) {
        return res.status(200).json({ success: true, fulfillments: [] });
      }
      conditions.push(`f.warehouse_id IN (${accessibleIds.map(() => "?").join(", ")})`);
      params.push(...accessibleIds);
    }

    const fulfillments = await query(
      `SELECT f.*, w.name AS warehouseName
       FROM fulfillments f
       INNER JOIN warehouses w ON w.id = f.warehouse_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY f.createdAt DESC`,
      params,
    );

    res.status(200).json({ success: true, fulfillments });
  } catch (error) {
    res.status(500).json({ message: "Error fetching fulfillments", error: error.message });
  }
};

module.exports.getFulfillmentById = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const rows = await query(
      "SELECT * FROM fulfillments WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const fulfillment = rows[0];
    if (!fulfillment) {
      return res.status(404).json({ message: "Fulfillment not found" });
    }

    const allowed = await hasWarehouseAccess(req.user, fulfillment.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const lines = await getHydratedLines(accountId, id);
    res.status(200).json({ success: true, fulfillment, lines });
  } catch (error) {
    res.status(500).json({ message: "Error fetching fulfillment", error: error.message });
  }
};

module.exports.confirmPickLine = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { fulfillmentId, lineId } = req.params;

    const fulfillmentRows = await query(
      "SELECT * FROM fulfillments WHERE id = ? AND user_id = ? LIMIT 1",
      [fulfillmentId, accountId],
    );
    const fulfillment = fulfillmentRows[0];
    if (!fulfillment) {
      return res.status(404).json({ message: "Fulfillment not found" });
    }
    if (TERMINAL_FULFILLMENT_STATUSES.includes(fulfillment.status)) {
      return res.status(400).json({ message: "This fulfillment is already finalized" });
    }

    const allowed = await hasWarehouseAccess(req.user, fulfillment.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const lineRows = await query(
      "SELECT * FROM fulfillment_lines WHERE id = ? AND fulfillment_id = ? AND user_id = ? LIMIT 1",
      [lineId, fulfillmentId, accountId],
    );
    const line = lineRows[0];
    if (!line) {
      return res.status(404).json({ message: "Fulfillment line not found" });
    }
    if (line.status !== "RESERVED") {
      return res.status(400).json({ message: "This line has already been picked" });
    }

    await confirmPick({
      accountId,
      productCodeId: line.product_code_id,
      warehouseId: fulfillment.warehouse_id,
      referenceType: "fulfillment_line",
      referenceId: line.id,
      performedBy: req.user.userId,
      idempotencyKey: `fl-pick-${line.id}`,
    });

    await query(
      "UPDATE fulfillment_lines SET status = 'PICKED' WHERE id = ? AND user_id = ?",
      [lineId, accountId],
    );

    const remainingRows = await query(
      "SELECT COUNT(*) AS count FROM fulfillment_lines WHERE fulfillment_id = ? AND user_id = ? AND status = 'RESERVED'",
      [fulfillmentId, accountId],
    );
    const nextFulfillmentStatus =
      Number(remainingRows[0].count) === 0 ? "PICKED" : "PICKING";
    await query("UPDATE fulfillments SET status = ? WHERE id = ? AND user_id = ?", [
      nextFulfillmentStatus,
      fulfillmentId,
      accountId,
    ]);

    const lines = await getHydratedLines(accountId, fulfillmentId);
    res.status(200).json({
      success: true,
      line: lines.find((l) => l.id === Number(lineId)),
      fulfillmentStatus: nextFulfillmentStatus,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Error confirming pick",
    });
  }
};

module.exports.dispatchFulfillment = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const fulfillmentRows = await query(
      "SELECT * FROM fulfillments WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const fulfillment = fulfillmentRows[0];
    if (!fulfillment) {
      return res.status(404).json({ message: "Fulfillment not found" });
    }
    if (TERMINAL_FULFILLMENT_STATUSES.includes(fulfillment.status)) {
      return res.status(400).json({ message: "This fulfillment is already finalized" });
    }

    const allowed = await hasWarehouseAccess(req.user, fulfillment.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const lines = await query(
      "SELECT * FROM fulfillment_lines WHERE fulfillment_id = ? AND user_id = ?",
      [id, accountId],
    );
    const notPicked = lines.filter((l) => l.status !== "PICKED");
    if (notPicked.length) {
      return res.status(400).json({
        message: "All lines must be picked before dispatch",
        pendingLines: notPicked.length,
      });
    }

    for (const line of lines) {
      await confirmDispatch({
        accountId,
        productCodeId: line.product_code_id,
        warehouseId: fulfillment.warehouse_id,
        referenceType: "fulfillment_line",
        referenceId: line.id,
        performedBy: req.user.userId,
        idempotencyKey: `fl-dispatch-${line.id}`,
      });
      await query(
        "UPDATE fulfillment_lines SET status = 'DISPATCHED' WHERE id = ? AND user_id = ?",
        [line.id, accountId],
      );
    }

    await query(
      "UPDATE fulfillments SET status = 'DISPATCHED', dispatched_at = NOW() WHERE id = ? AND user_id = ?",
      [id, accountId],
    );

    // Bypasses the ordinary sale status-update path on purpose — that path
    // would try to run the OLD instant stock-out logic again. Stock has
    // already left the building via the inventory engine above; this just
    // reflects that in the ERP record.
    await query(
      "UPDATE sales SET status = 'completed', stockOutRecorded = 1 WHERE id = ? AND user_id = ?",
      [fulfillment.sale_id, accountId],
    );

    await logActivity({
      action: "Dispatch Fulfillment",
      description: `Fulfillment ${fulfillment.fulfillment_no} was dispatched.`,
      entity: "fulfillment",
      entityId: Number(id),
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    const updatedRows = await query("SELECT * FROM fulfillments WHERE id = ? LIMIT 1", [id]);
    const updatedLines = await getHydratedLines(accountId, id);
    res.status(200).json({ success: true, fulfillment: updatedRows[0], lines: updatedLines });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Error dispatching fulfillment",
    });
  }
};

module.exports.cancelFulfillment = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const fulfillmentRows = await query(
      "SELECT * FROM fulfillments WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const fulfillment = fulfillmentRows[0];
    if (!fulfillment) {
      return res.status(404).json({ message: "Fulfillment not found" });
    }
    if (TERMINAL_FULFILLMENT_STATUSES.includes(fulfillment.status)) {
      return res.status(400).json({ message: "This fulfillment is already finalized" });
    }

    const allowed = await hasWarehouseAccess(req.user, fulfillment.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const lines = await query(
      "SELECT * FROM fulfillment_lines WHERE fulfillment_id = ? AND user_id = ?",
      [id, accountId],
    );

    for (const line of lines) {
      if (line.status === "DISPATCHED") continue;
      await moveReservationBucket({
        accountId,
        productCodeId: line.product_code_id,
        warehouseId: fulfillment.warehouse_id,
        fromStatus: line.status,
        toStatus: "AVAILABLE",
        referenceType: "fulfillment_line",
        referenceId: line.id,
        performedBy: req.user.userId,
        reason: "Fulfillment cancelled",
        transactionType: "RELEASE",
        idempotencyKey: `fl-cancel-${line.id}`,
      });
      await query(
        "UPDATE fulfillment_lines SET status = 'CANCELLED' WHERE id = ? AND user_id = ?",
        [line.id, accountId],
      );
    }

    await query("UPDATE fulfillments SET status = 'CANCELLED' WHERE id = ? AND user_id = ?", [
      id,
      accountId,
    ]);

    await logActivity({
      action: "Cancel Fulfillment",
      description: `Fulfillment ${fulfillment.fulfillment_no} was cancelled.`,
      entity: "fulfillment",
      entityId: Number(id),
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Fulfillment cancelled" });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Error cancelling fulfillment",
    });
  }
};
