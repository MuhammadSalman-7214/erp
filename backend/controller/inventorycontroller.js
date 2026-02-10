const Inventory = require("../models/Inventorymodel");
const Product = require("../models/Productmodel.js");
const { assertNotLocked } = require("../libs/periodLock.js");

module.exports.addOrUpdateInventory = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only branch staff can update inventory",
      });
    }
    const { product, quantity } = req.body;
    const { countryId, branchId } = req.user || {};

    if (!product || quantity === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Product and quantity are required" });
    }
    if (!branchId || !countryId) {
      return res.status(400).json({
        success: false,
        message: "Branch and country are required for inventory updates",
      });
    }
    await assertNotLocked({ countryId, branchId, transactionDate: new Date() });

    let inventory = await Inventory.findOne({
      product,
      branchId,
      countryId,
    });

    if (inventory) {
      inventory.quantity = quantity;
      inventory.lastUpdated = Date.now();
    } else {
      inventory = new Inventory({
        product,
        quantity,
        branchId,
        countryId,
      });
    }

    await inventory.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Inventory updated successfully",
        inventory,
      });
  } catch (error) {
    if (error.code === "ACCOUNTING_LOCKED") {
      return res.status(423).json({ success: false, message: error.message });
    }
    res
      .status(500)
      .json({ success: false, message: "Error updating inventory", error });
  }
};

module.exports.getAllInventory = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }

    const inventories = await Inventory.find(query).populate("product");

    res.status(200).json({ success: true, inventories });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching inventory", error });
  }
};

module.exports.getInventoryByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { role, countryId, branchId } = req.user || {};

    const query = { product: productId };
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      query.branchId = branchId;
      query.countryId = countryId;
    }

    const inventory = await Inventory.findOne(query).populate("product");

    if (!inventory) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Inventory not found for this product",
        });
    }

    res.status(200).json({ success: true, inventory });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching inventory", error });
  }
};

module.exports.deleteInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { role, countryId, branchId } = req.user || {};

    const query = { product: productId };
    if (role !== "branchadmin") {
      return res.status(403).json({
        success: false,
        message: "Only branch admin can delete inventory records",
      });
    }
    query.branchId = branchId;
    query.countryId = countryId;
    const inventory = await Inventory.findOneAndDelete(query);

    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory not found" });
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
