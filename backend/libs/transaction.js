const pool = require("../db");

/**
 * Runs `work` inside a single MySQL transaction pinned to one dedicated
 * pooled connection, so every statement `work` issues (via the `txQuery`
 * it receives) shares the same session. Commits on success, rolls back
 * and rethrows on failure, and always releases the connection back to
 * the pool.
 */
const withTransaction = async (work) => {
  const promisePool = pool.promise();
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    const txQuery = async (sql, values = []) => {
      const [result] = await connection.query(sql, values);
      return result;
    };

    const result = await work(txQuery);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { withTransaction };
