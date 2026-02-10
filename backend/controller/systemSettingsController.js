const SystemSettings = require("../models/SystemSettingsmodel.js");
const logActivity = require("../libs/logger.js");

const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.findOne();
    res.status(200).json(settings || {});
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching system settings", error: error.message });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const { globalAccountingLockUntil, numbering, taxLogic } = req.body;
    const updates = {};
    if (globalAccountingLockUntil !== undefined) {
      updates.globalAccountingLockUntil = globalAccountingLockUntil;
    }
    if (numbering !== undefined) {
      updates.numbering = numbering;
    }
    if (taxLogic !== undefined) {
      updates.taxLogic = taxLogic;
    }

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { $set: { ...updates, updatedBy: req.user.userId } },
      { new: true, upsert: true },
    );

    await logActivity({
      action: "System Settings Updated",
      description: "System settings updated",
      entity: "systemSettings",
      entityId: settings._id,
      userId: req.user.userId,
      ipAddress: req.ip,
    });

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({
      message: "Error updating system settings",
      error: error.message,
    });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
};
