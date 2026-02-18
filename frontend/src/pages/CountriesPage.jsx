// pages/CountriesPage.jsx - NEW

import React, { useState, useEffect } from "react";
import { countryAPI } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, DollarSign, Globe, X } from "lucide-react";
import NoData from "../Components/NoData";

const CountriesPage = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCountry, setCurrentCountry] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    currency: "",
    currencySymbol: "",
    exchangeRate: 1,
    settings: {
      fiscalYearStart: "01-01",
      timezone: "",
      language: "en",
    },
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const response = await countryAPI.getAll();
      setCountries(response.data);
    } catch (error) {
      toast.error("Failed to fetch countries");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editMode && currentCountry) {
        await countryAPI.update(currentCountry._id, formData);
        toast.success("Country updated successfully");
      } else {
        await countryAPI.create(formData);
        toast.success("Country created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchCountries();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
      console.error(error);
    }
  };

  const handleEdit = (country) => {
    setCurrentCountry(country);
    setFormData({
      name: country.name,
      code: country.code,
      currency: country.currency,
      currencySymbol: country.currencySymbol,
      exchangeRate: country.exchangeRate,
      settings: country.settings,
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (countryId) => {
    if (!window.confirm("Are you sure you want to deactivate this country?")) {
      return;
    }

    try {
      await countryAPI.delete(countryId);
      toast.success("Country deactivated successfully");
      fetchCountries();
    } catch (error) {
      toast.error("Failed to deactivate country");
      console.error(error);
    }
  };

  const handleUpdateExchangeRate = async (countryId, currentRate) => {
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
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      currency: "",
      currencySymbol: "",
      exchangeRate: 1,
      settings: {
        fiscalYearStart: "01-01",
        timezone: "",
        language: "en",
      },
    });
    setEditMode(false);
    setCurrentCountry(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Countries Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage countries and exchange rates
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-5 h-5" />
          <span>Add Country</span>
        </button>
      </div>

      {/* Countries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {countries.map((country) => (
          <div
            key={country._id}
            className="app-info-card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <Globe className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {country.name}
                  </h3>
                  <p className="text-sm text-gray-500">{country.code}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Currency:</span>
                <span className="text-sm font-medium text-gray-900">
                  {country.currency} ({country.currencySymbol})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Exchange Rate:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    1 USD = {country.exchangeRate} {country.currency}
                  </span>
                  <button
                    onClick={() =>
                      handleUpdateExchangeRate(
                        country._id,
                        country.exchangeRate,
                      )
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {country.countryAdminId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Admin:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {country.countryAdminId.name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    country.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {country.isActive ? "Active" : "Inactive"}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(country)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(country._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {countries.length === 0 && (
        <div className="text-center pt-8">
          <NoData
            title="No countries found"
            description="Create your first country to get started"
            icon={Globe}
          />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="app-modal-overlay"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          />
          <div className="app-modal-drawer app-modal-drawer-md">
            <div className="app-modal-header">
              <h2 className="app-modal-title">
                {editMode ? "Edit Country" : "Add New Country"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="app-modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country Code (ISO)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  maxLength={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., PKR, AED"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) =>
                    setFormData({ ...formData, currencySymbol: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Rs, د.إ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange Rate to USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exchangeRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      exchangeRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 USD = {formData.exchangeRate} {formData.currency}
                </p>
              </div>

              <div className="app-modal-footer -mx-5 -mb-4 mt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  {editMode ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default CountriesPage;
