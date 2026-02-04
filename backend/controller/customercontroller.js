const Customer = require("../models/Customermodel.js");
const logActivity = require("../libs/logger");

module.exports.createCustomer = async (req, res) => {
  try {
    const { name, contactInfo } = req.body;
    const { userId, branchId, countryId, userCurrency, userCurrencyExchangeRate } =
      req.user || {};

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!branchId || !countryId) {
      return res.status(400).json({
        message: "Branch and country are required for customer creation",
      });
    }
    if (!userCurrency || !userCurrencyExchangeRate) {
      return res.status(400).json({
        message: "Currency configuration is missing for this user",
      });
    }

    const customer = await Customer.create({
      name,
      contactInfo: {
        phone: contactInfo?.phone || "",
        email: contactInfo?.email || "",
        address: contactInfo?.address || "",
      },
      branchId,
      countryId,
      currency: userCurrency,
      exchangeRateUsed: userCurrencyExchangeRate,
      createdBy: userId,
    });

    await logActivity({
      action: "Add Customer",
      description: `Customer "${name}" was added`,
      entity: "customer",
      entityId: customer._id,
      userId,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ message: "Error creating customer", error: error.message });
  }
};

module.exports.getAllCustomers = async (req, res) => {
  try {
    const { role, countryId, branchId } = req.user || {};
    const query = { isActive: true };
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      query.countryId = countryId;
      query.branchId = branchId;
    }
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ message: "Error fetching customers", error: error.message });
  }
};

module.exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, countryId, branchId } = req.user || {};
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    if (
      role === "countryadmin" &&
      customer.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      customer.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    res.status(200).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer", error: error.message });
  }
};

module.exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, countryId, branchId, userId } = req.user || {};
    const existing = await Customer.findById(id);
    if (!existing) return res.status(404).json({ message: "Customer not found" });
    if (
      role === "countryadmin" &&
      existing.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      existing.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    const { name, contactInfo } = req.body;
    if (name) existing.name = name;
    if (contactInfo) {
      existing.contactInfo = {
        phone: contactInfo.phone || existing.contactInfo.phone,
        email: contactInfo.email || existing.contactInfo.email,
        address: contactInfo.address || existing.contactInfo.address,
      };
    }
    await existing.save();

    await logActivity({
      action: "Update Customer",
      description: `Customer "${existing.name}" was updated`,
      entity: "customer",
      entityId: existing._id,
      userId,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, customer: existing });
  } catch (error) {
    res.status(500).json({ message: "Error updating customer", error: error.message });
  }
};

module.exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, countryId, branchId, userId } = req.user || {};
    const existing = await Customer.findById(id);
    if (!existing) return res.status(404).json({ message: "Customer not found" });
    if (
      role === "countryadmin" &&
      existing.countryId?.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this country" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      existing.branchId?.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied for this branch" });
    }
    existing.isActive = false;
    await existing.save();

    await logActivity({
      action: "Delete Customer",
      description: `Customer "${existing.name}" was deactivated`,
      entity: "customer",
      entityId: existing._id,
      userId,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Customer deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting customer", error: error.message });
  }
};
