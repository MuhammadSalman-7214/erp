require("dotenv").config();
const pool = require("../db");
const query = require("../libs/dbQuery");
const initDb = require("../libs/initDb");
const receiving = require("../controller/receivingController");
const fulfillment = require("../controller/fulfillmentController");
const { getNextInvoiceNumber, nextCounterValue } = require("../libs/invoiceNumber");

// End-to-end coverage of the receiving -> putaway -> reserve -> pick ->
// dispatch workflow and its scan verification, driven through the real
// controllers and real SQL (same approach as inventoryEngine.test.js). A
// dedicated tenant id keeps it away from real data; everything it creates is
// deleted in afterAll.
const TENANT = 999002;
const OTHER_TENANT = 999003;

const admin = { userId: 1, accountId: TENANT, role: "admin", jobFunctions: [] };
const outsider = { userId: 2, accountId: OTHER_TENANT, role: "admin", jobFunctions: [] };
const staffNoAccess = { userId: 3, accountId: TENANT, role: "staff", jobFunctions: [] };

// Minimal Express req/res stand-ins so controllers run unmodified.
const call = async (handler, { user = admin, params = {}, body = {}, qs = {} } = {}) => {
  const out = { status: 200, body: null };
  const req = { user, params, body, query: qs, ip: "127.0.0.1", app: { get: () => null } };
  const res = {
    status(code) {
      out.status = code;
      return this;
    },
    json(payload) {
      out.body = payload;
      return this;
    },
  };
  await handler(req, res);
  return out;
};

let warehouseId;
let binA;
let binB;
let seq = 0;

const makeProduct = async (label) => {
  seq += 1;
  const code = `WT${TENANT}-${seq}`;
  const product = await query("INSERT INTO products (user_id, name) VALUES (?, ?)", [TENANT, label]);
  const pc = await query(
    "INSERT INTO product_codes (user_id, product, code, quantity) VALUES (?, ?, ?, 0)",
    [TENANT, product.insertId, code],
  );
  return { codeId: pc.insertId, code };
};

const makeOrder = async (codeId, qty) => {
  const order = await query("INSERT INTO orders (user_id, status) VALUES (?, 'pending')", [TENANT]);
  await query(
    "INSERT INTO order_items (order_id, user_id, productCode, quantity) VALUES (?, ?, ?, ?)",
    [order.insertId, TENANT, codeId, qty],
  );
  return order.insertId;
};

const makeSale = async (codeId, qty) => {
  const sale = await query("INSERT INTO sales (user_id, status) VALUES (?, 'pending')", [TENANT]);
  await query(
    "INSERT INTO sale_items (sale_id, user_id, productCode, quantity) VALUES (?, ?, ?, ?)",
    [sale.insertId, TENANT, codeId, qty],
  );
  return sale.insertId;
};

// Receives stock through the real, scan-verified receiving flow.
const stockIn = async (product, locationId, qty, batchNo, expiryDate) => {
  const orderId = await makeOrder(product.codeId, qty);
  const created = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
  const receiptId = created.body.receipt.id;
  const lineId = created.body.lines[0].id;
  const updated = await call(receiving.updateReceiptLine, {
    params: { receiptId, lineId },
    body: {
      receivedQty: qty,
      batchNo,
      expiryDate,
      condition: "ACCEPTED",
      locationId,
      scannedCode: product.code,
    },
  });
  await call(receiving.completeReceipt, { params: { id: receiptId } });
  return updated;
};

const stock = async (codeId) => {
  const rows = await query(
    "SELECT status, SUM(quantity) AS qty FROM inventory_batches WHERE product_code_id = ? GROUP BY status",
    [codeId],
  );
  const buckets = {};
  rows.forEach((row) => {
    // Emptied buckets stay behind as zero-quantity rows; they aren't stock.
    if (Number(row.qty) > 0) buckets[row.status] = Number(row.qty);
  });
  const [pc] = await query("SELECT quantity FROM product_codes WHERE id = ?", [codeId]);
  return { buckets, sellable: Number(pc.quantity) };
};

