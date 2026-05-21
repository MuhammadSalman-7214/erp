const query = require("../libs/dbQuery.js");
const bcrypt = require("bcryptjs");
const generateToken = require("../libs/Tokengenerator.js");
const Cloundinary = require("../libs/Cloundinary.js");
const logActivity = require("../libs/logger.js");
const { sendMail } = require("../libs/mailer.js");
const { isPaid } = require("../services/subscriptionService.js");

const OTP_EXPIRY_MINUTES = 1;
const OTP_ATTEMPT_LIMIT = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 5;
const OTP_BYPASS_EMAIL = process.env.TEST_USER;

const generateOtpCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const normalizeEmailForLogin = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "");

const maskEmail = (email) => {
  if (!email || !email.includes("@")) {
    return email;
  }

  const [localPart, domain] = email.split("@");
  const maskedLocal =
    localPart.length <= 2
      ? `${localPart[0] || ""}*`
      : `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 2))}`;

  return `${maskedLocal}@${domain}`;
};

const getInactiveAccountMessage = async (userId) => {
  const paid = await isPaid(userId);

  if (paid) {
    return "Account inactive. Please contact admin to restore access.";
  }

  return "Account inactive. Your subscription is unpaid. Please pay before contacting admin.";
};

const buildPasswordResetEmail = ({ name, code, expiresInMinutes }) => ({
  subject: "Your password reset code",
  text: `Your password reset code is ${code}. It expires in ${expiresInMinutes} minutes.`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 16px;">Password reset code</h2>
      <p>Hello ${name || "there"},</p>
      <p>Use the code below to reset your password:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0; color: #0f766e;">
        ${code}
      </div>
      <p>This code expires in ${expiresInMinutes} minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `,
});

const createPasswordResetChallenge = async (userId) => {
  const code = generateOtpCode();
  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000,
  );

  await query(
    "DELETE FROM password_reset_challenges WHERE user_id = ? AND usedAt IS NULL",
    [userId],
  );

  const result = await query(
    "INSERT INTO password_reset_challenges (user_id, otp_hash, expiresAt) VALUES (?, ?, ?)",
    [userId, otpHash, expiresAt],
  );

  return {
    challengeId: result.insertId,
    code,
    expiresIn: PASSWORD_RESET_EXPIRY_MINUTES * 60,
  };
};

module.exports.signup = async (req, res) => {
  try {
    const { name, email, password, ProfilePic, role } = req.body;
    const resolvedRole = role || "admin";
    const billingDay = new Date().getDate();

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
        "INSERT INTO users (name, email, password, ProfilePic, role, isActive, billingDay) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, email, hashedpassword, "", resolvedRole, 1, billingDay],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const savedUserRows = await query(
      "SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );
    const savedUser = savedUserRows[0] || {
      id: insertResult.insertId,
      name,
      email,
      role: resolvedRole,
      ProfilePic: "",
      isActive: 1,
      billingDay,
      createdAt: new Date(),
      updatedAt: new Date(),
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
        isActive: savedUser.isActive,
        billingDay: savedUser.billingDay,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
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
    const normalizedEmail = normalizeEmailForLogin(email);
    const ipAddress = req.ip;
    let duplicatedUser;
    try {
      const rows = await query(
        "SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
        [normalizedEmail],
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
      console.warn("[auth/login] account not found", { normalizedEmail });
      if (normalizedEmail === OTP_BYPASS_EMAIL) {
        const fallbackRows = await query(
          "SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt, updatedAt FROM users",
        );
        duplicatedUser = fallbackRows.find(
          (user) => normalizeEmailForLogin(user.email) === normalizedEmail,
        );

        console.log("[auth/login] bypass fallback result", {
          normalizedEmail,
          found: !!duplicatedUser,
          userId: duplicatedUser?.id || null,
        });
      }

      if (!duplicatedUser) {
        return res.status(400).json({
          message: "Account not found. Please sign up to create a new account.",
        });
      }
    }

    if (Number(duplicatedUser.isActive) === 0) {
      return res.status(403).json({
        message: await getInactiveAccountMessage(duplicatedUser.id),
      });
    }

    const hasedpassword = await bcrypt.compare(
      password,
      duplicatedUser.password,
    );

    if (!hasedpassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (normalizedEmail === OTP_BYPASS_EMAIL) {
      await query(
        "DELETE FROM login_otp_challenges WHERE user_id = ? AND verifiedAt IS NULL",
        [duplicatedUser.id],
      );

      const userForToken = {
        id: duplicatedUser.id,
        role: duplicatedUser.role,
      };
      const token = await generateToken(userForToken, res);

      try {
        await logActivity({
          action: "User Login",
          description: `User ${duplicatedUser.name} logged in.`,
          entity: "user",
          entityId: duplicatedUser.id,
          userId: duplicatedUser.id,
          ipAddress,
        });
      } catch (logError) {
        console.error("Login activity log failed:", logError.message);
      }

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: duplicatedUser.id,
          name: duplicatedUser.name,
          email: duplicatedUser.email,
          role: duplicatedUser.role,
          ProfilePic: duplicatedUser.ProfilePic,
          isActive: duplicatedUser.isActive,
          billingDay: duplicatedUser.billingDay,
          createdAt: duplicatedUser.createdAt,
          updatedAt: duplicatedUser.updatedAt,
          token,
        },
      });
    }

    const otpCode = generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
      "DELETE FROM login_otp_challenges WHERE user_id = ? AND verifiedAt IS NULL",
      [duplicatedUser.id],
    );

    const challengeResult = await query(
      "INSERT INTO login_otp_challenges (user_id, otp_hash, expiresAt) VALUES (?, ?, ?)",
      [duplicatedUser.id, otpHash, expiresAt],
    );

    try {
      await sendMail({
        to: duplicatedUser.email,
        subject: "Your login OTP",
        text: `Your login OTP is ${otpCode}. It expires in 1 minute.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="margin-bottom: 16px;">Login verification code</h2>
            <p>Use the following OTP to complete your login:</p>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0; color: #0f766e;">
              ${otpCode}
            </div>
            <p>This code expires in 1 minute. If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (mailError) {
      await query("DELETE FROM login_otp_challenges WHERE id = ?", [
        challengeResult.insertId,
      ]);
      throw mailError;
    }

    return res.status(200).json({
      message: "OTP sent to your email",
      otpRequired: true,
      challengeId: challengeResult.insertId,
      email: duplicatedUser.email,
      maskedEmail: maskEmail(duplicatedUser.email),
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error("Error in login to the page:", error.message);
    res.status(400).json({
      message: error.message || "Error in login to the page",
    });
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const rows = await query(
      "SELECT id, name, email FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );

    const user = rows[0];

    if (!user) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a reset code has been sent.",
        resetRequested: true,
      });
    }

    const challenge = await createPasswordResetChallenge(user.id);

    await sendMail({
      to: user.email,
      ...buildPasswordResetEmail({
        name: user.name,
        code: challenge.code,
        expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      }),
    });

    return res.status(200).json({
      message: "Password reset code sent to your email",
      resetRequested: true,
      challengeId: challenge.challengeId,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      expiresIn: challenge.expiresIn,
    });
  } catch (error) {
    console.error("Error in forgot password flow:", error.message);
    return res.status(500).json({
      message: "Unable to process password reset request",
    });
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    const { challengeId, otp, password } = req.body;

    if (!challengeId || !otp || !password) {
      return res.status(400).json({
        message: "Challenge ID, OTP, and new password are required",
      });
    }

    const rows = await query(
      `SELECT ch.id, ch.user_id, ch.otp_hash, ch.attempts, ch.expiresAt, ch.usedAt,
              u.id AS userId, u.name, u.email, u.role, u.isActive
       FROM password_reset_challenges ch
       INNER JOIN users u ON u.id = ch.user_id
       WHERE ch.id = ?
       LIMIT 1`,
      [challengeId],
    );

    const challenge = rows[0];

    if (!challenge) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (challenge.usedAt) {
      return res.status(400).json({ message: "Reset code already used" });
    }

    const now = new Date();
    const expiresAt = new Date(challenge.expiresAt);

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= now.getTime()
    ) {
      await query("DELETE FROM password_reset_challenges WHERE id = ?", [
        challengeId,
      ]);
      return res.status(400).json({
        message: "Reset code expired. Please request a new one.",
      });
    }

    const isValidOtp = await bcrypt.compare(
      String(otp).trim(),
      challenge.otp_hash,
    );

    if (!isValidOtp) {
      const nextAttempts = Number(challenge.attempts || 0) + 1;

      if (nextAttempts >= OTP_ATTEMPT_LIMIT) {
        await query("DELETE FROM password_reset_challenges WHERE id = ?", [
          challengeId,
        ]);
        return res.status(400).json({
          message: "Too many invalid attempts. Please request a new code.",
        });
      }

      await query(
        "UPDATE password_reset_challenges SET attempts = ? WHERE id = ?",
        [nextAttempts, challengeId],
      );

      return res.status(400).json({ message: "Invalid reset code" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      challenge.userId,
    ]);

    await query("DELETE FROM password_reset_challenges WHERE id = ?", [
      challengeId,
    ]);

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "", {
      maxAge: 0,
      httpOnly: true,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
      path: "/",
    });

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in reset password flow:", error.message);
    return res.status(500).json({
      message: "Unable to reset password",
    });
  }
};

