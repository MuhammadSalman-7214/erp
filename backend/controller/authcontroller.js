const query = require("../libs/dbQuery.js");
const bcrypt = require("bcryptjs");
const generateToken = require("../libs/Tokengenerator.js");
const Cloundinary = require("../libs/Cloundinary.js");
const logActivity = require("../libs/logger.js");
const { sendMail } = require("../libs/mailer.js");
const { isPaid } = require("../services/subscriptionService.js");
const { JOB_FUNCTION_TAGS } = require("../middleware/Authmiddleware.js");
const { ensureDefaultWarehouse } = require("../libs/warehouseAccess.js");

const OTP_EXPIRY_MINUTES = 1;
const OTP_ATTEMPT_LIMIT = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 5;
const OTP_BYPASS_EMAIL = process.env.TEST_USER;
const userSelectFields = `
  id, name, email, role, ProfilePic, isActive, billingDay, account_id, createdAt, updatedAt
`;
const TEAM_MEMBER_ROLES = ["staff", "manager"];
const defaultCompanyInfo = {
  companyName: "",
  companyDescription: "",
  companyLogo: "",
};

const mapUserResponse = (user, companyInfo = defaultCompanyInfo) => ({
  id: user.id || user.userId,
  name: user.name,
  email: user.email,
  role: user.role,
  ProfilePic: user.ProfilePic,
  companyName: companyInfo.companyName || "",
  companyDescription: companyInfo.companyDescription || "",
  companyLogo: companyInfo.companyLogo || "",
  isActive: user.isActive,
  billingDay: user.billingDay,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeCompanyInfo = (companyInfo) => ({
  companyName: companyInfo?.companyName || "",
  companyDescription: companyInfo?.companyDescription || "",
  companyLogo: companyInfo?.companyLogo || "",
});

// Company branding is a tenant-wide setting, not a personal one, so callers
// should pass the account/tenant id (accountId), not a specific login's own id.
const getCompanyInfoByAccountId = async (accountId) => {
  if (!accountId) {
    return { ...defaultCompanyInfo };
  }

  const rows = await query(
    `SELECT companyName, companyDescription, companyLogo
     FROM company_settings
     WHERE user_id = ?
     LIMIT 1`,
    [accountId],
  );

  return normalizeCompanyInfo(rows[0]);
};

const resolveAccountId = (user) => user?.account_id || user?.id;

// One batched query instead of N — attaches each user's assigned job
// function tags (if any) to the row, so the team-management screen can
// show them without a round trip per row.
const attachJobFunctions = async (users) => {
  const userIds = users.map((u) => u.id).filter(Boolean);
  if (!userIds.length) return users;

  const rows = await query(
    `SELECT staff_user_id, job_function FROM user_job_functions WHERE staff_user_id IN (${userIds.map(() => "?").join(", ")})`,
    userIds,
  );
  const byUser = new Map();
  rows.forEach((row) => {
    if (!byUser.has(row.staff_user_id)) byUser.set(row.staff_user_id, []);
    byUser.get(row.staff_user_id).push(row.job_function);
  });

  return users.map((u) => ({ ...u, jobFunctions: byUser.get(u.id) || [] }));
};

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
      // A public signup always starts a brand-new, self-owned business/tenant.
      await query("UPDATE users SET account_id = ? WHERE id = ?", [
        insertResult.insertId,
        insertResult.insertId,
      ]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    try {
      await query(
        "INSERT IGNORE INTO company_settings (user_id, companyName, companyDescription, companyLogo) VALUES (?, '', '', '')",
        [insertResult.insertId],
      );
      await ensureDefaultWarehouse(insertResult.insertId);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const savedUserRows = await query(
      `SELECT ${userSelectFields} FROM users WHERE id = ? LIMIT 1`,
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
    const companyInfo = await getCompanyInfoByAccountId(resolveAccountId(savedUser));
    const token = await generateToken(savedUser, res);

    res.status(201).json({
      message: "Signup successful",
      savedUser: {
        ...mapUserResponse(savedUser, companyInfo),
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

// Adds a staff/manager login under the CALLER's own tenant (account_id),
// unlike public signup which always starts a brand-new, empty business.
module.exports.createTeamMember = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const accountId = req.user.accountId;
    const callerRole = req.user.role;

    if (!TEAM_MEMBER_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Role must be one of: ${TEAM_MEMBER_ROLES.join(", ")}`,
      });
    }

    if (role === "manager" && !["admin", "super_admin"].includes(callerRole)) {
      return res.status(403).json({
        message: "Only an admin can add a manager to the team.",
      });
    }

    const normalizedEmail = normalizeEmailForLogin(email);

    const duplicatedUser = await query(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [normalizedEmail],
    );

    if (duplicatedUser.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedpassword = await bcrypt.hash(password, 10);
    const billingDay = new Date().getDate();

    const insertResult = await query(
      "INSERT INTO users (name, email, password, ProfilePic, role, isActive, billingDay, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, normalizedEmail, hashedpassword, "", role, 1, billingDay, accountId],
    );

    const savedUserRows = await query(
      `SELECT ${userSelectFields} FROM users WHERE id = ? LIMIT 1`,
      [insertResult.insertId],
    );
    const companyInfo = await getCompanyInfoByAccountId(accountId);

    res.status(201).json({
      message: "Team member added successfully",
      savedUser: mapUserResponse(savedUserRows[0], companyInfo),
    });

    await logActivity({
      action: "Team Member Added",
      description: `${callerRole} added ${role} "${name}" to the team.`,
      entity: "user",
      entityId: insertResult.insertId,
      userId: req.user.userId,
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error("Error creating team member:", error.message);
    res.status(400).json({
      message: "Error creating team member: " + error.message,
    });
  }
};

// Replaces a team member's full set of job function tags in one call — the
// UI sends whichever checkboxes are ticked, the server reconciles.
// Narrows what the member's role already allows; never grants beyond it.
module.exports.setJobFunctions = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { userId } = req.params;
    const jobFunctions = Array.isArray(req.body.jobFunctions)
      ? [...new Set(req.body.jobFunctions)]
      : [];

    const targetRows = await query(
      "SELECT id, role FROM users WHERE id = ? AND account_id = ? LIMIT 1",
      [userId, accountId],
    );
    const target = targetRows[0];
    if (!target) {
      return res.status(404).json({ message: "Team member not found in your business" });
    }
    if (["admin", "super_admin"].includes(target.role)) {
      return res.status(400).json({
        message: "Job functions don't apply to admin accounts — they already have full access.",
      });
    }

    const invalid = jobFunctions.filter((fn) => !JOB_FUNCTION_TAGS.includes(fn));
    if (invalid.length) {
      return res.status(400).json({
        message: `Unknown job function(s): ${invalid.join(", ")}. Valid values: ${JOB_FUNCTION_TAGS.join(", ")}`,
      });
    }

    await query("DELETE FROM user_job_functions WHERE staff_user_id = ?", [userId]);
    if (jobFunctions.length) {
      const values = jobFunctions.map((fn) => [accountId, userId, fn]);
      await query(
        "INSERT INTO user_job_functions (user_id, staff_user_id, job_function) VALUES ?",
        [values],
      );
    }

    await logActivity({
      action: "Update Job Functions",
      description: `Job functions for user #${userId} set to: ${jobFunctions.join(", ") || "none"}.`,
      entity: "user",
      entityId: Number(userId),
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, jobFunctions });
  } catch (error) {
    console.error("Error updating job functions:", error.message);
    res.status(500).json({ message: "Error updating job functions", error: error.message });
  }
};

// Who a team member reports to — used for "my team" visibility scoping,
// not for permissions (a manager doesn't gain capability just because
// people report to them; that's still governed by role + job function).
module.exports.setReportsTo = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { userId } = req.params;
    const { managerId } = req.body;

    const targetRows = await query(
      "SELECT id FROM users WHERE id = ? AND account_id = ? LIMIT 1",
      [userId, accountId],
    );
    if (!targetRows.length) {
      return res.status(404).json({ message: "Team member not found in your business" });
    }

    if (managerId) {
      if (Number(managerId) === Number(userId)) {
        return res.status(400).json({ message: "A team member cannot report to themselves" });
      }
      const managerRows = await query(
        "SELECT id, role FROM users WHERE id = ? AND account_id = ? LIMIT 1",
        [managerId, accountId],
      );
      if (!managerRows.length) {
        return res.status(404).json({ message: "Manager not found in your business" });
      }
      if (!["admin", "manager", "super_admin"].includes(managerRows[0].role)) {
        return res.status(400).json({
          message: "A team member can only report to an admin or manager",
        });
      }
    }

    await query("UPDATE users SET reports_to_user_id = ? WHERE id = ? AND account_id = ?", [
      managerId || null,
      userId,
      accountId,
    ]);

    res.status(200).json({ success: true, userId: Number(userId), managerId: managerId || null });
  } catch (error) {
    console.error("Error updating reporting manager:", error.message);
    res.status(500).json({ message: "Error updating reporting manager", error: error.message });
  }
};

// A manager's/supervisor's direct reports within their own tenant — for
// scoping "my team" views (e.g. a filtered activity log) without exposing
// the whole business's team to every manager.
module.exports.getMyTeam = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const rows = await query(
      "SELECT id, name, email, role, isActive FROM users WHERE reports_to_user_id = ? AND account_id = ?",
      [req.user.userId, accountId],
    );
    res.status(200).json({ success: true, team: await attachJobFunctions(rows) });
  } catch (error) {
    res.status(500).json({ message: "Error fetching team", error: error.message });
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

      const companyInfo = await getCompanyInfoByAccountId(
        resolveAccountId(duplicatedUser),
      );

      return res.status(200).json({
        message: "Login successful",
        user: {
          ...mapUserResponse(duplicatedUser, companyInfo),
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
              u.id AS userId, u.name, u.email, u.role, u.ProfilePic, u.isActive, u.billingDay, u.account_id, u.createdAt, u.updatedAt
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

    const companyInfo = await getCompanyInfoByAccountId(
      challenge.account_id || challenge.userId,
    );

    return res.status(200).json({
      message: "Login successful",
      user: {
        ...mapUserResponse(challenge, companyInfo),
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
            `SELECT ${userSelectFields} FROM users WHERE id = ?`,
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

        const companyInfo = await getCompanyInfoByAccountId(req.user.accountId);

        return res.status(200).json({
          message: "Profile updated successfully",
          updatedUser: mapUserResponse(updatedUser, companyInfo),
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

module.exports.updateCompanyInfo = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const accountId = req.user?.accountId;
    const { companyName, companyDescription, companyLogo } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const rows = await query(
      `SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt, updatedAt
       FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );
    const currentUser = rows[0];

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Company branding is shared by the whole tenant, so it's keyed by
    // accountId — a staff/manager updating it changes what their admin
    // (and every teammate) sees too, not a private copy of their own.
    const currentCompanyInfo = await getCompanyInfoByAccountId(accountId);
    const resolvedName =
      typeof companyName === "string"
        ? companyName.trim()
        : currentCompanyInfo.companyName || "";
    const resolvedDescription =
      typeof companyDescription === "string"
        ? companyDescription.trim()
        : currentCompanyInfo.companyDescription || "";

    let resolvedLogo = currentCompanyInfo.companyLogo || "";
    const trimmedLogo = String(companyLogo ?? "").trim();

    if (trimmedLogo) {
      if (trimmedLogo.startsWith("data:")) {
        const uploadResponse = await Cloundinary.uploader.upload(trimmedLogo, {
          folder: "company_logos",
          upload_preset: "upload",
        });

        resolvedLogo = uploadResponse.secure_url;
      } else {
        resolvedLogo = trimmedLogo;
      }
    } else if (companyLogo === "") {
      resolvedLogo = "";
    }

    await query(
      `INSERT INTO company_settings (user_id, companyName, companyDescription, companyLogo)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         companyName = VALUES(companyName),
         companyDescription = VALUES(companyDescription),
         companyLogo = VALUES(companyLogo),
         updatedAt = CURRENT_TIMESTAMP`,
      [accountId, resolvedName, resolvedDescription, resolvedLogo],
    );

    const updatedCompanyInfo = await getCompanyInfoByAccountId(accountId);

    return res.status(200).json({
      message: "Company info updated successfully",
      updatedUser: mapUserResponse(currentUser, updatedCompanyInfo),
    });
  } catch (error) {
    console.error("Error in update company info controller:", error.message);
    return res.status(500).json({
      message: "Failed to update company info",
      error: error.message,
    });
  }
};

module.exports.staffuser = async (req, res) => {
  try {
    let staffuser;
    try {
      staffuser = await query(
        "SELECT id, name, email, role, ProfilePic, isActive, billingDay, reports_to_user_id FROM users WHERE role = ? AND account_id = ?",
        ["staff", req.user.accountId],
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

    res.status(200).json(await attachJobFunctions(staffuser));
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
        "SELECT id, name, email, role, ProfilePic, isActive, billingDay, reports_to_user_id FROM users WHERE role = ? AND account_id = ?",
        ["manager", req.user.accountId],
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

    res.status(200).json(await attachJobFunctions(manageruser));
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
        "SELECT id, name, email, role, ProfilePic, isActive, billingDay FROM users WHERE role = ? AND account_id = ?",
        ["admin", req.user.accountId],
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
      `SELECT id, name, email, role, ProfilePic, isActive, billingDay, createdAt, updatedAt
       FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const companyInfo = await getCompanyInfoByAccountId(req.user.accountId);

    return res.status(200).json({
      user: {
        ...mapUserResponse(user, companyInfo),
        // Lets the frontend gate nav items/actions by job function, same
        // narrowing the backend already enforces — not a new access grant.
        jobFunctions: req.user.jobFunctions || [],
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};
