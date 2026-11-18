const query = require("./dbQuery.js");

const normalizeCode = (value) => String(value ?? "").trim().toUpperCase();

/**
 * Server-side proof that the operator handled the physical item they were
 * asked to handle. The camera scan (or the manual-entry fallback in the
 * scanner modal) produces `scannedCode`; the browser can't be trusted to
 * have compared it, so the comparison is repeated here against the line's
 * real product code (scoped to the tenant).
 *
 * Returns `null` when the scan is valid, otherwise `{ status, body }` ready
 * to send. `code` lets the UI distinguish "you didn't scan" from "wrong item".
 */
const verifyScannedProductCode = async ({ accountId, productCodeId, scannedCode }) => {
  if (!normalizeCode(scannedCode)) {
    return {
      status: 400,
      body: {
        code: "SCAN_REQUIRED",
        message: "Scan (or type) the product barcode to verify this item before confirming.",
      },
    };
  }

  const rows = await query(
    "SELECT code FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
    [productCodeId, accountId],
  );
  const expected = rows[0]?.code;

  if (!expected || normalizeCode(expected) !== normalizeCode(scannedCode)) {
    return {
      status: 400,
      body: {
        code: "SCAN_MISMATCH",
        message: `Scanned code "${String(scannedCode).trim()}" does not match this line's product${
          expected ? ` (${expected})` : ""
        }.`,
        expectedCode: expected || null,
      },
    };
  }

  return null;
};

module.exports = { verifyScannedProductCode, normalizeCode };
