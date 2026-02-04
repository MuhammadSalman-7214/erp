const jwt = require("jsonwebtoken");

require("dotenv").config();

const generateToken = async (user, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "Secret key is not defined in the environment variables.",
      );
    }
    const payload = {
      userId: user._id,
      role: user.role,
    };
    if (user.countryId?._id) payload.countryId = user.countryId._id;
    if (user.countryId?.name) payload.countryName = user.countryId.name;
    if (user.countryId?.currency)
      payload.userCurrency = user.countryId.currency;
    if (user.countryId?.exchangeRate)
      payload.userCurrencyExchangeRate = user.countryId.exchangeRate;
    if (user.countryId?.currencySymbol)
      payload.usercurrencySymbol = user.countryId.currencySymbol;
    if (user.branchId?._id) payload.branchId = user.branchId._id;

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    return token;
  } catch (error) {
    console.error("Error generating token:", error.message);
    throw new Error("Failed to generate token");
  }
};

module.exports = generateToken;
