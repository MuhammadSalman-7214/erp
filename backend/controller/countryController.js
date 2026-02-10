// controller/countryController.js - NEW

const Country = require("../models/Countrymodel.js");
const User = require("../models/Usermodel.js");
const logActivity = require("../libs/logger.js");

// Create Country (Super Admin only)
exports.createCountry = async (req, res) => {
  try {
    const { name, code, currency, currencySymbol, exchangeRate, settings } =
      req.body;
    const creatorId = req.user._id;

    const existingCountry = await Country.findOne({
      $or: [{ code }, { name }],
    });
    if (existingCountry) {
      return res
        .status(400)
        .json({ message: "Country with this code or name already exists" });
    }

    const newCountry = new Country({
      name,
      code: code.toUpperCase(),
      currency: currency.toUpperCase(),
      currencySymbol,
      exchangeRate: exchangeRate || 1,
      exchangeRateHistory: [
        {
          rate: exchangeRate || 1,
          updatedAt: new Date(),
          updatedBy: creatorId,
        },
      ],
      settings,
      createdBy: creatorId,
    });

    const savedCountry = await newCountry.save();

    await logActivity({
      action: "Country Created",
      description: `Country ${name} (${code}) created.`,
      entity: "country",
      entityId: savedCountry._id,
      userId: creatorId,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Country created successfully",
      country: savedCountry,
    });
  } catch (error) {
    console.error("Error creating country:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get All Countries
exports.getAllCountries = async (req, res) => {
  try {
    const currentUser = req.user;

    let query = { isActive: true };

    if (currentUser.role === "countryadmin") {
      query.countryAdminId = currentUser.userId;
    }

    const countries = await Country.find(query)
      .populate("countryAdminId", "name email")
      .sort({ name: 1 });
    res.status(200).json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Update Exchange Rate (Super Admin only)
exports.updateExchangeRate = async (req, res) => {
  try {
    const { countryId } = req.params;
    const { exchangeRate } = req.body;
    const updaterId = req.user._id;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    country.exchangeRate = exchangeRate;
    country.exchangeRateHistory.push({
      rate: exchangeRate,
      updatedAt: new Date(),
      updatedBy: updaterId,
    });

    await country.save();

    await logActivity({
      action: "Exchange Rate Updated",
      description: `Exchange rate for ${country.name} updated to ${exchangeRate}`,
      entity: "country",
      entityId: country._id,
      userId: updaterId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Exchange rate updated successfully",
      country,
    });
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Assign Country Admin
exports.assignCountryAdmin = async (req, res) => {
  try {
    const { countryId, userId } = req.body;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "countryadmin") {
      return res
        .status(400)
        .json({ message: "Invalid user or user is not a country admin" });
    }

    country.countryAdminId = userId;
    await country.save();

    // Update user's countryId
    user.countryId = countryId;
    await user.save();

    res.status(200).json({
      message: "Country admin assigned successfully",
      country,
    });
  } catch (error) {
    console.error("Error assigning country admin:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Update Country
exports.updateCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const updates = req.body;

    const country = await Country.findByIdAndUpdate(
      countryId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    res.status(200).json({
      message: "Country updated successfully",
      country,
    });
  } catch (error) {
    console.error("Error updating country:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Update Country Accounting Lock (Super Admin or Country Admin)
exports.updateCountryLock = async (req, res) => {
  try {
    const { countryId } = req.params;
    const { accountingLockUntil } = req.body;
    const { role, countryId: userCountryId } = req.user || {};

    if (role === "countryadmin" && countryId !== userCountryId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only lock your own country.",
      });
    }

    const country = await Country.findByIdAndUpdate(
      countryId,
      { accountingLockUntil },
      { new: true },
    );
    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    await logActivity({
      action: "Country Accounting Lock Updated",
      description: `Country accounting lock updated to ${accountingLockUntil}`,
      entity: "country",
      entityId: country._id,
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Country accounting lock updated successfully",
      country,
    });
  } catch (error) {
    console.error("Error updating country lock:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete Country (Soft delete)
exports.deleteCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findByIdAndUpdate(
      countryId,
      { isActive: false },
      { new: true },
    );

    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    res.status(200).json({
      message: "Country deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting country:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
