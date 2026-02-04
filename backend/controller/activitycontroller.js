const ActivityLog = require("../models/ActivityLogmodel.js");

module.exports.createActivityLog = async (req, res) => {
  try {
    const { action, description, entity, entityId, userId } = req.body;
    const { countryId, branchId } = req.user || {};

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
      userId,
      entity,
      entityId,
      ipAddress: req.ip,
      countryId: countryId || null,
      branchId: branchId || null,
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
    const { role, countryId, branchId } = req.user || {};
    const query = {};
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      query.countryId = countryId;
      query.branchId = branchId;
    }

    const logs = await ActivityLog.find(query).sort({ createdAt: -1 });

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
