const express = require("express");
const router = express.Router();
const query = require("../libs/dbQuery.js");
const {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
} = require("../middleware/Authmiddleware");

// 🔐 ADMIN → all logs
router.get("/", authmiddleware, adminmiddleware, async (req, res) => {
  try {
    const logs = await query(
      "SELECT al.*, u.id AS userId_id, u.name AS userId_name, u.email AS userId_email, u.role AS userId_role, u.ProfilePic AS userId_ProfilePic FROM activity_logs al LEFT JOIN users u ON u.id = al.userId WHERE al.user_id = ? ORDER BY al.createdAt ASC",
      [req.user.userId],
    );
    const formatted = logs.map((log) => ({
      ...log,
      userId: log.userId_id
        ? {
            id: log.userId_id,
            name: log.userId_name,
            email: log.userId_email,
            role: log.userId_role,
            ProfilePic: log.userId_ProfilePic,
          }
        : null,
    }));
    res.json(formatted);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err,
    });
  }
});

// 🔐 ADMIN + MANAGER → recent logs (dashboard)
router.get("/recent", authmiddleware, managermiddleware, async (req, res) => {
  try {
    const logs = await query(
      "SELECT al.*, u.id AS userId_id, u.name AS userId_name, u.email AS userId_email, u.role AS userId_role, u.ProfilePic AS userId_ProfilePic FROM activity_logs al LEFT JOIN users u ON u.id = al.userId WHERE al.user_id = ? ORDER BY al.createdAt DESC LIMIT 6",
      [req.user.userId],
    );
    const formatted = logs.map((log) => ({
      ...log,
      userId: log.userId_id
        ? {
            id: log.userId_id,
            name: log.userId_name,
            email: log.userId_email,
            role: log.userId_role,
            ProfilePic: log.userId_ProfilePic,
          }
        : null,
    }));
    res.json(formatted);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err,
    });
  }
});

// 🔐 ANY USER → own logs
router.get("/me", authmiddleware, async (req, res) => {
  try {
    const logs = await query(
      "SELECT al.*, u.id AS userId_id, u.name AS userId_name, u.email AS userId_email, u.role AS userId_role, u.ProfilePic AS userId_ProfilePic FROM activity_logs al LEFT JOIN users u ON u.id = al.userId WHERE al.userId = ? AND al.user_id = ? ORDER BY al.createdAt ASC",
      [req.user.userId, req.user.userId],
    );
    const formatted = logs.map((log) => ({
      ...log,
      userId: log.userId_id
        ? {
            id: log.userId_id,
            name: log.userId_name,
            email: log.userId_email,
            role: log.userId_role,
            ProfilePic: log.userId_ProfilePic,
          }
        : null,
    }));
    res.json(formatted);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err,
    });
  }
});

// 🧠 INTERNAL LOG CREATION
router.post("/", authmiddleware, async (req, res) => {
  const io = req.app.get("io");

  try {
    const { action, entity, entityId, ipAddress } = req.body;
    const insertResult = await query(
      "INSERT INTO activity_logs (action, entity, entityId, userId, user_id, ipAddress) VALUES (?, ?, ?, ?, ?, ?)",
      [
        action,
        entity,
        entityId,
        req.user.userId,
        req.user.userId,
        ipAddress || req.ip,
      ],
    );
    const rows = await query(
      "SELECT al.*, u.id AS userId_id, u.name AS userId_name, u.email AS userId_email, u.role AS userId_role, u.ProfilePic AS userId_ProfilePic FROM activity_logs al LEFT JOIN users u ON u.id = al.userId WHERE al.id = ?",
      [insertResult.insertId],
    );
    const log = rows[0] || null;
    const populatedLog = log
      ? {
          ...log,
          userId: log.userId_id
            ? {
                id: log.userId_id,
                name: log.userId_name,
                email: log.userId_email,
                role: log.userId_role,
                ProfilePic: log.userId_ProfilePic,
              }
            : null,
        }
      : null;

    io.emit("newActivityLog", populatedLog);
    res.status(201).json(populatedLog);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err,
    });
  }
});

// 🔐 ADMIN → delete log
router.delete("/:id", authmiddleware, adminmiddleware, async (req, res) => {
  try {
    await query("DELETE FROM activity_logs WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.userId,
    ]);
    res.json({ message: "Log deleted" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err,
    });
  }
});

module.exports = router;