module.exports.verifyLoginOtp = async (req, res) => {
  try {
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({
        message: "Challenge ID and OTP are required",
      });
    }

    const rows = await query(
      `SELECT ch.id, ch.user_id, ch.otp_hash, ch.attempts, ch.expiresAt, ch.verifiedAt,
              u.id AS userId, u.name, u.email, u.role, u.ProfilePic, u.isActive, u.billingDay, u.createdAt, u.updatedAt
       FROM login_otp_challenges ch
       INNER JOIN users u ON u.id = ch.user_id
       WHERE ch.id = ?
       LIMIT 1`,
      [challengeId],
    );

    const challenge = rows[0];

    if (!challenge) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (Number(challenge.isActive) === 0) {
      return res.status(403).json({
        message: await getInactiveAccountMessage(challenge.userId),
      });
    }

    if (challenge.verifiedAt) {
      return res.status(400).json({ message: "OTP already used" });
    }

    const now = new Date();
    const expiresAt = new Date(challenge.expiresAt);

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= now.getTime()
    ) {
      await query("DELETE FROM login_otp_challenges WHERE id = ?", [
        challengeId,
      ]);
      return res
        .status(400)
        .json({ message: "OTP expired. Please login again." });
    }

    const isValidOtp = await bcrypt.compare(
      String(otp).trim(),
      challenge.otp_hash,
    );

    if (!isValidOtp) {
      const nextAttempts = Number(challenge.attempts || 0) + 1;

      if (nextAttempts >= OTP_ATTEMPT_LIMIT) {
        await query("DELETE FROM login_otp_challenges WHERE id = ?", [
          challengeId,
        ]);
        return res.status(400).json({
          message: "Too many invalid attempts. Please login again.",
        });
      }

      await query("UPDATE login_otp_challenges SET attempts = ? WHERE id = ?", [
        nextAttempts,
        challengeId,
      ]);

      return res.status(400).json({ message: "Invalid OTP" });
    }

    await query("DELETE FROM login_otp_challenges WHERE id = ?", [challengeId]);

    const userForToken = {
      id: challenge.userId,
      role: challenge.role,
    };
    const token = await generateToken(userForToken, res);

    try {
      await logActivity({
        action: "User Login",
        description: `User ${challenge.name} logged in.`,
        entity: "user",
        entityId: challenge.userId,
        userId: challenge.userId,
        ipAddress: req.ip,
      });
    } catch (logError) {
      console.error("Login activity log failed:", logError.message);
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: challenge.userId,
        name: challenge.name,
        email: challenge.email,
        role: challenge.role,
        ProfilePic: challenge.ProfilePic,
        isActive: challenge.isActive,
        billingDay: challenge.billingDay,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
        token,
      },
    });
  } catch (error) {
    console.error("Error in OTP verification:", error.message);
    return res.status(400).json({
      message: error.message || "Error verifying OTP",
    });
  }
};

