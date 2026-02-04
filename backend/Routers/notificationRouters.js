const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

const {
  createNotification,
  getAllNotifications,
  markAsRead,
  deleteNotification,
} = require("../controller/notificationcontroller.js");

// GET notifications - All authenticated users
router.get(
  "/",
  authmiddleware,
  checkPermission("notification", "read"),
  getAllNotifications,
);

// POST notification - Admin only
router.post(
  "/",
  authmiddleware,
  checkPermission("notification", "write"),
  createNotification,
);

// Mark as read - All authenticated users
router.put(
  "/:id/read",
  authmiddleware,
  checkPermission("notification", "read"),
  markAsRead,
);

// DELETE notification - Admin only
router.delete(
  "/:id",
  authmiddleware,
  checkPermission("notification", "delete"),
  deleteNotification,
);

module.exports = router;
