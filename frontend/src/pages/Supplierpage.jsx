import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdAdd, IoMdEye, IoMdSearch } from "react-icons/io";
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
import NoData from "../Components/NoData";
import axiosInstance from "../lib/axios";
import DrawerPanel from "../Components/DrawerPanel";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import {
  validateNumberInput,
  validatePhoneInput,
  validateTextInput,
} from "../lib/formValidation";
import {
  Button,
  ConfirmDialog,
  Inputfield,
  SelectDropdown,
  Tooltip,
} from "../UI";

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
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <IoMdSearch className="text-lg" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Vendor Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search products by name, code, company, or category.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {sortedSuppliers.length} records shown
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Search</label>

            <Inputfield
              type="text"
              value={query}
              onChange={(e) => setQuery(e?.target?.value ?? e ?? "")}
              maxLength={120}
              className="w-full"
              placeholder="Search vendor..."
            />
          </div>

          {canWrite && (
            <div className="flex items-end">
              <Button onClick={() => openForm()} variant="primary">
                <IoMdAdd size={18} />
                Create Vendor
              </Button>
            </div>
          )}

          {isReadOnlyMode && (
            <div className="flex items-end">
              <div className="inline-flex h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-700 shadow-sm">
                Read-Only Mode
              </div>
            </div>
          )}
        </div>
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
            <div className="mb-4">
              <label>Name</label>
              <Inputfield
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
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div className="mb-4">
              <label>Phone</label>
              <Inputfield
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
                // type="text"
                inputMode="tel"
                maxLength={20}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="mb-4">
              <label>Address</label>
              <Inputfield
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
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            <div className="mb-4">
              <label>Product</label>
              <SelectDropdown
                value={product}
                onChange={(e) => setProduct(e?.target?.value ?? e ?? "")}
                placeholder="Select a product"
              >
                {getallproduct?.map((product) => (
                  <option key={getId(product)} value={getId(product)}>
                    {product.name}
                    {product.company || product.brand
                      ? ` • ${product.company || product.brand}`
                      : ""}
                  </option>
                ))}
              </SelectDropdown>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText={selectedSupplier ? "Updating..." : "Creating..."}
              variant="primary"
              className="w-full"
            >
              {selectedSupplier ? "Update Vendor" : "Create Vendor"}
            </Button>
          </form>
        </div>
      </DrawerPanel>

      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {!Array.isArray(displaySuppliers) || displaySuppliers.length === 0 ? (
            <div className="p-10 text-center">
              <NoData
                title="No Vendor Found"
                description="Try adjusting filters or add a new vendor to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="w-full max-w-[1230px] mx-auto overflow-x-auto relative">
                <div className="flex gap-2">
                  <table className="min-w-[1390px] w-full text-sm border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">#</th>
                        <th className="px-5 py-4 font-semibold">Name</th>
                        <th className="px-5 py-4 font-semibold">Phone</th>
                        <th className="px-5 py-4 font-semibold">Address</th>
                        <th className="px-5 py-4 font-semibold">Total Owed</th>
                        <th className="px-5 py-4 font-semibold">Paid</th>
                        <th className="px-5 py-4 font-semibold">Remaining</th>
                        <th className="px-5 py-4 font-semibold">
                          <DateSortHeader
                            label="Date"
                            direction={createdAtSort}
                            onToggle={() =>
                              setCreatedAtSort((prev) =>
                                prev === "asc" ? "desc" : "asc",
                              )
                            }
                          />
                        </th>

                        <th
                          className="px-5 py-4 font-semibold text-center sticky right-0 bg-slate-50 z-20"
                          style={{
                            boxShadow: "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedSuppliers.map((supplier, index) => {
                        const vendorSummary =
                          vendorBalances[String(getId(supplier))] || {};
                        return (
                          <tr
                            key={getId(supplier)}
                            className="group border-b border-slate-100 bg-white transition-colors duration-150 hover:bg-blue-50/30"
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

                            <td className="px-5 py-4 text-slate-600 font-medium">
                              {currency(vendorSummary.totalAmount)}
                            </td>
                            <td className="px-5 py-4 text-emerald-700 font-medium">
                              {currency(vendorSummary.paidAmount)}
                            </td>
                            <td className="px-5 py-4 text-red-700 font-medium">
                              {currency(vendorSummary.remainingAmount)}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              <FormattedTime timestamp={supplier.createdAt} />
                            </td>

                            <td
                              className="px-4 py-4 sticky right-0 z-10 bg-gray-50/80 text-center transition-colors duration-150"
                              style={{
                                boxShadow:
                                  "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                              }}
                            >
                              <div className="flex justify-center">
                                <div className="flex items-center justify-center gap-2 overflow-hidden">
                                  {!isReadOnlyMode && canWrite && (
                                    <Tooltip content="Edit Product">
                                      <Button
                                        onClick={() =>
                                          handleEditClick(supplier)
                                        }
                                        className="metal-btn"
                                        title="Edit"
                                        variant="info"
                                      >
                                        <MdEdit size={18} />
                                      </Button>
                                    </Tooltip>
                                  )}
                                  {!isReadOnlyMode && canDelete && (
                                    <ConfirmDialog
                                      title={
                                        <div className="flex flex-col gap-1 max-w-xs">
                                          <span className="font-semibold text-red-600 text-sm">
                                            Confirm Supplier Deletion
                                          </span>
                                          <span className="text-xs text-gray-600 leading-snug">
                                            This action will permanently remove
                                            this supplier and may affect linked
                                            purchase records. This operation
                                            cannot be undone.
                                          </span>
                                        </div>
                                      }
                                      okText="Delete"
                                      cancelText="Cancel"
                                      okButtonProps={{
                                        danger: true,
                                        className:
                                          "font-semibold bg-red-50 hover:bg-red-100 border border-red-100",
                                      }}
                                      cancelButtonProps={{
                                        className: "font-medium",
                                      }}
                                      placement="topRight"
                                      onConfirm={() =>
                                        handleRemove(getId(supplier))
                                      }
                                    >
                                      <Tooltip content="Delete Vendor">
                                        <Button
                                          className="metal-btn"
                                          title="Delete Supplier"
                                          variant="danger"
                                        >
                                          <MdDelete size={18} />
                                        </Button>
                                      </Tooltip>
                                    </ConfirmDialog>
                                  )}
                                  <Tooltip content="Vendor Details">
                                    <Button
                                      onClick={() =>
                                        handleViewSupplier(getId(supplier))
                                      }
                                      className="metal-btn"
                                      title="View Details"
                                      variant="emerald"
                                    >
                                      <IoMdEye size={18} />
                                    </Button>
                                  </Tooltip>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 text-sm font-semibold text-slate-700">
                        <td
                          className="px-5 py-4 text-md text-teal-800"
                          colSpan={4}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold uppercase">
                              Grand Total
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-teal-700/80">
                              Vendor Overview - {getallSupplier?.length || 0}{" "}
                              Vendors
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-base font-bold text-emerald-800 shadow-sm">
                              {currency(summaryTotals.total)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700/80">
                              Total Owed
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50/90 px-3 py-1 text-base font-bold text-violet-800 shadow-sm">
                              {currency(summaryTotals.paid)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-violet-700/80">
                              Paid
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-base font-bold text-amber-800 shadow-sm">
                              {currency(summaryTotals.remaining)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700/80">
                              Remaining
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-emerald-700/80">
                              Summary
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                              Date
                            </span>
                          </div>
                        </td>

                        <td
                          className="sticky right-0 z-20 px-4 py-4 text-center text-white"
                          style={{
                            boxShadow:
                              "inset 8px 0 16px -8px rgba(166, 174, 192, 0.45)",
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-emerald-700/80">
                              Summary
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                              Actions
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Supplierpage;
