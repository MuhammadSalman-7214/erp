const db = require("../db");
const query = require("../libs/dbQuery");

const run = async () => {
  try {
    const unsetResult = await query(
      "UPDATE customers SET customerCode = NULL WHERE customerCode IS NULL",
    );
    const emptyResult = await query(
      "UPDATE customers SET customerCode = NULL WHERE customerCode = ''",
    );

    console.log("Unset null customerCode:", unsetResult.affectedRows || 0);
    console.log("Unset empty customerCode:", emptyResult.affectedRows || 0);
  } catch (error) {
    console.error("Failed to normalize customer codes:", error.message);
    process.exitCode = 1;
  } finally {
    db.end();
  }
};

run();
