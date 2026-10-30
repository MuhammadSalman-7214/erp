const { withTransaction } = require("../libs/transaction");
const query = require("../libs/dbQuery");

// mysql2 reports a UNIQUE constraint violation as errno 1062. The
// check-then-insert inside the transaction can't fully close the race
// between two truly concurrent duplicate submissions (both can pass the
// "not found" check before either commits) — the UNIQUE key on
// (user_id, idempotency_key) is the actual safety net, and this lets the
// loser of that race come back with the winner's result instead of a raw
// SQL error.
const isDuplicateIdempotencyError = (error) => error?.errno === 1062;

const fetchByIdempotencyKey = async (accountId, idempotencyKey) => {
  const rows = await query(
    "SELECT * FROM inventory_transactions WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
    [accountId, idempotencyKey],
  );
  return rows[0] || null;
};

/**
 * The single choke point for every stock-changing operation the WMS layer
 * performs (receiving today; picking/transfers/counting in later phases).
 * Every call:
 *   - is idempotency-key protected, so a retried/duplicated request is a
 *     safe no-op instead of double-counting stock,
 *   - writes an immutable ledger row (`inventory_transactions`),
 *   - maintains the granular, location/batch-aware balance
 *     (`inventory_batches`),
 *   - and rolls the change up into `product_codes.quantity`, which is what
 *     every existing sales/dashboard/low-stock code already reads — so
 *     nothing downstream needs to change.
 * All of this happens in one DB transaction (`withTransaction`), so a crash
 * partway through can never leave the ledger, the batch balance, and the
 * rollup out of sync with each other.
 */

const findExistingTransaction = async (txQuery, accountId, idempotencyKey) => {
  if (!idempotencyKey) return null;

  const rows = await txQuery(
    "SELECT * FROM inventory_transactions WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
    [accountId, idempotencyKey],
  );
  return rows[0] || null;
};

