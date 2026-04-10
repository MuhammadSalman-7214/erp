const query = require("../libs/dbQuery.js");

const normalizeText = (value = "") => String(value).trim().toLowerCase();

const customerKeyFromFields = ({ code, name }) => {
  const normalizedCode = normalizeText(code);
  const normalizedName = normalizeText(name);
  return normalizedCode || normalizedName
    ? `${normalizedCode}|${normalizedName}`
    : "";
};

const customerSnapshotFromDoc = (customerDoc) => ({
  code: customerDoc?.customerCode || "",
  name: customerDoc?.name || "Customer",
});

const createPayment = async (req, res) => {
  try {
    const {
      type,
      amount,
      method,
      invoice,
      partyType,
      customer,
      customerId,
      vendor,
      paidAt,
      description,
      notes,
    } = req.body;
    const userId = req.user.userId;

    if (!type || amount === undefined || !partyType) {
      return res
        .status(400)
        .json({ message: "Type, amount, and party are required" });
    }

    let invoiceType;
    let resolvedCustomerId = customerId;
    let resolvedCustomer = customer;
    let resolvedVendor = vendor;

    if (invoice) {
      let invoiceDoc;
      try {
        const rows = await query(
          "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
          [invoice, userId],
        );
        invoiceDoc = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!invoiceDoc) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      invoiceType = invoiceDoc.invoiceType;

      if (invoiceDoc.customerId && !resolvedCustomerId) {
        resolvedCustomerId = String(invoiceDoc.customerId);
      }

      if (invoiceDoc.customer_name && !resolvedCustomer) {
        resolvedCustomer = {
          code: invoiceDoc.customer_code || "",
          name: invoiceDoc.customer_name || "Customer",
        };
      }

      if (invoiceDoc.vendor && !resolvedVendor) {
        resolvedVendor = invoiceDoc.vendor;
      }
    }

    if (partyType === "customer") {
      if (resolvedCustomerId) {
        let customerDoc;
        const isNumericId =
          typeof resolvedCustomerId === "number" ||
          (typeof resolvedCustomerId === "string" &&
            /^\d+$/.test(resolvedCustomerId));
        try {
          if (isNumericId) {
            const rows = await query(
              "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
              [resolvedCustomerId, userId],
            );
            customerDoc = rows[0];
          } else {
            const rows = await query(
              "SELECT * FROM customers WHERE user_id = ? AND (name = ? OR customerCode = ?) LIMIT 1",
              [
                userId,
                String(resolvedCustomerId).trim(),
                String(resolvedCustomerId).trim(),
              ],
            );
            customerDoc = rows[0];
          }
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });
        }
        if (!customerDoc) {
          return res.status(404).json({ message: "Customer not found" });
        }
        resolvedCustomerId = customerDoc.id;
        resolvedCustomer = customerSnapshotFromDoc(customerDoc);
      }

      if (!resolvedCustomerId && !resolvedCustomer?.name) {
        return res.status(400).json({
          message: "Customer is required for customer payments",
        });
      }
    }

    if (partyType === "vendor" && resolvedVendor) {
      let vendorDoc;
      try {
        const rows = await query(
          "SELECT id FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
          [resolvedVendor, userId],
        );
        vendorDoc = rows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (!vendorDoc) {
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    let paymentInsert;
    const resolvedDescription = String(description || notes || "").trim();

    try {
      paymentInsert = await query(
        "INSERT INTO payments (user_id, type, amount, method, invoice, invoiceType, partyType, customerId, customer_code, customer_name, vendor, paidAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          type,
          amount,
          method || "cash",
          invoice || null,
          invoiceType || null,
          partyType,
          resolvedCustomerId || null,
          resolvedCustomer?.code || "",
          resolvedCustomer?.name || "",
          resolvedVendor || null,
          paidAt || new Date(),
          resolvedDescription,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (invoice) {
      let paymentsTotal;
      let invoiceDoc;
      try {
        const paymentRows = await query(
          "SELECT SUM(amount) as total FROM payments WHERE invoice = ? AND user_id = ?",
          [invoice, userId],
        );
        paymentsTotal = paymentRows?.[0]?.total || 0;
        const invoiceRows = await query(
          "SELECT totalAmount FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
          [invoice, userId],
        );
        invoiceDoc = invoiceRows[0];
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (invoiceDoc && paymentsTotal >= invoiceDoc.totalAmount) {
        await query(
          "UPDATE invoices SET status = ?, paidAt = ? WHERE id = ? AND user_id = ?",
          ["paid", new Date(), invoice, userId],
        );
      }
    }

    res.status(201).json({
      success: true,
      payment: {
        id: paymentInsert.insertId,
        user_id: userId,
        type,
        amount,
        method,
        invoice,
        invoiceType,
        partyType,
        customerId: resolvedCustomerId || undefined,
        customer: resolvedCustomer,
        vendor: resolvedVendor,
        paidAt: paidAt || new Date(),
        notes: resolvedDescription,
        description: resolvedDescription,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const userId = req.user.userId;
    let payments;
    try {
      payments = await query(
        "SELECT * FROM payments WHERE user_id = ? ORDER BY createdAt ASC",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const hydrated = await Promise.all(
      payments.map(async (payment) => {
        let invoiceDoc = null;
        let vendorDoc = null;
        let customerDoc = null;
        try {
          if (payment.invoice) {
            const invoiceRows = await query(
              "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1",
              [payment.invoice, userId],
            );
            invoiceDoc = invoiceRows[0] || null;
          }
          if (payment.vendor) {
            const vendorRows = await query(
              "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
              [payment.vendor, userId],
            );
            vendorDoc = vendorRows[0] || null;
          }
          if (payment.customerId) {
            const customerRows = await query(
              "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
              [payment.customerId, userId],
            );
            const c = customerRows[0];
            customerDoc = c
              ? {
                  ...c,
                  contactInfo: {
                    phone: c.contact_phone || "",
                    address: c.contact_address || "",
                  },
                }
              : null;
          }
        } catch (err) {
          return { error: err };
        }

        return {
          ...payment,
          description: payment.notes || "",
          invoice: invoiceDoc,
          vendor: vendorDoc,
          customerId: customerDoc,
        };
      }),
    );

    const errorEntry = hydrated.find((p) => p?.error);
    if (errorEntry) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: errorEntry.error,
      });
    }

    res.status(200).json({ success: true, payments: hydrated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPartyBalances = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [
      vendors,
      customers,
      purchaseInvoices,
      salesInvoices,
      vendorPayments,
      vendorDebitAdjustments,
      customerPayments,
    ] = await Promise.all([
      query("SELECT id, name, openingBalance FROM vendors WHERE user_id = ?", [
        userId,
      ]),
      query(
        "SELECT id, name, customerCode, openingBalance FROM customers WHERE user_id = ?",
        [userId],
      ),
      query(
        "SELECT id, vendor, totalAmount, status FROM invoices WHERE invoiceType = ? AND user_id = ?",
        ["purchase", userId],
      ),
      query(
        "SELECT id, customerId, customer_name, customer_code, totalAmount, status FROM invoices WHERE invoiceType = ? AND user_id = ?",
        ["sales", userId],
      ),
      query(
        "SELECT vendor, amount, invoice FROM payments WHERE partyType = ? AND type = ? AND user_id = ?",
        ["vendor", "paid", userId],
      ),
      query(
        "SELECT vendor, amount, invoice FROM payments WHERE partyType = ? AND type = ? AND user_id = ?",
        ["vendor", "debit", userId],
      ),
      query(
        "SELECT customerId, customer_name, customer_code, amount, invoice FROM payments WHERE partyType = ? AND type = ? AND user_id = ?",
        ["customer", "received", userId],
      ),
    ]);

    const vendorMap = new Map();
    for (const vendor of vendors) {
      vendorMap.set(String(vendor.id), {
        vendorId: String(vendor.id),
        name: vendor.name || "Vendor",
        openingBalance: Number(vendor.openingBalance) || 0,
        totalAmount: Number(vendor.openingBalance) || 0,
        paidAmount: 0,
        remainingAmount: Number(vendor.openingBalance) || 0,
        invoiceCount: 0,
        paymentCount: 0,
      });
    }

    const purchaseInvoiceIdsWithPayments = new Set();
    for (const payment of vendorPayments) {
      const vendorId = payment.vendor ? String(payment.vendor) : "";
      if (!vendorId) continue;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          name: "Unknown Vendor",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }

      const current = vendorMap.get(vendorId);
      if (!current) continue;
      current.paidAmount += Number(payment.amount) || 0;
      current.paymentCount += 1;
      if (payment.invoice) {
        purchaseInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const adjustment of vendorDebitAdjustments) {
      const vendorId = adjustment.vendor ? String(adjustment.vendor) : "";
      if (!vendorId) continue;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          name: "Unknown Vendor",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }

      const current = vendorMap.get(vendorId);
      if (!current) continue;
      current.totalAmount += Number(adjustment.amount) || 0;
    }

    for (const invoice of purchaseInvoices) {
      const vendorId = invoice.vendor ? String(invoice.vendor) : "";
      if (!vendorId) continue;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          name: "Unknown Vendor",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }
      const current = vendorMap.get(vendorId);
      if (!current) continue;
      current.totalAmount += Number(invoice.totalAmount) || 0;
      current.invoiceCount += 1;
      if (
        invoice.status === "paid" &&
        !purchaseInvoiceIdsWithPayments.has(String(invoice.id))
      ) {
        current.paidAmount += Number(invoice.totalAmount) || 0;
      }
    }

    const customerMap = new Map();
    const customerLookup = new Map();
    const salesInvoiceIdsWithPayments = new Set();

    for (const customer of customers) {
      const customerId = String(customer.id);
      customerMap.set(customerId, {
        customerId: String(customer.id),
        customerCode: customer.customerCode || "",
        customerName: customer.name || "Customer",
        openingBalance: Number(customer.openingBalance) || 0,
        totalAmount: Number(customer.openingBalance) || 0,
        paidAmount: 0,
        remainingAmount: Number(customer.openingBalance) || 0,
        invoiceCount: 0,
        paymentCount: 0,
      });
      const codeKey = normalizeText(customer.customerCode);
      const nameKey = normalizeText(customer.name);
      if (codeKey) customerLookup.set(`code:${codeKey}`, customerId);
      if (nameKey) customerLookup.set(`name:${nameKey}`, customerId);
      if (codeKey || nameKey) {
        customerLookup.set(`combo:${codeKey}|${nameKey}`, customerId);
      }
    }

    const ensureLegacyCustomer = (details) => {
      const code = normalizeText(details?.code || details?.customer_code);
      const name = normalizeText(details?.name || details?.customer_name);
      const matchedCustomerId =
        customerLookup.get(`combo:${code}|${name}`) ||
        customerLookup.get(`code:${code}`) ||
        customerLookup.get(`name:${name}`);
      if (matchedCustomerId) return matchedCustomerId;

      const key = customerKeyFromFields({
        code: details?.code || details?.customer_code,
        name: details?.name || details?.customer_name,
      });
      if (!key) return null;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: "",
          customerCode: details?.code || details?.customer_code || "",
          customerName: details?.name || details?.customer_name || "Customer",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
      }
      return key;
    };

    const resolveCustomerSummaryKey = (details) => {
      const customerId = details?.customerId ? String(details.customerId) : "";
      if (customerId && customerMap.has(customerId)) {
        return customerId;
      }

      const legacyKey = ensureLegacyCustomer(details);
      if (legacyKey) {
        return legacyKey;
      }

      if (customerId) {
        customerMap.set(customerId, {
          customerId,
          customerCode: details?.customer_code || "",
          customerName: details?.customer_name || "Customer",
          openingBalance: 0,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoiceCount: 0,
          paymentCount: 0,
        });
        return customerId;
      }

      return "";
    };

    for (const payment of customerPayments) {
      const customerKey = resolveCustomerSummaryKey(payment);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
      if (!current) continue;
      current.paidAmount += Number(payment.amount) || 0;
      current.paymentCount += 1;
      if (payment.invoice) {
        salesInvoiceIdsWithPayments.add(String(payment.invoice));
      }
    }

    for (const invoice of salesInvoices) {
      const customerKey = resolveCustomerSummaryKey(invoice);
      if (!customerKey) continue;

      const current = customerMap.get(customerKey);
      if (!current) continue;
      current.totalAmount += Number(invoice.totalAmount) || 0;
      current.invoiceCount += 1;
      if (
        invoice.status === "paid" &&
        !salesInvoiceIdsWithPayments.has(String(invoice.id))
      ) {
        current.paidAmount += Number(invoice.totalAmount) || 0;
      }
    }

    const vendorsSummary = Array.from(vendorMap.values())
      .map((entry) => ({
        ...entry,
        remainingAmount: Math.max(entry.totalAmount - entry.paidAmount, 0),
      }))
      .sort((a, b) => b.remainingAmount - a.remainingAmount);

    const customersSummary = Array.from(customerMap.values())
      .map((entry) => ({
        ...entry,
        remainingAmount: Math.max(entry.totalAmount - entry.paidAmount, 0),
      }))
      .sort((a, b) => b.remainingAmount - a.remainingAmount);

    res.status(200).json({
      success: true,
      vendors: vendorsSummary,
      customers: customersSummary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVendorLedger = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = req.user.userId;

    let vendor;
    try {
      const rows = await query(
        "SELECT id, name, openingBalance, createdAt FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
        [vendorId, userId],
      );
      vendor = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const [invoices, payments] = await Promise.all([
      query(
        "SELECT id, invoiceNumber, totalAmount, issueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ? AND vendor = ? ORDER BY createdAt ASC, id ASC",
        ["purchase", userId, vendorId],
      ),
      query(
        "SELECT id, amount, method, invoice, notes, paidAt, createdAt, type FROM payments WHERE partyType = ? AND type IN (?, ?) AND user_id = ? AND vendor = ? ORDER BY createdAt ASC, id ASC",
        ["vendor", "paid", "debit", userId, vendorId],
      ),
    ]);

    const invoiceNumberById = new Map(
      invoices.map((inv) => [String(inv.id), inv.invoiceNumber || ""]),
    );

    const ledger = [];
    let ledgerOrder = 0;

    const openingBalance = Number(vendor.openingBalance) || 0;
    if (openingBalance !== 0) {
      ledger.push({
        id: `opening-${vendor.id}`,
        date: vendor.createdAt || new Date(0),
        sortDate: vendor.createdAt || new Date(0),
        type: openingBalance >= 0 ? "debit" : "credit",
        amount: Math.abs(openingBalance),
        source: "opening_balance",
        reference: "",
        notes: "Opening balance",
        sortOrder: (ledgerOrder += 1),
      });
    }

    invoices.forEach((invoice) => {
      ledger.push({
        id: String(invoice.id),
        date: invoice.issueDate || invoice.createdAt || new Date(),
        sortDate: invoice.createdAt || invoice.issueDate || new Date(),
        type: "debit",
        amount: Number(invoice.totalAmount) || 0,
        source: "purchase_invoice",
        reference: invoice.invoiceNumber || "",
        status: invoice.status || "",
        sortOrder: (ledgerOrder += 1),
      });
    });

    payments.forEach((payment) => {
      const invoiceRef = payment.invoice
        ? invoiceNumberById.get(String(payment.invoice)) ||
          String(payment.invoice)
        : "";
      const isManualDebit =
        String(payment.type || "").toLowerCase() === "debit";
      ledger.push({
        id: String(payment.id),
        date: payment.paidAt || payment.createdAt || new Date(),
        sortDate: payment.createdAt || payment.paidAt || new Date(),
        type: isManualDebit ? "debit" : "credit",
        amount: Number(payment.amount) || 0,
        source: isManualDebit ? "manual" : "payment",
        reference: isManualDebit ? "" : payment.notes || invoiceRef,
        method: payment.method || "",
        notes: payment.notes || "",
        sortOrder: (ledgerOrder += 1),
      });
    });

    ledger.sort((a, b) => {
      const timeDiff =
        new Date(a.sortDate || a.date).getTime() -
        new Date(b.sortDate || b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledgerWithBalance = ledger.map((entry) => {
      if (entry.type === "debit") {
        runningBalance += entry.amount;
        totalDebit += entry.amount;
      } else {
        runningBalance -= entry.amount;
        totalCredit += entry.amount;
      }
      return { ...entry, balance: runningBalance };
    });

    res.status(200).json({
      success: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
      },
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        balance: runningBalance,
      },
      ledger: ledgerWithBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;

    let customer;
    try {
      const rows = await query(
        "SELECT id, name, customerCode, openingBalance, createdAt FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [customerId, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const [invoices, payments] = await Promise.all([
      query(
        "SELECT id, invoiceNumber, totalAmount, issueDate, status, createdAt FROM invoices WHERE invoiceType = ? AND user_id = ? AND (customerId = ? OR customer_name = ? OR customer_code = ?) ORDER BY createdAt ASC, id ASC",
        [
          "sales",
          userId,
          customerId,
          customer.name || "",
          customer.customerCode || "",
        ],
      ),
      query(
        "SELECT id, amount, method, invoice, notes, paidAt, createdAt, type, customerId, customer_code, customer_name FROM payments WHERE partyType = ? AND type IN (?, ?) AND user_id = ? ORDER BY createdAt ASC, id ASC",
        ["customer", "received", "debit", userId],
      ),
    ]);

    const invoiceNumberById = new Map(
      invoices.map((inv) => [String(inv.id), inv.invoiceNumber || ""]),
    );

    const ledger = [];
    let ledgerOrder = 0;

    const openingBalance = Number(customer.openingBalance) || 0;
    if (openingBalance !== 0) {
      ledger.push({
        id: `opening-${customer.id}`,
        date: customer.createdAt || new Date(0),
        sortDate: customer.createdAt || new Date(0),
        type: openingBalance >= 0 ? "debit" : "credit",
        amount: Math.abs(openingBalance),
        source: "opening_balance",
        reference: "",
        notes: "Opening balance",
        sortOrder: (ledgerOrder += 1),
      });
    }

    invoices.forEach((invoice) => {
      ledger.push({
        id: String(invoice.id),
        date: invoice.issueDate || invoice.createdAt || new Date(),
        sortDate: invoice.createdAt || invoice.issueDate || new Date(),
        type: "debit",
        amount: Number(invoice.totalAmount) || 0,
        source: "sales_invoice",
        reference: invoice.invoiceNumber || "",
        status: invoice.status || "",
        sortOrder: (ledgerOrder += 1),
      });
    });

    const normalizedCustomerName = normalizeText(customer.name);
    const normalizedCustomerCode = normalizeText(customer.customerCode);

    payments.forEach((payment) => {
      const paymentCustomerId = payment.customerId
        ? String(payment.customerId)
        : "";
      const paymentCustomerName = normalizeText(payment.customer_name);
      const paymentCustomerCode = normalizeText(payment.customer_code);
      const matchesCustomer =
        paymentCustomerId === String(customerId) ||
        (paymentCustomerId === "" &&
          (paymentCustomerName === normalizedCustomerName ||
            paymentCustomerCode === normalizedCustomerCode));

      if (!matchesCustomer) {
        return;
      }

      const invoiceRef = payment.invoice
        ? invoiceNumberById.get(String(payment.invoice)) ||
          String(payment.invoice)
        : "";
      const isDebit = String(payment.type || "").toLowerCase() === "debit";
      ledger.push({
        id: String(payment.id),
        date: payment.paidAt || payment.createdAt || new Date(),
        sortDate: payment.createdAt || payment.paidAt || new Date(),
        type: isDebit ? "debit" : "credit",
        amount: Number(payment.amount) || 0,
        source: isDebit ? "manual" : "payment",
        reference: isDebit ? "" : payment.notes || invoiceRef,
        method: payment.method || "",
        notes: payment.notes || "",
        sortOrder: (ledgerOrder += 1),
      });
    });

    ledger.sort((a, b) => {
      const timeDiff =
        new Date(a.sortDate || a.date).getTime() -
        new Date(b.sortDate || b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledgerWithBalance = ledger.map((entry) => {
      if (entry.type === "debit") {
        runningBalance += entry.amount;
        totalDebit += entry.amount;
      } else {
        runningBalance -= entry.amount;
        totalCredit += entry.amount;
      }
      return { ...entry, balance: runningBalance };
    });

    res.status(200).json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
      },
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        balance: runningBalance,
      },
      ledger: ledgerWithBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPartyBalances,
  getVendorLedger,
  getCustomerLedger,
};
