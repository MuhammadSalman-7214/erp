const Customer = require("../models/Customermodel");

module.exports.createCustomer = async (req, res) => {
  try {
    const { name, contactInfo } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }
    if (!contactInfo?.address || !contactInfo.address.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer address is required.",
      });
    }

    const customer = await Customer.create({
      user_id: userId,
      name: name.trim(),
      contactInfo: {
        phone: contactInfo?.phone || "",
        address: contactInfo?.address || "",
      },
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
    const { name, contactInfo } = req.body;
    const userId = req.user.userId;

    const customer = await Customer.findOne({ _id: id, user_id: userId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const nextName = name?.trim() || customer.name;
    const nextPhone = contactInfo?.phone ?? customer.contactInfo?.phone ?? "";
    const nextAddress =
      contactInfo?.address ?? customer.contactInfo?.address ?? "";
    if (!String(nextAddress).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer address is required.",
      });
    }

    customer.name = nextName;
    customer.contactInfo = {
      phone: nextPhone,
      address: nextAddress,
    };

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
