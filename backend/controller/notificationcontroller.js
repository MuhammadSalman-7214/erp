const Notification = require("../models/Notificationmodel.js");

module.exports.createNotification = async (req, res) => {
  try {
    const { name, type } = req.body;
    const userId = req.user.userId;
    if (!name || !type)
      return res
        .status(400)
        .json({ success: false, message: "Name and type required" });

    const notification = new Notification({ name, type, user_id: userId });
    await notification.save();

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
    const notifications = await Notification.find({ user_id: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

module.exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id: userId },
      { read: true },
      { new: true },
    );
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
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
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user_id: userId,
    });
    if (!notification)
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
