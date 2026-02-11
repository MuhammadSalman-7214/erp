import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { MdDelete } from "react-icons/md";
import { useSelector } from "react-redux";
import { IoMdAdd } from "react-icons/io";

function CreateInvoicePage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const dashboardBasePath = (() => {
    switch (user?.role) {
      case "admin":
        return "/AdminDashboard";
      case "manager":
        return "/ManagerDashboard";
      case "staff":
        return "/StaffDashboard";
      default:
        return "/";
    }
  })();

  const [invoiceType, setInvoiceType] = useState("sales");
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
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
    const fetchVendors = async () => {
      try {
        const res = await axiosInstance.get("/supplier");
        setVendors(res.data || []);
      } catch (error) {
        console.error("Failed to load vendors", error);
      }
    };

    fetchVendors();
  }, []);

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

  const handleSubmit = async () => {
    if (invoiceType === "sales" && !customer.name.trim()) {
      return toast.error("Customer name is required");
    }
    if (invoiceType === "purchase" && !vendorId) {
      return toast.error("Vendor is required");
    }
    if (items.length === 0)
      return toast.error("Invoice must have at least one item");

    try {
      await axiosInstance.post("invoice", {
        invoiceType,
        customer: invoiceType === "sales" ? customer : undefined,
        vendor: invoiceType === "purchase" ? vendorId : undefined,
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
        currency: "USD",
      });
      toast.success("Invoice created successfully");
      navigate(`${dashboardBasePath}/invoices`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create invoice");
    }
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">
            Create Invoice
          </h1>

          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2 text-gray-700 font-medium">
                Invoice Number
              </label>
              <input
                value="Auto-generated"
                disabled
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2 text-gray-700 font-medium">
                Invoice Type
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="sales">Sales</option>
                <option value="purchase">Purchase</option>
              </select>
            </div>
          </div>

          {invoiceType === "sales" ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Customer
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                  placeholder="Customer Name"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  placeholder="Customer Email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  placeholder="Customer Phone"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  placeholder="Customer Address"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Vendor
              </h2>
              <div className="mb-6">
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

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
                  Rs {item.total.toLocaleString()}
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
            <p className="text-gray-600">Subtotal: Rs {subTotal.toFixed(2)}</p>
            <p className="text-gray-600">Tax: Rs {taxAmount.toFixed(2)}</p>
            <p className="text-lg font-semibold">
              Total: Rs {totalAmount.toFixed(2)}
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