const findOrCreateBatch = async (
  txQuery,
  { accountId, productCodeId, warehouseId, locationId, batchNo, expiryDate, costPrice, status },
) => {
  const batchStatus = status || "AVAILABLE";

  const existing = await txQuery(
    `SELECT * FROM inventory_batches
     WHERE user_id = ? AND product_code_id = ? AND warehouse_id = ?
       AND location_id <=> ? AND batch_no <=> ? AND status = ?
     LIMIT 1`,
    [accountId, productCodeId, warehouseId, locationId ?? null, batchNo ?? null, batchStatus],
  );

  if (existing[0]) {
    return existing[0];
  }

  const result = await txQuery(
    `INSERT INTO inventory_batches
       (user_id, product_code_id, warehouse_id, location_id, batch_no, expiry_date, quantity, status, cost_price, received_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
    [
      accountId,
      productCodeId,
      warehouseId,
      locationId ?? null,
      batchNo ?? null,
      expiryDate ?? null,
      batchStatus,
      costPrice ?? 0,
    ],
  );

  const rows = await txQuery("SELECT * FROM inventory_batches WHERE id = ? LIMIT 1", [
    result.insertId,
  ]);
  return rows[0];
};

const rollupProductCodeQuantity = async (txQuery, accountId, productCodeId, delta) => {
  await txQuery(
    "UPDATE product_codes SET quantity = quantity + ? WHERE id = ? AND user_id = ?",
    [delta, productCodeId, accountId],
  );
};

/**
 * Records a stock receipt (goods receipt line, or any future inbound
 * source) against a specific product code / warehouse / location / batch.
 * `quantity` must be positive.
 */
const receiveStock = async ({
  accountId,
  productCodeId,
  warehouseId,
  locationId,
  quantity,
  batchNo,
  expiryDate,
  costPrice,
  referenceType,
  referenceId,
  performedBy,
  reason,
  idempotencyKey,
  // AVAILABLE (default) counts as sellable stock and rolls up into
  // product_codes.quantity. DAMAGED/REJECTED/QUARANTINE are recorded for
  // audit/traceability but must NOT inflate sellable inventory.
  status,
}) => {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    const error = new Error("Receive quantity must be a positive number");
    error.statusCode = 400;
    throw error;
  }
  const batchStatus = status || "AVAILABLE";
  const isSellable = batchStatus === "AVAILABLE";

  try {
    return await withTransaction(async (txQuery) => {
      const existingTxn = await findExistingTransaction(txQuery, accountId, idempotencyKey);
      if (existingTxn) {
        const batchRows = await txQuery(
          "SELECT * FROM inventory_batches WHERE id = ? LIMIT 1",
          [existingTxn.batch_id],
        );
        return {
          alreadyProcessed: true,
          transaction: existingTxn,
          batch: batchRows[0] || null,
        };
      }

      const batch = await findOrCreateBatch(txQuery, {
        accountId,
        productCodeId,
        warehouseId,
        locationId,
        batchNo,
        expiryDate,
        costPrice,
        status: batchStatus,
      });

      const previousQty = Number(batch.quantity);
      const newQty = previousQty + qty;

      await txQuery("UPDATE inventory_batches SET quantity = ? WHERE id = ? AND user_id = ?", [
        newQty,
        batch.id,
        accountId,
      ]);

      const txnResult = await txQuery(
        `INSERT INTO inventory_transactions
           (user_id, product_code_id, batch_id, warehouse_id, location_id, type, quantity,
            reference_type, reference_id, previous_qty, new_qty, performed_by, reason, idempotency_key)
         VALUES (?, ?, ?, ?, ?, 'RECEIPT', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          productCodeId,
          batch.id,
          warehouseId,
          locationId ?? null,
          qty,
          referenceType ?? null,
          referenceId ?? null,
          previousQty,
          newQty,
          performedBy ?? null,
          reason ?? null,
          idempotencyKey ?? null,
        ],
      );

      if (isSellable) {
        await rollupProductCodeQuantity(txQuery, accountId, productCodeId, qty);
      }

      const updatedBatchRows = await txQuery(
        "SELECT * FROM inventory_batches WHERE id = ? LIMIT 1",
        [batch.id],
      );

      return {
        alreadyProcessed: false,
        transactionId: txnResult.insertId,
        batch: updatedBatchRows[0],
      };
    });
  } catch (error) {
    if (isDuplicateIdempotencyError(error) && idempotencyKey) {
      const winnerTxn = await fetchByIdempotencyKey(accountId, idempotencyKey);
      if (winnerTxn) {
        const batchRows = await query("SELECT * FROM inventory_batches WHERE id = ? LIMIT 1", [
          winnerTxn.batch_id,
        ]);
        return { alreadyProcessed: true, transaction: winnerTxn, batch: batchRows[0] || null };
      }
    }
    throw error;
  }
};

/**
 * Applies a signed quantity correction to a specific batch (e.g. a cycle
 * count variance or a damage write-off) and keeps the ledger + rollup in
 * sync. `quantityDelta` may be positive or negative but must never push the
 * batch below zero.
 */
