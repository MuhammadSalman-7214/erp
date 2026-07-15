const query = require("../libs/dbQuery.js");
const logActivity = require("../libs/logger");

module.exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const userId = req.user.userId;
    const ipAddress = req.ip;
    if (!name) {
      return res
        .status(400)
        .json({ message: "Please provide all necessary information." });
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO categories (user_id, name) VALUES (?, ?)",
        [userId, name],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    await logActivity({
      action: "Add Category",
      description: `Category "${name}" was added`,
      entity: "category",
      entityId: insertResult.insertId,
      userId,
      ipAddress,
    });

    const newCategory = await query(
      "SELECT * FROM categories WHERE id = ? AND user_id = ? LIMIT 1",
      [insertResult.insertId, userId],
    );

    res.status(201).json(newCategory[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating Category", error: error.message });
  }
};

module.exports.RemoveCategory = async (req, res) => {
  try {
    const { CategoryId } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;
    let DeletedCategory;
    try {
      const rows = await query(
        "SELECT * FROM categories WHERE id = ? AND user_id = ? LIMIT 1",
        [CategoryId, userId],
      );
      DeletedCategory = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!DeletedCategory) {
      return res.status(404).json({ message: "Category is not found!" });
    }

    try {
      await query("DELETE FROM categories WHERE id = ? AND user_id = ?", [
        CategoryId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    await logActivity({
      action: "Delete Category",
      description: `Category "${DeletedCategory.name}" was deleted.`,
      entity: "category",
      entityId: DeletedCategory.id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json({ message: "Category delete successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting Category", error: error.message });
  }
};

module.exports.getCategory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const isPaginated = req.query.page !== undefined;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(req.query.pageSize, 10) || 5, 1),
      100,
    );
    const offset = (page - 1) * pageSize;
    const sortDir = req.query.sortDir === "desc" ? "DESC" : "ASC";

    let allCategory;
    let countRows = null;

    try {
      if (isPaginated) {
        [allCategory, countRows] = await Promise.all([
          query(
            `SELECT * FROM categories
             WHERE user_id = ?
             ORDER BY createdAt ${sortDir}
             LIMIT ? OFFSET ?`,
            [userId, pageSize, offset],
          ),
          query("SELECT COUNT(*) AS count FROM categories WHERE user_id = ?", [
            userId,
          ]),
        ]);
      } else {
        allCategory = await query(
          `SELECT * FROM categories
           WHERE user_id = ?
           ORDER BY createdAt ${sortDir}`,
          [userId],
        );
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    const categoriesWithCount = await Promise.all(
      allCategory.map(async (category) => {
        const count = await query(
          "SELECT COUNT(*) AS count FROM products WHERE Category = ? AND user_id = ?",
          [category.id, userId],
        );

        return {
          ...category,
          productCount: count[0]?.count || 0,
        };
      }),
    );

    const response = {
      success: true,
      categoriesWithCount,
    };

    if (isPaginated) {
      const totalItems = countRows[0]?.count || 0;
      response.pagination = {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
      };
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message: "Error getting categories",
      error: error.message,
    });
  }
};

module.exports.updateCategory = async (req, res) => {
  try {
    const { updatedCategory } = req.body;
    const { CategoryId } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;
    const updatedCategoryName =
      typeof updatedCategory === "string"
        ? updatedCategory
        : updatedCategory?.name;

    if (!updatedCategoryName) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    let updateResult;
    try {
      updateResult = await query(
        "UPDATE categories SET name = ? WHERE id = ? AND user_id = ?",
        [updatedCategoryName, CategoryId, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ message: "Category is not found" });
    }

    let updatingCategory;
    try {
      const rows = await query(
        "SELECT * FROM categories WHERE id = ? AND user_id = ? LIMIT 1",
        [CategoryId, userId],
      );
      updatingCategory = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    await logActivity({
      action: "Update Category",
      description: `Category "${updatingCategory.name}" was updated.`,
      entity: "category",
      entityId: updatingCategory.id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json(updatingCategory);
  } catch (error) {
    res.status(500).json({
      message: "Error in update status Category",
      error: error.message,
    });
  }
};

module.exports.Searchcategory = async (req, res) => {
  try {
    const { query: searchQueryRaw } = req.query;
    const userId = req.user.userId;
    const searchQuery = String(searchQueryRaw || "").trim();

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    let categoryRows;
    try {
      categoryRows = await query(
        "SELECT * FROM categories WHERE user_id = ? AND name LIKE ?",
        [userId, `%${searchQuery}%`],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.json(categoryRows);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error finding category", error: error.message });
  }
};
