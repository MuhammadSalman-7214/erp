const query = require("./dbQuery");

const isTableEngineError = (error) =>
  error?.errno === 1932 ||
  /doesn't exist in engine/i.test(error?.sqlMessage || "") ||
  /table .* doesn't exist in engine/i.test(error?.message || "");

const extractTableName = (sql) => {
  const match =
    sql.match(/CREATE TABLE IF NOT EXISTS\s+`?([a-zA-Z0-9_]+)`?/i) ||
    sql.match(/ALTER TABLE\s+`?([a-zA-Z0-9_]+)`?/i) ||
    sql.match(/UPDATE\s+`?([a-zA-Z0-9_]+)`?/i);

  return match?.[1] || "unknown";
};

const logTableEngineWarning = (sql, error) => {
  const tableName = extractTableName(sql);

  console.error(
    `[initDb] MariaDB reported a table engine problem while processing "${tableName}".`,
  );
  console.error(
    "[initDb] This usually means the table metadata exists, but the underlying table data is missing or corrupted.",
  );
  console.error(
    "[initDb] In a development database, the fastest fix is often to drop and recreate the broken table or restore the database files from a clean backup.",
  );
  console.error("[initDb] Original error:", error);
};

const initDb = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      ProfilePic TEXT,
      role VARCHAR(50),
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_categories_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS category_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category INT NOT NULL,
      code VARCHAR(255) NOT NULL,
      variantName VARCHAR(255) DEFAULT '',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_category_code (user_id, category, code, variantName),
      INDEX idx_category_codes_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(50),
      contact_address TEXT,
      openingBalance DECIMAL(12,2) DEFAULT 0,
      paymentTerms VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_vendors_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      company VARCHAR(255),
      brand VARCHAR(255),
      Category INT,
      purchasePrice DECIMAL(12,2) DEFAULT 0,
      tradePrice DECIMAL(12,2) DEFAULT 0,
      salePrice DECIMAL(12,2) DEFAULT 0,
      pricing TEXT,
      priceHistory TEXT,
      Price DECIMAL(12,2),
      image TEXT,
      vendor INT,
      supplier INT,
      sku VARCHAR(255),
      quantity DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_products_user (user_id),
      INDEX idx_products_category (Category)
    )`,
    `CREATE TABLE IF NOT EXISTS product_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product INT NOT NULL,
      code VARCHAR(255) NOT NULL,
      variantName VARCHAR(255) DEFAULT '',
      quantity DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_code (user_id, product, code),
      INDEX idx_product_codes_user (user_id),
      INDEX idx_product_codes_product (product)
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(50),
      contact_address TEXT,
      customerCode VARCHAR(255),
      openingBalance DECIMAL(12,2) DEFAULT 0,
      openingBalanceNote TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customers_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      user INT,
      vendor INT,
      supplier INT,
      totalAmount DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(50),
      stockInRecorded TINYINT(1) DEFAULT 0,
      invoice INT,
      invoiceUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_orders_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      user_id INT NOT NULL,
      product INT,
      productCode INT,
      quantity DECIMAL(12,2) DEFAULT 0,
      price DECIMAL(12,2) DEFAULT 0,
      INDEX idx_order_items_order (order_id),
      INDEX idx_order_items_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      invoiceNumber VARCHAR(255),
      customer INT,
      customerName VARCHAR(255),
      carage DECIMAL(12,2) DEFAULT 0,
      totalAmount DECIMAL(12,2) DEFAULT 0,
      paymentStatus VARCHAR(50) DEFAULT 'unpaid',
      paymentMethod VARCHAR(50),
      invoice INT,
      status VARCHAR(50),
      stockOutRecorded TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sales_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      user_id INT NOT NULL,
      product INT,
      productCode INT,
      quantity DECIMAL(12,2) DEFAULT 0,
      price DECIMAL(12,2) DEFAULT 0,
      INDEX idx_sale_items_sale (sale_id),
      INDEX idx_sale_items_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      invoiceNumber VARCHAR(255),
      invoiceType VARCHAR(50),
      customerId INT,
      customer_code VARCHAR(255),
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      customer_address TEXT,
      vendor INT,
      subTotal DECIMAL(12,2) DEFAULT 0,
      carage DECIMAL(12,2) DEFAULT 0,
      taxRate DECIMAL(12,2) DEFAULT 0,
      taxAmount DECIMAL(12,2) DEFAULT 0,
      discount DECIMAL(12,2) DEFAULT 0,
      totalAmount DECIMAL(12,2) DEFAULT 0,
      currency VARCHAR(20),
      status VARCHAR(50),
      issueDate DATETIME,
      dueDate DATETIME,
      paymentMethod VARCHAR(50),
      paidAt DATETIME,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_invoices_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      name VARCHAR(255),
      quantity DECIMAL(12,2) DEFAULT 0,
      unitPrice DECIMAL(12,2) DEFAULT 0,
      total DECIMAL(12,2) DEFAULT 0,
      INDEX idx_invoice_items_invoice (invoice_id)
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50),
      amount DECIMAL(12,2) DEFAULT 0,
      method VARCHAR(50),
      invoice INT,
      invoiceType VARCHAR(50),
      partyType VARCHAR(50),
      customerId INT,
      customer_code VARCHAR(255),
      customer_name VARCHAR(255),
      vendor INT,
      paidAt DATETIME,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payments_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      productCode INT NOT NULL,
      quantity DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(50),
      lastUpdated DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_inventory (user_id, productCode)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      \`read\` TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_notifications_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      userId INT,
      action VARCHAR(255),
      entity VARCHAR(255),
      entityId INT,
      ipAddress VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_activity_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product INT,
      productCode INT,
      type VARCHAR(50),
      quantity DECIMAL(12,2) DEFAULT 0,
      transactionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      vendor INT,
      supplier INT,
      sourceModel VARCHAR(50),
      sourceId INT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_stock_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS counters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      \`key\` VARCHAR(255) NOT NULL,
      seq INT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_counter (user_id, \`key\`)
    )`,
    `CREATE TABLE IF NOT EXISTS vendor_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      vendor_id INT NOT NULL,
      product_id INT NOT NULL,
      UNIQUE KEY uniq_vendor_product (user_id, vendor_id, product_id),
      INDEX idx_vendor_products_user (user_id)
    )`,
  ];

  for (const sql of statements) {
    try {
      await query(sql);
    } catch (error) {
      if (isTableEngineError(error)) {
        logTableEngineWarning(sql, error);
      }

      throw error;
    }
  }

  try {
    await query(
      "ALTER TABLE users ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1",
    );
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE users ADD COLUMN isActive", error);
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query("ALTER TABLE sales ADD COLUMN invoiceNumber VARCHAR(255)");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE sales ADD COLUMN invoiceNumber", error);
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query("ALTER TABLE sales ADD COLUMN carage DECIMAL(12,2) DEFAULT 0");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE sales ADD COLUMN carage", error);
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query("ALTER TABLE customers ADD COLUMN openingBalanceNote TEXT");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning(
        "ALTER TABLE customers ADD COLUMN openingBalanceNote",
        error,
      );
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query("ALTER TABLE invoices ADD COLUMN carage DECIMAL(12,2) DEFAULT 0");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE invoices ADD COLUMN carage", error);
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query(
      `UPDATE sales s
       INNER JOIN invoices i ON i.id = s.invoice AND i.user_id = s.user_id
       SET s.invoiceNumber = i.invoiceNumber
       WHERE (s.invoiceNumber IS NULL OR s.invoiceNumber = '')
         AND i.invoiceNumber IS NOT NULL
         AND i.invoiceNumber <> ''`,
    );
  } catch (error) {
    throw error;
  }
};

module.exports = initDb;
