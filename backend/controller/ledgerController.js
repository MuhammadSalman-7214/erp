const LedgerEntry = require("../models/LedgerEntrymodel.js");

module.exports.getLedgerByParty = async (req, res) => {
  try {
    const { partyType, partyId } = req.params;
    const { role, countryId, branchId } = req.user || {};

    if (!["customer", "supplier"].includes(partyType)) {
      return res.status(400).json({ message: "Invalid party type" });
    }

    const query = { partyType, partyId };
    if (role === "countryadmin") {
      query.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      query.countryId = countryId;
      query.branchId = branchId;
    }

    const entries = await LedgerEntry.find(query).sort({ createdAt: 1 });
    let runningBalance = 0;
    const rows = entries.map((e) => {
      runningBalance += (e.debit || 0) - (e.credit || 0);
      return {
        ...e.toObject(),
        runningBalance,
      };
    });

    res.status(200).json({ success: true, entries: rows, balance: runningBalance });
  } catch (error) {
    res.status(500).json({ message: "Error fetching ledger", error: error.message });
  }
};

module.exports.getOutstandingByParty = async (req, res) => {
  try {
    const { partyType } = req.params;
    const { role, countryId, branchId } = req.user || {};

    if (!["customer", "supplier"].includes(partyType)) {
      return res.status(400).json({ message: "Invalid party type" });
    }

    const match = { partyType };
    if (role === "countryadmin") {
      match.countryId = countryId;
    } else if (["branchadmin", "staff", "agent"].includes(role)) {
      match.countryId = countryId;
      match.branchId = branchId;
    }

    const data = await LedgerEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$partyId",
          totalDebit: { $sum: { $ifNull: ["$debit", 0] } },
          totalCredit: { $sum: { $ifNull: ["$credit", 0] } },
        },
      },
      {
        $project: {
          partyId: "$_id",
          outstanding: { $subtract: ["$totalDebit", "$totalCredit"] },
        },
      },
      { $sort: { outstanding: -1 } },
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching outstanding data", error: error.message });
  }
};
