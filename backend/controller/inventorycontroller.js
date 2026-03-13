const Inventory = require("../models/Inventorymodel");
const ProductCode = require("../models/ProductCodemodel");

module.exports.addOrUpdateInventory = async (req, res) => {
  try {
    const { productCode, quantity } = req.body;
    const userId = req.user.userId;

    if (!productCode || quantity === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Product code and quantity are required" });
    }

    const codeRecord = await ProductCode.findOne({
      _id: productCode,
      user_id: userId,
    });
    if (!codeRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Product code not found" });
    }

    await ProductCode.findOneAndUpdate(
      { _id: productCode, user_id: userId },
      { quantity: Number(quantity) },
    );

    let inventory = await Inventory.findOne({ productCode, user_id: userId });

    if (inventory) {
      inventory.quantity = Number(quantity);
      inventory.lastUpdated = Date.now();
    } else {
      inventory = new Inventory({
        user_id: userId,
        productCode,
        quantity: Number(quantity),
      });
    }

    await inventory.save();

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
    const inventories = await Inventory.find({ user_id: userId }).populate(
      "productCode",
    );

    res.status(200).json({ success: true, inventories });
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

    const inventory = await Inventory.findOne({
      productCode: productCodeId,
      user_id: userId,
    }).populate("productCode");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found for this product code",
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
    const { productCodeId } = req.params;
    const userId = req.user.userId;

    const inventory = await Inventory.findOneAndDelete({
      productCode: productCodeId,
      user_id: userId,
    });

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
