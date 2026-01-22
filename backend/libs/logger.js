const ActivityLog = require("../models/ActivityLogmodel.js");

const logActivity = async ({
  action,
  description,
  entity,
  entityId,
  userId,
  ipAddress,
}) => {
  try {
    const newActivity = new ActivityLog({
      action,
      description,
      entity,
      entityId,
      userId,
      ipAddress,
    });

    await newActivity.save();
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = logActivity;
