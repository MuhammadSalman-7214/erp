const query = require("./dbQuery.js");

const padSequence = (seq) => String(seq).padStart(5, "0");

const getNextInvoiceNumber = async (prefix, userId) => {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;

  await query(
    "INSERT INTO counters (`key`, user_id, seq) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE seq = seq + 1",
    [key, userId],
  );
  const rows = await query(
    "SELECT seq FROM counters WHERE `key` = ? AND user_id = ? LIMIT 1",
    [key, userId],
  );
  const seq = rows[0]?.seq || 1;
  return `${prefix}-${year}-${padSequence(seq)}`;
};

module.exports = { getNextInvoiceNumber };
