// pages/BranchesPage.jsx - NEW

import React, { useState, useEffect } from "react";
import { branchAPI, countryAPI } from "../services/api";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Building2, MapPin, X } from "lucide-react";
import NoData from "../Components/NoData";

const BranchesPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [branches, setBranches] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    branchCode: "",
    countryId: "",
    city: "",
    address: {
      street: "",
      area: "",
      postalCode: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    fetchCountries();
    fetchBranches();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await countryAPI.getAll();

      setCountries(response.data);

      // Auto-select country for country admin
      if (user.role === "countryadmin" && user.countryId) {
        setSelectedCountry(user.countryId._id || user.countryId);
        setFormData((prev) => ({
          ...prev,
          countryId: user.countryId._id || user.countryId,
        }));
      }
    } catch (error) {
      toast.error("Failed to fetch countries");
      console.error(error);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await branchAPI.getAll();
      setBranches(response.data);
    } catch (error) {
      toast.error("Failed to fetch branches");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editMode && currentBranch) {
        await branchAPI.update(currentBranch._id, formData);
        toast.success("Branch updated successfully");
      } else {
        await branchAPI.create(formData);
        toast.success("Branch created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
      console.error(error);
    }
  };

  const handleEdit = (branch) => {
    setCurrentBranch(branch);
    setFormData({
      name: branch.name,
      branchCode: branch.branchCode,
      countryId: branch.countryId._id || branch.countryId,
      city: branch.city,
      address: branch.address,
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm("Are you sure you want to deactivate this branch?")) {
      return;
    }

    try {
      await branchAPI.delete(branchId);
      toast.success("Branch deactivated successfully");
      fetchBranches();
    } catch (error) {
      toast.error("Failed to deactivate branch");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      branchCode: "",
      countryId:
        user.role === "countryadmin"
          ? user.countryId._id || user.countryId
          : "",
      city: "",
      address: {
        street: "",
        area: "",
        postalCode: "",
        phone: "",
        email: "",
      },
    });
    setEditMode(false);
    setCurrentBranch(null);
  };

  const filteredBranches = selectedCountry
    ? branches.filter(
        (b) => (b.countryId._id || b.countryId) === selectedCountry,
      )
    : branches;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end pb-6">
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-5 h-5" />
          <span>Add Branch</span>
        </button>
      </div>

      {/* Filter */}
      {user.role === "superadmin" && (
        <div
          className="bg-white rounded-xl p-4 my-6 
               app-card
               "
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Country
          </label>
          <div className="app-select-wrapper md:w-64">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="app-select"
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country._id} value={country._id}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>

            <div className="app-select-arrow">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map((branch) => (
          <div key={branch._id} className="app-info-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {branch.name}
                  </h3>
                  <p className="text-sm text-gray-500">{branch.branchCode}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {branch.city}, {branch.countryId.name}
                </span>
              </div>

              {branch.address.phone && (
                <div className="text-sm text-gray-600">
                  📞 {branch.address.phone}
                </div>
              )}

              {branch.address.email && (
                <div className="text-sm text-gray-600">
                  ✉️ {branch.address.email}
                </div>
              )}

              {branch.branchAdminId && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-gray-600">Admin:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {branch.branchAdminId.name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    branch.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {branch.isActive ? "Active" : "Inactive"}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(branch)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(branch._id)}
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
      {filteredBranches.length === 0 && (
        <NoData
          title="Branches"
          description="Try adjusting filters or add a new branch to get started."
        />
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
          <div className="app-modal-drawer app-modal-drawer-lg">
            <div className="app-modal-header">
              <h2 className="app-modal-title">
                {editMode ? "Edit Branch" : "Add New Branch"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name
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
                    Branch Code
                  </label>
                  <input
                    type="text"
                    value={formData.branchCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branchCode: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., KHI-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <div className="app-select-wrapper">
                    <select
                      value={formData.countryId}
                      onChange={(e) =>
                        setFormData({ ...formData, countryId: e.target.value })
                      }
                      className="app-select"
                      required
                      disabled={user.role === "countryadmin"}
                    >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country._id} value={country._id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <div className="app-select-arrow">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Address Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Street
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            street: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Area
                    </label>
                    <input
                      type="text"
                      value={formData.address.area}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            area: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.address.postalCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            postalCode: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.address.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            phone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.address.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            email: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
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

export default BranchesPage;
