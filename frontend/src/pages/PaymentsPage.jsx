import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import LoadingButton from "../Components/LoadingButton";
import useKeyboardDropdown from "../hooks/useKeyboardDropdown";
import DateSortHeader from "../Components/DateSortHeader";
import { formatDateLabel, sortByDateValue } from "../lib/dateFormat";
import { uppercasePayload } from "../lib/uppercasePayload";
import {
  validateDateInput,
  validateNumberInput,
  validateTextInput,
} from "../lib/formValidation";

const getLocalDateInputValue = (date = new Date()) => {
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

const normalizeString = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const getPartyOptionKey = (item, kind) => {
  const name = normalizeString(item?.name);
  const code = normalizeString(
    kind === "customer" ? item?.customerCode : item?.vendorCode,
  );
  const phone = normalizeString(item?.contactInfo?.phone);

  if (name || code || phone) {
    return `${kind}:${name}|${code}|${phone}`;
  }

  const id = String(item?.id || "").trim();
  return id ? `${kind}:${id}` : `${kind}:unknown`;
};

const dedupeOptions = (items = [], kind) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = getPartyOptionKey(item, kind);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [type, setType] = useState("received");
  const [partyType, setPartyType] = useState("customer");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(() => getLocalDateInputValue());
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [errors, setErrors] = useState({});
  const [customerQuery, setCustomerQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [showVendorOptions, setShowVendorOptions] = useState(false);
  const [paymentDateSort, setPaymentDateSort] = useState("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getId = (value) => value?.id ?? value?.id ?? value;

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

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

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
    const uniqueCustomers = dedupeOptions(customers, "customer");
    const query = normalizeString(customerQuery);
    if (!query) return uniqueCustomers;

    return uniqueCustomers.filter((customer) => {
      const name = normalizeString(customer.name);
      const code = normalizeString(customer.customerCode);
      const phone = normalizeString(customer.contactInfo?.phone);
      return (
        name.includes(query) || code.includes(query) || phone.includes(query)
      );
    });
  }, [customers, customerQuery]);

  const filteredVendors = useMemo(() => {
    const uniqueVendors = dedupeOptions(vendors, "vendor");
    const query = normalizeString(vendorQuery);
    if (!query) return uniqueVendors;

    return uniqueVendors.filter((vendor) => {
      const name = normalizeString(vendor.name);
      const code = normalizeString(vendor.vendorCode);
      const phone = normalizeString(vendor.contactInfo?.phone);
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

    const amountCheck = validateField("amount", amount, (value) =>
      validateNumberInput(value, "Amount", {
        min: 0.01,
        allowZero: false,
      }),
    );
    if (!amountCheck.ok) {
      toast.error(amountCheck.message);
      return;
    }

    if (partyType === "customer" && !customerId) {
      toast.error("Customer is required");
      return;
    }

    if (partyType === "vendor" && !vendorId) {
      toast.error("Vendor is required");
      return;
    }

    const dateCheck = validateField("paidAt", paidAt, (value) =>
      validateDateInput(value, "Payment date"),
    );
    if (!dateCheck.ok) {
      toast.error(dateCheck.message);
      return;
    }

    const descriptionCheck = validateField("description", description, (value) =>
      validateTextInput(value, "Description", {
        required: false,
        maxLength: 200,
        allowEmpty: true,
      }),
    );
    if (!descriptionCheck.ok) {
      toast.error(descriptionCheck.message);
      return;
    }

    const payload = {
      type,
      amount: amountCheck.value,
      method,
      partyType,
      paidAt: dateCheck.value,
      description: uppercasePayload(descriptionCheck.value),
    };

    if (partyType === "customer") payload.customerId = customerId;

    if (partyType === "vendor") {
      payload.vendor = vendorId || undefined;
    }

    try {
      setIsSubmitting(true);
      await axiosInstance.post("/payment", payload);
      toast.success("Payment recorded");
      setAmount("");
      setCustomerId("");
      setVendorId("");
      setCustomerQuery("");
      setVendorQuery("");
      setShowCustomerOptions(false);
      setShowVendorOptions(false);
      setDescription("");
      setPaidAt(getLocalDateInputValue());
      fetchPayments();
    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
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

  const sortedPayments = useMemo(() => {
    return sortByDateValue(
      payments || [],
      (payment) => payment.paidAt || payment.createdAt,
      paymentDateSort,
    );
  }, [payments, paymentDateSort]);

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
              onChange={(e) => {
                const value = e.target.value;
                setType(value);
                validateField("type", value, (current) =>
                  validateTextInput(current, "Type", {
                    required: true,
                    maxLength: 20,
                  }),
                );
              }}
              className="w-full h-10 px-3 border rounded-xl mt-1"
            >
              <option value="received">Receive</option>
              <option value="paid">Pay</option>
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Method</label>
            <select
              value={method}
              onChange={(e) => {
                const value = e.target.value;
                setMethod(value);
                validateField("method", value, (current) =>
                  validateTextInput(current, "Method", {
                    required: true,
                    maxLength: 40,
                  }),
                );
              }}
              className="w-full h-10 px-3 border rounded-xl mt-1"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="paypal">PayPal</option>
              <option value="other">Other</option>
            </select>
            {errors.method && <p className="mt-1 text-sm text-red-500">{errors.method}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => {
                const value = e.target.value;
                setPaidAt(value);
                validateField("paidAt", value, (current) =>
                  validateDateInput(current, "Payment date"),
                );
              }}
              onBlur={(e) =>
                validateField("paidAt", e.target.value, (current) =>
                  validateDateInput(current, "Payment date"),
                )
              }
              className="w-full h-10 px-3 border rounded-xl mt-1"
            />
            {errors.paidAt && <p className="mt-1 text-sm text-red-500">{errors.paidAt}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                setAmount(value);
                validateField("amount", value, (current) =>
                  validateNumberInput(current, "Amount", {
                    min: 0.01,
                    allowZero: false,
                  }),
                );
              }}
              onBlur={(e) =>
                validateField("amount", e.target.value, (current) =>
                  validateNumberInput(current, "Amount", {
                    min: 0.01,
                    allowZero: false,
                  }),
                )
              }
              className="w-full h-10 px-3 border rounded-xl mt-1"
              required
              min="0"
              step="0.01"
            />
            {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                const value = e.target.value;
                setDescription(value);
                validateField("description", value, (current) =>
                  validateTextInput(current, "Description", {
                    required: false,
                    maxLength: 200,
                    allowEmpty: true,
                  }),
                );
              }}
              onBlur={(e) =>
                validateField("description", e.target.value, (current) =>
                  validateTextInput(current, "Description", {
                    required: false,
                    maxLength: 200,
                    allowEmpty: true,
                  }),
                )
              }
              className="w-full h-10 px-3 border rounded-xl mt-1"
              placeholder="Enter payment description"
              maxLength={200}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {partyType === "customer" ? (
            <>
              <div className="relative">
                <label className="text-sm font-medium">Customer</label>
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => {
                  const value = e.target.value;
                    setCustomerQuery(value);
                    setCustomerId("");
                    setShowCustomerOptions(true);
                  validateField("customerQuery", value, (current) =>
                    validateTextInput(current, "Customer", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  );
                }}
                onBlur={(e) => {
                  validateField("customerQuery", e.target.value, (current) =>
                    validateTextInput(current, "Customer", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  );
                  setTimeout(() => {
                    setShowCustomerOptions(false);
                    setCustomerActiveIndex(-1);
                  }, 150);
                }}
                  maxLength={120}
                  onFocus={() => {
                    setShowCustomerOptions(true);
                    setCustomerActiveIndex(0);
                  }}
                  onKeyDownCapture={onCustomerKeyDown}
                  className="w-full h-10 px-3 border rounded-xl mt-1"
                placeholder="Search customer..."
              />
              {errors.customerQuery && (
                <p className="mt-1 text-sm text-red-500">{errors.customerQuery}</p>
              )}
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
            <div className="relative">
              <label className="text-sm font-medium">Vendor</label>
              <input
                type="text"
                value={vendorQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setVendorQuery(value);
                  setVendorId("");
                  setShowVendorOptions(true);
                  validateField("vendorQuery", value, (current) =>
                    validateTextInput(current, "Vendor", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  );
                }}
                onBlur={(e) => {
                  validateField("vendorQuery", e.target.value, (current) =>
                    validateTextInput(current, "Vendor", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  );
                  setTimeout(() => {
                    setShowVendorOptions(false);
                    setVendorActiveIndex(-1);
                  }, 150);
                }}
                maxLength={120}
                onFocus={() => {
                  setShowVendorOptions(true);
                  setVendorActiveIndex(0);
                }}
                onKeyDownCapture={onVendorKeyDown}
                className="w-full h-10 px-3 border rounded-xl mt-1"
                placeholder="Search vendor..."
              />
              {errors.vendorQuery && (
                <p className="mt-1 text-sm text-red-500">{errors.vendorQuery}</p>
              )}
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
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="Saving..."
              className="w-full h-11 bg-teal-700 text-white rounded-xl hover:bg-teal-600"
            >
              Save Payment
            </LoadingButton>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow-sm border p-4">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
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
                  <DateSortHeader
                    label="Date"
                    direction={paymentDateSort}
                    onToggle={() =>
                      setPaymentDateSort((prev) =>
                        prev === "asc" ? "desc" : "asc",
                      )
                    }
                  />
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Party</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr
                    key={getId(payment)}
                    className={`border-b last:border-b-0 transition ${getRowStyle(
                      payment.type,
                    )}`}
                  >
                    <td className="px-4 py-3">
                      {formatDateLabel(payment.paidAt || payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.type}</td>
                    <td className="px-4 py-3">
                      Rs{Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {payment.description || payment.notes || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {payment.partyType === "vendor"
                        ? payment.vendor?.name || "Vendor"
                        : payment.customerId?.name ||
                          payment.customer?.name ||
                          "Customer"}
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.method}</td>
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
