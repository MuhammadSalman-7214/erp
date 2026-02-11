const Counter = require("../models/Countermodel");

const padSequence = (seq) => String(seq).padStart(5, "0");

const getNextInvoiceNumber = async (prefix) => {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return `${prefix}-${year}-${padSequence(counter.seq)}`;
};

module.exports = { getNextInvoiceNumber };
