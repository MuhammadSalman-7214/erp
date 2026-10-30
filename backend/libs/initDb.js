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
      billingDay INT NOT NULL DEFAULT 1,
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
    `CREATE TABLE IF NOT EXISTS price_list_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      productName VARCHAR(255) NOT NULL,
      size VARCHAR(100) DEFAULT NULL,
      price DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_price_list_user (user_id)
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
    `CREATE TABLE IF NOT EXISTS subscription_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      month VARCHAR(7) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      addedBy INT DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_subscription_payment (user_id, month),
      INDEX idx_subscription_payments_user (user_id),
      INDEX idx_subscription_payments_month (month)
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
    `CREATE TABLE IF NOT EXISTS login_otp_challenges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      verifiedAt DATETIME DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_login_otp_user (user_id),
      INDEX idx_login_otp_expires (expiresAt)
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_challenges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_password_reset_user (user_id),
      INDEX idx_password_reset_expires (expiresAt)
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
    `CREATE TABLE IF NOT EXISTS company_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      companyName VARCHAR(255) DEFAULT '',
      companyDescription TEXT,
      companyLogo TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_company_settings_user (user_id),
      INDEX idx_company_settings_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS business_insights (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      \`date\` DATE NOT NULL,
      stats LONGTEXT NOT NULL,
      aiSummary TEXT NOT NULL,
      aiRecommendations LONGTEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_business_insight_user_date (user_id, \`date\`),
      INDEX idx_business_insights_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_insight_views (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      insightId INT NOT NULL,
      seen TINYINT(1) DEFAULT 0,
      seenAt DATETIME DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_insight_view (userId, insightId),
      INDEX idx_user_insight_view_user (userId),
      INDEX idx_user_insight_view_insight (insightId)
    )`,
    `CREATE TABLE IF NOT EXISTS warehouses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_warehouse_code (user_id, code),
      INDEX idx_warehouses_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS warehouse_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      warehouse_id INT NOT NULL,
      parent_location_id INT DEFAULT NULL,
      code VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      location_type VARCHAR(50) NOT NULL DEFAULT 'bin',
      barcode VARCHAR(255),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_location_code (user_id, warehouse_id, code),
      INDEX idx_locations_user (user_id),
      INDEX idx_locations_warehouse (warehouse_id),
      INDEX idx_locations_parent (parent_location_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_warehouse_access (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      staff_user_id INT NOT NULL,
      warehouse_id INT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_warehouse (user_id, staff_user_id, warehouse_id),
      INDEX idx_uwa_user (user_id),
      INDEX idx_uwa_staff (staff_user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_code_id INT NOT NULL,
      warehouse_id INT NOT NULL,
      location_id INT DEFAULT NULL,
      batch_no VARCHAR(255) DEFAULT NULL,
      expiry_date DATE DEFAULT NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
      cost_price DECIMAL(12,2) DEFAULT 0,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_batches_user (user_id),
      INDEX idx_batches_product_code (product_code_id),
      INDEX idx_batches_warehouse (warehouse_id),
      INDEX idx_batches_location (location_id),
      INDEX idx_batches_status (status),
      INDEX idx_batches_expiry (expiry_date)
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_code_id INT NOT NULL,
      batch_id INT DEFAULT NULL,
      warehouse_id INT NOT NULL,
      location_id INT DEFAULT NULL,
      type VARCHAR(50) NOT NULL,
      quantity DECIMAL(12,2) NOT NULL,
      reference_type VARCHAR(50) DEFAULT NULL,
      reference_id INT DEFAULT NULL,
      previous_qty DECIMAL(12,2) DEFAULT NULL,
      new_qty DECIMAL(12,2) DEFAULT NULL,
      performed_by INT DEFAULT NULL,
      reason TEXT,
      idempotency_key VARCHAR(255) DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_inventory_txn_idempotency (user_id, idempotency_key),
      INDEX idx_inventory_txn_user (user_id),
      INDEX idx_inventory_txn_product_code (product_code_id),
      INDEX idx_inventory_txn_reference (reference_type, reference_id)
    )`,
    `CREATE TABLE IF NOT EXISTS goods_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      warehouse_id INT NOT NULL,
      order_id INT DEFAULT NULL,
      receipt_no VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      received_by INT DEFAULT NULL,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_goods_receipt_no (user_id, receipt_no),
      INDEX idx_goods_receipts_user (user_id),
      INDEX idx_goods_receipts_order (order_id),
      INDEX idx_goods_receipts_warehouse (warehouse_id)
    )`,
    `CREATE TABLE IF NOT EXISTS goods_receipt_lines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      receipt_id INT NOT NULL,
      order_item_id INT DEFAULT NULL,
      product_code_id INT NOT NULL,
      expected_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
      received_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
      batch_no VARCHAR(255) DEFAULT NULL,
      expiry_date DATE DEFAULT NULL,
      condition_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      location_id INT DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_grl_user (user_id),
      INDEX idx_grl_receipt (receipt_id),
      INDEX idx_grl_product_code (product_code_id)
    )`,
    `CREATE TABLE IF NOT EXISTS fulfillments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      warehouse_id INT NOT NULL,
      sale_id INT NOT NULL,
      fulfillment_no VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'RESERVED',
      created_by INT DEFAULT NULL,
      dispatched_at DATETIME DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_fulfillment_no (user_id, fulfillment_no),
      INDEX idx_fulfillments_user (user_id),
      INDEX idx_fulfillments_sale (sale_id),
      INDEX idx_fulfillments_warehouse (warehouse_id)
    )`,
    `CREATE TABLE IF NOT EXISTS fulfillment_lines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      fulfillment_id INT NOT NULL,
      sale_item_id INT DEFAULT NULL,
      product_code_id INT NOT NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'RESERVED',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_fl_user (user_id),
      INDEX idx_fl_fulfillment (fulfillment_id),
      INDEX idx_fl_product_code (product_code_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_scope_access (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      staff_user_id INT NOT NULL,
      scope_type VARCHAR(50) NOT NULL DEFAULT 'warehouse',
      scope_id INT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_scope (user_id, staff_user_id, scope_type, scope_id),
      INDEX idx_usa_user (user_id),
      INDEX idx_usa_staff (staff_user_id),
      INDEX idx_usa_scope (scope_type, scope_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_job_functions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      staff_user_id INT NOT NULL,
      job_function VARCHAR(50) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_job_function (staff_user_id, job_function),
      INDEX idx_ujf_user (user_id),
      INDEX idx_ujf_staff (staff_user_id)
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
      `INSERT IGNORE INTO company_settings (user_id, companyName, companyDescription, companyLogo)
       SELECT id, COALESCE(companyName, ''), COALESCE(companyDescription, ''), COALESCE(companyLogo, '')
       FROM users`,
    );
  } catch (error) {
    if (error?.errno !== 1054) {
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
    await query("ALTER TABLE users ADD COLUMN billingDay INT NOT NULL DEFAULT 1");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE users ADD COLUMN billingDay", error);
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query("ALTER TABLE users ADD COLUMN account_id INT DEFAULT NULL");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE users ADD COLUMN account_id", error);
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query("ALTER TABLE users ADD INDEX idx_users_account (account_id)");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE users ADD INDEX idx_users_account", error);
    }

    if (error?.errno !== 1061) {
      throw error;
    }
  }

  try {
    // Every existing login becomes its own tenant, matching current behavior exactly.
    await query("UPDATE users SET account_id = id WHERE account_id IS NULL");
  } catch (error) {
    throw error;
  }

  try {
    // Who this login reports to, for "my team" visibility scoping and future
    // approval workflows. Purely additive — nothing reads it yet unless a
    // feature opts in, so leaving it NULL changes no existing behavior.
    await query(
      "ALTER TABLE users ADD COLUMN reports_to_user_id INT DEFAULT NULL",
    );
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning(
        "ALTER TABLE users ADD COLUMN reports_to_user_id",
        error,
      );
    }

    if (error?.errno !== 1060) {
      throw error;
    }
  }

  try {
    await query(
      "ALTER TABLE users ADD INDEX idx_users_reports_to (reports_to_user_id)",
    );
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning(
        "ALTER TABLE users ADD INDEX idx_users_reports_to",
        error,
      );
    }

    if (error?.errno !== 1061) {
      throw error;
    }
  }

  try {
    await query(
      `UPDATE users
       SET billingDay = COALESCE(NULLIF(billingDay, 0), DAY(createdAt), DAY(CURRENT_DATE()))
       WHERE billingDay IS NULL OR billingDay = 0`,
    );
  } catch (error) {
    throw error;
  }

  try {
    await query("ALTER TABLE price_list_items ADD COLUMN size VARCHAR(100)");
  } catch (error) {
    if (isTableEngineError(error)) {
      logTableEngineWarning("ALTER TABLE price_list_items ADD COLUMN size", error);
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

  try {
    // Every tenant (account) gets one default warehouse so existing data has
    // a home without requiring manual setup. Idempotent via the unique key
    // on (user_id, code).
    await query(
      `INSERT IGNORE INTO warehouses (user_id, name, code, is_default, is_active)
       SELECT DISTINCT account_id, 'Main Warehouse', 'MAIN', 1, 1
       FROM users
       WHERE account_id IS NOT NULL`,
    );
  } catch (error) {
    throw error;
  }

  try {
    await query(
      `INSERT IGNORE INTO warehouse_locations (user_id, warehouse_id, code, name, location_type)
       SELECT w.user_id, w.id, 'RECEIVING', 'Receiving Dock', 'receiving'
       FROM warehouses w
       WHERE w.code = 'MAIN'`,
    );
    await query(
      `INSERT IGNORE INTO warehouse_locations (user_id, warehouse_id, code, name, location_type)
       SELECT w.user_id, w.id, 'GENERAL', 'General Storage', 'bin'
       FROM warehouses w
       WHERE w.code = 'MAIN'`,
    );
  } catch (error) {
    throw error;
  }

  try {
    // One-time carry-over: `user_warehouse_access` is kept (not dropped) for
    // safety, but every access check now reads from the generalized
    // `user_scope_access` table (scope_type='warehouse'), so existing grants
    // must exist there too. Idempotent via the unique key.
    await query(
      `INSERT IGNORE INTO user_scope_access (user_id, staff_user_id, scope_type, scope_id)
       SELECT user_id, staff_user_id, 'warehouse', warehouse_id
       FROM user_warehouse_access`,
    );
  } catch (error) {
    throw error;
  }
};

module.exports = initDb;
