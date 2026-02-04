const ActivityLog = require("../models/ActivityLogmodel.js");
const User = require("../models/Usermodel.js");

const logActivity = async ({
  action,
  description,
  entity,
  entityId,
  userId,
  ipAddress,
  countryId,
  branchId,
}) => {
  try {
    let resolvedCountryId = countryId || null;
    let resolvedBranchId = branchId || null;
    if (!resolvedCountryId && !resolvedBranchId && userId) {
      const user = await User.findById(userId).select("countryId branchId");
      resolvedCountryId = user?.countryId || null;
      resolvedBranchId = user?.branchId || null;
    }
    const newActivity = new ActivityLog({
      action,
      description,
      entity,
      entityId,
      userId,
      ipAddress,
      countryId: resolvedCountryId,
      branchId: resolvedBranchId,
    });

    await newActivity.save();
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = logActivity;
