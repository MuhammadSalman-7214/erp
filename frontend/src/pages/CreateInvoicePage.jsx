import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { IoMdAdd } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers } from "../features/customerSlice";

function CreateInvoicePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { customers } = useSelector((state) => state.customers);

  const dashboardBasePath = (() => {
    switch (user?.role) {
      case "superadmin":
        return "/SuperAdminDashboard";
      case "countryadmin":
        return "/CountryAdminDashboard";
      case "branchadmin":
        return "/BranchAdminDashboard";
      case "staff":
        return "/StaffDashboard";
      case "agent":
        return "/AgentDashboard";
      default:
        return "/";
    }
  })();

  const [client, setClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([
    { name: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  // Recalculate totals
  useEffect(() => {
    const sub = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const tax = (sub * taxRate) / 100;
    const total = sub + tax - discount;

    setSubTotal(sub);
    setTaxAmount(tax);
    setTotalAmount(total);
  }, [items, taxRate, discount]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] =
      field === "quantity" || field === "unitPrice" ? Number(value) : value;
    updated[index].total = updated[index].quantity * updated[index].unitPrice;
    setItems(updated);
  };

  const addItem = () =>
    setItems([
      ...items,
      { name: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleCustomerSelect = (id) => {
    setCustomerId(id);
    if (!id) return;
    const selected = (customers || []).find((c) => c._id === id);
    if (!selected) return;
    setClient({
      name: selected.name || "",
      email: selected.contactInfo?.email || "",
      phone: selected.contactInfo?.phone || "",
      address: selected.contactInfo?.address || "",
    });
  };

  const handleSubmit = async () => {
    if (!client.name.trim()) return toast.error("Client name is required");
    if (items.length === 0)
      return toast.error("Invoice must have at least one item");

    try {
      await axiosInstance.post("invoice", {
        client,
        customerId: customerId || null,
        items: items.map(({ name, description, quantity, unitPrice }) => ({
          name,
          description,
          quantity,
          unitPrice,
        })),
        taxRate,
        discount,
        dueDate,
        paymentMethod,
        notes,
      });
      toast.success("Invoice created successfully");
      navigate(`${dashboardBasePath}/invoices`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create invoice");
    }
  };

  return (
    <div className="min-h-[92vh]">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="app-card p-6">
          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2 text-gray-700 font-medium">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Client */}
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Client</h2>
          <div className="mb-4">
            <label className="block mb-2 text-gray-700 font-medium">
              Select Customer (Optional)
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">-- Select Customer --</option>
              {(customers || []).map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              placeholder="Client Name"
              value={client.name}
              onChange={(e) => setClient({ ...client, name: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              placeholder="Client Email"
              value={client.email}
              onChange={(e) => setClient({ ...client, email: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              placeholder="Client Phone"
              value={client.phone}
              onChange={(e) => setClient({ ...client, phone: e.target.value })}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              placeholder="Client Address"
              value={client.address}
              onChange={(e) =>
                setClient({ ...client, address: e.target.value })
              }
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Items */}
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Items</h2>
          <div className="space-y-3 mb-6">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg"
              >
                <input
                  type="text"
                  value={item.name}
                  placeholder="Item Name"
                  onChange={(e) =>
                    handleItemChange(idx, "name", e.target.value)
                  }
                  className="col-span-3 border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="text"
                  value={item.description}
                  placeholder="Description"
                  onChange={(e) =>
                    handleItemChange(idx, "description", e.target.value)
                  }
                  className="col-span-4 border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(idx, "quantity", e.target.value)
                  }
                  className="col-span-1 border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleItemChange(idx, "unitPrice", e.target.value)
                  }
                  className="col-span-2 border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="col-span-1 text-gray-700 font-semibold">
                  ${item.total.toLocaleString()}
                </span>
                <button
                  onClick={() => removeItem(idx)}
                  className="col-span-1 flex items-center justify-center bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                >
                  <MdDelete />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mb-6 inline-flex items-center gap-2 bg-teal-800 text-white px-4 py-2 rounded-lg hover:bg-teal-600"
          >
            <IoMdAdd /> Add Item
          </button>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Discount
              </label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="text-right mb-6 space-y-1">
            <p className="text-gray-600">Subtotal: ${subTotal.toFixed(2)}</p>
            <p className="text-gray-600">Tax: ${taxAmount.toFixed(2)}</p>
            <p className="text-lg font-semibold">
              Total: ${totalAmount.toFixed(2)}
            </p>
          </div>

          {/* Payment & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="paypal">Paypal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-teal-800 text-white rounded-lg hover:bg-teal-700"
            >
              Create Invoice
            </button>
            <button
              onClick={() => navigate(`${dashboardBasePath}/invoices`)}
              className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateInvoicePage;