beforeAll(async () => {
  // Idempotent; guarantees reservation_ref + indexes exist on whatever DB
  // the suite is pointed at.
  await initDb();

  const wh = await query(
    "INSERT INTO warehouses (user_id, name, code, is_default) VALUES (?, 'Workflow WH', 'WFWH', 1)",
    [TENANT],
  );
  warehouseId = wh.insertId;
  const otherWh = await query(
    "INSERT INTO warehouses (user_id, name, code) VALUES (?, 'Other WH', 'WFOTH')",
    [OTHER_TENANT],
  );
  global.__otherWarehouseId = otherWh.insertId;

  binA = (
    await query(
      "INSERT INTO warehouse_locations (user_id, warehouse_id, code, name) VALUES (?, ?, 'WF-A', 'Bin A')",
      [TENANT, warehouseId],
    )
  ).insertId;
  binB = (
    await query(
      "INSERT INTO warehouse_locations (user_id, warehouse_id, code, name) VALUES (?, ?, 'WF-B', 'Bin B')",
      [TENANT, warehouseId],
    )
  ).insertId;
});

afterAll(async () => {
  const tables = [
    "inventory_transactions",
    "inventory_batches",
    "fulfillment_lines",
    "fulfillments",
    "goods_receipt_lines",
    "goods_receipts",
    "sale_items",
    "sales",
    "order_items",
    "orders",
    "product_codes",
    "products",
    "warehouse_locations",
    "warehouses",
    "user_scope_access",
    "counters",
    "activity_logs",
  ];
  for (const table of tables) {
    await query(`DELETE FROM ${table} WHERE user_id IN (?, ?)`, [TENANT, OTHER_TENANT]);
  }
  await new Promise((resolve) => pool.end(resolve));
});

describe("document numbering", () => {
  test("parallel callers always get unique, gap-free numbers", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 25 }, () => getNextInvoiceNumber("WFT", TENANT)),
    );
    expect(new Set(numbers).size).toBe(25);
  });

  test("a brand-new counter starts at 1 (not at the row's auto-increment id)", async () => {
    // Burn a few ids on other counters so the new row's auto id is > 1.
    await nextCounterValue("burn-1", TENANT);
    await nextCounterValue("burn-2", TENANT);
    expect(await nextCounterValue("fresh-counter", TENANT)).toBe(1);
    expect(await nextCounterValue("fresh-counter", TENANT)).toBe(2);
  });
});

