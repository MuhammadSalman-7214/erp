// libs/currencyConverter.js - NEW

const Country = require("../models/Countrymodel.js");

/**
 * Convert amount from local currency to USD
 * @param {Number} amount - Amount in local currency
 * @param {ObjectId} countryId - Country ID
 * @returns {Object} - {amountUSD, exchangeRate}
 */
exports.convertToUSD = async (amount, countryId) => {
  try {
    const country = await Country.findById(countryId);
    if (!country) {
      throw new Error("Country not found");
    }

    const amountUSD = amount / country.exchangeRate;

    return {
      amountUSD: parseFloat(amountUSD.toFixed(2)),
      exchangeRate: country.exchangeRate,
      currency: country.currency,
    };
  } catch (error) {
    console.error("Currency conversion error:", error);
    throw error;
  }
};

/**
 * Convert amount from USD to local currency
 * @param {Number} amountUSD - Amount in USD
 * @param {ObjectId} countryId - Country ID
 * @returns {Object} - {amount, exchangeRate, currency}
 */
exports.convertFromUSD = async (amountUSD, countryId) => {
  try {
    const country = await Country.findById(countryId);
    if (!country) {
      throw new Error("Country not found");
    }

    const amount = amountUSD * country.exchangeRate;

    return {
      amount: parseFloat(amount.toFixed(2)),
      exchangeRate: country.exchangeRate,
      currency: country.currency,
    };
  } catch (error) {
    console.error("Currency conversion error:", error);
    throw error;
  }
};

/**
 * Middleware to auto-convert currency on create/update
 * Use this in your product, sales, order controllers
 */
exports.currencyMiddleware = async (req, res, next) => {
  try {
    const { branchId, countryId, price, amount } = req.body;

    if (countryId && (price || amount)) {
      const valueToConvert = price || amount;
      const converted = await exports.convertToUSD(valueToConvert, countryId);

      req.convertedData = {
        priceUSD: converted.amountUSD,
        amountUSD: converted.amountUSD,
        exchangeRateUsed: converted.exchangeRate,
        currency: converted.currency,
      };
    }

    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Currency conversion failed", error: error.message });
  }
};
