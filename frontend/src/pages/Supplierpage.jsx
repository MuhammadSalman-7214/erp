import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdAdd, IoMdEye } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";
import {
  SearchSupplier,
  CreateSupplier,
  gettingallSupplier,
  EditSupplier,
  deleteSupplier,
} from "../features/SupplierSlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { gettingallproducts } from "../features/productSlice";
import { AiOutlineProduct } from "react-icons/ai";
import { TfiSupport } from "react-icons/tfi";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import NoData from "../Components/NoData";
import { Popconfirm } from "antd";
import axiosInstance from "../lib/axios";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import InputField from "../Components/InputField";
import SelectField from "../Components/SelectField";
import { sortByDateValue } from "../lib/dateFormat";
import {
  validateNumberInput,
  validatePhoneInput,
  validateTextInput,
} from "../lib/formValidation";

function Supplierpage({ readOnly = false }) {
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  // Determine if page is in read-only mode
  const isReadOnlyMode = readOnly || checkReadOnly("supplier");
  const canWrite = hasPermission("supplier", "write");
  const canDelete = hasPermission("supplier", "delete");

  const { getallSupplier, searchdata } = useSelector((state) => state.supplier);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [name, setName] = useState("");
  // const [contactInfo, setContactInfo] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [product, setProduct] = useState("");
  const [vendorBalances, setVendorBalances] = useState({});
  const [createdAtSort, setCreatedAtSort] = useState("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getId = (value) => value?.id ?? value?.id ?? value;

  const { getallproduct } = useSelector((state) => state.product);

  const fetchVendorBalances = async () => {
    try {
      const response = await axiosInstance.get("/payment/summary");
      const vendors = response.data?.vendors || [];
      const balancesById = vendors.reduce((acc, vendor) => {
        if (vendor.vendorId) {
          acc[String(vendor.vendorId)] = vendor;
        }
        return acc;
      }, {});
      setVendorBalances(balancesById);
    } catch (error) {
      console.error("Failed to fetch vendor balances:", error);
    }
  };

  useEffect(() => {
    dispatch(gettingallSupplier());
    dispatch(gettingallproducts());
    fetchVendorBalances();
  }, [dispatch]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(SearchSupplier(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallSupplier());
    }
  }, [query, dispatch]);

  const handleRemove = async (supplierId) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete suppliers");
      return;
    }

    dispatch(deleteSupplier(supplierId))
      .unwrap()
      .then(() => {
        toast.success("Supplier removed successfully");
        fetchVendorBalances();
      })
      .catch((error) => {
        toast.error(error || "Failed to remove supplier");
      });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to edit suppliers");
      return;
    }

    if (!selectedSupplier) return;

    const codeCheck = validateField("vendorCode", vendorCode, (value) =>
      validateTextInput(value, "Vendor code", {
        required: false,
        maxLength: 40,
        allowEmpty: true,
      }),
    );
    if (!codeCheck.ok) {
      toast.error(codeCheck.message);
      return;
    }

    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Vendor name", {
        required: true,
        minLength: 2,
        maxLength: 120,
      }),
    );
    if (!nameCheck.ok) {
      toast.error(nameCheck.message);
      return;
    }

    const phoneCheck = validateField("phone", phone, (value) =>
      validatePhoneInput(value),
    );
    if (!phoneCheck.ok) {
      toast.error(phoneCheck.message);
      return;
    }

    const addressCheck = validateField("address", address, (value) =>
      validateTextInput(value, "Address", {
        required: false,
        maxLength: 200,
        allowEmpty: true,
      }),
    );
    if (!addressCheck.ok) {
      toast.error(addressCheck.message);
      return;
    }

    const openingBalanceValue =
      String(openingBalance).trim() === ""
        ? undefined
        : validateField("openingBalance", openingBalance, (value) =>
            validateNumberInput(value, "Opening balance", {
              min: 0,
              allowZero: true,
            }),
          );
    if (openingBalanceValue && !openingBalanceValue.ok) {
      toast.error(openingBalanceValue.message);
      return;
    }

    const paymentTermsCheck = validateField(
      "paymentTerms",
      paymentTerms,
      (value) =>
        validateTextInput(value, "Payment terms", {
          required: false,
          maxLength: 80,
          allowEmpty: true,
        }),
    );
    if (!paymentTermsCheck.ok) {
      toast.error(paymentTermsCheck.message);
      return;
    }

    const updatedData = {
      vendorCode: codeCheck.value,
      name: nameCheck.value,
      contactInfo: {
        phone: phoneCheck.value,
        address: addressCheck.value,
      },
      ...(openingBalanceValue?.value !== undefined
        ? { openingBalance: openingBalanceValue.value }
        : {}),
      paymentTerms: paymentTermsCheck.value,
      // optionally keep productsSupplied if needed
      productsSupplied: product ? [product] : [],
    };

    setIsSubmitting(true);
    dispatch(EditSupplier({ supplierId: getId(selectedSupplier), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Vendor updated successfully");
        closeForm();
        fetchVendorBalances();
      })
      .catch(() => {
        toast.error("Failed to update supplier");
      })
      .finally(() => setIsSubmitting(false));
  };

  const submitSupplier = async (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to add suppliers");
      return;
    }

    const codeCheck = validateField("vendorCode", vendorCode, (value) =>
      validateTextInput(value, "Vendor code", {
        required: false,
        maxLength: 40,
        allowEmpty: true,
      }),
    );
    if (!codeCheck.ok) {
      toast.error(codeCheck.message);
      return;
    }

    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Vendor name", {
        required: true,
        minLength: 2,
        maxLength: 120,
      }),
    );
    if (!nameCheck.ok) {
      toast.error(nameCheck.message);
      return;
    }

    const phoneCheck = validateField("phone", phone, (value) =>
      validatePhoneInput(value),
    );
    if (!phoneCheck.ok) {
      toast.error(phoneCheck.message);
      return;
    }

    const addressCheck = validateField("address", address, (value) =>
      validateTextInput(value, "Address", {
        required: false,
        maxLength: 200,
        allowEmpty: true,
      }),
    );
    if (!addressCheck.ok) {
      toast.error(addressCheck.message);
      return;
    }

    const openingBalanceValue =
      String(openingBalance).trim() === ""
        ? undefined
        : validateField("openingBalance", openingBalance, (value) =>
            validateNumberInput(value, "Opening balance", {
              min: 0,
              allowZero: true,
            }),
          );
    if (openingBalanceValue && !openingBalanceValue.ok) {
      toast.error(openingBalanceValue.message);
      return;
    }

    const paymentTermsCheck = validateField(
      "paymentTerms",
      paymentTerms,
      (value) =>
        validateTextInput(value, "Payment terms", {
          required: false,
          maxLength: 80,
          allowEmpty: true,
        }),
    );
    if (!paymentTermsCheck.ok) {
      toast.error(paymentTermsCheck.message);
      return;
    }

    const supplierData = {
      vendorCode: codeCheck.value,
      name: nameCheck.value,
      contactInfo: {
        phone: phoneCheck.value,
        address: addressCheck.value,
      },
      ...(openingBalanceValue?.value !== undefined
        ? { openingBalance: openingBalanceValue.value }
        : {}),
      paymentTerms: paymentTermsCheck.value,
      productsSupplied: product ? [product] : [],
    };
    setIsSubmitting(true);
    dispatch(CreateSupplier(supplierData))
      .unwrap()
      .then(() => {
        toast.success("Vendor added successfully");
        closeForm();
        fetchVendorBalances();
      })
      .catch(() => toast.error("Vendor add unsuccessful"))
      .finally(() => setIsSubmitting(false));
  };

  const resetForm = () => {
    setVendorCode("");
    setName("");
    setPhone("");
    setAddress("");
    setOpeningBalance("");
    setPaymentTerms("");
    setErrors({});
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    setSelectedSupplier(null);
    resetForm();
  };

  const openForm = (supplier = null) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setVendorCode(supplier.vendorCode || "");
      setName(supplier.name || "");
      setPhone(supplier.contactInfo?.phone || "");
      setAddress(supplier.contactInfo?.address || "");
      setOpeningBalance(supplier.openingBalance ?? "");
      setPaymentTerms(supplier.paymentTerms ?? "");
    } else {
      setSelectedSupplier(null);
      resetForm();
    }

    setErrors({});
    setIsDrawerMinimized(false);
    setIsFormVisible(true);
  };

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

  const handleEditClick = (supplier) => {
    if (isReadOnlyMode) {
      toast.error("You can only view suppliers in read-only mode");
      return;
    }

    openForm(supplier);
  };

  const handleViewSupplier = (supplierId) => {
    navigate(`/supplier/${supplierId}`);
  };

  const displaySuppliers = query.trim() !== "" ? searchdata : getallSupplier;
  const sortedSuppliers = useMemo(
    () =>
      sortByDateValue(
        displaySuppliers || [],
        (supplier) => supplier.createdAt,
        createdAtSort,
      ),
    [displaySuppliers, createdAtSort],
  );
  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const summaryTotals = Array.isArray(getallSupplier)
    ? getallSupplier.reduce(
        (acc, supplier) => {
          const vendorSummary = vendorBalances[String(getId(supplier))] || {};
          acc.total += Number(vendorSummary.totalAmount || 0);
          acc.paid += Number(vendorSummary.paidAmount || 0);
          acc.remaining += Number(vendorSummary.remainingAmount || 0);
          return acc;
        },
        { total: 0, paid: 0, remaining: 0 },
      )
    : { total: 0, paid: 0, remaining: 0 };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 lg:grid-cols-3">
        <div className="rounded-xl p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Vendor Total Owed
            </div>
            <FaMoneyBill1Wave className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 transition-all duration-300">
            {currency(summaryTotals.total)}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            <span className="text-emerald-600 font-medium">
              Paid: {currency(summaryTotals.paid)}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-rose-600 font-medium">
              Remaining: {currency(summaryTotals.remaining)}
            </span>
          </div>
        </div>
        <div className="rounded-xl p-5 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Total Vendors
            </div>
            <TfiSupport className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-xl font-bold text-orange-700 transition-all duration-300">
            {getallSupplier?.length || 0}
          </div>
        </div>

        <div className="rounded-xl p-5 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Products Linked
            </div>
            <AiOutlineProduct className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 transition-all duration-300">
            {getallproduct?.length || 0}
          </div>
        </div>

        {/* <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl sm:text-3xl font-bold">Active</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supplier Status
          </p>
        </div> */}
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <InputField
          containerClassName="w-full md:w-96"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
          placeholder="Search vendor..."
        />

        {canWrite && (
          <button
            onClick={() => openForm()}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Create Vendor
          </button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
      </div>
      <DrawerPanel
        open={isFormVisible && canWrite}
        title={selectedSupplier ? "Edit Vendor" : "Create Vendor"}
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={selectedSupplier ? handleEditSubmit : submitSupplier}>
            {/* <div className="mb-4">
              <label>Vendor Code</label>
              <input
                value={vendorCode}
                placeholder="VND-0001"
                onChange={(e) => setVendorCode(e.target.value)}
                type="text"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div> */}

            <InputField
              containerClassName="mb-4"
              label="Name"
              value={name}
              placeholder="Enter Vendor name"
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                validateField("name", value, (current) =>
                  validateTextInput(current, "Vendor name", {
                    required: true,
                    minLength: 2,
                    maxLength: 120,
                  }),
                );
              }}
              onBlur={(e) =>
                validateField("name", e.target.value, (current) =>
                  validateTextInput(current, "Vendor name", {
                    required: true,
                    minLength: 2,
                    maxLength: 120,
                  }),
                )
              }
              type="text"
              maxLength={120}
              error={errors.name}
            />

            <InputField
              containerClassName="mb-4"
              label="Phone"
              value={phone}
              type="number"
              placeholder="Enter Vendor Phone"
              onChange={(e) => {
                const value = e.target.value;
                setPhone(value);
                validateField("phone", value, (current) =>
                  validatePhoneInput(current),
                );
              }}
              onBlur={(e) =>
                validateField("phone", e.target.value, (current) =>
                  validatePhoneInput(current),
                )
              }
              inputMode="tel"
              maxLength={20}
              error={errors.phone}
            />

            <InputField
              containerClassName="mb-4"
              label="Address"
              type="text"
              placeholder="Enter Vendor Address"
              value={address}
              onChange={(e) => {
                const value = e.target.value;
                setAddress(value);
                validateField("address", value, (current) =>
                  validateTextInput(current, "Address", {
                    required: false,
                    maxLength: 200,
                    allowEmpty: true,
                  }),
                );
              }}
              onBlur={(e) =>
                validateField("address", e.target.value, (current) =>
                  validateTextInput(current, "Address", {
                    required: false,
                    maxLength: 200,
                    allowEmpty: true,
                  }),
                )
              }
              maxLength={200}
              error={errors.address}
            />

            {/* <div className="mb-4">
              <label>Opening Balance</label>
              <input
                type="number"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div> */}

            {/* <div className="mb-4">
              <label>Payment Terms</label>
              <input
                type="text"
                placeholder="Net 30"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div> */}

            <SelectField
              containerClassName="mb-4"
              label="Product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Select a product"
              options={getallproduct?.map((product) => ({
                label: `${product.name}${product.company || product.brand ? ` • ${product.company || product.brand}` : ""}`,
                value: getId(product),
              }))}
            />

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={selectedSupplier ? "Updating..." : "Creating..."}
              className="mt-4 h-12 w-full rounded-lg bg-teal-800 text-white hover:bg-teal-700"
            >
              {selectedSupplier ? "Update Vendor" : "Create Vendor"}
            </LoadingButton>
          </form>
        </div>
      </DrawerPanel>

      <div className="mt-4">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {!Array.isArray(displaySuppliers) || displaySuppliers.length === 0 ? (
            <div className="p-10 text-center">
              <NoData
                title="No Vendor Found"
                description="Try adjusting filters or add a new vendor to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Name</th>
                    <th className="px-5 py-4 font-medium">Phone</th>
                    <th className="px-5 py-4 font-medium">Address</th>
                    {/* <th className="px-5 py-4 font-medium">Opening</th> */}
                    <th className="px-5 py-4 font-medium">Total Owed</th>
                    <th className="px-5 py-4 font-medium">Paid</th>
                    <th className="px-5 py-4 font-medium">Remaining</th>
                    {/* <th className="px-5 py-4 font-medium">Terms</th> */}
                    <DateSortHeader
                      label="Date"
                      direction={createdAtSort}
                      onToggle={() =>
                        setCreatedAtSort((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                    />
                    <th className="px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedSuppliers.map((supplier, index) => {
                    const vendorSummary =
                      vendorBalances[String(getId(supplier))] || {};
                    return (
                      <tr
                        key={getId(supplier)}
                        className="border-b last:border-b-0 hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4 text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800">
                          {supplier.name}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {supplier.contactInfo?.phone || "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                          {supplier.contactInfo?.address || "-"}
                        </td>

                        {/* <td className="px-5 py-4 text-slate-600">
                          {supplier.openingBalance ?? 0}
                        </td> */}
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {currency(vendorSummary.totalAmount)}
                        </td>
                        <td className="px-5 py-4 text-emerald-700 font-medium">
                          {currency(vendorSummary.paidAmount)}
                        </td>
                        <td className="px-5 py-4 text-red-700 font-medium">
                          {currency(vendorSummary.remainingAmount)}
                        </td>

                        {/* <td className="px-5 py-4 text-slate-600">
                          {supplier.paymentTerms || "-"}
                        </td> */}

                        <td className="px-5 py-4 text-slate-600">
                          <FormattedTime timestamp={supplier.createdAt} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleViewSupplier(getId(supplier))
                              }
                              className="p-2 rounded-lg bg-slate-100 hover:bg-teal-100 text-emerald-700 transition"
                              title="View Details"
                            >
                              <IoMdEye size={18} />
                            </button>
                            {!isReadOnlyMode && canDelete && (
                              <Popconfirm
                                title={
                                  <div className="flex flex-col gap-1 max-w-xs">
                                    <span className="font-semibold text-red-600 text-sm">
                                      Confirm Supplier Deletion
                                    </span>
                                    <span className="text-xs text-gray-600 leading-snug">
                                      This action will permanently remove this
                                      supplier and may affect linked purchase
                                      records. This operation cannot be undone.
                                    </span>
                                  </div>
                                }
                                okText="Yes, Delete"
                                cancelText="Cancel"
                                okButtonProps={{
                                  danger: true,
                                  className: "font-semibold",
                                }}
                                cancelButtonProps={{
                                  className: "font-medium",
                                }}
                                placement="topRight"
                                onConfirm={() => handleRemove(getId(supplier))}
                              >
                                <button
                                  className="
      p-2 rounded-lg
      bg-slate-100
      hover:bg-red-100
      text-red-600
      transition-all duration-200
      hover:shadow-sm
    "
                                  title="Delete Supplier"
                                >
                                  <MdDelete size={18} />
                                </button>
                              </Popconfirm>
                            )}
                            {!isReadOnlyMode && canWrite && (
                              <button
                                onClick={() => handleEditClick(supplier)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                                title="Edit"
                              >
                                <MdEdit size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Supplierpage;
