const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  adminmiddleware,
} = require("../middleware/Authmiddleware.js");

const {
  createNotification,
  getAllNotifications,
  markAsRead,
  deleteNotification,
} = require("../controller/NotificationController.js");

// GET notifications - All authenticated users
router.get("/", authmiddleware, getAllNotifications);

// POST notification - Admin only
router.post("/", authmiddleware, adminmiddleware, createNotification);

// Mark as read - All authenticated users
router.put("/:id/read", authmiddleware, markAsRead);

// DELETE notification - Admin only
router.delete("/:id", authmiddleware, adminmiddleware, deleteNotification);

module.exports = router;
