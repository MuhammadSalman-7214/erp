const Supplier = require("../models/Suppliermodel.js");
const { getCountryCurrencySnapshot } = require("../libs/currency.js");

module.exports.createSupplier = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (!["branchadmin", "staff"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only branch staff can create suppliers.",
      });
    }
    const { name, contactInfo, productsSupplied } = req.body;
    const { branchId, countryId } = req.user || {};

    if (!name || !contactInfo || !contactInfo.email || !contactInfo.phone) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and email are required.",
      });
    }
    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: "Branch and country are required for supplier creation.",
      });
    }
    const currencySnapshot = await getCountryCurrencySnapshot(countryId);
    const userCurrency = currencySnapshot.currency;
    const userCurrencyExchangeRate = currencySnapshot.exchangeRate;

    const newSupplier = new Supplier({
      name,
      contactInfo: {
        phone: contactInfo.phone,
        email: contactInfo.email,
        address: contactInfo.address || "",
      },
      productsSupplied: productsSupplied || [],
      branchId,
      countryId,
      currency: userCurrency,
      exchangeRateUsed: userCurrencyExchangeRate,
      priceUSD: 0,
    });

    await newSupplier.save();

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      newSupplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating supplier",
      error,
    });
  }
};

module.exports.getAllSuppliers = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};

    const query = {};

    if (role === "countryadmin") {
      query.countryId = countryId;
    }

    if (["branchadmin", "staff"].includes(role)) {
      query.countryId = countryId;

      if (branchId) {
        // Branch-specific + global suppliers
        query.$or = [
          { branchId: branchId },
          { branchId: { $exists: false } },
          { branchId: null },
        ];
      } else {
        // Only global suppliers
        query.$or = [{ branchId: { $exists: false } }, { branchId: null }];
      }
    }

    const suppliers = await Supplier.find(query)
      .populate("productsSupplied")
      .lean();

    res.status(200).json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching suppliers",
      error: error.message,
    });
  }
};

module.exports.getSupplierById = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { role, countryId, branchId } = req.user || {};

    const supplier =
      await Supplier.findById(supplierId).populate("productsSupplied");

    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    if (
      role === "countryadmin" &&
      supplier.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied for this country." });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      supplier.branchId?.toString() !== branchId?.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied for this branch." });
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
  const { name, contactInfo, productsSupplied } = req.body;
  const { role, countryId, branchId } = req.user || {};

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    if (
      role === "countryadmin" &&
      supplier.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this country." });
    }
    if (
      ["branchadmin", "staff"].includes(role) &&
      supplier.branchId?.toString() !== branchId?.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this branch." });
    }

    supplier.name = name || supplier.name;
    supplier.contactInfo = {
      phone: contactInfo?.phone || supplier.contactInfo.phone,
      email: contactInfo?.email || supplier.contactInfo.email,
      address: contactInfo?.address || supplier.contactInfo.address,
    };

    supplier.productsSupplied = Array.isArray(productsSupplied)
      ? productsSupplied
      : supplier.productsSupplied;

    const updatedSupplier = await supplier.save();

    res.status(200).json({
      message: "Supplier updated successfully",
      supplier: updatedSupplier,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating supplier", error });
  }
};

module.exports.deleteSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params; // <-- use req.params
    const { role, countryId, branchId } = req.user || {};
    const supplier = await Supplier.findById(supplierId);

    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    if (
      role === "countryadmin" &&
      supplier.countryId?.toString() !== countryId?.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied for this country." });
    }
    if (role !== "branchadmin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }
    if (supplier.branchId?.toString() !== branchId?.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied for this branch." });
    }

    await Supplier.findByIdAndDelete(supplierId);

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
    const { role, countryId, branchId } = req.user || {};

    if (!query || query.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Query parameter is required" });
    }

    const searchQuery = {
      name: { $regex: new RegExp(query, "i") },
    };
    if (role === "countryadmin") {
      searchQuery.countryId = countryId;
    } else if (["branchadmin", "staff"].includes(role)) {
      searchQuery.branchId = branchId;
      searchQuery.countryId = countryId;
    }

    const suppliers = await Supplier.find(searchQuery);

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