describe("receiving workflow + scan verification", () => {
  test("rejects a line update with no scan, and with the wrong item's code", async () => {
    const product = await makeProduct("Scan Widget");
    const other = await makeProduct("Other Widget");
    const orderId = await makeOrder(product.codeId, 10);
    const created = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
    const params = { receiptId: created.body.receipt.id, lineId: created.body.lines[0].id };
    const base = { receivedQty: 10, condition: "ACCEPTED", locationId: binA };

    const missing = await call(receiving.updateReceiptLine, { params, body: base });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("SCAN_REQUIRED");

    const wrong = await call(receiving.updateReceiptLine, {
      params,
      body: { ...base, scannedCode: other.code },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBe("SCAN_MISMATCH");
    expect((await stock(product.codeId)).sellable).toBe(0);

    // Matching is case/whitespace-insensitive (manual entry fallback).
    const ok = await call(receiving.updateReceiptLine, {
      params,
      body: { ...base, scannedCode: `  ${product.code.toLowerCase()} ` },
    });
    expect(ok.status).toBe(200);
    expect((await stock(product.codeId)).sellable).toBe(10);
  });

  test("a processed line cannot be submitted twice (no double count)", async () => {
    const product = await makeProduct("Idempotent Widget");
    const orderId = await makeOrder(product.codeId, 4);
    const created = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
    const params = { receiptId: created.body.receipt.id, lineId: created.body.lines[0].id };
    const body = { receivedQty: 4, condition: "ACCEPTED", locationId: binA, scannedCode: product.code };

    expect((await call(receiving.updateReceiptLine, { params, body })).status).toBe(200);
    expect((await call(receiving.updateReceiptLine, { params, body })).status).toBe(400);
    expect((await stock(product.codeId)).sellable).toBe(4);
  });

  test("over-receipt needs explicit confirmation", async () => {
    const product = await makeProduct("Over Widget");
    const orderId = await makeOrder(product.codeId, 5);
    const created = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
    const params = { receiptId: created.body.receipt.id, lineId: created.body.lines[0].id };
    const body = { receivedQty: 8, condition: "ACCEPTED", locationId: binA, scannedCode: product.code };

    const first = await call(receiving.updateReceiptLine, { params, body });
    expect(first.status).toBe(409);
    expect(first.body.overReceived).toBe(true);

    const confirmed = await call(receiving.updateReceiptLine, {
      params,
      body: { ...body, confirmOverReceipt: true },
    });
    expect(confirmed.status).toBe(200);
    expect((await stock(product.codeId)).sellable).toBe(8);
  });

  test("only one open receipt per order, and the existing one is reported", async () => {
    const product = await makeProduct("Dup Receipt Widget");
    const orderId = await makeOrder(product.codeId, 10);

    const first = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
    expect(first.status).toBe(201);

    const second = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
    expect(second.status).toBe(409);
    expect(second.body.existingReceiptId).toBe(first.body.receipt.id);
  });

  test("completing is refused with unprocessed lines unless explicitly partial", async () => {
    const a = await makeProduct("Line A");
    const b = await makeProduct("Line B");
    const order = await query("INSERT INTO orders (user_id, status) VALUES (?, 'pending')", [TENANT]);
    await query(
      "INSERT INTO order_items (order_id, user_id, productCode, quantity) VALUES (?, ?, ?, 3), (?, ?, ?, 3)",
      [order.insertId, TENANT, a.codeId, order.insertId, TENANT, b.codeId],
    );

    const created = await call(receiving.createReceipt, {
      body: { orderId: order.insertId, warehouseId },
    });
    const receiptId = created.body.receipt.id;
    const [lineA, lineB] = created.body.lines;

    // Nothing processed yet.
    const empty = await call(receiving.completeReceipt, { params: { id: receiptId } });
    expect(empty.status).toBe(400);

    await call(receiving.updateReceiptLine, {
      params: { receiptId, lineId: lineA.id },
      body: { receivedQty: 3, condition: "ACCEPTED", locationId: binA, scannedCode: a.code },
    });

    const refused = await call(receiving.completeReceipt, { params: { id: receiptId } });
    expect(refused.status).toBe(409);
    expect(refused.body.pendingLines).toBe(1);

    const partial = await call(receiving.completeReceipt, {
      params: { id: receiptId },
      body: { allowPartial: true },
    });
    expect(partial.status).toBe(200);
    const lines = await query(
      "SELECT id, condition_status FROM goods_receipt_lines WHERE receipt_id = ?",
      [receiptId],
    );
    expect(lines.find((l) => l.id === lineB.id).condition_status).toBe("NOT_RECEIVED");

    // Short shipment: order is partially received, and a follow-up receipt
    // can still be opened for the missing item.
    const [orderRow] = await query("SELECT status FROM orders WHERE id = ?", [order.insertId]);
    expect(orderRow.status).toBe("partially_received");
    const followUp = await call(receiving.createReceipt, {
      body: { orderId: order.insertId, warehouseId },
    });
    expect(followUp.status).toBe(201);
    expect(followUp.body.lines).toHaveLength(1);
  });

  test("full acceptance delivers the order; damaged goods never become sellable", async () => {
    const good = await makeProduct("Good Widget");
    const bad = await makeProduct("Damaged Widget");

    await stockIn(good, binA, 10, "LOT-G", null);
    const [goodOrder] = await query(
      "SELECT o.status FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.productCode = ?",
      [good.codeId],
    );
    expect(goodOrder.status).toBe("delivered");

    const orderId = await makeOrder(bad.codeId, 5);
    const created = await call(receiving.createReceipt, { body: { orderId, warehouseId } });
    const receiptId = created.body.receipt.id;
    const damaged = await call(receiving.updateReceiptLine, {
      params: { receiptId, lineId: created.body.lines[0].id },
      body: { receivedQty: 5, condition: "DAMAGED", scannedCode: bad.code },
    });
    expect(damaged.status).toBe(200);
    expect(await stock(bad.codeId)).toEqual({ buckets: { DAMAGED: 5 }, sellable: 0 });
  });

  test("access control: other tenants and unassigned staff are blocked", async () => {
    const product = await makeProduct("Guarded Widget");
    const orderId = await makeOrder(product.codeId, 2);

    const cross = await call(receiving.createReceipt, {
      user: outsider,
      body: { orderId, warehouseId: global.__otherWarehouseId },
    });
    expect(cross.status).toBe(404);

    const unassigned = await call(receiving.createReceipt, {
      user: staffNoAccess,
      body: { orderId, warehouseId },
    });
    expect(unassigned.status).toBe(403);
  });
});

describe("fulfillment workflow + scan verification", () => {
  test("pick requires a matching scan; dispatch needs every line picked", async () => {
    const product = await makeProduct("Pick Widget");
    const other = await makeProduct("Wrong Widget");
    await stockIn(product, binA, 20, "LOT-P", "2027-01-01");

    const saleId = await makeSale(product.codeId, 8);
    const created = await call(fulfillment.createFulfillment, { body: { saleId, warehouseId } });
    expect(created.status).toBe(201);
    const fulfillmentId = created.body.fulfillment.id;
    const lineId = created.body.lines[0].id;
    const params = { fulfillmentId, lineId };

    expect(await stock(product.codeId)).toEqual({
      buckets: { AVAILABLE: 12, RESERVED: 8 },
      sellable: 12,
    });

    // A second active fulfillment for the same sale is refused.
    const dup = await call(fulfillment.createFulfillment, { body: { saleId, warehouseId } });
    expect(dup.status).toBe(400);

    const early = await call(fulfillment.dispatchFulfillment, { params: { id: fulfillmentId } });
    expect(early.status).toBe(400);

    const noScan = await call(fulfillment.confirmPickLine, { params });
    expect(noScan.status).toBe(400);
    expect(noScan.body.code).toBe("SCAN_REQUIRED");

    const wrong = await call(fulfillment.confirmPickLine, {
      params,
      body: { scannedCode: other.code },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBe("SCAN_MISMATCH");
    expect((await query("SELECT status FROM fulfillment_lines WHERE id = ?", [lineId]))[0].status).toBe(
      "RESERVED",
    );

    const picked = await call(fulfillment.confirmPickLine, {
      params,
      body: { scannedCode: product.code },
    });
    expect(picked.status).toBe(200);
    expect(picked.body.fulfillmentStatus).toBe("PICKED");

    const again = await call(fulfillment.confirmPickLine, {
      params,
      body: { scannedCode: product.code },
    });
    expect(again.status).toBe(400);

    const dispatched = await call(fulfillment.dispatchFulfillment, { params: { id: fulfillmentId } });
    expect(dispatched.status).toBe(200);
    const after = await stock(product.codeId);
    expect(after.sellable).toBe(12);
    expect(after.buckets.RESERVED || 0).toBe(0);
    expect(after.buckets.PICKED || 0).toBe(0);

    const [sale] = await query("SELECT status, stockOutRecorded FROM sales WHERE id = ?", [saleId]);
    expect(sale.status).toBe("completed");
    expect(sale.stockOutRecorded).toBe(1);
  });

  test("a reservation spanning several bins/lots is picked and dispatched in full", async () => {
    const product = await makeProduct("Multi-bin Widget");
    await stockIn(product, binA, 6, "LOT-S1", "2027-01-01");
    await stockIn(product, binB, 4, "LOT-S2", "2027-02-01");

    const saleId = await makeSale(product.codeId, 8);
    const created = await call(fulfillment.createFulfillment, { body: { saleId, warehouseId } });
    const fulfillmentId = created.body.fulfillment.id;
    const lineId = created.body.lines[0].id;

    // FEFO: all 6 of the sooner-expiring lot + 2 of the next.
    expect((await stock(product.codeId)).buckets.RESERVED).toBe(8);

    await call(fulfillment.confirmPickLine, {
      params: { fulfillmentId, lineId },
      body: { scannedCode: product.code },
    });
    let state = await stock(product.codeId);
    expect(state.buckets.PICKED).toBe(8);
    expect(state.buckets.RESERVED || 0).toBe(0);

    await call(fulfillment.dispatchFulfillment, { params: { id: fulfillmentId } });
    state = await stock(product.codeId);
    expect(state.buckets.PICKED || 0).toBe(0);
    expect(state.buckets.RESERVED || 0).toBe(0);
    expect(state.sellable).toBe(2);
    expect(state.buckets.AVAILABLE).toBe(2);
  });

  test("cancelling after pick restores stock and keeps the original lot numbers", async () => {
    const product = await makeProduct("Cancel Widget");
    await stockIn(product, binA, 10, "LOT-KEEP", "2027-03-01");

    const saleId = await makeSale(product.codeId, 4);
    const created = await call(fulfillment.createFulfillment, { body: { saleId, warehouseId } });
    const fulfillmentId = created.body.fulfillment.id;
    await call(fulfillment.confirmPickLine, {
      params: { fulfillmentId, lineId: created.body.lines[0].id },
      body: { scannedCode: product.code },
    });

    const cancelled = await call(fulfillment.cancelFulfillment, { params: { id: fulfillmentId } });
    expect(cancelled.status).toBe(200);

    const state = await stock(product.codeId);
    expect(state.sellable).toBe(10);
    expect(state.buckets.AVAILABLE).toBe(10);
    expect(state.buckets.PICKED || 0).toBe(0);

    const available = await query(
      "SELECT batch_no, reservation_ref FROM inventory_batches WHERE product_code_id = ? AND status = 'AVAILABLE' AND quantity > 0",
      [product.codeId],
    );
    expect(available).toHaveLength(1); // merged back into the original batch
    expect(available[0].batch_no).toBe("LOT-KEEP");
    expect(available[0].reservation_ref).toBeNull();
  });

  test("insufficient stock leaves no orphan fulfillment; multi-line failure rolls back", async () => {
    const plenty = await makeProduct("Plenty Widget");
    const scarce = await makeProduct("Scarce Widget");
    await stockIn(plenty, binA, 10, "LOT-PL", null);
    await stockIn(scarce, binA, 2, "LOT-SC", null);

    const tooMuch = await makeSale(plenty.codeId, 50);
    const refused = await call(fulfillment.createFulfillment, {
      body: { saleId: tooMuch, warehouseId },
    });
    expect(refused.status).toBe(400);
    expect(
      (await query("SELECT COUNT(*) AS c FROM fulfillments WHERE sale_id = ?", [tooMuch]))[0].c,
    ).toBe(0);

    const sale = await query("INSERT INTO sales (user_id, status) VALUES (?, 'pending')", [TENANT]);
    await query(
      "INSERT INTO sale_items (sale_id, user_id, productCode, quantity) VALUES (?, ?, ?, 3), (?, ?, ?, 99)",
      [sale.insertId, TENANT, plenty.codeId, sale.insertId, TENANT, scarce.codeId],
    );
    const before = await stock(plenty.codeId);
    const failed = await call(fulfillment.createFulfillment, {
      body: { saleId: sale.insertId, warehouseId },
    });
    expect(failed.status).toBe(400);
    expect(await stock(plenty.codeId)).toEqual(before);
  });

  test("two sales racing for the same stock never oversell, and both get distinct numbers", async () => {
    const product = await makeProduct("Race Widget");
    await stockIn(product, binA, 10, "LOT-RACE", null);

    // 6 + 6 against 10: exactly one may win.
    const [s1, s2] = [await makeSale(product.codeId, 6), await makeSale(product.codeId, 6)];
    const results = await Promise.all([
      call(fulfillment.createFulfillment, { body: { saleId: s1, warehouseId } }),
      call(fulfillment.createFulfillment, { body: { saleId: s2, warehouseId } }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await stock(product.codeId)).toEqual({
      buckets: { AVAILABLE: 4, RESERVED: 6 },
      sellable: 4,
    });

    // 1 + 1 against plenty: both must succeed (used to 500 on a duplicate number).
    const [s3, s4] = [await makeSale(product.codeId, 1), await makeSale(product.codeId, 1)];
    const both = await Promise.all([
      call(fulfillment.createFulfillment, { body: { saleId: s3, warehouseId } }),
      call(fulfillment.createFulfillment, { body: { saleId: s4, warehouseId } }),
    ]);
    expect(both.map((r) => r.status)).toEqual([201, 201]);
    expect(both[0].body.fulfillment.fulfillment_no).not.toBe(both[1].body.fulfillment.fulfillment_no);
  });
});

describe("ledger integrity", () => {
  test("sellable rollup always equals the sum of AVAILABLE batches", async () => {
    const drift = await query(
      `SELECT pc.id, pc.quantity AS rollup,
              COALESCE(SUM(CASE WHEN ib.status = 'AVAILABLE' THEN ib.quantity END), 0) AS available
       FROM product_codes pc
       LEFT JOIN inventory_batches ib ON ib.product_code_id = pc.id
       WHERE pc.user_id = ?
       GROUP BY pc.id
       HAVING ABS(rollup - available) > 0.001`,
      [TENANT],
    );
    expect(drift).toEqual([]);
  });
});
