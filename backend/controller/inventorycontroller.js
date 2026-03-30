const query = require("../libs/dbQuery.js");

module.exports.addOrUpdateInventory = async (req, res) => {
  try {
    const { productCode, quantity } = req.body;
    const userId = req.user.userId;

    if (!productCode || quantity === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Product code and quantity are required" });
    }

    let codeRecord;
    try {
      const rows = await query(
        "SELECT * FROM product_codes WHERE id = ? AND user_id = ? LIMIT 1",
        [productCode, userId],
      );
      codeRecord = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!codeRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Product code not found" });
    }

    try {
      await query(
        "UPDATE product_codes SET quantity = ? WHERE id = ? AND user_id = ?",
        [Number(quantity), productCode, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    let inventory;
    try {
      const rows = await query(
        "SELECT * FROM inventory WHERE productCode = ? AND user_id = ? LIMIT 1",
        [productCode, userId],
      );
      inventory = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const nextQuantity = Number(quantity);
    const nextStatus =
      nextQuantity === 0
        ? "out-of-stock"
        : nextQuantity < 10
          ? "low-stock"
          : "in-stock";

    if (inventory) {
      try {
        await query(
          "UPDATE inventory SET quantity = ?, status = ?, lastUpdated = ? WHERE id = ? AND user_id = ?",
          [nextQuantity, nextStatus, new Date(), inventory.id, userId],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      inventory = {
        ...inventory,
        quantity: nextQuantity,
        status: nextStatus,
        lastUpdated: new Date(),
      };
    } else {
      let insertResult;
      try {
        insertResult = await query(
          "INSERT INTO inventory (user_id, productCode, quantity, status, lastUpdated) VALUES (?, ?, ?, ?, ?)",
          [userId, productCode, nextQuantity, nextStatus, new Date()],
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }
      inventory = {
        id: insertResult.insertId,
        user_id: userId,
        productCode,
        quantity: nextQuantity,
        status: nextStatus,
        lastUpdated: new Date(),
      };
    }

    res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      inventory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error updating inventory", error });
  }
};

module.exports.getAllInventory = async (req, res) => {
  try {
    const userId = req.user.userId;
    let inventories;
    try {
      inventories = await query(
        "SELECT i.*, pc.id AS productCode_id, pc.product AS productCode_product, pc.code AS productCode_code, pc.variantName AS productCode_variantName, pc.quantity AS productCode_quantity FROM inventory i LEFT JOIN product_codes pc ON pc.id = i.productCode WHERE i.user_id = ?",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const formatted = inventories.map((row) => ({
      ...row,
      productCode: row.productCode_id
        ? {
            id: row.productCode_id,
            product: row.productCode_product,
            code: row.productCode_code,
            variantName: row.productCode_variantName,
            quantity: row.productCode_quantity,
          }
        : null,
    }));

    res.status(200).json({ success: true, inventories: formatted });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching inventory", error });
  }
};

module.exports.getInventoryByProduct = async (req, res) => {
  try {
    const { productCodeId } = req.params;
    const userId = req.user.userId;

    let inventory;
    try {
      const rows = await query(
        "SELECT i.*, pc.id AS productCode_id, pc.product AS productCode_product, pc.code AS productCode_code, pc.variantName AS productCode_variantName, pc.quantity AS productCode_quantity FROM inventory i LEFT JOIN product_codes pc ON pc.id = i.productCode WHERE i.productCode = ? AND i.user_id = ? LIMIT 1",
        [productCodeId, userId],
      );
      inventory = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found for this product code",
      });
    }

    res.status(200).json({
      success: true,
      inventory: {
        ...inventory,
        productCode: inventory.productCode_id
          ? {
              id: inventory.productCode_id,
              product: inventory.productCode_product,
              code: inventory.productCode_code,
              variantName: inventory.productCode_variantName,
              quantity: inventory.productCode_quantity,
            }
          : null,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching inventory", error });
  }
};

module.exports.deleteInventory = async (req, res) => {
  try {
    const { productCodeId } = req.params;
    const userId = req.user.userId;

    let inventory;
    try {
      const rows = await query(
        "SELECT * FROM inventory WHERE productCode = ? AND user_id = ? LIMIT 1",
        [productCodeId, userId],
      );
      inventory = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory not found" });
    }

    try {
      await query("DELETE FROM inventory WHERE id = ? AND user_id = ?", [
        inventory.id,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Inventory deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting inventory", error });
  }
};
