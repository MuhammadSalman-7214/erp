const Vendor = require("../models/Suppliermodel.js");
const Product = require("../models/Productmodel.js");

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

    if (!name || !contactInfo || !contactInfo.email || !contactInfo.phone) {
      return res.status(400).json({
        success: false,
        message: " name, phone and email are required.",
      });
    }

    if (Array.isArray(productsSupplied) && productsSupplied.length) {
      const ownedProducts = await Product.countDocuments({
        _id: { $in: productsSupplied },
        user_id: userId,
      });
      if (ownedProducts !== productsSupplied.length) {
        return res.status(403).json({
          success: false,
          message: "One or more products do not belong to the current user.",
        });
      }
    }

    const newSupplier = new Vendor({
      user_id: userId,
      name,
      contactInfo: {
        phone: contactInfo.phone,
        email: contactInfo.email,
        address: contactInfo.address || "",
      },
      openingBalance: Number(openingBalance) || 0,
      paymentTerms: paymentTerms || "",
      productsSupplied: productsSupplied || [],
    });

    await newSupplier.save();

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
    const Suppliers = await Vendor.find({ user_id: userId }).populate(
      "productsSupplied",
    );

    res.status(200).json(Suppliers);
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

    const supplier = await Vendor.findOne({
      _id: supplierId,
      user_id: userId,
    }).populate("productsSupplied");

    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    res.status(200).json({ success: true, supplier });
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
    const supplier = await Vendor.findOne({ _id: id, user_id: userId });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    supplier.name = name || supplier.name;
    supplier.contactInfo = {
      phone: contactInfo?.phone || supplier.contactInfo.phone,
      email: contactInfo?.email || supplier.contactInfo.email,
      address: contactInfo?.address || supplier.contactInfo.address,
    };
    supplier.openingBalance =
      openingBalance !== undefined
        ? Number(openingBalance)
        : supplier.openingBalance;
    supplier.paymentTerms = paymentTerms ?? supplier.paymentTerms;

    supplier.productsSupplied = Array.isArray(productsSupplied)
      ? productsSupplied
      : supplier.productsSupplied;

    if (Array.isArray(supplier.productsSupplied) && supplier.productsSupplied.length) {
      const ownedProducts = await Product.countDocuments({
        _id: { $in: supplier.productsSupplied },
        user_id: userId,
      });
      if (ownedProducts !== supplier.productsSupplied.length) {
        return res.status(403).json({
          message: "One or more products do not belong to the current user.",
        });
      }
    }

    const updatedSupplier = await supplier.save();

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
    const supplier = await Vendor.findOneAndDelete({
      _id: supplierId,
      user_id: userId,
    });

    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
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

    const suppliers = await Vendor.find({
      user_id: userId,
      name: { $regex: new RegExp(query, "i") },
    });

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
