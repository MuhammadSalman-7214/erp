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
      description: `Category "${name} was added`,
      entity: "category",
      entityId: insertResult.insertId,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(201).json({ id: insertResult.insertId, user_id: userId, name });
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
    let allCategory;
    try {
      allCategory = await query(
        "SELECT * FROM categories WHERE user_id = ?",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    // if (!allCategory || allCategory.length === 0) {
    //   return res.status(404).json({ message: "Categories not found" });
    // }

    const categoriesWithCount = await Promise.all(
      allCategory.map(async (category) => {
        const countRows = await query(
          "SELECT COUNT(*) as count FROM products WHERE Category = ? AND user_id = ?",
          [category.id, userId],
        );
        const count = countRows[0]?.count || 0;
        return {
          ...category,
          productCount: count,
        };
      }),
    );

    res.status(200).json({ categoriesWithCount });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error getting categories", error: error.message });
  }
};

module.exports.updateCategory = async (req, res) => {
  try {
    const { updatedCategory } = req.body;
    const { CategoryId } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;
    let updateResult;
    try {
      updateResult = await query(
        "UPDATE categories SET name = ? WHERE id = ? AND user_id = ?",
        [updatedCategory?.name, CategoryId, userId],
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
    const { query } = req.query;
    const userId = req.user.userId;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    let category;
    try {
      category = await query(
        "SELECT * FROM categories WHERE user_id = ? AND name LIKE ?",
        [userId, `%${query}%`],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.json(category);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error finding category", error: error.message });
  }
};
