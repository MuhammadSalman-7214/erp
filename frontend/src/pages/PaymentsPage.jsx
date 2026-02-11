import { useEffect, useState } from "react";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";

function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [type, setType] = useState("received");
  const [partyType, setPartyType] = useState("customer");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const fetchPayments = async () => {
    try {
      const res = await axiosInstance.get("/payment");
      setPayments(res.data.payments || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payments");
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axiosInstance.get("/supplier");
      setVendors(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchVendors();
  }, []);

  useEffect(() => {
    if (type === "received") {
      setPartyType("customer");
    } else {
      setPartyType("vendor");
    }
  }, [type]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!amount) {
      toast.error("Amount is required");
      return;
    }

    const payload = {
      type,
      amount: Number(amount),
      method,
      partyType,
      invoice: invoiceId || undefined,
    };

    if (partyType === "customer") {
      payload.customer = {
        name: customerName,
        code: customerCode,
      };
    }

    if (partyType === "vendor") {
      payload.vendor = vendorId || undefined;
    }

    try {
      await axiosInstance.post("/payment", payload);
      toast.success("Payment recorded");
      setAmount("");
      setCustomerName("");
      setCustomerCode("");
      setVendorId("");
      setInvoiceId("");
      fetchPayments();
    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment");
    }
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
              <option value="received">Received</option>
              <option value="paid">Paid</option>
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
              <div>
                <label className="text-sm font-medium">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-10 px-3 border rounded-xl mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Customer Code</label>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  className="w-full h-10 px-3 border rounded-xl mt-1"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl mt-1"
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor._id} value={vendor._id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
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
                  <tr key={payment._id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 capitalize">{payment.type}</td>
                    <td className="px-4 py-3">
                      Rs{Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {payment.partyType === "vendor"
                        ? payment.vendor?.name || "Vendor"
                        : payment.customer?.name || "Customer"}
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
