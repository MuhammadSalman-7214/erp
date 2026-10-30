const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");
const { getNextInvoiceNumber } = require("../libs/invoiceNumber");
const { receiveStock } = require("../services/inventoryEngine");
const {
  hasWarehouseAccess,
  getAccessibleWarehouseIds,
} = require("../libs/warehouseAccess");
const { canDecideReceivingCondition } = require("../middleware/Authmiddleware");

const FULL_ACCESS_ROLES = ["admin", "super_admin", "manager"];
const CONDITION_STATUSES = ["ACCEPTED", "DAMAGED", "REJECTED", "QUARANTINE"];
const BATCH_STATUS_BY_CONDITION = {
  ACCEPTED: "AVAILABLE",
  DAMAGED: "DAMAGED",
  REJECTED: "REJECTED",
  QUARANTINE: "QUARANTINE",
};

// Best-effort: a discrepancy notification must never block or fail the
// actual receiving transaction it's reporting on.
const notifyDiscrepancy = async (req, { receipt, line, condition, overReceived }) => {
  try {
    const recipients = await query(
      "SELECT id FROM users WHERE account_id = ? AND role IN ('admin', 'manager')",
      [req.user.accountId],
    );
    if (!recipients.length) return;

    const label = overReceived ? "Over-received" : condition;
    const name = `${label} on ${receipt.receipt_no}: ${line.productName} (qty ${line.received_qty})`;
    const io = req.app.get("io");

    for (const recipient of recipients) {
      const result = await query(
        "INSERT INTO notifications (name, type, user_id, `read`) VALUES (?, 'receiving_discrepancy', ?, 0)",
        [name, recipient.id],
      );
      io?.emit("newNotification", {
        id: result.insertId,
        name,
        type: "receiving_discrepancy",
        user_id: recipient.id,
        read: false,
      });
    }
  } catch (error) {
    console.error("Failed to create receiving discrepancy notification:", error.message);
  }
};

const getHydratedLines = async (accountId, receiptId) =>
  query(
    `SELECT gl.*, pc.code AS productCodeValue, pc.variantName, p.name AS productName,
            oi.quantity AS orderItemQuantity, wl.name AS locationName, wl.code AS locationCode
     FROM goods_receipt_lines gl
     INNER JOIN product_codes pc ON pc.id = gl.product_code_id AND pc.user_id = gl.user_id
     INNER JOIN products p ON p.id = pc.product AND p.user_id = gl.user_id
     LEFT JOIN order_items oi ON oi.id = gl.order_item_id
     LEFT JOIN warehouse_locations wl ON wl.id = gl.location_id AND wl.user_id = gl.user_id
     WHERE gl.receipt_id = ? AND gl.user_id = ?
     ORDER BY gl.id ASC`,
    [receiptId, accountId],
  );