const adjustStock = async ({
  accountId,
  batchId,
  quantityDelta,
  reason,
  performedBy,
  referenceType,
  referenceId,
  idempotencyKey,
}) => {
  const delta = Number(quantityDelta);
  if (!Number.isFinite(delta) || delta === 0) {
    const error = new Error("Adjustment quantity must be a non-zero number");
    error.statusCode = 400;
    throw error;
  }

  try {
    return await withTransaction(async (txQuery) => {
      const existingTxn = await findExistingTransaction(txQuery, accountId, idempotencyKey);
      if (existingTxn) {
        return { alreadyProcessed: true, transaction: existingTxn };
      }

      const batchRows = await txQuery(
        "SELECT * FROM inventory_batches WHERE id = ? AND user_id = ? LIMIT 1",
        [batchId, accountId],
      );
      const batch = batchRows[0];
      if (!batch) {
        const error = new Error("Inventory batch not found");
        error.statusCode = 404;
        throw error;
      }

      const previousQty = Number(batch.quantity);
      const newQty = previousQty + delta;
      if (newQty < 0) {
        const error = new Error(
          `Adjustment would take this batch negative (has ${previousQty}, adjusting by ${delta})`,
        );
        error.statusCode = 400;
        throw error;
      }

      await txQuery("UPDATE inventory_batches SET quantity = ? WHERE id = ? AND user_id = ?", [
        newQty,
        batchId,
        accountId,
      ]);

      const txnResult = await txQuery(
        `INSERT INTO inventory_transactions
           (user_id, product_code_id, batch_id, warehouse_id, location_id, type, quantity,
            reference_type, reference_id, previous_qty, new_qty, performed_by, reason, idempotency_key)
         VALUES (?, ?, ?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          batch.product_code_id,
          batch.id,
          batch.warehouse_id,
          batch.location_id,
          delta,
          referenceType ?? null,
          referenceId ?? null,
          previousQty,
          newQty,
          performedBy ?? null,
          reason ?? null,
          idempotencyKey ?? null,
        ],
      );

      if (batch.status === "AVAILABLE") {
        await rollupProductCodeQuantity(txQuery, accountId, batch.product_code_id, delta);
      }

      return { alreadyProcessed: false, transactionId: txnResult.insertId };
    });
  } catch (error) {
    if (isDuplicateIdempotencyError(error) && idempotencyKey) {
      const winnerTxn = await fetchByIdempotencyKey(accountId, idempotencyKey);
      if (winnerTxn) {
        return { alreadyProcessed: true, transaction: winnerTxn };
      }
    }
    throw error;
  }
};

/**
 * Reserves stock for one outbound fulfillment line by moving quantity out of
 * AVAILABLE batches (FEFO — soonest expiry first, then oldest received)
 * into a single dedicated RESERVED-status bucket tagged to this reference,
 * so `confirmPick`/`confirmDispatch`/`releaseReservation` can find it again.
 *
 * Concurrency: the source batches are locked with `FOR UPDATE` for the
 * duration of the transaction, so two sales racing for the same last units
 * are serialized by the database — the loser sees the reduced quantity
 * left by the winner and correctly fails with "insufficient stock" rather
 * than both succeeding and overselling.
 */
const reserveStock = async ({
  accountId,
  productCodeId,
  warehouseId,
  quantity,
  referenceType,
  referenceId,
  performedBy,
  reason,
  idempotencyKey,
}) => {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    const error = new Error("Reservation quantity must be a positive number");
    error.statusCode = 400;
    throw error;
  }

  const bucketTag = `FUL-${referenceType}-${referenceId}`;

  try {
    return await withTransaction(async (txQuery) => {
      const existingTxn = await findExistingTransaction(txQuery, accountId, idempotencyKey);
      if (existingTxn) {
        return { alreadyProcessed: true, transaction: existingTxn };
      }

      const availableBatches = await txQuery(
        `SELECT * FROM inventory_batches
         WHERE user_id = ? AND product_code_id = ? AND warehouse_id = ? AND status = 'AVAILABLE' AND quantity > 0
         ORDER BY (expiry_date IS NULL) ASC, expiry_date ASC, received_at ASC
         FOR UPDATE`,
        [accountId, productCodeId, warehouseId],
      );

      const totalAvailable = availableBatches.reduce(
        (sum, b) => sum + Number(b.quantity),
        0,
      );
      if (totalAvailable < qty) {
        const error = new Error(
          `Only ${totalAvailable} available to reserve. Requested ${qty}.`,
        );
        error.statusCode = 400;
        error.available = totalAvailable;
        error.requested = qty;
        throw error;
      }

      let remaining = qty;
      let anchorTxnId = null;
      for (const batch of availableBatches) {
        if (remaining <= 0) break;
        const consume = Math.min(remaining, Number(batch.quantity));
        if (consume <= 0) continue;

        const previousQty = Number(batch.quantity);
        const newQty = previousQty - consume;
        await txQuery(
          "UPDATE inventory_batches SET quantity = ? WHERE id = ? AND user_id = ?",
          [newQty, batch.id, accountId],
        );

        const bucket = await findOrCreateBatch(txQuery, {
          accountId,
          productCodeId,
          warehouseId,
          locationId: batch.location_id,
          batchNo: bucketTag,
          expiryDate: batch.expiry_date,
          costPrice: batch.cost_price,
          status: "RESERVED",
        });
        const bucketNewQty = Number(bucket.quantity) + consume;
        await txQuery(
          "UPDATE inventory_batches SET quantity = ? WHERE id = ? AND user_id = ?",
          [bucketNewQty, bucket.id, accountId],
        );

        const isFirstMove = remaining === qty;
        const txnResult = await txQuery(
          `INSERT INTO inventory_transactions
             (user_id, product_code_id, batch_id, warehouse_id, location_id, type, quantity,
              reference_type, reference_id, previous_qty, new_qty, performed_by, reason, idempotency_key)
           VALUES (?, ?, ?, ?, ?, 'RESERVATION', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            accountId,
            productCodeId,
            bucket.id,
            warehouseId,
            batch.location_id,
            consume,
            referenceType,
            referenceId,
            previousQty,
            newQty,
            performedBy ?? null,
            reason ?? "Reserved for fulfillment",
            // Only the first ledger row of a (possibly multi-batch)
            // reservation carries the idempotency key — the UNIQUE
            // constraint is per (user_id, key), not per row.
            isFirstMove ? idempotencyKey ?? null : null,
          ],
        );
        if (isFirstMove) anchorTxnId = txnResult.insertId;

        await rollupProductCodeQuantity(txQuery, accountId, productCodeId, -consume);
        remaining -= consume;
      }

      return { alreadyProcessed: false, transactionId: anchorTxnId, reservedQty: qty };
    });
  } catch (error) {
    if (isDuplicateIdempotencyError(error) && idempotencyKey) {
      const winnerTxn = await fetchByIdempotencyKey(accountId, idempotencyKey);
      if (winnerTxn) {
        return { alreadyProcessed: true, transaction: winnerTxn };
      }
    }
    throw error;
  }
};