module.exports.logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "", {
      maxAge: 0,
      httpOnly: true,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
      path: "/",
    });
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
            "SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt, updatedAt FROM users WHERE id = ?",
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
        "SELECT id, name, email, role, ProfilePic, isActive, billingDay FROM users WHERE role = ?",
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
        "SELECT id, name, email, role, ProfilePic, isActive, billingDay FROM users WHERE role = ?",
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
        "SELECT id, name, email, role, ProfilePic, isActive, billingDay FROM users WHERE role = ?",
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

module.exports.superadminAdmins = async (req, res) => {
  try {
    const admins = await query(
      "SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt FROM users WHERE role = ? ORDER BY createdAt ASC",
      ["admin"],
    );

    return res.status(200).json(admins);
  } catch (error) {
    console.error("Error in super admin admin list:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    const rows = await query(
      "SELECT id, name, email, role, isActive, billingDay FROM users WHERE id = ? AND role = ? LIMIT 1",
      [id, "admin"],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    const nextStatus = Number(rows[0].isActive) === 1 ? 0 : 1;

    await query("UPDATE users SET isActive = ? WHERE id = ?", [nextStatus, id]);

    const updatedRows = await query(
      "SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt FROM users WHERE id = ? LIMIT 1",
      [id],
    );

    return res.status(200).json({
      message: `Admin ${nextStatus ? "activated" : "deactivated"} successfully`,
      admin: updatedRows[0],
    });
  } catch (error) {
    console.error("Error toggling admin status:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error });
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

module.exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const rows = await query(
      "SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching current user:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};
