import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  fetchCustomerSummary,
  fetchCustomerLedger,
  createCustomerPayment,
} from "../features/customerSlice";
import { toast } from "react-hot-toast";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import NoData from "../Components/NoData";
import FormattedTime from "../lib/FormattedTime";

function CustomersPage({ readOnly = false }) {
  const dispatch = useDispatch();
  const {
    customers,
    isLoading,
    selectedCustomerSummary,
    selectedCustomerLedger,
    isCustomerSummaryLoading,
    isCustomerLedgerLoading,
  } = useSelector((state) => state.customers);
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  const isReadOnlyMode = readOnly || checkReadOnly("customer");

  const [query, setQuery] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  useEffect(() => {
    if (!activeCustomer?._id) return;
    dispatch(fetchCustomerSummary(activeCustomer._id));
    dispatch(fetchCustomerLedger(activeCustomer._id));
  }, [dispatch, activeCustomer?._id]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const submitCustomer = async (e) => {
    e.preventDefault();
    if (!name) return toast.error("Name is required");
    const payload = { name, contactInfo: { phone, email, address } };

    if (editing) {
      dispatch(updateCustomer({ id: editing._id, payload }))
        .unwrap()
        .then(() => {
          toast.success("Customer updated");
          setIsFormVisible(false);
          setEditing(null);
          resetForm();
        })
        .catch((err) => toast.error(err));
      return;
    }

    dispatch(createCustomer(payload))
      .unwrap()
      .then(() => {
        toast.success("Customer created");
        setIsFormVisible(false);
        resetForm();
      })
      .catch((err) => toast.error(err));
  };

  const handleEdit = (customer) => {
    setEditing(customer);
    setName(customer.name || "");
    setPhone(customer.contactInfo?.phone || "");
    setEmail(customer.contactInfo?.email || "");
    setAddress(customer.contactInfo?.address || "");
    setIsFormVisible(true);
  };

  const handleDelete = (id) => {
    dispatch(deleteCustomer(id))
      .unwrap()
      .then(() => toast.success("Customer deleted"))
      .catch((err) => toast.error(err));
  };

  const handleCustomerPayment = () => {
    if (!activeCustomer?._id) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    dispatch(
      createCustomerPayment({
        customerId: activeCustomer._id,
        amount,
        description: paymentDescription,
      }),
    )
      .unwrap()
      .then(() => {
        toast.success("Customer payment recorded");
        setPaymentAmount("");
        setPaymentDescription("");
        dispatch(fetchCustomerSummary(activeCustomer._id));
        dispatch(fetchCustomerLedger(activeCustomer._id));
      })
      .catch((err) => toast.error(err || "Failed to record payment"));
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const filtered = (customers || []).filter((c) => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(lower)) ||
      (c.contactInfo?.email && c.contactInfo.email.toLowerCase().includes(lower)) ||
      (c.contactInfo?.phone && c.contactInfo.phone.toLowerCase().includes(lower))
    );
  });

  return (
    <div className="min-h-[92vh] p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search customer..."
        />
        {hasPermission("customer", "write") && (
          <button
            onClick={() => {
              setEditing(null);
              resetForm();
              setIsFormVisible(true);
            }}
            className="bg-teal-800 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd size={18} />
            Add Customer
          </button>
        )}
      </div>

      {isFormVisible && (
        <div className="mt-4 app-card p-4">
          <form
            onSubmit={submitCustomer}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <input
              className="border rounded px-3 py-2"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-teal-600 text-white rounded">
                {editing ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormVisible(false);
                  setEditing(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-4 app-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-500 animate-pulse">
            Loading customers...
          </div>
        ) : filtered.length === 0 ? (
          <NoData
            title="No customers found"
            description="Try adjusting filters or add a new customer to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">Name</th>
                  <th className="px-5 py-4 font-medium">Email</th>
                  <th className="px-5 py-4 font-medium">Phone</th>
                  <th className="px-5 py-4 font-medium">Country</th>
                  <th className="px-5 py-4 font-medium">Branch</th>
                  <th className="px-5 py-4 font-medium">Created By</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c._id}
                    className={`border-b last:border-b-0 ${
                      activeCustomer?._id === c._id ? "bg-teal-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-4">{c.name}</td>
                    <td className="px-5 py-4">{c.contactInfo?.email || "-"}</td>
                    <td className="px-5 py-4">{c.contactInfo?.phone || "-"}</td>
                    <td className="px-5 py-4">{c.countryId?.name || "-"}</td>
                    <td className="px-5 py-4">{c.branchId?.name || "-"}</td>
                    <td className="px-5 py-4">{c.createdBy?.email || "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveCustomer(c)}
                          className="px-2 py-1 rounded-lg bg-teal-100 text-teal-700 text-xs font-semibold"
                        >
                          Ledger
                        </button>
                        {!isReadOnlyMode && hasPermission("customer", "write") && (
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                          >
                            <MdEdit size={18} />
                          </button>
                        )}
                        {!isReadOnlyMode && hasPermission("customer", "delete") && (
                          <button
                            onClick={() => handleDelete(c._id)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                          >
                            <MdDelete size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeCustomer && (
        <div className="mt-4 app-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Customer Financials: {activeCustomer.name}
            </h3>
            {hasPermission("customer", "write") && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Received amount"
                  className="h-9 px-3 border rounded-lg"
                />
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="Description"
                  className="h-9 px-3 border rounded-lg"
                />
                <button
                  onClick={handleCustomerPayment}
                  className="h-9 px-3 rounded-lg bg-teal-700 text-white text-sm"
                >
                  Record Receipt
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="text-lg font-semibold">
                {isCustomerSummaryLoading
                  ? "Loading..."
                  : formatAmount(selectedCustomerSummary?.totalSales)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Paid Amount</p>
              <p className="text-lg font-semibold">
                {isCustomerSummaryLoading
                  ? "Loading..."
                  : formatAmount(selectedCustomerSummary?.totalReceived)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Pending Amount</p>
              <p className="text-lg font-semibold">
                {isCustomerSummaryLoading
                  ? "Loading..."
                  : formatAmount(selectedCustomerSummary?.pending)}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                  <th className="px-3 py-2 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {isCustomerLedgerLoading ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={5}>
                      Loading transaction history...
                    </td>
                  </tr>
                ) : selectedCustomerLedger.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={5}>
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  selectedCustomerLedger.map((entry) => (
                    <tr key={entry._id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <FormattedTime timestamp={entry.createdAt} />
                      </td>
                      <td className="px-3 py-2">
                        {entry.transactionType || entry.entryType}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(entry.debitAmount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(entry.creditAmount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(entry.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomersPage;

