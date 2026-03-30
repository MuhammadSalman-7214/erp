const query = require("../libs/dbQuery.js");

const resolveProductIds = async (productsSupplied, userId) => {
  if (!Array.isArray(productsSupplied) || !productsSupplied.length) {
    return [];
  }

  const ids = [];
  for (const item of productsSupplied) {
    if (item === null || item === undefined) continue;
    if (typeof item === "number" || (typeof item === "string" && /^\d+$/.test(item))) {
      ids.push(Number(item));
      continue;
    }

    const raw = String(item).trim();
    if (!raw) continue;

    let name = raw;
    let company = "";
    if (raw.includes("•")) {
      const parts = raw.split("•").map((p) => p.trim());
      name = parts[0] || raw;
      company = parts[1] || "";
    } else if (raw.includes("-")) {
      const parts = raw.split("-").map((p) => p.trim());
      name = parts[0] || raw;
      company = parts[1] || "";
    }

    let rows;
    if (company) {
      rows = await query(
        "SELECT id FROM products WHERE user_id = ? AND name = ? AND company = ? LIMIT 1",
        [userId, name, company],
      );
    } else {
      rows = await query(
        "SELECT id FROM products WHERE user_id = ? AND name = ? LIMIT 1",
        [userId, name],
      );
    }
    if (rows[0]?.id) {
      ids.push(rows[0].id);
    }
  }

  return ids;
};

