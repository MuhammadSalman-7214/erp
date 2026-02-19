import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  fetchPurchaseBills,
  createPurchaseBill,
  approvePurchaseBill,
  payPurchaseBill,
  deletePurchaseBill,
} from "../features/purchaseBillSlice";
import { gettingallSupplier } from "../features/SupplierSlice";
import { toast } from "react-hot-toast";
import { IoMdAdd } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import NoData from "../Components/NoData";

const emptyItem = { name: "", description: "", quantity: 1, unitPrice: 0 };

function PurchaseBillsPage() {
  const dispatch = useDispatch();
  const { bills, isLoading } = useSelector((state) => state.purchaseBills);
  const { getallSupplier } = useSelector((state) => state.supplier);
  const { hasPermission } = useRolePermissions();

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState([emptyItem]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    dispatch(fetchPurchaseBills());
    dispatch(gettingallSupplier());
  }, [dispatch]);

  const addItem = () => setItems([...items, emptyItem]);
  const removeItem = (idx) =>
    setItems(items.filter((_, index) => index !== idx));
  const updateItem = (idx, key, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    setItems(updated);
  };

  const submitBill = (e) => {
    e.preventDefault();
    if (!supplierId) return toast.error("Supplier required");
    if (!items.length) return toast.error("At least one item required");
    dispatch(
      createPurchaseBill({
        supplierId,
        items,
        taxRate: Number(taxRate),
        discount: Number(discount),
        dueDate: dueDate || null,
      }),
    )
      .unwrap()
      .then(() => {
        toast.success("Purchase bill created");
        setShowForm(false);
        setItems([emptyItem]);
        setSupplierId("");
        setTaxRate(0);
        setDiscount(0);
        setDueDate("");
      })
      .catch((err) => toast.error(err));
  };

  const approveBill = (id) =>
    dispatch(approvePurchaseBill(id))
      .unwrap()
      .then(() => toast.success("Bill approved"))
      .catch((err) => toast.error(err));

  const payBill = (id) =>
    dispatch(payPurchaseBill(id))
      .unwrap()
      .then(() => toast.success("Bill paid"))
      .catch((err) => toast.error(err));

  const deleteBill = (id) =>
    dispatch(deletePurchaseBill(id))
      .unwrap()
      .then(() => toast.success("Bill deleted"))
      .catch((err) => toast.error(err));

  const display = (bills || []).filter((b) => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      (b.billNumber && b.billNumber.toLowerCase().includes(lower)) ||
      (b.status && b.status.toLowerCase().includes(lower))
    );
  });

  const statusStyles = {
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-indigo-100 text-indigo-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="min-h-[92vh] p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search purchase bills..."
        />
        {hasPermission("purchase", "write") && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-teal-800 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd size={18} />
            Create Bill
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 app-card p-4">
          <form onSubmit={submitBill} className="space-y-3">
            <select
              className="border rounded px-3 py-2 w-full"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select Supplier</option>
              {(getallSupplier || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                />
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, "quantity", Number(e.target.value))
                  }
                />
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(idx, "unitPrice", Number(e.target.value))
                  }
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="bg-red-100 text-red-600 rounded px-2"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-2 bg-slate-200 rounded"
            >
              Add Item
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                className="border rounded px-3 py-2"
                placeholder="Tax Rate %"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
              <input
                type="number"
                className="border rounded px-3 py-2"
                placeholder="Discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
              <input
                type="date"
                className="border rounded px-3 py-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-teal-600 text-white rounded">
                Save Bill
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
            Loading bills...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">Bill</th>
                  <th className="px-5 py-4 font-medium">Supplier</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium ">Actions</th>
                </tr>
              </thead>
              <tbody>
                {display.map((b) => (
                  <tr key={b._id} className="border-b last:border-b-0">
                    <td className="px-5 py-4">{b.billNumber}</td>
                    <td className="px-5 py-4">{b.supplierId?.name || "-"}</td>
                    <td className="px-5 py-4">
                      {b.currency} {b.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusStyles[b.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {b.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {hasPermission("purchaseApprove", "write") &&
                          b.status === "draft" && (
                            <button
                              onClick={() => approveBill(b._id)}
                              className="px-3 py-2 rounded-lg bg-indigo-600 text-white"
                            >
                              Approve
                            </button>
                          )}
                        {hasPermission("purchase", "write") &&
                          b.status === "approved" && (
                            <button
                              onClick={() => payBill(b._id)}
                              className="px-3 py-2 rounded-lg bg-green-600 text-white"
                            >
                              Pay
                            </button>
                          )}
                        {hasPermission("purchase", "delete") && (
                          <button
                            onClick={() => deleteBill(b._id)}
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
            {display.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                <NoData
                  title="No purchase bills found."
                  description="Try adjusting filters or add a new branch to get started"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseBillsPage;
