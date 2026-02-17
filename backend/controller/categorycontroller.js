const Product = require("../models/Productmodel");
const Category = require("../models/ Categorymodel");
const logActivity = require("../libs/logger");
const StockTransaction = require("../models/StockTranscationmodel");

module.exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        message: "Please provide all necessary information.",
      });
    }

    const { userId, branchId, countryId } = req.user;
    if (!countryId) {
      return res.status(400).json({
        message: "Country are required for category creation.",
      });
    }

    const newCategory = new Category({
      name,
      description,
      branchId,
      countryId,
    });

    await newCategory.save();

    await logActivity({
      action: "Add Category",
      description: `Category "${name}" was added`,
      entity: "category",
      entityId: newCategory._id,
      userId: userId,
      ipAddress: req.ip,
    });

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({
      message: "Error in creating Category",
      error: error.message,
    });
  }
};

module.exports.RemoveCategory = async (req, res) => {
  try {
    const { CategoryId } = req.params;

    const userId = req.user.userId;
    const ipAddress = req.ip;
    const { role, countryId, branchId } = req.user;
    const existingCategory = await Category.findById(CategoryId);

    if (!existingCategory) {
      return res.status(404).json({ message: "Category is not found!" });
    }

    if (
      role === "countryadmin" &&
      existingCategory.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      existingCategory.branchId?.toString() !== branchId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this branch." });
    }

    const DeletedCategory = await Category.findByIdAndDelete(CategoryId);

    if (!DeletedCategory) {
      return res.status(404).json({ message: "Category is not found!" });
    }

    await logActivity({
      action: "Delete Category",
      description: `Category "${DeletedCategory.name}" was deleted.`,
      entity: "category",
      entityId: DeletedCategory._id,
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

// module.exports.getCategory = async (req, res) => {
//   try {
//     const { role, countryId, branchId } = req.user;

//     const query = {};
//     if (role === "countryadmin") {
//       query.countryId = countryId;
//     } else if (["branchadmin", "staff", "agent"].includes(role)) {
//       query.branchId = branchId;
//       query.countryId = countryId;
//     }

//     const allCategory = await Category.find(query);
//     console.log({ role, countryId, branchId, allCategory });

//     // if (!allCategory || allCategory.length === 0) {
//     //   return res.status(404).json({ message: "Categories not found" });
//     // }

//     const categoriesWithCount = await Promise.all(
//       allCategory.map(async (category) => {
//         const productQuery = { Category: category._id };
//         if (role === "countryadmin") {
//           productQuery.countryId = countryId;
//         } else if (["branchadmin", "staff", "agent"].includes(role)) {
//           productQuery.branchId = branchId;
//           productQuery.countryId = countryId;
//         }
//         const count = await Product.countDocuments(productQuery);
//         return {
//           ...category.toObject(),
//           productCount: count,
//         };
//       }),
//     );

//     res.status(200).json({ categoriesWithCount });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error getting categories", error: error.message });
//   }
// };

module.exports.getCategory = async (req, res) => {
  try {
    const { role, countryId } = req.user;

    const query = { countryId };

    const categoriesWithCount = await Category.find(query).lean();

    res.status(200).json({ categoriesWithCount });
  } catch (err) {
    res.status(500).json({ message: "Error fetching categories" });
  }
};

module.exports.updateCategory = async (req, res) => {
  try {
    const { updatedData } = req.body;
    const { CategoryId } = req.params;
    const userId = req.user.userId;
    const ipAddress = req.ip;
    const { role, countryId, branchId } = req.user;

    const existingCategory = await Category.findById(CategoryId);
    if (!existingCategory) {
      return res.status(400).json({ message: "Category is not found" });
    }
    if (
      role === "countryadmin" &&
      existingCategory.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      existingCategory.branchId?.toString() !== branchId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this branch." });
    }

    if (updatedData?.countryId || updatedData?.branchId) {
      return res.status(400).json({
        message: "Country and branch cannot be changed for a category.",
      });
    }

    const updatingCategory = await Category.findByIdAndUpdate(
      CategoryId,
      updatedData,
      { new: true },
    );

    if (!updatingCategory) {
      return res.status(400).json({ message: "Category is not found" });
    }

    await logActivity({
      action: "Update Category",
      description: `Category "${updatingCategory.name}" was updated.`,
      entity: "category",
      entityId: updatingCategory._id,
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
    const { role, countryId, branchId } = req.user;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
    if (role === "countryadmin") {
      searchQuery.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      searchQuery.branchId = branchId;
      searchQuery.countryId = countryId;
    }

    const category = await Category.find(searchQuery);

    res.json(category);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error finding category", error: error.message });
  }
};