/**
 * Moves the single reservation bucket tagged to `referenceType`/`referenceId`
 * from one status to another (RESERVED -> PICKED -> [gone], or RESERVED ->
 * AVAILABLE for a release/cancel). Shared by confirmPick, confirmDispatch,
 * and releaseReservation below.
 */
const moveReservationBucket = async ({
  accountId,
  productCodeId,
  warehouseId,
  fromStatus,
  toStatus,
  referenceType,
  referenceId,
  performedBy,
  reason,
  transactionType,
  idempotencyKey,
}) => {
  const bucketTag = `FUL-${referenceType}-${referenceId}`;

  try {
    return await withTransaction(async (txQuery) => {
      const existingTxn = await findExistingTransaction(txQuery, accountId, idempotencyKey);
      if (existingTxn) {
        return { alreadyProcessed: true, transaction: existingTxn };
      }

      const sourceRows = await txQuery(
        `SELECT * FROM inventory_batches
         WHERE user_id = ? AND product_code_id = ? AND warehouse_id = ? AND batch_no = ? AND status = ?
         LIMIT 1 FOR UPDATE`,
        [accountId, productCodeId, warehouseId, bucketTag, fromStatus],
      );
      const source = sourceRows[0];
      const moveQty = Number(source?.quantity || 0);

      if (!source || moveQty <= 0) {
        const error = new Error(
          `No ${fromStatus.toLowerCase()} reservation found for this line`,
        );
        error.statusCode = 404;
        throw error;
      }

      await txQuery(
        "UPDATE inventory_batches SET quantity = 0 WHERE id = ? AND user_id = ?",
        [source.id, accountId],
      );

      let destBatchId = null;
      if (toStatus) {
        const dest = await findOrCreateBatch(txQuery, {
          accountId,
          productCodeId,
          warehouseId,
          locationId: source.location_id,
          batchNo: bucketTag,
          expiryDate: source.expiry_date,
          costPrice: source.cost_price,
          status: toStatus,
        });
        const destNewQty = Number(dest.quantity) + moveQty;
        await txQuery(
          "UPDATE inventory_batches SET quantity = ? WHERE id = ? AND user_id = ?",
          [destNewQty, dest.id, accountId],
        );
        destBatchId = dest.id;
      }

      const txnResult = await txQuery(
        `INSERT INTO inventory_transactions
           (user_id, product_code_id, batch_id, warehouse_id, location_id, type, quantity,
            reference_type, reference_id, previous_qty, new_qty, performed_by, reason, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          productCodeId,
          destBatchId || source.id,
          warehouseId,
          source.location_id,
          transactionType,
          moveQty,
          referenceType,
          referenceId,
          moveQty,
          0,
          performedBy ?? null,
          reason ?? null,
          idempotencyKey ?? null,
        ],
      );

      if (fromStatus === "AVAILABLE") {
        await rollupProductCodeQuantity(txQuery, accountId, productCodeId, -moveQty);
      }
      if (toStatus === "AVAILABLE") {
        await rollupProductCodeQuantity(txQuery, accountId, productCodeId, moveQty);
      }

      return { alreadyProcessed: false, transactionId: txnResult.insertId, movedQty: moveQty };
    });
  } catch (error) {
    if (isDuplicateIdempotencyError(error) && idempotencyKey) {
      const winnerTxn = await fetchByIdempotencyKey(accountId, idempotencyKey);
      if (winnerTxn) {
        return { alreadyProcessed: true, transaction: winnerTxn };
      }
    }
    throw error;
  }
};

const confirmPick = ({ accountId, productCodeId, warehouseId, referenceType, referenceId, performedBy, idempotencyKey }) =>
  moveReservationBucket({
    accountId,
    productCodeId,
    warehouseId,
    fromStatus: "RESERVED",
    toStatus: "PICKED",
    referenceType,
    referenceId,
    performedBy,
    reason: "Picked for fulfillment",
    transactionType: "PICK",
    idempotencyKey,
  });

const confirmDispatch = ({ accountId, productCodeId, warehouseId, referenceType, referenceId, performedBy, idempotencyKey }) =>
  moveReservationBucket({
    accountId,
    productCodeId,
    warehouseId,
    fromStatus: "PICKED",
    toStatus: null,
    referenceType,
    referenceId,
    performedBy,
    reason: "Dispatched",
    transactionType: "DISPATCH",
    idempotencyKey,
  });

const releaseReservation = ({ accountId, productCodeId, warehouseId, referenceType, referenceId, performedBy, idempotencyKey }) =>
  moveReservationBucket({
    accountId,
    productCodeId,
    warehouseId,
    fromStatus: "RESERVED",
    toStatus: "AVAILABLE",
    referenceType,
    referenceId,
    performedBy,
    reason: "Reservation released",
    transactionType: "RELEASE",
    idempotencyKey,
  });

module.exports = {
  receiveStock,
  adjustStock,
  reserveStock,
  confirmPick,
  confirmDispatch,
  releaseReservation,
  // Exposed directly (beyond the confirmPick/confirmDispatch/releaseReservation
  // wrappers) so callers like fulfillment cancellation can release a bucket
  // from whichever status it's currently sitting in (RESERVED or PICKED).
  moveReservationBucket,
};
