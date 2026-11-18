const query = require("./dbQuery.js");

const padSequence = (seq) => String(seq).padStart(5, "0");

/**
 * Atomically increments and returns the next value of a per-tenant counter.
 *
 * The increment and the read MUST be one statement: a separate SELECT after
 * the upsert lets concurrent callers all observe the same (latest) value and
 * hand out duplicate document numbers. `LAST_INSERT_ID(expr)` makes the
 * incremented value available on this connection's result without a second
 * round trip.
 *
 * `affectedRows` distinguishes the two upsert outcomes: 1 = a brand-new row
 * was inserted (seq starts at 1; `insertId` is then the row's auto-increment
 * id, NOT the sequence), 2 = an existing row was updated (`insertId` carries
 * the value we passed to LAST_INSERT_ID).
 */
const nextCounterValue = async (key, userId) => {
  const result = await query(
    "INSERT INTO counters (`key`, user_id, seq) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)",
    [key, userId],
  );

  return result.affectedRows === 1 ? 1 : Number(result.insertId);
};

const getNextInvoiceNumber = async (prefix, userId) => {
  const year = new Date().getFullYear();
  const seq = await nextCounterValue(`${prefix}-${year}`, userId);
  return `${prefix}-${year}-${padSequence(seq)}`;
};

module.exports = { getNextInvoiceNumber, nextCounterValue };
