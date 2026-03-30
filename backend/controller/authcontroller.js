const query = require("../libs/dbQuery.js");
const bcrypt = require("bcryptjs");
const generateToken = require("../libs/Tokengenerator.js");
const Cloundinary = require("../libs/Cloundinary.js");
const logActivity = require("../libs/logger.js");

module.exports.signup = async (req, res) => {
  try {
    const { name, email, password, ProfilePic, role } = req.body;
    const resolvedRole = role || "admin";

    let duplicatedUser;
    try {
      duplicatedUser = await query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (duplicatedUser.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }
    // if (role === "admin") {
    //   const existingAdmin = await User.findOne({ role: "admin" });
    //   if (existingAdmin) {
    //     return res.status(403).json({
    //       message: "Admin already exists. Only one admin is allowed.",
    //     });
    //   }
    // }
    const hashedpassword = await bcrypt.hash(password, 10);

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO users (name, email, password, ProfilePic, role) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedpassword, "", resolvedRole],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const savedUser = {
      id: insertResult.insertId,
      name,
      email,
      role: resolvedRole,
      ProfilePic: "",
    };
    const token = await generateToken(savedUser, res);

    res.status(201).json({
      message: "Signup successful",
      savedUser: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        ProfilePic: savedUser.ProfilePic,
        token,
      },
    });

    await logActivity({
      action: "User Signup",
      description: `User ${name} signed up.`,
      entity: "user",
      entityId: savedUser.id,
      userId: savedUser.id,
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error("Error during signup:", error.message);
    res.status(400).json({ message: "Error during signup: " + error.message });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    let duplicatedUser;
    try {
      const rows = await query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email],
      );
      duplicatedUser = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (!duplicatedUser) {
      return res.status(400).json({
        message: "Account not found. Please sign up to create a new account.",
      });
    }

    const hasedpassword = await bcrypt.compare(
      password,
      duplicatedUser.password,
    );

    if (!hasedpassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = await generateToken(duplicatedUser, res);

    await logActivity({
      action: "User Login",
      description: `User ${duplicatedUser.name} logged in.`,
      entity: "user",
      entityId: duplicatedUser.id,
      userId: duplicatedUser.id,
      ipAddress: ipAddress,
    });
    return res.status(201).json({
      message: "login successfully",
      user: {
        id: duplicatedUser.id,
        name: duplicatedUser.name,
        email: duplicatedUser.email,
        role: duplicatedUser.role,
        ProfilePic: duplicatedUser.ProfilePic,
        token,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: "Error in login to the page",
    });
  }
};

module.exports.logout = async (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred during logout. Please try again.",
      error: error.message,
    });
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { ProfilePic } = req.body;
    const userId = req.user?.userId;
    const ipAddress = req.ip;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (ProfilePic) {
      try {
        const uploadResponse = await Cloundinary.uploader.upload(ProfilePic, {
          folder: "profile_inventory_system",
          upload_preset: "upload",
        });

        let updateResult;
        try {
          updateResult = await query(
            "UPDATE users SET ProfilePic = ? WHERE id = ?",
            [uploadResponse.secure_url, userId],
          );
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        let updatedUser;
        try {
          const rows = await query(
            "SELECT id, name, email, role, ProfilePic FROM users WHERE id = ?",
            [userId],
          );
          updatedUser = rows[0];
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });
        }

        return res.status(200).json({
          message: "Profile updated successfully",
          updatedUser,
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary upload failed:", cloudinaryError);
        return res.status(500).json({
          message: "Image upload failed",
          error: cloudinaryError.message,
        });
      }
    } else {
      return res.status(400).json({ message: "No profile picture provided" });
    }
  } catch (error) {
    console.error("Error in update profile Controller", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.staffuser = async (req, res) => {
  try {
    let staffuser;
    try {
      staffuser = await query(
        "SELECT id, name, email, role, ProfilePic FROM users WHERE role = ?",
        ["staff"],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (staffuser.length === 0) {
      return res
        .status(200)
        .json({ message: "There are no staff users available." });
    }

    res.status(200).json(staffuser);
  } catch (error) {
    console.log("Error in get staff Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.manageruser = async (req, res) => {
  try {
    let manageruser;
    try {
      manageruser = await query(
        "SELECT id, name, email, role, ProfilePic FROM users WHERE role = ?",
        ["manager"],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (manageruser.length === 0) {
      return res
        .status(200)
        .json({ message: "There are no manager users available." });
    }

    res.status(200).json(manageruser);
  } catch (error) {
    console.log("Error in get manager Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.adminuser = async (req, res) => {
  try {
    let adminuser;
    try {
      adminuser = await query(
        "SELECT id, name, email, role, ProfilePic FROM users WHERE role = ?",
        ["admin"],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (adminuser.length === 0) {
      return res
        .status(200)
        .json({ message: "There are no admin users available." });
    }

    res.status(200).json(adminuser);
  } catch (error) {
    console.log("Error in get admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.removeuser = async (req, res) => {
  try {
    const { UserId } = req.params;

    if (!UserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    let deleteUser;
    try {
      deleteUser = await query("DELETE FROM users WHERE id = ?", [UserId]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    if (deleteUser.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
