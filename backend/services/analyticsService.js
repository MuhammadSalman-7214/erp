const query = require("../libs/dbQuery");

const DEFAULT_LOW_STOCK_THRESHOLD = 50;

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeText = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const getProductDisplayName = (row) => {
  const productName = normalizeText(row?.productName);
  const productCode = normalizeText(row?.productCode);
  const variantName = normalizeText(row?.variantName);

  if (!productName && !productCode) {
    return "Unknown Product";
  }

  const codeSuffix = productCode ? ` (${productCode})` : "";
  const variantSuffix = variantName ? ` - ${variantName}` : "";

  return `${productName || "Product"}${codeSuffix}${variantSuffix}`;
};

const soldProductsBaseSql = `
  SELECT
    COALESCE(p.id, si.product) AS productId,
    COALESCE(p.name, CONCAT('Product #', si.product), 'Unknown Product') AS productName,
    COALESCE(pc.code, '') AS productCode,
    COALESCE(pc.variantName, '') AS variantName,
    COALESCE(SUM(si.quantity), 0) AS quantitySold,
    COALESCE(SUM(si.quantity * COALESCE(si.price, 0)), 0) AS revenueGenerated
  FROM sale_items si
  INNER JOIN sales s
    ON s.id = si.sale_id
   AND s.user_id = si.user_id
  LEFT JOIN products p
    ON p.id = si.product
   AND p.user_id = si.user_id
  LEFT JOIN product_codes pc
    ON pc.id = si.productCode
   AND pc.user_id = si.user_id
  WHERE si.user_id = ?
  GROUP BY
    COALESCE(p.id, si.product),
    COALESCE(p.name, CONCAT('Product #', si.product), 'Unknown Product'),
    COALESCE(pc.code, ''),
    COALESCE(pc.variantName, '')
`;

const salesCustomerKeySql = (alias) => `
  CASE
    WHEN ${alias}.customer IS NOT NULL AND ${alias}.customer <> 0
      THEN CONCAT('id:', ${alias}.customer)
    WHEN ${alias}.customerName IS NOT NULL AND TRIM(${alias}.customerName) <> ''
      THEN CONCAT('name:', LOWER(TRIM(${alias}.customerName)))
    ELSE NULL
  END
`;

const invoiceCustomerKeySql = (alias) => `
  CASE
    WHEN ${alias}.customerId IS NOT NULL AND ${alias}.customerId <> 0
      THEN CONCAT('id:', ${alias}.customerId)
    WHEN ${alias}.customer_name IS NOT NULL AND TRIM(${alias}.customer_name) <> ''
      THEN CONCAT('name:', LOWER(TRIM(${alias}.customer_name)))
    ELSE NULL
  END
`;

