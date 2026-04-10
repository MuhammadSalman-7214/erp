const query = require("../libs/dbQuery.js");

module.exports.createActivityLog = async (req, res) => {
  try {
    const { action, entity, entityId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!action || !entity || !entityId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required details.",
        });
    }

    let insertResult;
    try {
      insertResult = await query(
        "INSERT INTO activity_logs (action, userId, user_id, entity, entityId, ipAddress) VALUES (?, ?, ?, ?, ?, ?)",
        [action, userId, userId, entity, entityId, req.ip],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

    res
      .status(201)
      .json({
        success: true,
        message: "Activity log created successfully.",
        activity: {
          id: insertResult.insertId,
          action,
          userId,
          user_id: userId,
          entity,
          entityId,
          ipAddress: req.ip,
        },
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
    let logs;
    try {
      logs = await query(
        "SELECT * FROM activity_logs WHERE user_id = ? ORDER BY createdAt ASC",
        [userId],
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });
    }

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
