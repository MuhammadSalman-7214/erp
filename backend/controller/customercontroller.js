const Customer = require("../models/Customermodel");

module.exports.createCustomer = async (req, res) => {
  try {
    const { customerCode, name, contactInfo, openingBalance, paymentTerms } =
      req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    if (customerCode) {
      const existingCode = await Customer.findOne({
        customerCode: customerCode.toUpperCase(),
        user_id: userId,
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Customer code already exists.",
        });
      }
    }

    const customer = await Customer.create({
      user_id: userId,
      customerCode: customerCode ? customerCode.toUpperCase() : undefined,
      name: name.trim(),
      contactInfo: {
        phone: contactInfo?.phone || "",
        email: contactInfo?.email || "",
        address: contactInfo?.address || "",
      },
      openingBalance: Number(openingBalance) || 0,
      paymentTerms: paymentTerms || "",
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating customer",
      error: error.message,
    });
  }
};

module.exports.getAllCustomers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const customers = await Customer.find({ user_id: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

module.exports.getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;
    const customer = await Customer.findOne({
      _id: customerId,
      user_id: userId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching customer",
      error: error.message,
    });
  }
};

module.exports.editCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerCode, name, contactInfo, openingBalance, paymentTerms } =
      req.body;
    const userId = req.user.userId;

    const customer = await Customer.findOne({ _id: id, user_id: userId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const normalizedCode = customerCode ? customerCode.toUpperCase() : "";
    if (normalizedCode && normalizedCode !== customer.customerCode) {
      const existingCode = await Customer.findOne({
        customerCode: normalizedCode,
        _id: { $ne: id },
        user_id: userId,
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Customer code already exists.",
        });
      }
      customer.customerCode = normalizedCode;
    }

    customer.name = name?.trim() || customer.name;
    customer.contactInfo = {
      phone: contactInfo?.phone ?? customer.contactInfo?.phone ?? "",
      email: contactInfo?.email ?? customer.contactInfo?.email ?? "",
      address: contactInfo?.address ?? customer.contactInfo?.address ?? "",
    };
    customer.openingBalance =
      openingBalance !== undefined
        ? Number(openingBalance) || 0
        : customer.openingBalance;
    customer.paymentTerms = paymentTerms ?? customer.paymentTerms;

    const updatedCustomer = await customer.save();

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating customer",
      error: error.message,
    });
  }
};

module.exports.deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;
    const customer = await Customer.findOneAndDelete({
      _id: customerId,
      user_id: userId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting customer",
      error: error.message,
    });
  }
};

module.exports.searchCustomer = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }

    const customers = await Customer.find({
      user_id: userId,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { customerCode: { $regex: query, $options: "i" } },
        { "contactInfo.email": { $regex: query, $options: "i" } },
        { "contactInfo.phone": { $regex: query, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching customer",
      error: error.message,
    });
  }
};
