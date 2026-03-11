const ActivityLog = require("../models/ActivityLogmodel.js");

const logActivity = async ({
  action,
  entity,
  entityId,
  userId,
  ipAddress,
}) => {
  try {
  const newActivity = new ActivityLog({
    action,
    entity,
    entityId,
    userId,
    user_id: userId,
    ipAddress,
  });

    await newActivity.save();
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = logActivity;
