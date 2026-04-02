import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import useKeyboardDropdown from "../hooks/useKeyboardDropdown";

function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [type, setType] = useState("received");
  const [partyType, setPartyType] = useState("customer");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [showVendorOptions, setShowVendorOptions] = useState(false);

  const getId = (value) => value?.id ?? value?.id ?? value;

  const normalize = (value) => String(value || "").toLowerCase().trim();

  const fetchPayments = async () => {
    try {
      const res = await axiosInstance.get("/payment");
      setPayments(res.data.payments || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payments");
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [vendorsRes, customersRes] = await Promise.all([
        axiosInstance.get("/supplier"),
        axiosInstance.get("/customer"),
      ]);
      setVendors(vendorsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (type === "received") {
      setPartyType("customer");
      setVendorId("");
      setVendorQuery("");
      setShowVendorOptions(false);
    } else {
      setPartyType("vendor");
      setCustomerId("");
      setCustomerQuery("");
      setShowCustomerOptions(false);
    }
  }, [type]);

  const filteredCustomers = useMemo(() => {
    const query = normalize(customerQuery);
    if (!query) return customers;

    return customers.filter((customer) => {
      const name = normalize(customer.name);
      const code = normalize(customer.customerCode);
      const phone = normalize(customer.contactInfo?.phone);
      return (
        name.includes(query) || code.includes(query) || phone.includes(query)
      );
    });
  }, [customers, customerQuery]);

  const filteredVendors = useMemo(() => {
    const query = normalize(vendorQuery);
    if (!query) return vendors;

    return vendors.filter((vendor) => {
      const name = normalize(vendor.name);
      const code = normalize(vendor.vendorCode);
      const phone = normalize(vendor.contactInfo?.phone);
      return (
        name.includes(query) || code.includes(query) || phone.includes(query)
      );
    });
  }, [vendors, vendorQuery]);

  const selectCustomer = (customer) => {
    const id = getId(customer);
    setCustomerId(id);
    setCustomerQuery(
      `${customer.name}${customer.customerCode ? ` (${customer.customerCode})` : ""}`,
    );
    setShowCustomerOptions(false);
  };

  const selectVendor = (vendor) => {
    const id = getId(vendor);
    setVendorId(id);
    setVendorQuery(
      `${vendor.name}${vendor.vendorCode ? ` (${vendor.vendorCode})` : ""}`,
    );
    setShowVendorOptions(false);
  };

  const {
    activeIndex: customerActiveIndex,
    onKeyDown: onCustomerKeyDown,
    setActiveIndex: setCustomerActiveIndex,
  } = useKeyboardDropdown({
    options: filteredCustomers,
    isOpen: showCustomerOptions && customerQuery.trim() !== "",
    onSelect: (customer) => selectCustomer(customer),
    onClose: () => setShowCustomerOptions(false),
  });

  const {
    activeIndex: vendorActiveIndex,
    onKeyDown: onVendorKeyDown,
    setActiveIndex: setVendorActiveIndex,
  } = useKeyboardDropdown({
    options: filteredVendors,
    isOpen: showVendorOptions && vendorQuery.trim() !== "",
    onSelect: (vendor) => selectVendor(vendor),
    onClose: () => setShowVendorOptions(false),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!amount) {
      toast.error("Amount is required");
      return;
    }

    if (partyType === "customer" && !customerId) {
      toast.error("Customer is required");
      return;
    }

    const payload = {
      type,
      amount: Number(amount),
      method,
      partyType,
      invoice: invoiceId || undefined,
    };

    if (partyType === "customer") payload.customerId = customerId;

    if (partyType === "vendor") {
      payload.vendor = vendorId || undefined;
    }

    try {
      await axiosInstance.post("/payment", payload);
      toast.success("Payment recorded");
      setAmount("");
      setCustomerId("");
      setVendorId("");
      setCustomerQuery("");
      setVendorQuery("");
      setShowCustomerOptions(false);
      setShowVendorOptions(false);
      setInvoiceId("");
      fetchPayments();
    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment");
    }
  };

  const getRowStyle = (paymentType = "") => {
    const normalizedType = String(paymentType).trim().toLowerCase();
    if (normalizedType === "received") {
      return "bg-amber-50/70 hover:bg-amber-100/80 border-amber-200";
    }
    if (normalizedType === "paid") {
      return "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200";
    }
    return "bg-white hover:bg-slate-50 border-slate-200";
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div>
            <label className="text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-10 px-3 border rounded-xl mt-1"
            >
              <option value="received">Receive</option>
              <option value="paid">Pay</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 px-3 border rounded-xl mt-1"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="paypal">PayPal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-10 px-3 border rounded-xl mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Invoice ID (optional)</label>
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full h-10 px-3 border rounded-xl mt-1"
              placeholder="Invoice ObjectId"
            />
          </div>

          {partyType === "customer" ? (
            <>
              <div className="relative">
                <label className="text-sm font-medium">Customer</label>
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setCustomerId("");
                    setShowCustomerOptions(true);
                  }}
                  onFocus={() => {
                    setShowCustomerOptions(true);
                    setCustomerActiveIndex(0);
                  }}
                  onKeyDownCapture={onCustomerKeyDown}
                  onBlur={() =>
                    setTimeout(() => {
                      setShowCustomerOptions(false);
                      setCustomerActiveIndex(-1);
                    }, 150)
                  }
                  className="w-full h-10 px-3 border rounded-xl mt-1"
                  placeholder="Search customer..."
                />
                {showCustomerOptions && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={getId(customer)}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          customerActiveIndex ===
                          filteredCustomers.findIndex(
                            (item) => getId(item) === getId(customer),
                          )
                            ? "bg-slate-50"
                            : ""
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCustomer(customer)}
                      >
                        {customer.name}
                        {customer.customerCode
                          ? ` (${customer.customerCode})`
                          : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="md:col-span-2 relative">
              <label className="text-sm font-medium">Vendor</label>
              <input
                type="text"
                value={vendorQuery}
                onChange={(e) => {
                  setVendorQuery(e.target.value);
                  setVendorId("");
                  setShowVendorOptions(true);
                }}
                onFocus={() => {
                  setShowVendorOptions(true);
                  setVendorActiveIndex(0);
                }}
                onKeyDownCapture={onVendorKeyDown}
                onBlur={() =>
                  setTimeout(() => {
                    setShowVendorOptions(false);
                    setVendorActiveIndex(-1);
                  }, 150)
                }
                className="w-full h-10 px-3 border rounded-xl mt-1"
                placeholder="Search vendor..."
              />
              {showVendorOptions && filteredVendors.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                  {filteredVendors.map((vendor) => (
                    <button
                      key={getId(vendor)}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                        vendorActiveIndex ===
                        filteredVendors.findIndex(
                          (item) => getId(item) === getId(vendor),
                        )
                          ? "bg-slate-50"
                          : ""
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectVendor(vendor)}
                    >
                      {vendor.name}
                      {vendor.vendorCode ? ` (${vendor.vendorCode})` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full h-11 bg-teal-700 text-white rounded-xl hover:bg-teal-600"
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow-sm border p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
        {payments.length === 0 ? (
          <NoData
            title="No Payments"
            description="Record a payment to see it listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Party</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={getId(payment)}
                    className={`border-b last:border-b-0 transition ${getRowStyle(
                      payment.type,
                    )}`}
                  >
                    <td className="px-4 py-3 capitalize">{payment.type}</td>
                    <td className="px-4 py-3">
                      Rs{Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {payment.partyType === "vendor"
                        ? payment.vendor?.name || "Vendor"
                        : payment.customerId?.name ||
                          payment.customer?.name ||
                          "Customer"}
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.method}</td>
                    <td className="px-4 py-3">
                      {new Date(payment.paidAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentsPage;
