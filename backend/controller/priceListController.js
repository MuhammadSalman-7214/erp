const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");

const normalizeText = (value = "") => String(value).trim();
const normalizeUpperText = (value = "") => normalizeText(value).toUpperCase();
const normalizeOptionalText = (value) => {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const upper = text.toUpperCase();
  if (upper === "NULL" || upper === "UNDEFINED") return null;

  return upper;
};

const normalizeItemRow = (item) =>
  item
    ? {
        ...item,
        size: normalizeOptionalText(item.size),
      }
    : item;

const fetchPriceListItem = async (id, userId) => {
  const rows = await query(
    "SELECT * FROM price_list_items WHERE id = ? AND user_id = ? LIMIT 1",
    [id, userId],
  );
  return normalizeItemRow(rows[0] || null);
};

module.exports.createPriceListItem = async (req, res) => {
  try {
    const { productName, size, price } = req.body;
    const userId = req.user.userId;

    const resolvedName = normalizeUpperText(productName);
    const resolvedSize = normalizeOptionalText(size);
    const resolvedPrice = Number(price);

    if (!resolvedName) {
      return res.status(400).json({
        success: false,
        message: "Product name is required.",
      });
    }

    if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "A valid price is required.",
      });
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO price_list_items (user_id, productName, size, price) VALUES (?, ?, ?, ?)",
        [userId, resolvedName, resolvedSize, resolvedPrice],
      );
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error,
      });
    }

    const createdItem = await fetchPriceListItem(insertResult.insertId, userId);

    await logActivity({
      action: "Add Price List Item",
      description: `Price item "${resolvedName}" was added.`,
      entity: "price_list_item",
      entityId: insertResult.insertId,
      userId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      item:
        createdItem || {
          id: insertResult.insertId,
          user_id: userId,
          productName: resolvedName,
          size: resolvedSize,
          price: resolvedPrice,
        },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating price list item",
      error: error.message,
    });
  }
};

module.exports.getPriceListItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const searchText = normalizeText(req.query?.query);
    const values = [userId];
    let sql = "SELECT * FROM price_list_items WHERE user_id = ?";

    if (searchText) {
      sql +=
        " AND (productName LIKE ? OR size LIKE ? OR CAST(price AS CHAR) LIKE ?)";
      values.push(`%${searchText}%`, `%${searchText}%`, `%${searchText}%`);
    }

    sql += " ORDER BY createdAt ASC, id ASC";

    let items;
    try {
      items = await query(sql, values);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error,
      });
    }

    return res.status(200).json({
      success: true,
      items: Array.isArray(items) ? items.map(normalizeItemRow) : [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching price list items",
      error: error.message,
    });
  }
};

module.exports.updatePriceListItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { productName, size, price } = req.body;

    const existingItem = await fetchPriceListItem(id, userId);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Price list item not found",
      });
    }

    const resolvedName = normalizeUpperText(
      productName ?? existingItem.productName,
    );
    const resolvedSize =
      size === undefined ? existingItem.size || null : normalizeOptionalText(size);
    const resolvedPrice = Number(
      price !== undefined ? price : existingItem.price,
    );

    if (!resolvedName) {
      return res.status(400).json({
        success: false,
        message: "Product name is required.",
      });
    }

    if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "A valid price is required.",
      });
    }

    try {
      await query(
        "UPDATE price_list_items SET productName = ?, size = ?, price = ? WHERE id = ? AND user_id = ?",
        [resolvedName, resolvedSize, resolvedPrice, id, userId],
      );
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error,
      });
    }

    const updatedItem = await fetchPriceListItem(id, userId);

    await logActivity({
      action: "Update Price List Item",
      description: `Price item "${resolvedName}" was updated.`,
      entity: "price_list_item",
      entityId: Number(id),
      userId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      item: normalizeItemRow(updatedItem),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating price list item",
      error: error.message,
    });
  }
};

module.exports.deletePriceListItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existingItem = await fetchPriceListItem(id, userId);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Price list item not found",
      });
    }

    try {
      await query("DELETE FROM price_list_items WHERE id = ? AND user_id = ?", [
        id,
        userId,
      ]);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error,
      });
    }

    await logActivity({
      action: "Delete Price List Item",
      description: `Price item "${existingItem.productName}" was deleted.`,
      entity: "price_list_item",
      entityId: Number(id),
      userId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Price list item deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting price list item",
      error: error.message,
    });
  }
};
