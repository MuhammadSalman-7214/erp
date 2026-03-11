const Inventory = require("../models/Inventorymodel");
const Product = require("../models/Productmodel.js");

module.exports.addOrUpdateInventory = async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const userId = req.user.userId;

    if (!product || quantity === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Product and quantity are required" });
    }

    const productRecord = await Product.findOne({ _id: product, user_id: userId });
    if (!productRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    let inventory = await Inventory.findOne({ product, user_id: userId });

    if (inventory) {
      inventory.quantity = quantity;
      inventory.lastUpdated = Date.now();
    } else {
      inventory = new Inventory({
        user_id: userId,
        product,
        quantity,
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
    res
      .status(500)
      .json({ success: false, message: "Error updating inventory", error });
  }
};

module.exports.getAllInventory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const inventories = await Inventory.find({ user_id: userId }).populate(
      "product",
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
    const { productId } = req.params;
    const userId = req.user.userId;

    const inventory = await Inventory.findOne({
      product: productId,
      user_id: userId,
    }).populate("product");

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
    const userId = req.user.userId;

    const inventory = await Inventory.findOneAndDelete({
      product: productId,
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
