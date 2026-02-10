const Branch = require("../models/Branchmodel.js");
const Country = require("../models/Countrymodel.js");
const SystemSettings = require("../models/SystemSettingsmodel.js");

const getEffectiveLockDate = async ({ countryId, branchId }) => {
  const [globalSettings, country, branch] = await Promise.all([
    SystemSettings.findOne().select("globalAccountingLockUntil"),
    Country.findById(countryId).select("accountingLockUntil"),
    Branch.findById(branchId).select("accountingLockUntil"),
  ]);

  const dates = [
    globalSettings?.globalAccountingLockUntil || null,
    country?.accountingLockUntil || null,
    branch?.accountingLockUntil || null,
  ].filter(Boolean);

  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
};

const assertNotLocked = async ({ countryId, branchId, transactionDate }) => {
  const lockDate = await getEffectiveLockDate({ countryId, branchId });
  if (!lockDate) return;
  const txDate = transactionDate ? new Date(transactionDate) : new Date();
  if (txDate <= lockDate) {
    const error = new Error(
      "Accounting period is locked for this branch/country/global scope",
    );
    error.code = "ACCOUNTING_LOCKED";
    throw error;
  }
};

module.exports = { getEffectiveLockDate, assertNotLocked };
