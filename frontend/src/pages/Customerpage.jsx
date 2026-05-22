import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdAdd, IoMdEye } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import { PiUsersBold } from "react-icons/pi";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import axiosInstance from "../lib/axios";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { validatePhoneInput, validateTextInput } from "../lib/formValidation";
import { Button, ConfirmDialog, Inputfield, SelectDropdown } from "../UI";
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
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Total Customers
            </div>
            <PiUsersBold className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 transition-all duration-300">
            {getAllCustomer?.length || 0}
          </div>
        </div>

        <div className="rounded-xl p-5 border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Customer Total Sales
            </div>
            <FaMoneyBill1Wave className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700 transition-all duration-300">
            {currency(summaryTotals.total)}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            <span className="text-emerald-600 font-medium">
              Collected: {currency(summaryTotals.paid)}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-rose-600 font-medium">
              Remaining: {currency(summaryTotals.remaining)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <Inputfield
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search customer..."
        />
        <SelectDropdown
          value={amountFilter}
          onChange={(e) => setAmountFilter(e.target.value)}
          className="w-full md:w-64 h-10 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
        >
          <option value="all">All Customers</option>
          <option value="total">Total Amount</option>
          <option value="collected">Collected Amount</option>
          <option value="remaining">Remaining Amount</option>
        </SelectDropdown>

        {canWrite && (
          <Button
            onClick={() => {
              openForm();
            }}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Create Customer
          </Button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
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
              placeholder="Customer name"
              maxLength={120}
              className="w-full h-10 rounded-xl border px-3"
              required
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
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
              className="w-full h-10 rounded-xl border px-3"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm">{errors.phone}</p>
            )}
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
              className="w-full h-10 rounded-xl border px-3"
            />
            {errors.address && (
              <p className="text-red-500 text-sm">{errors.address}</p>
            )}
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={selectedCustomer ? "Updating..." : "Creating..."}
              className="h-11 w-full rounded-xl bg-teal-700 text-white hover:bg-teal-600"
            >
              {selectedCustomer ? "Update Customer" : "Create Customer"}
            </LoadingButton>
          </form>
        </div>
      </DrawerPanel>

      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden">
        {!filteredCustomers || filteredCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <NoData
              title="No Customer Found"
              description="Try adjusting filters or add a new customer to get started."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Phone</th>
                  <th className="px-5 py-4 font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Collected</th>
                  <th className="px-5 py-4 font-medium">Remaining</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const customerSummary =
                    customerBalances[String(getId(customer))] || {};
                  return (
                    <tr
                      key={getId(customer)}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
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
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleViewCustomer(getId(customer))}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-teal-100 text-emerald-700 transition"
                          >
                            <IoMdEye size={18} />
                          </Button>
                          {canWrite && (
                            <Button
                              onClick={() => handleEditClick(customer)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                            >
                              <MdEdit size={18} />
                            </Button>
                          )}
                          {canDelete && (
                            <ConfirmDialog
                              title="Delete Customer"
                              description="Are you sure to delete this customer?"
                              okText="Delete"
                              cancelText="Cancel"
                              onConfirm={() => handleRemove(getId(customer))}
                            >
                              <Button className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition">
                                <MdDelete size={18} />
                              </Button>
                            </ConfirmDialog>
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
  );
}

export default Customerpage;
