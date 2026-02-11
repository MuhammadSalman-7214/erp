const Customer = require("../models/Customermodel");

module.exports.createCustomer = async (req, res) => {
  try {
    const { customerCode, name, contactInfo, openingBalance, paymentTerms } =
      req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    if (customerCode) {
      const existingCode = await Customer.findOne({
        customerCode: customerCode.toUpperCase(),
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Customer code already exists.",
        });
      }
    }

    const customer = await Customer.create({
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
    const customers = await Customer.find().sort({ createdAt: -1 });
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
    const customer = await Customer.findById(customerId);

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

    const customer = await Customer.findById(id);
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
    const customer = await Customer.findByIdAndDelete(customerId);

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

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }

    const customers = await Customer.find({
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