module.exports.createReceipt = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { orderId, warehouseId } = req.body;

    const orderRows = await query(
      "SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1",
      [orderId, accountId],
    );
    const order = orderRows[0];
    if (!order) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Cannot receive a cancelled order" });
    }
    if (order.status === "delivered") {
      return res.status(400).json({ message: "This order has already been fully delivered" });
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

    const orderItems = await query(
      "SELECT * FROM order_items WHERE order_id = ? AND user_id = ?",
      [orderId, accountId],
    );
    if (!orderItems.length) {
      return res.status(400).json({ message: "This order has no line items to receive" });
    }

    // Sum already-accepted quantities per order item across ALL receipts for
    // this order (not just a new one), so re-receiving a partially-received
    // order can never let the total accepted exceed what was ordered.
    const acceptedRows = await query(
      `SELECT gl.order_item_id, SUM(gl.received_qty) AS acceptedQty
       FROM goods_receipt_lines gl
       INNER JOIN goods_receipts gr ON gr.id = gl.receipt_id
       WHERE gr.order_id = ? AND gl.user_id = ? AND gl.condition_status = 'ACCEPTED'
       GROUP BY gl.order_item_id`,
      [orderId, accountId],
    );
    const acceptedByItem = new Map(
      acceptedRows.map((row) => [row.order_item_id, Number(row.acceptedQty) || 0]),
    );

    const pendingItems = orderItems.filter(
      (item) => Number(item.quantity) - (acceptedByItem.get(item.id) || 0) > 0,
    );
    if (!pendingItems.length) {
      return res.status(400).json({
        message: "All items on this order have already been received",
      });
    }

    const receiptNo = await getNextInvoiceNumber("GR", accountId);

    const receiptResult = await query(
      "INSERT INTO goods_receipts (user_id, warehouse_id, order_id, receipt_no, status, received_by) VALUES (?, ?, ?, ?, 'IN_PROGRESS', ?)",
      [accountId, warehouseId, orderId, receiptNo, req.user.userId],
    );
    const receiptId = receiptResult.insertId;

    for (const item of pendingItems) {
      const outstandingQty = Number(item.quantity) - (acceptedByItem.get(item.id) || 0);
      await query(
        "INSERT INTO goods_receipt_lines (user_id, receipt_id, order_item_id, product_code_id, expected_qty, received_qty, condition_status) VALUES (?, ?, ?, ?, ?, 0, 'PENDING')",
        [accountId, receiptId, item.id, item.productCode, outstandingQty],
      );
    }

    await logActivity({
      action: "Create Goods Receipt",
      description: `Goods receipt ${receiptNo} started for order #${orderId}.`,
      entity: "goods_receipt",
      entityId: receiptId,
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    const receiptRows = await query("SELECT * FROM goods_receipts WHERE id = ? LIMIT 1", [
      receiptId,
    ]);
    const lines = await getHydratedLines(accountId, receiptId);

    res.status(201).json({ success: true, receipt: receiptRows[0], lines });
  } catch (error) {
    res.status(500).json({ message: "Error creating goods receipt", error: error.message });
  }
};

module.exports.getReceipts = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { status, warehouseId } = req.query;

    const conditions = ["gr.user_id = ?"];
    const params = [accountId];
    if (status) {
      conditions.push("gr.status = ?");
      params.push(status);
    }
    if (warehouseId) {
      conditions.push("gr.warehouse_id = ?");
      params.push(warehouseId);
    }

    if (!FULL_ACCESS_ROLES.includes(req.user.role)) {
      const accessibleIds = await getAccessibleWarehouseIds(req.user);
      if (!accessibleIds.length) {
        return res.status(200).json({ success: true, receipts: [] });
      }
      conditions.push(`gr.warehouse_id IN (${accessibleIds.map(() => "?").join(", ")})`);
      params.push(...accessibleIds);
    }

    const receipts = await query(
      `SELECT gr.*, w.name AS warehouseName
       FROM goods_receipts gr
       INNER JOIN warehouses w ON w.id = gr.warehouse_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY gr.createdAt DESC`,
      params,
    );

    res.status(200).json({ success: true, receipts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching goods receipts", error: error.message });
  }
};

module.exports.getReceiptById = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const rows = await query(
      "SELECT * FROM goods_receipts WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const receipt = rows[0];
    if (!receipt) {
      return res.status(404).json({ message: "Goods receipt not found" });
    }

    const allowed = await hasWarehouseAccess(req.user, receipt.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const lines = await getHydratedLines(accountId, id);
    res.status(200).json({ success: true, receipt, lines });
  } catch (error) {
    res.status(500).json({ message: "Error fetching goods receipt", error: error.message });
  }
};

module.exports.updateReceiptLine = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { receiptId, lineId } = req.params;
    const {
      receivedQty,
      batchNo,
      expiryDate,
      condition,
      locationId,
      confirmOverReceipt,
    } = req.body;

    const receiptRows = await query(
      "SELECT * FROM goods_receipts WHERE id = ? AND user_id = ? LIMIT 1",
      [receiptId, accountId],
    );
    const receipt = receiptRows[0];
    if (!receipt) {
      return res.status(404).json({ message: "Goods receipt not found" });
    }
    if (receipt.status === "COMPLETED") {
      return res.status(400).json({ message: "This goods receipt is already completed" });
    }

    const allowed = await hasWarehouseAccess(req.user, receipt.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    const lineRows = await query(
      "SELECT * FROM goods_receipt_lines WHERE id = ? AND receipt_id = ? AND user_id = ? LIMIT 1",
      [lineId, receiptId, accountId],
    );
    const line = lineRows[0];
    if (!line) {
      return res.status(404).json({ message: "Goods receipt line not found" });
    }
    if (line.condition_status !== "PENDING") {
      return res.status(400).json({
        message: "This line has already been processed and cannot be changed",
      });
    }

    if (!CONDITION_STATUSES.includes(condition)) {
      return res.status(400).json({
        message: `condition must be one of: ${CONDITION_STATUSES.join(", ")}`,
      });
    }

    if (condition !== "ACCEPTED" && !canDecideReceivingCondition(req.user)) {
      return res.status(403).json({
        message:
          "Only a quality-tagged team member can mark items damaged, rejected, or quarantined.",
      });
    }

    const qty = Number(receivedQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "receivedQty must be a positive number" });
    }

    if (condition === "ACCEPTED" && !locationId) {
      return res.status(400).json({
        message: "A putaway location is required to accept stock into inventory",
      });
    }

    if (locationId) {
      const locRows = await query(
        "SELECT id FROM warehouse_locations WHERE id = ? AND warehouse_id = ? AND user_id = ? LIMIT 1",
        [locationId, receipt.warehouse_id, accountId],
      );
      if (!locRows.length) {
        return res.status(400).json({ message: "Location not found in this warehouse" });
      }
    }

    const overReceived = qty > Number(line.expected_qty);
    if (overReceived && confirmOverReceipt !== true) {
      return res.status(409).json({
        message: `Received quantity (${qty}) exceeds the expected quantity (${line.expected_qty}). Resubmit with confirmOverReceipt: true to proceed.`,
        overReceived: true,
        expectedQty: Number(line.expected_qty),
      });
    }

    const batchStatus = BATCH_STATUS_BY_CONDITION[condition];

    let engineResult = null;
    if (condition === "ACCEPTED") {
      engineResult = await receiveStock({
        accountId,
        productCodeId: line.product_code_id,
        warehouseId: receipt.warehouse_id,
        locationId: locationId || null,
        quantity: qty,
        batchNo: batchNo || null,
        expiryDate: expiryDate || null,
        referenceType: "goods_receipt_line",
        referenceId: line.id,
        performedBy: req.user.userId,
        reason: `Goods receipt ${receipt.receipt_no}`,
        idempotencyKey: `grl-${line.id}`,
        status: batchStatus,
      });
    } else {
      // Damaged/rejected/quarantined stock is still recorded in the
      // inventory ledger for traceability, just never rolled into sellable
      // product_codes.quantity (inventoryEngine handles that distinction).
      engineResult = await receiveStock({
        accountId,
        productCodeId: line.product_code_id,
        warehouseId: receipt.warehouse_id,
        locationId: locationId || null,
        quantity: qty,
        batchNo: batchNo || null,
        expiryDate: expiryDate || null,
        referenceType: "goods_receipt_line",
        referenceId: line.id,
        performedBy: req.user.userId,
        reason: `Goods receipt ${receipt.receipt_no} — ${condition.toLowerCase()}`,
        idempotencyKey: `grl-${line.id}`,
        status: batchStatus,
      });
    }

    await query(
      "UPDATE goods_receipt_lines SET received_qty = ?, batch_no = ?, expiry_date = ?, condition_status = ?, location_id = ? WHERE id = ? AND user_id = ?",
      [qty, batchNo || null, expiryDate || null, condition, locationId || null, lineId, accountId],
    );

    await logActivity({
      action: "Update Goods Receipt Line",
      description: `Line on receipt ${receipt.receipt_no} marked ${condition} (qty ${qty}).`,
      entity: "goods_receipt_line",
      entityId: Number(lineId),
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    const updatedLines = await getHydratedLines(accountId, receiptId);
    const updatedLine = updatedLines.find((l) => l.id === Number(lineId));

    if (condition !== "ACCEPTED" || overReceived) {
      notifyDiscrepancy(req, { receipt, line: updatedLine, condition, overReceived });
    }

    res.status(200).json({
      success: true,
      line: updatedLine,
      overReceived,
      alreadyProcessed: engineResult.alreadyProcessed,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Error updating receipt line",
    });
  }
};

