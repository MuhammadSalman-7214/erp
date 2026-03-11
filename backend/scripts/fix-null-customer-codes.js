const mongoose = require("mongoose");
const Customer = require("../models/Customermodel");

const run = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL is not set");
    }

    await mongoose.connect(process.env.MONGODB_URL);

    const unsetResult = await Customer.updateMany(
      { customerCode: null },
      { $unset: { customerCode: "" } },
    );
    const emptyResult = await Customer.updateMany(
      { customerCode: "" },
      { $unset: { customerCode: "" } },
    );

    console.log("Unset null customerCode:", unsetResult.modifiedCount || 0);
    console.log("Unset empty customerCode:", emptyResult.modifiedCount || 0);
  } catch (error) {
    console.error("Failed to normalize customer codes:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
