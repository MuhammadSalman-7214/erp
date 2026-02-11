import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { PiUsersBold } from "react-icons/pi";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Popconfirm } from "antd";
import NoData from "../Components/NoData";
import axiosInstance from "../lib/axios";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  createCustomer,
  editCustomer,
  getAllCustomers,
  removeCustomer,
  searchCustomer,
} from "../features/customerSlice";

function Customerpage({ readOnly = false }) {
  const dispatch = useDispatch();
  const { getAllCustomer, searchData } = useSelector((state) => state.customer);
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  const isReadOnlyMode = readOnly || checkReadOnly("customer");
  const canWrite = hasPermission("customer", "write");
  const canDelete = hasPermission("customer", "delete");

  const [query, setQuery] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBalances, setCustomerBalances] = useState({});

  const fetchCustomerBalances = async () => {
    try {
      const response = await axiosInstance.get("/payment/summary");
      const customers = response.data?.customers || [];
      const balancesById = customers.reduce((acc, customer) => {
        if (customer.customerId) {
          acc[customer.customerId] = customer;
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

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(searchCustomer(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    }
    dispatch(getAllCustomers());
  }, [query, dispatch]);

  const resetForm = () => {
    setCustomerCode("");
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setOpeningBalance("");
    setPaymentTerms("");
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setSelectedCustomer(null);
    resetForm();
  };

  const submitCustomer = async (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("Only admin can add customers");
      return;
    }

    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const customerData = {
      customerCode,
      name,
      contactInfo: {
        phone,
        email,
        address,
      },
      openingBalance,
      paymentTerms,
    };

    dispatch(createCustomer(customerData))
      .unwrap()
      .then(() => {
        toast.success("Customer added successfully");
        closeForm();
        fetchCustomerBalances();
      })
      .catch((error) => toast.error(error || "Customer add unsuccessful"));
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("Only admin can edit customers");
      return;
    }

    if (!selectedCustomer) return;
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const updatedData = {
      customerCode,
      name,
      contactInfo: {
        phone,
        email,
        address,
      },
      openingBalance,
      paymentTerms,
    };

    dispatch(editCustomer({ customerId: selectedCustomer._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Customer updated successfully");
        closeForm();
        fetchCustomerBalances();
      })
      .catch(() => toast.error("Failed to update customer"));
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

  const handleEditClick = (customer) => {
    if (isReadOnlyMode) {
      toast.error("You can only view customers in read-only mode");
      return;
    }

    setSelectedCustomer(customer);
    setCustomerCode(customer.customerCode || "");
    setName(customer.name || "");
    setPhone(customer.contactInfo?.phone || "");
    setEmail(customer.contactInfo?.email || "");
    setAddress(customer.contactInfo?.address || "");
    setOpeningBalance(customer.openingBalance ?? "");
    setPaymentTerms(customer.paymentTerms ?? "");
    setIsFormVisible(true);
  };

  const displayCustomers = query.trim() !== "" ? searchData : getAllCustomer;
  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const summaryTotals = Array.isArray(getAllCustomer)
    ? getAllCustomer.reduce(
        (acc, customer) => {
          const customerSummary = customerBalances[customer._id] || {};
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-teal-600 text-white text-lg sm:text-xl p-2">
              <PiUsersBold />
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              {getAllCustomer?.length || 0}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total Customers
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="text-sm text-slate-500">Customer Total Sales</div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {currency(summaryTotals.total)}
          </div>
          <div className="text-xs text-emerald-600 mt-2">
            Collected: {currency(summaryTotals.paid)}
          </div>
          <div className="text-xs text-red-600 mt-1">
            Remaining: {currency(summaryTotals.remaining)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search customer..."
        />

        {canWrite && (
          <button
            onClick={() => {
              setIsFormVisible(true);
              setSelectedCustomer(null);
              resetForm();
            }}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Customer
          </button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
      </div>

      {isFormVisible && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={closeForm} />
      )}

      {isFormVisible && canWrite && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white p-6 border-l shadow-2xl z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedCustomer ? "Edit Customer" : "Add Customer"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={closeForm}
              className="cursor-pointer text-2xl"
            />
          </div>

          <form
            onSubmit={selectedCustomer ? handleEditSubmit : submitCustomer}
            className="space-y-4"
          >
            <input
              type="text"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              placeholder="Customer code (optional)"
              className="w-full h-10 px-3 border rounded-xl"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              className="w-full h-10 px-3 border rounded-xl"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full h-10 px-3 border rounded-xl"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full h-10 px-3 border rounded-xl"
            />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="w-full h-10 px-3 border rounded-xl"
            />
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="Opening balance"
              className="w-full h-10 px-3 border rounded-xl"
            />
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Payment terms"
              className="w-full h-10 px-3 border rounded-xl"
            />
            <button
              type="submit"
              className="w-full h-11 bg-teal-700 text-white rounded-xl hover:bg-teal-600"
            >
              {selectedCustomer ? "Update Customer" : "Add Customer"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden">
        {!displayCustomers || displayCustomers.length === 0 ? (
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
                  <th className="px-5 py-4 font-medium">Code</th>
                  <th className="px-5 py-4 font-medium">Phone</th>
                  <th className="px-5 py-4 font-medium">Email</th>
                  <th className="px-5 py-4 font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Collected</th>
                  <th className="px-5 py-4 font-medium">Remaining</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayCustomers.map((customer) => {
                  const customerSummary = customerBalances[customer._id] || {};
                  return (
                    <tr
                      key={customer._id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4">{customer.name}</td>
                      <td className="px-5 py-4">{customer.customerCode || "-"}</td>
                      <td className="px-5 py-4">
                        {customer.contactInfo?.phone || "-"}
                      </td>
                      <td className="px-5 py-4">
                        {customer.contactInfo?.email || "-"}
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
                          {canWrite && (
                            <button
                              onClick={() => handleEditClick(customer)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                            >
                              <MdEdit size={18} />
                            </button>
                          )}
                          {canDelete && (
                            <Popconfirm
                              title="Delete Customer"
                              description="Are you sure to delete this customer?"
                              okText="Delete"
                              cancelText="Cancel"
                              onConfirm={() => handleRemove(customer._id)}
                            >
                              <button className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition">
                                <MdDelete size={18} />
                              </button>
                            </Popconfirm>
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