module.exports.completeReceipt = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { id } = req.params;

    const receiptRows = await query(
      "SELECT * FROM goods_receipts WHERE id = ? AND user_id = ? LIMIT 1",
      [id, accountId],
    );
    const receipt = receiptRows[0];
    if (!receipt) {
      return res.status(404).json({ message: "Goods receipt not found" });
    }
    if (receipt.status === "COMPLETED") {
      return res.status(400).json({ message: "This goods receipt is already completed" });
    }

    const allowed = await hasWarehouseAccess(req.user, receipt.warehouse_id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this warehouse" });
    }

    await query("UPDATE goods_receipts SET status = 'COMPLETED' WHERE id = ? AND user_id = ?", [
      id,
      accountId,
    ]);

    if (receipt.order_id) {
      const orderItems = await query(
        "SELECT id, quantity FROM order_items WHERE order_id = ? AND user_id = ?",
        [receipt.order_id, accountId],
      );
      const acceptedRows = await query(
        `SELECT gl.order_item_id, SUM(gl.received_qty) AS acceptedQty
         FROM goods_receipt_lines gl
         INNER JOIN goods_receipts gr ON gr.id = gl.receipt_id
         WHERE gr.order_id = ? AND gl.user_id = ? AND gl.condition_status = 'ACCEPTED'
         GROUP BY gl.order_item_id`,
        [receipt.order_id, accountId],
      );
      const acceptedByItem = new Map(
        acceptedRows.map((row) => [row.order_item_id, Number(row.acceptedQty) || 0]),
      );
      const fullyReceived = orderItems.every(
        (item) => (acceptedByItem.get(item.id) || 0) >= Number(item.quantity),
      );
      const anyReceived = orderItems.some((item) => (acceptedByItem.get(item.id) || 0) > 0);

      const orderRows = await query(
        "SELECT status FROM orders WHERE id = ? AND user_id = ? LIMIT 1",
        [receipt.order_id, accountId],
      );
      const currentOrderStatus = orderRows[0]?.status;

      if (fullyReceived && currentOrderStatus !== "delivered") {
        await query(
          "UPDATE orders SET status = 'delivered', stockInRecorded = 1 WHERE id = ? AND user_id = ?",
          [receipt.order_id, accountId],
        );
      } else if (!fullyReceived && anyReceived && currentOrderStatus !== "delivered") {
        await query("UPDATE orders SET status = 'partially_received' WHERE id = ? AND user_id = ?", [
          receipt.order_id,
          accountId,
        ]);
      }
    }

    await logActivity({
      action: "Complete Goods Receipt",
      description: `Goods receipt ${receipt.receipt_no} was completed.`,
      entity: "goods_receipt",
      entityId: Number(id),
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    const updatedRows = await query("SELECT * FROM goods_receipts WHERE id = ? LIMIT 1", [id]);
    const lines = await getHydratedLines(accountId, id);
    res.status(200).json({ success: true, receipt: updatedRows[0], lines });
  } catch (error) {
    res.status(500).json({ message: "Error completing goods receipt", error: error.message });
  }
};
