require("dotenv").config();
const pool = require("../db");
const query = require("../libs/dbQuery");
const {
  receiveStock,
  adjustStock,
  reserveStock,
  confirmPick,
  confirmDispatch,
  releaseReservation,
} = require("../services/inventoryEngine");

// A dedicated, high-numbered tenant id that can't collide with real
// accounts. There are no FK constraints in this schema, so we don't need a
// real `users` row — inventoryEngine only ever scopes by this id.
const ACCOUNT_ID = 999001;

let productId;
let productCodeId;
let warehouseId;
let locationId;

beforeAll(async () => {
  const productResult = await query(
    "INSERT INTO products (user_id, name, company) VALUES (?, 'Jest Test Product', 'Jest Co')",
    [ACCOUNT_ID],
  );
  productId = productResult.insertId;

  const codeResult = await query(
    "INSERT INTO product_codes (user_id, product, code, quantity) VALUES (?, ?, 'JEST-CODE-1', 0)",
    [ACCOUNT_ID, productId],
  );
  productCodeId = codeResult.insertId;

  const warehouseResult = await query(
    "INSERT INTO warehouses (user_id, name, code) VALUES (?, 'Jest Warehouse', 'JESTWH')",
    [ACCOUNT_ID],
  );
  warehouseId = warehouseResult.insertId;

  const locationResult = await query(
    "INSERT INTO warehouse_locations (user_id, warehouse_id, code, name) VALUES (?, ?, 'JESTBIN', 'Jest Bin')",
    [ACCOUNT_ID, warehouseId],
  );
  locationId = locationResult.insertId;
});

afterAll(async () => {
  await query("DELETE FROM inventory_transactions WHERE product_code_id = ?", [productCodeId]);
  await query("DELETE FROM inventory_batches WHERE product_code_id = ?", [productCodeId]);
  await query("DELETE FROM product_codes WHERE id = ?", [productCodeId]);
  await query("DELETE FROM products WHERE id = ?", [productId]);
  await query("DELETE FROM warehouse_locations WHERE id = ?", [locationId]);
  await query("DELETE FROM warehouses WHERE id = ?", [warehouseId]);
  await new Promise((resolve) => pool.end(resolve));
});

const getSellableQuantity = async () => {
  const rows = await query("SELECT quantity FROM product_codes WHERE id = ?", [productCodeId]);
  return Number(rows[0].quantity);
};

describe("inventoryEngine.receiveStock", () => {
  test("records a receipt and rolls it up into sellable quantity", async () => {
    const before = await getSellableQuantity();

    const result = await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 20,
      batchNo: "JEST-BATCH-1",
      idempotencyKey: `jest-receive-${Date.now()}-basic`,
    });

    expect(result.alreadyProcessed).toBe(false);
    expect(Number(result.batch.quantity)).toBe(20);
    expect(await getSellableQuantity()).toBe(before + 20);
  });

  test("is a safe no-op when the same idempotency key is retried sequentially", async () => {
    const key = `jest-receive-${Date.now()}-sequential-retry`;

    const first = await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 5,
      idempotencyKey: key,
    });
    const afterFirst = await getSellableQuantity();

    const second = await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 5,
      idempotencyKey: key,
    });
    const afterSecond = await getSellableQuantity();

    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
    expect(afterSecond).toBe(afterFirst);
  });

  test("never double-counts truly concurrent duplicate submissions (the real race)", async () => {
    const key = `jest-receive-${Date.now()}-concurrent`;
    const before = await getSellableQuantity();

    const [a, b] = await Promise.all([
      receiveStock({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        locationId,
        quantity: 7,
        idempotencyKey: key,
      }),
      receiveStock({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        locationId,
        quantity: 7,
        idempotencyKey: key,
      }),
    ]);

    const after = await getSellableQuantity();
    const flags = [a.alreadyProcessed, b.alreadyProcessed].sort();

    // Exactly one side of the race wins; the other must observe the
    // winner's result instead of erroring or double-applying.
    expect(flags).toEqual([false, true]);
    expect(after).toBe(before + 7);
  });

  test("rejects a non-positive quantity without touching the database", async () => {
    const before = await getSellableQuantity();

    await expect(
      receiveStock({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        locationId,
        quantity: 0,
      }),
    ).rejects.toThrow(/positive/i);

    expect(await getSellableQuantity()).toBe(before);
  });

  test("keeps damaged/rejected stock out of sellable quantity, but still ledgers it", async () => {
    const before = await getSellableQuantity();

    const result = await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 4,
      status: "DAMAGED",
      idempotencyKey: `jest-receive-${Date.now()}-damaged`,
    });

    expect(await getSellableQuantity()).toBe(before);

    const batches = await query(
      "SELECT quantity, status FROM inventory_batches WHERE id = ?",
      [result.batch.id],
    );
    expect(batches[0].status).toBe("DAMAGED");
    expect(Number(batches[0].quantity)).toBe(4);
  });
});

