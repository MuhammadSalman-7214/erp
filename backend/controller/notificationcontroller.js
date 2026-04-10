const query = require("../libs/dbQuery.js");

module.exports.createNotification = async (req, res) => {
  try {
    const { name, type } = req.body;
    const userId = req.user.userId;
    if (!name || !type)
      return res
        .status(400)
        .json({ success: false, message: "Name and type required" });

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO notifications (name, type, user_id, `read`) VALUES (?, ?, ?, ?)",
        [name, type, userId, false],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    const notification = {
      id: insertResult.insertId,
      name,
      type,
      user_id: userId,
      read: false,
    };

    const io = req.app.get("io");
    io.emit("newNotification", notification);

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error creating notification", error });
  }
};

module.exports.getAllNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    let notifications;
    try {
      notifications = await query(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY createdAt ASC",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

module.exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    let updateResult;
    try {
      updateResult = await query(
        "UPDATE notifications SET `read` = ? WHERE id = ? AND user_id = ?",
        [true, id, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (updateResult.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    let notification;
    try {
      const rows = await query(
        "SELECT * FROM notifications WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId],
      );
      notification = rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    res.status(200).json({ success: true, notification });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error marking notification as read",
        error,
      });
  }
};

module.exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    let deleteResult;
    try {
      deleteResult = await query(
        "DELETE FROM notifications WHERE id = ? AND user_id = ?",
        [id, userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }
    if (deleteResult.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    res.status(200).json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting notification", error });
  }
};
