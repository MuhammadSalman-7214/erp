import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { IoMdAdd } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { FormSkeleton } from "../Components/LoadingSkeletons";
import { uppercasePayload } from "../lib/uppercasePayload";
import {
  validateDateInput,
  validateNumberInput,
  validateTextInput,
} from "../lib/formValidation";

function InvoiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  const [invoiceType, setInvoiceType] = useState("sales");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [items, setItems] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [carage, setCarage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("draft");
  const [dueDate, setDueDate] = useState("");

  /* ================= FETCH INVOICE ================= */
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const [invoiceRes, customersRes] = await Promise.all([
          axiosInstance.get(`/invoice/${id}`),
          axiosInstance.get("/customer"),
        ]);
        const inv = invoiceRes.data.data;

        setInvoice(inv);
        setCustomers(customersRes.data || []);
        setInvoiceType(inv.invoiceType || "sales");
        setCustomerId(inv.customerId?.id || inv.customerId || "");
        setVendorName(inv.vendor?.name || "");
        setItems(inv.items);
        setTaxRate(inv.taxRate);
        setDiscount(inv.discount);
        setCarage(inv.carage || 0);
        setPaymentMethod(inv.paymentMethod || "");
        setStatus(inv.status);
        setDueDate(inv.dueDate?.split("T")[0] || "");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  /* ================= ITEM HANDLERS ================= */
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] =
      field === "quantity" || field === "unitPrice" ? Number(value) : value;
    updated[index].total = updated[index].quantity * updated[index].unitPrice;
    setItems(updated);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const addItem = () =>
    setItems([...items, { name: "", quantity: 1, unitPrice: 0, total: 0 }]);

  /* ================= UPDATE INVOICE ================= */
  const handleUpdate = async () => {
    if (invoiceType === "sales" && !customerId) {
      toast.error("Customer is required");
      return;
    }

    if (items.length === 0) {
      toast.error("Invoice must have at least one item");
      return;
    }

    const dueDateCheck = validateDateInput(dueDate, "Due date");
    if (!dueDateCheck.ok) {
      toast.error(dueDateCheck.message);
      return;
    }

    const taxRateCheck = validateNumberInput(taxRate, "Tax rate", {
      min: 0,
      allowZero: true,
    });
    if (!taxRateCheck.ok) {
      toast.error(taxRateCheck.message);
      return;
    }

    const discountCheck = validateNumberInput(discount, "Discount", {
      min: 0,
      allowZero: true,
    });
    if (!discountCheck.ok) {
      toast.error(discountCheck.message);
      return;
    }

    const carageCheck = validateNumberInput(carage, "Carage", {
      min: 0,
      allowZero: true,
    });
    if (!carageCheck.ok) {
      toast.error(carageCheck.message);
      return;
    }

    const validatedItems = [];
    for (const item of items) {
      const itemNameCheck = validateTextInput(item.name, "Item name", {
        required: true,
        minLength: 1,
        maxLength: 120,
      });
      if (!itemNameCheck.ok) {
        toast.error(itemNameCheck.message);
        return;
      }

      const quantityCheck = validateNumberInput(item.quantity, "Quantity", {
        min: 1,
        allowZero: false,
        integer: true,
      });
      if (!quantityCheck.ok) {
        toast.error(quantityCheck.message);
        return;
      }

      const unitPriceCheck = validateNumberInput(item.unitPrice, "Unit price", {
        min: 0,
        allowZero: true,
      });
      if (!unitPriceCheck.ok) {
        toast.error(unitPriceCheck.message);
        return;
      }

      validatedItems.push({
        name: itemNameCheck.value,
        quantity: quantityCheck.value,
        unitPrice: unitPriceCheck.value,
      });
    }

    const paymentMethodCheck = validateTextInput(
      paymentMethod,
      "Payment method",
      {
        required: false,
        maxLength: 40,
        allowEmpty: true,
      },
    );
    if (!paymentMethodCheck.ok) {
      toast.error(paymentMethodCheck.message);
      return;
    }

    const statusCheck = validateTextInput(status, "Status", {
      required: false,
      maxLength: 40,
      allowEmpty: true,
    });
    if (!statusCheck.ok) {
      toast.error(statusCheck.message);
      return;
    }

    try {
      await axiosInstance.put(`/invoice/${id}`, {
        customerId: invoiceType === "sales" ? customerId : undefined,
        items: uppercasePayload(validatedItems),
        taxRate: taxRateCheck.value,
        discount: discountCheck.value,
        carage: carageCheck.value,
        paymentMethod: paymentMethodCheck.value,
        status: statusCheck.value,
        dueDate: dueDateCheck.value,
      });
      toast.success("Invoice updated successfully");
      navigate(`/invoice/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update invoice");
    }
  };

  if (loading)
    return <FormSkeleton />;
  if (!invoice)
    return <p className="p-6 text-center text-red-500">Invoice not found</p>;

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Edit Invoice
          </h1>

          {/* Invoice Number */}
          <p className="text-gray-600 mb-6">
            <strong>Invoice No:</strong> {invoice.invoiceNumber}
          </p>

          {/* Party */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {invoiceType === "purchase" ? "Vendor Name" : "Customer Name"}
            </label>
            {invoiceType === "purchase" ? (
              <input
                value={vendorName}
                readOnly
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100"
              />
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.customerCode ? ` (${customer.customerCode})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Items */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Items</h2>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="relative grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    placeholder="Item Name"
                    maxLength={120}
                    className="col-span-3 border border-gray-300 p-2 rounded"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    min="1"
                    step="1"
                    className="col-span-1 border border-gray-300 p-2 rounded"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, "unitPrice", e.target.value)
                    }
                    min="0"
                    step="0.01"
                    className="col-span-2 border border-gray-300 p-2 rounded"
                  />
                  <span className="col-span-1 text-gray-700 font-semibold">
                    Rs {item.total.toLocaleString()}
                  </span>

                  <button
                    onClick={() => removeItem(index)}
                    className="
      absolute -top-3 -right-3
      w-7 h-7
      flex items-center justify-center
      rounded-full
      text-red-600
      hover:text-red-600
      hover:bg-red-50
      transition-all duration-200
      p-1
      border-red-500 border-2
      bg-red-100
    "
                    title="Remove"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="mt-3 inline-flex items-center gap-2 bg-teal-800 text-white px-4 py-2 rounded-lg hover:bg-teal-600"
            >
              <IoMdAdd /> Add Item
            </button>
          </div>

          {/* Tax, Discount, Payment & Status */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                min="0"
                step="0.01"
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Carage
              </label>
              <input
                type="number"
                value={carage}
                onChange={(e) => setCarage(Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select</option>
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="mb-6">
            <label className="block mb-1 text-gray-700 font-medium">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleUpdate}
              className="px-6 py-2 bg-teal-800 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Save Changes
            </button>
            <button
              onClick={() => navigate(`/invoice/${id}`)}
              className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceEditPage;
