import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdAdd, IoMdEye, IoMdSearch } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import DrawerPanel from "../Components/DrawerPanel";
import axiosInstance from "../lib/axios";
import { validatePhoneInput, validateTextInput } from "../lib/formValidation";
import {
  Button,
  ConfirmDialog,
  Inputfield,
  SelectDropdown,
  Tooltip,
} from "../UI";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  createCustomer,
  editCustomer,
  getAllCustomers,
  removeCustomer,
} from "../features/customerSlice";

function Customerpage({ readOnly = false }) {
  const dispatch = useDispatch();
  const { getAllCustomer } = useSelector((state) => state.customer);
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();
  const navigate = useNavigate();

  const isReadOnlyMode = readOnly || checkReadOnly("customer");
  const canWrite = hasPermission("customer", "write");
  const canDelete = hasPermission("customer", "delete");

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBalances, setCustomerBalances] = useState({});
  const [amountFilter, setAmountFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getId = (value) => value?.id ?? value?.id ?? value;

  const fetchCustomerBalances = async () => {
    try {
      const response = await axiosInstance.get("/payment/summary");
      const customers = response.data?.customers || [];
      const balancesById = customers.reduce((acc, customer) => {
        if (customer.customerId) {
          acc[String(customer.customerId)] = customer;
        }
        return acc;
      }, {});
      setCustomerBalances(balancesById);
    } catch (error) {
      console.error("Failed to fetch customer balances:", error);
    }
  };

  useEffect(() => {
    dispatch(getAllCustomers());
    fetchCustomerBalances();
  }, [dispatch]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setErrors({});
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    setSelectedCustomer(null);
    resetForm();
  };

  const openForm = (customer = null) => {
    setSelectedCustomer(customer);
    setName(customer?.name || "");
    setPhone(customer?.contactInfo?.phone || "");
    setAddress(customer?.contactInfo?.address || "");
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

  const submitCustomer = async (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("Only admin can add customers");
      return;
    }

    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Customer name", {
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
      validatePhoneInput(value, { required: false }),
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

    const customerData = {
      name: nameCheck.value,
      contactInfo: {
        phone: phoneCheck.value,
        address: addressCheck.value,
      },
    };

    setIsSubmitting(true);
    dispatch(createCustomer(customerData))
      .unwrap()
      .then(() => {
        toast.success("Customer added successfully");
        closeForm();
        fetchCustomerBalances();
      })
      .catch((error) => toast.error(error || "Customer add unsuccessful"))
      .finally(() => setIsSubmitting(false));
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("Only admin can edit customers");
      return;
    }

    if (!selectedCustomer) return;

    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Customer name", {
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
      validatePhoneInput(value, { required: false }),
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

    const updatedData = {
      name: nameCheck.value,
      contactInfo: {
        phone: phoneCheck.value,
        address: addressCheck.value,
      },
    };

    setIsSubmitting(true);
    dispatch(editCustomer({ customerId: getId(selectedCustomer), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Customer updated successfully");
        closeForm();
        fetchCustomerBalances();
      })
      .catch(() => toast.error("Failed to update customer"))
      .finally(() => setIsSubmitting(false));
  };

  const handleRemove = (customerId) => {
    if (!canDelete) {
      toast.error("Only admin can delete customers");
      return;
    }

    dispatch(removeCustomer(customerId))
      .unwrap()
      .then(() => {
        toast.success("Customer removed successfully");
        fetchCustomerBalances();
      })
      .catch((error) => toast.error(error || "Failed to remove customer"));
  };

  const handleViewCustomer = (customerId) => {
    navigate(`/customer/${customerId}`);
  };

  const handleEditClick = (customer) => {
    if (isReadOnlyMode) {
      toast.error("You can only view customers in read-only mode");
      return;
    }

    openForm(customer);
  };

  const normalizeText = (value = "") => String(value).trim().toLowerCase();
  const normalizePhone = (value = "") => String(value).replace(/[^\d+]/g, "");

  const displayCustomers = useMemo(() => {
    const customers = Array.isArray(getAllCustomer) ? getAllCustomer : [];
    const normalizedQuery = normalizeText(query);
    const normalizedPhoneQuery = normalizePhone(query);

    if (!normalizedQuery && !normalizedPhoneQuery) {
      return customers;
    }

    return customers.filter((customer) => {
      const name = normalizeText(customer.name);
      const phone = normalizePhone(
        customer.contactInfo?.phone || customer.phone || "",
      );
      const code = normalizeText(customer.customerCode);

      return (
        name.includes(normalizedQuery) ||
        code.includes(normalizedQuery) ||
        (normalizedPhoneQuery && phone.includes(normalizedPhoneQuery))
      );
    });
  }, [getAllCustomer, query]);

  const filteredCustomers = Array.isArray(displayCustomers)
    ? displayCustomers.filter((customer) => {
        if (amountFilter === "all") return true;
        const summary = customerBalances[String(getId(customer))] || {};
        const total = Number(summary.totalAmount || 0);
        const paid = Number(summary.paidAmount || 0);
        const remaining = Number(summary.remainingAmount || 0);
        if (amountFilter === "total") return total > 0;
        if (amountFilter === "collected") return paid > 0;
        if (amountFilter === "remaining") return remaining > 0;
        return true;
      })
    : [];
  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const summaryTotals = Array.isArray(getAllCustomer)
    ? getAllCustomer.reduce(
        (acc, customer) => {
          const customerSummary =
            customerBalances[String(getId(customer))] || {};
          acc.total += Number(customerSummary.totalAmount || 0);
          acc.paid += Number(customerSummary.paidAmount || 0);
          acc.remaining += Number(customerSummary.remainingAmount || 0);
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
                  Customer Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search customers by name or phone.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {filteredCustomers.length} records shown
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Search</label>

            <Inputfield
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={120}
              placeholder="Search customer..."
            />
          </div>
          <div className="flex items-end">
            {" "}
            <SelectDropdown
              value={amountFilter}
              onChange={(e) => setAmountFilter(e?.target?.value ?? e ?? "")}
            >
              <option value="all">All Customers</option>
              <option value="total">Total Amount</option>
              <option value="collected">Collected Amount</option>
              <option value="remaining">Remaining Amount</option>
            </SelectDropdown>
          </div>
          {canWrite && (
            <div className="flex items-end">
              <Button
                onClick={() => {
                  openForm();
                }}
                variant="primary"
              >
                <IoMdAdd size={18} />
                Create Customer
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
        title={selectedCustomer ? "Edit Customer" : "Create Customer"}
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form
            onSubmit={selectedCustomer ? handleEditSubmit : submitCustomer}
            className="space-y-4"
          >
            <diV>
              <label className="text-sm font-medium">Name</label>
              <Inputfield
                type="text"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  validateField("name", value, (current) =>
                    validateTextInput(current, "Customer name", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("name", e.target.value, (current) =>
                    validateTextInput(current, "Customer name", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  )
                }
                placeholder="Name"
                maxLength={120}
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </diV>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Inputfield
                type="text"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value;
                  setPhone(value);
                  validateField("phone", value, (current) =>
                    validatePhoneInput(current, { required: false }),
                  );
                }}
                onBlur={(e) =>
                  validateField("phone", e.target.value, (current) =>
                    validatePhoneInput(current, { required: false }),
                  )
                }
                placeholder="Phone"
                inputMode="tel"
                maxLength={20}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Inputfield
                type="text"
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
                placeholder="Address"
                maxLength={200}
              />
              {errors.address && (
                <p className="text-red-500 text-sm">{errors.address}</p>
              )}
            </div>
            <Button
              type="submit"
              loading={isSubmitting}
              loadingText={selectedCustomer ? "Updating..." : "Creating..."}
              variant="primary"
              className="w-full"
            >
              {selectedCustomer ? "Update Customer" : "Create Customer"}
            </Button>
          </form>
        </div>
      </DrawerPanel>

      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {!filteredCustomers || filteredCustomers.length === 0 ? (
            <div className="p-10 text-center">
              <NoData
                title="No Customer Found"
                description="Try adjusting filters or add a new customer to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="w-full max-w-[1230px] mx-auto overflow-x-auto relative">
                <div className="flex gap-2">
                  <table className="min-w-[1390px] w-full text-sm border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">Customer</th>
                        <th className="px-5 py-4 font-semibold">Phone</th>
                        <th className="px-5 py-4 font-semibold">Total</th>
                        <th className="px-5 py-4 font-semibold">Collected</th>
                        <th className="px-5 py-4 font-semibold">Remaining</th>
                        <th
                          className="px-5 py-4 max-w-[20px] font-semibold text-center sticky right-0 bg-slate-50 z-20"
                          style={{
                            boxShadow: "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => {
                        const customerSummary =
                          customerBalances[String(getId(customer))] || {};
                        return (
                          <tr
                            key={getId(customer)}
                            className="group border-b border-slate-100 bg-white transition-colors duration-150 hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-4">{customer.name}</td>
                            <td className="px-5 py-4">
                              {customer.contactInfo?.phone || "-"}
                            </td>
                            <td className="px-5 py-4 font-medium">
                              {currency(customerSummary.totalAmount)}
                            </td>
                            <td className="px-5 py-4 text-emerald-700 font-medium">
                              {currency(customerSummary.paidAmount)}
                            </td>
                            <td className="px-5 py-4 text-red-700 font-medium">
                              {currency(customerSummary.remainingAmount)}
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
                                  {canWrite && (
                                    <Tooltip content="Edit Customer">
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleEditClick(customer)
                                        }
                                        variant="info"
                                        className="metal-btn"
                                      >
                                        <MdEdit size={18} />
                                      </Button>
                                    </Tooltip>
                                  )}
                                  {canDelete && (
                                    <ConfirmDialog
                                      title="Delete Customer"
                                      description="Are you sure to delete this customer?"
                                      okButtonProps={{
                                        danger: true,
                                        className:
                                          "font-semibold bg-red-50 hover:bg-red-100 border border-red-100",
                                      }}
                                      cancelButtonProps={{
                                        className: "font-medium",
                                      }}
                                      onConfirm={() =>
                                        handleRemove(getId(customer))
                                      }
                                    >
                                      <Tooltip content="Delete Customer">
                                        <Button
                                          type="button"
                                          variant="danger"
                                          className="metal-btn"
                                        >
                                          <MdDelete size={18} />
                                        </Button>
                                      </Tooltip>
                                    </ConfirmDialog>
                                  )}
                                  <Tooltip content="Customer Details">
                                    <Button
                                      type="button"
                                      onClick={() =>
                                        handleViewCustomer(getId(customer))
                                      }
                                      variant="emerald"
                                      className="metal-btn"
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
                          colSpan={2}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold uppercase">
                              Grand Total
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-teal-700/80">
                              Customer Overview - {getAllCustomers?.length || 0}{" "}
                              Customers
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-base font-bold text-emerald-800 shadow-sm">
                              {currency(summaryTotals.total)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700/80">
                              Total Sale
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50/90 px-3 py-1 text-base font-bold text-violet-800 shadow-sm">
                              {currency(summaryTotals.paid)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-violet-700/80">
                              Collected
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

export default Customerpage;
