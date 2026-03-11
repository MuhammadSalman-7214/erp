const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLogmodel");
const {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
} = require("../middleware/Authmiddleware");

// 🔐 ADMIN → all logs
router.get("/", authmiddleware, adminmiddleware, async (req, res) => {
  const logs = await ActivityLog.find({ user_id: req.user.userId })
    .populate("userId", "-password")
    .sort({ createdAt: -1 });
  res.json(logs);
});

// 🔐 ADMIN + MANAGER → recent logs (dashboard)
router.get("/recent", authmiddleware, managermiddleware, async (req, res) => {
  const logs = await ActivityLog.find({ user_id: req.user.userId })
    .populate("userId", "-password")
    .sort({ createdAt: -1 })
    .limit(6);

  res.json(logs);
});

// 🔐 ANY USER → own logs
router.get("/me", authmiddleware, async (req, res) => {
  const logs = await ActivityLog.find({
    userId: req.user.userId,
    user_id: req.user.userId,
  })
    .populate("userId", "-password")
    .sort({ createdAt: -1 });

  res.json(logs);
});

// 🧠 INTERNAL LOG CREATION
router.post("/", authmiddleware, async (req, res) => {
  const io = req.app.get("io");

  const log = await ActivityLog.create({
    ...req.body,
    userId: req.user.userId,
    user_id: req.user.userId,
  });
  const populatedLog = await log.populate("userId", "-password");

  io.emit("newActivityLog", populatedLog);
  res.status(201).json(populatedLog);
});

// 🔐 ADMIN → delete log
router.delete("/:id", authmiddleware, adminmiddleware, async (req, res) => {
  await ActivityLog.findOneAndDelete({
    _id: req.params.id,
    user_id: req.user.userId,
  });
  res.json({ message: "Log deleted" });
});

module.exports = router;
