const mysql = require("mysql2");
require("dotenv").config();

// A dedicated connection per request (via `mysql.createConnection`) meant every
// query in the whole process shared ONE MySQL session. Because transactions are
// session-scoped, a `START TRANSACTION`/`COMMIT` from one request could interleave
// with an unrelated concurrent query (or another transaction), risking corrupted
// or partially-applied writes under concurrent load. A pool gives each concurrent
// operation its own connection, and `libs/transaction.js` pins one connection for
// the lifetime of a transaction via `pool.getConnection()`.
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.on("error", (err) => {
  console.error("MySQL pool error:", err);
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL connection error:", err);
  } else {
    console.log("MySQL Connected");
    connection.release();
  }
});

module.exports = db;