module.exports.createSupplier = async (req, res) => {
  try {
    const {
      name,
      contactInfo,
      productsSupplied,
      openingBalance,
      paymentTerms,
    } = req.body;
    const userId = req.user.userId;

    if (!name || !contactInfo || !contactInfo.phone) {
      return res.status(400).json({
        success: false,
        message: " name and phone are required.",
      });
    }

    const resolvedProductIds = await resolveProductIds(productsSupplied, userId);

    if (resolvedProductIds.length) {
      const placeholders = resolvedProductIds.map(() => "?").join(", ");
      let ownedProducts;
      try {
        const rows = await query(
          `SELECT COUNT(*) as count FROM products WHERE id IN (${placeholders}) AND user_id = ?`,
          [...resolvedProductIds, userId],
        );
        ownedProducts = rows[0]?.count || 0;
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (ownedProducts !== resolvedProductIds.length) {
        return res.status(403).json({
          success: false,
          message: "One or more products do not belong to the current user.",
        });
      }
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO vendors (user_id, name, contact_phone, contact_address, openingBalance, paymentTerms) VALUES (?, ?, ?, ?, ?, ?)",
        [
          userId,
          name,
          contactInfo.phone,
          contactInfo.address || "",
          Number(openingBalance) || 0,
          paymentTerms || "",
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (resolvedProductIds.length) {
      const values = resolvedProductIds.map((pid) => [
        userId,
        insertResult.insertId,
        pid,
      ]);
      try {
        await query(
          "INSERT INTO vendor_products (user_id, vendor_id, product_id) VALUES ?",
          [values],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
    }

    const newSupplier = {
      id: insertResult.insertId,
      user_id: userId,
      name,
      contactInfo: {
        phone: contactInfo.phone,
        address: contactInfo.address || "",
      },
      openingBalance: Number(openingBalance) || 0,
      paymentTerms: paymentTerms || "",
      productsSupplied: resolvedProductIds.length ? resolvedProductIds : [],
    };

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor: newSupplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating vendor",
      error,
    });
  }
};

module.exports.getAllSuppliers = async (req, res) => {
  try {
    const userId = req.user.userId;
    let Suppliers;
    try {
      Suppliers = await query("SELECT * FROM vendors WHERE user_id = ?", [
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const suppliersWithProducts = await Promise.all(
      Suppliers.map(async (supplier) => {
        let productsSupplied = [];
        try {
          productsSupplied = await query(
            "SELECT p.* FROM vendor_products vp JOIN products p ON p.id = vp.product_id WHERE vp.vendor_id = ? AND vp.user_id = ?",
            [supplier.id, userId],
          );
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });
        }
        return {
          ...supplier,
          contactInfo: {
            phone: supplier.contact_phone || "",
            address: supplier.contact_address || "",
          },
          productsSupplied,
        };
      }),
    );

    res.status(200).json(suppliersWithProducts);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching suppliers", error });
  }
};

module.exports.getSupplierById = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const userId = req.user.userId;

    let supplier;
    try {
      const rows = await query(
        "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
        [supplierId, userId],
      );
      supplier = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    let productsSupplied = [];
    try {
      productsSupplied = await query(
        "SELECT p.* FROM vendor_products vp JOIN products p ON p.id = vp.product_id WHERE vp.vendor_id = ? AND vp.user_id = ?",
        [supplier.id, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({
      success: true,
      supplier: {
        ...supplier,
        contactInfo: {
          phone: supplier.contact_phone || "",
          address: supplier.contact_address || "",
        },
        productsSupplied,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching supplier", error });
  }
};

module.exports.editSupplier = async (req, res) => {
  const { id } = req.params;
  const { name, contactInfo, productsSupplied, openingBalance, paymentTerms } =
    req.body;

  try {
    const userId = req.user.userId;
    let supplier;
    try {
      const rows = await query(
        "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      supplier = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const nextName = name || supplier.name;
    const nextPhone = contactInfo?.phone || supplier.contact_phone;
    const nextAddress = contactInfo?.address || supplier.contact_address;
    const nextOpeningBalance =
      openingBalance !== undefined
        ? Number(openingBalance)
        : supplier.openingBalance;
    const nextPaymentTerms = paymentTerms ?? supplier.paymentTerms;
    const nextProductsSupplied = Array.isArray(productsSupplied)
      ? productsSupplied
      : null;

    const resolvedNextProductIds = await resolveProductIds(
      nextProductsSupplied,
      userId,
    );

    if (resolvedNextProductIds.length) {
      const placeholders = resolvedNextProductIds.map(() => "?").join(", ");
      let ownedProducts;
      try {
        const rows = await query(
          `SELECT COUNT(*) as count FROM products WHERE id IN (${placeholders}) AND user_id = ?`,
          [...resolvedNextProductIds, userId],
        );
        ownedProducts = rows[0]?.count || 0;
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (ownedProducts !== resolvedNextProductIds.length) {
        return res.status(403).json({
          message: "One or more products do not belong to the current user.",
        });
      }
    }

    try {
      await query(
        "UPDATE vendors SET name = ?, contact_phone = ?, contact_address = ?, openingBalance = ?, paymentTerms = ? WHERE id = ? AND user_id = ?",
        [
          nextName,
          nextPhone,
          nextAddress,
          nextOpeningBalance,
          nextPaymentTerms,
          id,
          userId,
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (Array.isArray(nextProductsSupplied)) {
      try {
        await query(
          "DELETE FROM vendor_products WHERE vendor_id = ? AND user_id = ?",
          [id, userId],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      if (resolvedNextProductIds.length) {
        const values = resolvedNextProductIds.map((pid) => [
          userId,
          id,
          pid,
        ]);
        try {
          await query(
            "INSERT INTO vendor_products (user_id, vendor_id, product_id) VALUES ?",
            [values],
          );
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });
        }
      }
    }

    const updatedSupplier = {
      ...supplier,
      name: nextName,
      contactInfo: {
        phone: nextPhone || "",
        address: nextAddress || "",
      },
      openingBalance: nextOpeningBalance,
      paymentTerms: nextPaymentTerms,
      productsSupplied: Array.isArray(nextProductsSupplied)
        ? resolvedNextProductIds
        : supplier.productsSupplied || [],
    };

    res.status(200).json({
      message: "Vendor updated successfully",
      vendor: updatedSupplier,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating supplier", error });
  }
};

module.exports.deleteSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params; // <-- use req.params
    const userId = req.user.userId;
    let supplier;
    try {
      const rows = await query(
        "SELECT * FROM vendors WHERE id = ? AND user_id = ? LIMIT 1",
        [supplierId, userId],
      );
      supplier = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    try {
      await query("DELETE FROM vendors WHERE id = ? AND user_id = ?", [
        supplierId,
        userId,
      ]);
      await query(
        "DELETE FROM vendor_products WHERE vendor_id = ? AND user_id = ?",
        [supplierId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting supplier", error });
  }
};

module.exports.searchSupplier = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;
    console.log("Received query:", query);

    if (!query || query.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Query parameter is required" });
    }

    let suppliers;
    try {
      suppliers = await query(
        "SELECT * FROM vendors WHERE user_id = ? AND name LIKE ?",
        [userId, `%${query}%`],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    return res.json({ success: true, suppliers });
  } catch (error) {
    console.error("Search Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching supplier",
      error: error.message,
    });
  }
};
