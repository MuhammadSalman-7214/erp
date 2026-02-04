// src/pages/ExchangeRatesPage.jsx - NEW

import React, { useState, useEffect } from "react";
import { countryAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdEdit } from "react-icons/md";

const ExchangeRatesPage = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await countryAPI.getAll();
      setCountries(response.data);
    } catch (error) {
      toast.error("Failed to fetch countries");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async (countryId, currentRate) => {
    const newRate = prompt(
      `Enter new exchange rate (current: ${currentRate}):`,
    );

    if (!newRate || isNaN(newRate)) {
      toast.error("Invalid exchange rate");
      return;
    }

    try {
      await countryAPI.updateExchangeRate(countryId, parseFloat(newRate));
      toast.success("Exchange rate updated successfully");
      fetchCountries();
    } catch (error) {
      toast.error("Failed to update exchange rate");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exchange Rates Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Currency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Exchange Rate (to USD)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {countries.map((country) => (
              <tr key={country._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {country.name} ({country.code})
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {country.currency} ({country.currencySymbol})
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  1 USD = {country.exchangeRate} {country.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      handleUpdateRate(country._id, country.exchangeRate)
                    }
                    className="p-2 rounded-xl bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                  >
                    <MdEdit size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExchangeRatesPage;
