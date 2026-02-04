const Notification = require("../models/Notificationmodel.js");

module.exports.createNotification = async (req, res) => {
  try {
    const { name, type } = req.body;
    const { role, countryId, branchId, userId } = req.user || {};
    if (!name || !type)
      return res
        .status(400)
        .json({ success: false, message: "Name and type required" });

    const notification = new Notification({
      name,
      type,
      countryId: role === "superadmin" ? null : countryId,
      branchId:
        ["branchadmin", "staff", "agent"].includes(role) ? branchId : null,
      createdBy: userId || null,
    });
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
    const { role, countryId, branchId } = req.user || {};
    let query = {};
    if (role === "countryadmin") {
      query = {
        $or: [{ countryId }, { countryId: null }],
      };
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      query = {
        $and: [
          { $or: [{ countryId }, { countryId: null }] },
          { $or: [{ branchId }, { branchId: null }] },
        ],
      };
    }

    const notifications = await Notification.find(query).sort({
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
    const { role, countryId, branchId } = req.user || {};
    const existingNotification = await Notification.findById(id);
    if (!existingNotification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    if (
      role === "countryadmin" &&
      existingNotification.countryId &&
      existingNotification.countryId.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      existingNotification.branchId &&
      existingNotification.branchId.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true },
    );
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
    const { role, countryId, branchId } = req.user || {};
    const notification = await Notification.findById(id);
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    if (
      role === "countryadmin" &&
      notification.countryId &&
      notification.countryId.toString() !== countryId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (
      ["branchadmin", "staff", "agent"].includes(role) &&
      notification.branchId &&
      notification.branchId.toString() !== branchId?.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    await Notification.findByIdAndDelete(id);
    res.status(200).json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting notification", error });
  }
};
