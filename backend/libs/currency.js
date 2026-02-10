const Country = require("../models/Countrymodel.js");

const getCountryCurrencySnapshot = async (countryId) => {
  const country = await Country.findById(countryId).select(
    "currency exchangeRate currencySymbol",
  );
  if (!country) {
    throw new Error("Country not found for currency snapshot");
  }
  return {
    currency: country.currency,
    exchangeRate: country.exchangeRate,
    currencySymbol: country.currencySymbol,
  };
};

module.exports = { getCountryCurrencySnapshot };
