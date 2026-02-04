const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLogmodel");
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");

// 🔐 ADMIN → all logs
router.get("/", authmiddleware, checkPermission("activityLog", "read"), async (req, res) => {
  const { role, countryId, branchId } = req.user;
  const query = {};
  if (role === "countryadmin") {
    query.countryId = countryId;
  } else if (["branchadmin", "staff", "agent"].includes(role)) {
    query.branchId = branchId;
    query.countryId = countryId;
  }

  const logs = await ActivityLog.find(query)
    .populate("userId", "-password")
    .sort({ createdAt: -1 });
  res.json(logs);
});

// 🔐 RECENT logs (dashboard)
router.get("/recent", authmiddleware, checkPermission("activityLog", "read"), async (req, res) => {
  const { role, countryId, branchId } = req.user;
  const query = {};
  if (role === "countryadmin") {
    query.countryId = countryId;
  } else if (["branchadmin", "staff", "agent"].includes(role)) {
    query.branchId = branchId;
    query.countryId = countryId;
  }

  const logs = await ActivityLog.find(query)
    .populate("userId", "-password")
    .sort({ createdAt: -1 })
    .limit(6);

  res.json(logs);
});

// 🔐 ANY USER → own logs
router.get("/me", authmiddleware, async (req, res) => {
  const logs = await ActivityLog.find({ userId: req.user.userId })
    .populate("userId", "-password")
    .sort({ createdAt: -1 });

  res.json(logs);
});

// 🧠 INTERNAL LOG CREATION
router.post("/", authmiddleware, checkPermission("activityLog", "write"), async (req, res) => {
  const io = req.app.get("io");

  const log = await ActivityLog.create(req.body);
  const populatedLog = await log.populate("userId", "-password");

  io.emit("newActivityLog", populatedLog);
  res.status(201).json(populatedLog);
});

// 🔐 ADMIN → delete log
router.delete("/:id", authmiddleware, checkPermission("activityLog", "delete"), async (req, res) => {
  await ActivityLog.findByIdAndDelete(req.params.id);
  res.json({ message: "Log deleted" });
});

module.exports = router;
