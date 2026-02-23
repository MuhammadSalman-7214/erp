import { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft, MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";
import {
  SearchSupplier,
  CreateSupplier,
  gettingallSupplier,
  EditSupplier,
  deleteSupplier,
  fetchSupplierSummary,
  fetchSupplierLedger,
  createSupplierPayment,
} from "../features/SupplierSlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { gettingallproducts } from "../features/productSlice";
import { AiOutlineProduct } from "react-icons/ai";
import { TfiSupport } from "react-icons/tfi";
import NoData from "../Components/NoData";
import InfoStatCard from "../Components/InfoStatCard";

function Supplierpage({ readOnly = false }) {
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();
  const isReadOnlyMode = readOnly || checkReadOnly("supplier");
  const canWrite = hasPermission("supplier", "write");
  const canDelete = hasPermission("supplier", "delete");

  const {
    getallSupplier,
    searchdata,
    selectedSupplierSummary,
    selectedSupplierLedger,
    isSupplierSummaryLoading,
    isSupplierLedgerLoading,
  } = useSelector((state) => state.supplier);
  const { getallproduct } = useSelector((state) => state.product);
  const dispatch = useDispatch();

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [product, setProduct] = useState("");
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");

  useEffect(() => {
    dispatch(gettingallSupplier());
    dispatch(gettingallproducts());
  }, [dispatch]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(SearchSupplier(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    }
    dispatch(gettingallSupplier());
  }, [query, dispatch]);

  useEffect(() => {
    if (!activeSupplier?._id) return;
    dispatch(fetchSupplierSummary(activeSupplier._id));
    dispatch(fetchSupplierLedger(activeSupplier._id));
  }, [dispatch, activeSupplier?._id]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setProduct("");
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setSelectedSupplier(null);
    resetForm();
  };

  const handleRemove = (supplierId) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete suppliers");
      return;
    }
    dispatch(deleteSupplier(supplierId))
      .unwrap()
      .then(() => toast.success("Supplier removed successfully"))
      .catch((error) => toast.error(error || "Failed to remove supplier"));
  };

  const handleEditClick = (supplier) => {
    if (isReadOnlyMode) {
      toast.error("You can only view suppliers in read-only mode");
      return;
    }
    setSelectedSupplier(supplier);
    setName(supplier.name || "");
    setPhone(supplier.contactInfo?.phone || "");
    setEmail(supplier.contactInfo?.email || "");
    setAddress(supplier.contactInfo?.address || "");
    setIsFormVisible(true);
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!canWrite) return toast.error("You do not have permission to edit suppliers");
    if (!name || !phone || !email) return toast.error("Name, phone and email are required");
    if (!selectedSupplier) return;

    const updatedData = {
      name,
      contactInfo: { phone, email, address },
      productsSupplied: product ? [product] : [],
    };

    dispatch(EditSupplier({ supplierId: selectedSupplier._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Supplier updated successfully");
        closeForm();
      })
      .catch(() => toast.error("Failed to update supplier"));
  };

  const submitSupplier = (event) => {
    event.preventDefault();
    if (!canWrite) return toast.error("You do not have permission to add suppliers");
    if (!name || !phone || !email) return toast.error("Name, phone and email are required");

    const supplierData = {
      name,
      contactInfo: { phone, email, address },
      productsSupplied: product ? [product] : [],
    };

    dispatch(CreateSupplier(supplierData))
      .unwrap()
      .then(() => {
        toast.success("Supplier added successfully");
        closeForm();
      })
      .catch(() => toast.error("Supplier add unsuccessful"));
  };

  const handleSupplierPayment = () => {
    if (!activeSupplier?._id) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    dispatch(
      createSupplierPayment({
        supplierId: activeSupplier._id,
        amount,
        description: paymentDescription,
      }),
    )
      .unwrap()
      .then(() => {
        setPaymentAmount("");
        setPaymentDescription("");
        dispatch(fetchSupplierSummary(activeSupplier._id));
        dispatch(fetchSupplierLedger(activeSupplier._id));
      })
      .catch((error) => toast.error(error || "Failed to record payment"));
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const displaySuppliers = query.trim() !== "" ? searchdata : getallSupplier;

  return (
    <div className="min-h-[92vh] p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
        <InfoStatCard
          title="Total Suppliers"
          value={getallSupplier?.length || 0}
          subtitle="Suppliers in current scope"
          icon={<TfiSupport />}
          accentClass="bg-orange-500"
          iconShellClass="bg-orange-50 text-orange-700"
        />
        <InfoStatCard
          title="Products Linked"
          value={getallproduct?.length || 0}
          subtitle="Products associated with suppliers"
          icon={<AiOutlineProduct />}
          accentClass="bg-violet-500"
          iconShellClass="bg-violet-50 text-violet-700"
        />
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search supplier..."
        />

        {canWrite && (
          <button
            onClick={() => {
              setIsFormVisible(true);
              setSelectedSupplier(null);
              resetForm();
            }}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Supplier
          </button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
      </div>

      {isFormVisible && <div className="app-modal-overlay" onClick={closeForm} />}

      {isFormVisible && canWrite && (
        <div className="app-modal-drawer app-modal-drawer-md">
          <div className="app-modal-header">
            <h2 className="app-modal-title">
              {selectedSupplier ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={closeForm}
              className="cursor-pointer text-2xl text-slate-500 hover:text-slate-800"
            />
          </div>

          <form
            onSubmit={selectedSupplier ? handleEditSubmit : submitSupplier}
            className="app-modal-body"
          >
            <div className="mb-4">
              <label>Name</label>
              <input
                value={name}
                placeholder="Enter Supplier name"
                onChange={(e) => setName(e.target.value)}
                type="text"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>
            <div className="mb-4">
              <label>Phone</label>
              <input
                value={phone}
                type="number"
                placeholder="Enter Supplier Phone"
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>
            <div className="mb-4">
              <label>Email</label>
              <input
                value={email}
                placeholder="example@email.com"
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>
            <div className="mb-4">
              <label>Address</label>
              <input
                type="text"
                placeholder="Enter Supplier Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>
            <div className="mb-4">
              <label>Product</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              >
                <option value="">Select a product</option>
                {getallproduct?.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              {selectedSupplier ? "Update Supplier" : "Add Supplier"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-4 app-card overflow-hidden">
        {!Array.isArray(displaySuppliers) || displaySuppliers.length === 0 ? (
          <div className="p-10 text-center">
            <NoData
              title="No Supplier Found"
              description="Try adjusting filters or add a new supplier to get started."
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
                  <th className="px-5 py-4 font-medium">Email</th>
                  <th className="px-5 py-4 font-medium">Address</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displaySuppliers.map((supplier, index) => (
                  <tr
                    key={supplier._id}
                    className={`border-b last:border-b-0 hover:bg-slate-50 transition ${
                      activeSupplier?._id === supplier._id ? "bg-teal-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {supplier.name}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {supplier.contactInfo?.phone || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {supplier.contactInfo?.email || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                      {supplier.contactInfo?.address || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <FormattedTime timestamp={supplier.createdAt} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveSupplier(supplier)}
                          className="px-2 py-1 rounded-lg bg-teal-100 text-teal-700 text-xs font-semibold"
                          title="Show financial summary"
                        >
                          Ledger
                        </button>
                        {!isReadOnlyMode && canDelete && (
                          <button
                            onClick={() => handleRemove(supplier._id)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                            title="Delete"
                          >
                            <MdDelete size={18} />
                          </button>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeSupplier && (
        <div className="mt-4 app-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Supplier Financials: {activeSupplier.name}
            </h3>
            {canWrite && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Payment amount"
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
                  onClick={handleSupplierPayment}
                  className="h-9 px-3 rounded-lg bg-teal-700 text-white text-sm"
                >
                  Record Payment
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="text-lg font-semibold">
                {isSupplierSummaryLoading
                  ? "Loading..."
                  : formatAmount(selectedSupplierSummary?.totalPurchases)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Paid Amount</p>
              <p className="text-lg font-semibold">
                {isSupplierSummaryLoading
                  ? "Loading..."
                  : formatAmount(selectedSupplierSummary?.totalPaid)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Pending Amount</p>
              <p className="text-lg font-semibold">
                {isSupplierSummaryLoading
                  ? "Loading..."
                  : formatAmount(selectedSupplierSummary?.pending)}
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
                {isSupplierLedgerLoading ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={5}>
                      Loading transaction history...
                    </td>
                  </tr>
                ) : selectedSupplierLedger.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={5}>
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  selectedSupplierLedger.map((entry) => (
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

export default Supplierpage;

