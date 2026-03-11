const ActivityLog = require("../models/ActivityLogmodel.js");

module.exports.createActivityLog = async (req, res) => {
  try {
    const { action, description, entity, entityId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!action || !description || !entity || !entityId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required details.",
        });
    }

    const newActivity = new ActivityLog({
      action,
      description,
      userId: userId,
      user_id: userId,
      entity,
      entityId,
      ipAddress: req.ip,
    });

    await newActivity.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Activity log created successfully.",
        activity: newActivity,
      });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error creating activity log.", error });
  }
};

module.exports.getAllActivityLogs = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const logs = await ActivityLog.find({ user_id: userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, logs });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching activity logs.",
        error,
      });
  }
};