describe("inventoryEngine.adjustStock", () => {
  let batchId;

  beforeAll(async () => {
    const result = await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 50,
      batchNo: "JEST-ADJUST-BATCH",
      idempotencyKey: `jest-adjust-setup-${Date.now()}`,
    });
    batchId = result.batch.id;
  });

  test("applies a negative correction and rolls it into sellable quantity", async () => {
    const before = await getSellableQuantity();

    await adjustStock({
      accountId: ACCOUNT_ID,
      batchId,
      quantityDelta: -10,
      reason: "jest cycle count variance",
      idempotencyKey: `jest-adjust-${Date.now()}-negative`,
    });

    expect(await getSellableQuantity()).toBe(before - 10);
  });

  test("rejects an adjustment that would take a batch negative, and changes nothing", async () => {
    const before = await getSellableQuantity();

    await expect(
      adjustStock({ accountId: ACCOUNT_ID, batchId, quantityDelta: -999999 }),
    ).rejects.toThrow(/negative/i);

    expect(await getSellableQuantity()).toBe(before);
  });

  test("404s on a batch that doesn't belong to this tenant", async () => {
    await expect(
      adjustStock({ accountId: ACCOUNT_ID + 1, batchId, quantityDelta: -1 }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("inventoryEngine outbound: reserveStock / confirmPick / confirmDispatch / releaseReservation", () => {
  beforeAll(async () => {
    await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 100,
      batchNo: "JEST-OUTBOUND-STOCK",
      idempotencyKey: `jest-outbound-setup-${Date.now()}`,
    });
  });

  test("reserving moves quantity out of sellable stock", async () => {
    const before = await getSellableQuantity();
    const refId = Date.now() % 100000;

    const result = await reserveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      quantity: 20,
      referenceType: "jest-fulfillment-line",
      referenceId: refId,
      idempotencyKey: `jest-reserve-${refId}`,
    });

    expect(result.alreadyProcessed).toBe(false);
    expect(await getSellableQuantity()).toBe(before - 20);
  });

  test("rejects reserving more than is available, and changes nothing", async () => {
    const before = await getSellableQuantity();
    const refId = (Date.now() % 100000) + 1;

    await expect(
      reserveStock({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        quantity: before + 1000,
        referenceType: "jest-fulfillment-line",
        referenceId: refId,
      }),
    ).rejects.toThrow(/available/i);

    expect(await getSellableQuantity()).toBe(before);
  });

  test("never oversells under two concurrent reservations racing for the same last units", async () => {
    // Drain down to a known, small available quantity first so the race is
    // deterministic: exactly enough for ONE of the two 30-unit requests.
    const current = await getSellableQuantity();
    const drainRefId = Date.now() % 100000;
    await reserveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      quantity: current - 30,
      referenceType: "jest-fulfillment-line",
      referenceId: drainRefId,
    });
    expect(await getSellableQuantity()).toBe(30);

    const refA = (Date.now() % 100000) + 1;
    const refB = (Date.now() % 100000) + 2;

    const results = await Promise.allSettled([
      reserveStock({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        quantity: 30,
        referenceType: "jest-fulfillment-line",
        referenceId: refA,
      }),
      reserveStock({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        quantity: 30,
        referenceType: "jest-fulfillment-line",
        referenceId: refB,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Only one side of the race can actually get the last 30 units.
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.message).toMatch(/available/i);
    expect(await getSellableQuantity()).toBe(0);
  });

  test("confirmPick then confirmDispatch never touches sellable quantity (already excluded at reservation)", async () => {
    const refId = (Date.now() % 100000) + 3;
    await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 15,
      idempotencyKey: `jest-outbound-topup-${refId}`,
    });
    const beforeReserve = await getSellableQuantity();

    await reserveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      quantity: 15,
      referenceType: "jest-fulfillment-line",
      referenceId: refId,
    });
    expect(await getSellableQuantity()).toBe(beforeReserve - 15);

    const pickResult = await confirmPick({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      referenceType: "jest-fulfillment-line",
      referenceId: refId,
    });
    expect(pickResult.movedQty).toBe(15);
    expect(await getSellableQuantity()).toBe(beforeReserve - 15);

    const dispatchResult = await confirmDispatch({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      referenceType: "jest-fulfillment-line",
      referenceId: refId,
    });
    expect(dispatchResult.movedQty).toBe(15);
    expect(await getSellableQuantity()).toBe(beforeReserve - 15);

    // The reservation bucket is fully consumed — nothing left to pick again.
    await expect(
      confirmPick({
        accountId: ACCOUNT_ID,
        productCodeId,
        warehouseId,
        referenceType: "jest-fulfillment-line",
        referenceId: refId,
      }),
    ).rejects.toThrow(/no reserved reservation/i);
  });

  test("releaseReservation returns quantity to sellable stock", async () => {
    const refId = (Date.now() % 100000) + 4;
    await receiveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      locationId,
      quantity: 8,
      idempotencyKey: `jest-outbound-topup-${refId}`,
    });
    const beforeReserve = await getSellableQuantity();

    await reserveStock({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      quantity: 8,
      referenceType: "jest-fulfillment-line",
      referenceId: refId,
    });
    expect(await getSellableQuantity()).toBe(beforeReserve - 8);

    await releaseReservation({
      accountId: ACCOUNT_ID,
      productCodeId,
      warehouseId,
      referenceType: "jest-fulfillment-line",
      referenceId: refId,
    });
    expect(await getSellableQuantity()).toBe(beforeReserve);
  });
});
