const query = require("../libs/dbQuery.js");

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

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO customers (user_id, name, contact_phone, contact_address) VALUES (?, ?, ?, ?)",
        [
          userId,
          name.trim(),
          contactInfo?.phone || "",
          contactInfo?.address || "",
        ],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const customer = {
      id: insertResult.insertId,
      user_id: userId,
      name: name.trim(),
      contactInfo: {
        phone: contactInfo?.phone || "",
        address: contactInfo?.address || "",
      },
    };

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
    let customers;
    try {
      customers = await query(
        "SELECT * FROM customers WHERE user_id = ? ORDER BY createdAt DESC",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const formatted = customers.map((c) => ({
      ...c,
      contactInfo: {
        phone: c.contact_phone || "",
        address: c.contact_address || "",
      },
    }));
    res.status(200).json(formatted);
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
    let customer;
    try {
      const rows = await query(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [customerId, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      customer: {
        ...customer,
        contactInfo: {
          phone: customer.contact_phone || "",
          address: customer.contact_address || "",
        },
      },
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

    let customer;
    try {
      const rows = await query(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const nextName = name?.trim() || customer.name;
    const nextPhone = contactInfo?.phone ?? customer.contact_phone ?? "";
    const nextAddress = contactInfo?.address ?? customer.contact_address ?? "";
    if (!String(nextAddress).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer address is required.",
      });
    }

    let updateResult;
    try {
      updateResult = await query(
        "UPDATE customers SET name = ?, contact_phone = ?, contact_address = ? WHERE id = ? AND user_id = ?",
        [nextName, nextPhone, nextAddress, id, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const updatedCustomer = {
      ...customer,
      name: nextName,
      contact_phone: nextPhone,
      contact_address: nextAddress,
      contactInfo: {
        phone: nextPhone,
        address: nextAddress,
      },
    };

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
    let customer;
    try {
      const rows = await query(
        "SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1",
        [customerId, userId],
      );
      customer = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    try {
      await query("DELETE FROM customers WHERE id = ? AND user_id = ?", [
        customerId,
        userId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
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

    let customers;
    try {
      customers = await query(
        "SELECT * FROM customers WHERE user_id = ? AND (name LIKE ? OR contact_phone LIKE ?) ORDER BY createdAt DESC",
        [userId, `%${query}%`, `%${query}%`],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res.status(200).json({
      success: true,
      customers: customers.map((c) => ({
        ...c,
        contactInfo: {
          phone: c.contact_phone || "",
          address: c.contact_address || "",
        },
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching customer",
      error: error.message,
    });
  }
};