const buildAllTimeBusinessStats = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to build business statistics");
  }

  const lowStockThreshold = toNumber(
    process.env.BUSINESS_INSIGHT_LOW_STOCK_THRESHOLD || DEFAULT_LOW_STOCK_THRESHOLD,
  );

  const [
    revenueRows,
    orderRows,
    customerRows,
    productRows,
    bestSellingRows,
    topSellingRows,
    lowestSellingRows,
    neverSoldRows,
    lowStockRows,
    highestSpendingRows,
    monthlyRows,
    inventoryValueRows,
    activeCustomerRows,
  ] = await Promise.all([
    query(
      "SELECT COALESCE(SUM(totalAmount), 0) AS totalRevenue FROM sales WHERE user_id = ?",
      [userId],
    ),
    query("SELECT COUNT(*) AS totalOrders FROM sales WHERE user_id = ?", [
      userId,
    ]),
    query("SELECT COUNT(*) AS totalCustomers FROM customers WHERE user_id = ?", [
      userId,
    ]),
    query("SELECT COUNT(*) AS totalProducts FROM products WHERE user_id = ?", [
      userId,
    ]),
    query(
      `
        SELECT *
        FROM (
          ${soldProductsBaseSql}
        ) AS sold_products
        ORDER BY quantitySold DESC, revenueGenerated DESC, productName ASC
        LIMIT 1
      `,
      [userId],
    ),
    query(
      `
        SELECT *
        FROM (
          ${soldProductsBaseSql}
        ) AS sold_products
        ORDER BY quantitySold DESC, revenueGenerated DESC, productName ASC
        LIMIT 10
      `,
      [userId],
    ),
    query(
      `
        SELECT *
        FROM (
          ${soldProductsBaseSql}
        ) AS sold_products
        ORDER BY quantitySold ASC, revenueGenerated ASC, productName ASC
        LIMIT 10
      `,
      [userId],
    ),
    query(
      `
        SELECT
          p.id AS productId,
          p.name AS productName,
          COALESCE(p.sku, '') AS productCode,
          COALESCE(p.brand, '') AS variantName,
          COALESCE(p.quantity, 0) AS currentStock
        FROM products p
        LEFT JOIN sale_items si
          ON si.product = p.id
         AND si.user_id = p.user_id
        WHERE p.user_id = ?
        GROUP BY p.id, p.name, p.sku, p.brand, p.quantity
        HAVING COALESCE(SUM(si.quantity), 0) = 0
        ORDER BY p.name ASC
      `,
      [userId],
    ),
    query(
      `
        SELECT
          pc.id AS productCodeId,
          pc.product AS productId,
          p.name AS productName,
          COALESCE(pc.code, '') AS productCode,
          COALESCE(pc.variantName, '') AS variantName,
          COALESCE(pc.quantity, 0) AS quantity,
          COALESCE(
            NULLIF(p.purchasePrice, 0),
            NULLIF(p.Price, 0),
            NULLIF(p.tradePrice, 0),
            NULLIF(p.salePrice, 0),
            0
          ) AS unitValue
        FROM product_codes pc
        LEFT JOIN products p
          ON p.id = pc.product
         AND p.user_id = pc.user_id
        WHERE pc.user_id = ?
        ORDER BY pc.quantity ASC, p.name ASC
        LIMIT 20
      `,
      [userId],
    ),
    query(
      `
        SELECT
          COALESCE(c.id, s.customer) AS customerId,
          COALESCE(c.name, s.customerName, 'Customer') AS customerName,
          COALESCE(c.customerCode, '') AS customerCode,
          COUNT(*) AS orderCount,
          COALESCE(SUM(s.totalAmount), 0) AS totalSpent
        FROM sales s
        LEFT JOIN customers c
          ON c.id = s.customer
         AND c.user_id = s.user_id
        WHERE s.user_id = ?
        GROUP BY COALESCE(c.id, s.customer), customerName, customerCode
        ORDER BY totalSpent DESC, orderCount DESC, customerName ASC
        LIMIT 1
      `,
      [userId],
    ),
    query(
      `
        SELECT
          DATE_FORMAT(s.createdAt, '%Y-%m') AS monthKey,
          COALESCE(SUM(s.totalAmount), 0) AS totalRevenue,
          COUNT(*) AS totalOrders
        FROM sales s
        WHERE s.user_id = ?
        GROUP BY DATE_FORMAT(s.createdAt, '%Y-%m')
        ORDER BY monthKey ASC
      `,
      [userId],
    ),
    query(
      `
        SELECT
          COALESCE(SUM(
            COALESCE(pc.quantity, 0) * COALESCE(
              NULLIF(p.purchasePrice, 0),
              NULLIF(p.Price, 0),
              NULLIF(p.tradePrice, 0),
              NULLIF(p.salePrice, 0),
              0
            )
          ), 0) AS inventoryValue
        FROM product_codes pc
        LEFT JOIN products p
          ON p.id = pc.product
         AND p.user_id = pc.user_id
        WHERE pc.user_id = ?
      `,
      [userId],
    ),
    query(
      `
        SELECT COUNT(DISTINCT customerKey) AS activeCustomers
        FROM (
          SELECT ${salesCustomerKeySql("s")} AS customerKey
          FROM sales s
          WHERE s.user_id = ?

          UNION

          SELECT ${invoiceCustomerKeySql("i")} AS customerKey
          FROM invoices i
          WHERE i.user_id = ? AND i.invoiceType = 'sales'

          UNION

          SELECT
            CASE
              WHEN p.customerId IS NOT NULL AND p.customerId <> 0
                THEN CONCAT('id:', p.customerId)
              WHEN p.customer_name IS NOT NULL AND TRIM(p.customer_name) <> ''
                THEN CONCAT('name:', LOWER(TRIM(p.customer_name)))
              ELSE NULL
            END AS customerKey
          FROM payments p
          WHERE p.user_id = ? AND p.partyType = 'customer' AND p.type = 'received'
        ) active_customer_keys
        WHERE customerKey IS NOT NULL AND customerKey <> ''
      `,
      [userId, userId, userId],
    ),
  ]);

  const totalRevenue = toNumber(revenueRows?.[0]?.totalRevenue);
  const totalOrders = toNumber(orderRows?.[0]?.totalOrders);
  const totalCustomers = toNumber(customerRows?.[0]?.totalCustomers);
  const totalProducts = toNumber(productRows?.[0]?.totalProducts);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const overallBestSellingProduct = bestSellingRows?.[0]
    ? {
        productId: bestSellingRows[0].productId ?? null,
        name: getProductDisplayName(bestSellingRows[0]),
        quantitySold: toNumber(bestSellingRows[0].quantitySold),
        revenueGenerated: toNumber(bestSellingRows[0].revenueGenerated),
      }
    : {
        productId: null,
        name: "No sales recorded",
        quantitySold: 0,
        revenueGenerated: 0,
      };

  const top10SellingProducts = (topSellingRows || []).map((row) => ({
    productId: row.productId ?? null,
    name: getProductDisplayName(row),
    quantitySold: toNumber(row.quantitySold),
    revenueGenerated: toNumber(row.revenueGenerated),
  }));

  const lowestSellingProducts = (lowestSellingRows || []).map((row) => ({
    productId: row.productId ?? null,
    name: getProductDisplayName(row),
    quantitySold: toNumber(row.quantitySold),
    revenueGenerated: toNumber(row.revenueGenerated),
  }));

  const productsNeverSold = (neverSoldRows || []).map((row) => ({
    productId: row.productId ?? null,
    name: normalizeText(row.productName) || "Unknown Product",
    code: normalizeText(row.productCode),
    variantName: normalizeText(row.variantName),
    currentStock: toNumber(row.currentStock),
  }));

  const lowStockProducts = (lowStockRows || []).map((row) => ({
    productCodeId: row.productCodeId ?? null,
    productId: row.productId ?? null,
    name: normalizeText(row.productName) || "Product",
    code: normalizeText(row.productCode),
    variantName: normalizeText(row.variantName),
    quantity: toNumber(row.quantity),
    unitValue: toNumber(row.unitValue),
  }));

  const highestSpendingCustomer = highestSpendingRows?.[0]
    ? {
        customerId: highestSpendingRows[0].customerId ?? null,
        name: normalizeText(highestSpendingRows[0].customerName) || "Customer",
        code: normalizeText(highestSpendingRows[0].customerCode),
        totalSpent: toNumber(highestSpendingRows[0].totalSpent),
        orderCount: toNumber(highestSpendingRows[0].orderCount),
      }
    : {
        customerId: null,
        name: "No customer activity",
        code: "",
        totalSpent: 0,
        orderCount: 0,
      };

  const monthlyRevenueTrend = (monthlyRows || []).map((row) => ({
    month: row.monthKey,
    revenue: toNumber(row.totalRevenue),
    orders: toNumber(row.totalOrders),
  }));

  const totalInventoryValue = toNumber(inventoryValueRows?.[0]?.inventoryValue);

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    totalProductsAmount: totalInventoryValue,
    overallBestSellingProduct,
    top10SellingProducts,
    lowestSellingProducts,
    productsNeverSold,
    lowStockProducts,
    averageOrderValue,
    highestSpendingCustomer,
    monthlyRevenueTrend,
    monthlyOrderTrend: monthlyRevenueTrend.map((row) => ({
      month: row.month,
      orders: row.orders,
    })),
    totalInventoryValue,
    activeCustomers: toNumber(activeCustomerRows?.[0]?.activeCustomers),
  };
};

module.exports = {
  buildAllTimeBusinessStats,
};
