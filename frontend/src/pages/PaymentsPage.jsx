import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import useKeyboardDropdown from "../hooks/useKeyboardDropdown";
import DateSortHeader from "../Components/DateSortHeader";
import { formatDateLabel, sortByDateValue } from "../lib/dateFormat";
import { uppercasePayload } from "../lib/uppercasePayload";
import {
  validateDateInput,
  validateNumberInput,
  validateTextInput,
} from "../lib/formValidation";
import { Button, Inputfield, SelectDropdown } from "../UI";
import DrawerPanel from "../Components/DrawerPanel";
import { IoMdAdd, IoMdSearch } from "react-icons/io";
import { useSelector } from "react-redux";
import TablePagination from "../UI/TablePagination";

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
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalItems: 0,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;
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
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [query, setquery] = useState("");
  const { sidebarOpen } = useSelector((state) => state.sidebar);

  const getId = (value) => value?.id ?? value?.id ?? value;

  const fetchPayments = async (page = currentPage) => {
    try {
      const res = await axiosInstance.get("/payment", {
        params: { page, pageSize: PAGE_SIZE, sortDir: paymentDateSort },
      });
      setPayments(res.data.payments || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
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
      setVendors(vendorsRes.data.suppliers || []);
      setCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPayments(currentPage);
    fetchDropdownData();
  }, [currentPage, paymentDateSort]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

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

    const descriptionCheck = validateField(
      "description",
      description,
      (value) =>
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
      fetchPayments(currentPage);
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
      return "bg-emerald-50/70 hover:bg-emerald-100/80 border-[#40de90]";
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

  const filteredPayments = useMemo(() => {
    const normalizedQuery = normalizeString(query);
    if (!normalizedQuery) return sortedPayments;

    return sortedPayments.filter((payment) => {
      const amountValue = normalizeString(payment.amount);
      const typeValue = normalizeString(payment.type);
      const partyValue = normalizeString(
        payment.partyType === "vendor"
          ? payment.vendor?.name || payment.vendor?.vendorCode
          : payment.customerId?.name ||
              payment.customer?.name ||
              payment.customerId?.customerCode ||
              payment.customer?.customerCode,
      );
      const descriptionValue = normalizeString(
        payment.description || payment.notes,
      );
      const methodValue = normalizeString(payment.method);
      const dateValue = normalizeString(payment.paidAt || payment.createdAt);

      return (
        amountValue.includes(normalizedQuery) ||
        typeValue.includes(normalizedQuery) ||
        partyValue.includes(normalizedQuery) ||
        descriptionValue.includes(normalizedQuery) ||
        methodValue.includes(normalizedQuery) ||
        dateValue.includes(normalizedQuery)
      );
    });
  }, [query, sortedPayments]);
  const resetForm = () => {
    setType("received");
    setPartyType("customer");
    setAmount("");
    setMethod("cash");
    setPaidAt(getLocalDateInputValue());
    setDescription("");
    setCustomerId("");
    setVendorId("");
    setCustomerQuery("");
    setVendorQuery("");
    setErrors({});
    setShowCustomerOptions(false);
    setShowVendorOptions(false);
    setIsDrawerMinimized(false);
  };
  const openForm = (category = null) => {
    setErrors({});
    setIsDrawerMinimized(false);
    setIsFormVisible(true);
  };
  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    resetForm();
  };
  return (
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <IoMdSearch className="text-lg" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Payment Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search products by name, code, company, or category.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {filteredPayments.length} records shown
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Search</label>
            <Inputfield
              type="text"
              value={query}
              onChange={(e) => setquery(e.target.value)}
              placeholder="Search by category, amount or party..."
              maxLength={120}
              className="w-full"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                openForm();
              }}
              variant="primary"
            >
              <IoMdAdd size={18} />
              Add Payment
            </Button>
          </div>
        </div>
      </div>

      <DrawerPanel
        open={isFormVisible}
        title="Make Payment"
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <SelectDropdown
                value={type}
                onChange={(e) => {
                  const value = e?.target?.value ?? e ?? "";
                  setType(value);
                  validateField("type", value, (current) =>
                    validateTextInput(current, "Type", {
                      required: true,
                      maxLength: 20,
                    }),
                  );
                }}
                placeholder="Select Payment Type"
              >
                <option value="received">Receive</option>
                <option value="paid">Pay</option>
              </SelectDropdown>
              {errors.type && (
                <p className="mt-1 text-sm text-red-500">{errors.type}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Method</label>
              <SelectDropdown
                value={method}
                onChange={(e) => {
                  const value = e?.target?.value ?? e ?? "";
                  setMethod(value);
                  validateField("method", value, (current) =>
                    validateTextInput(current, "Method", {
                      required: true,
                      maxLength: 40,
                    }),
                  );
                }}
                placeholder="Select Method"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </SelectDropdown>
              {errors.method && (
                <p className="mt-1 text-sm text-red-500">{errors.method}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Date</label>
              <Inputfield
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
              />
              {errors.paidAt && (
                <p className="mt-1 text-sm text-red-500">{errors.paidAt}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <Inputfield
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
                required
                min="0"
                step="0.01"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Inputfield
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
                placeholder="Enter payment description"
                maxLength={200}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.description}
                </p>
              )}
            </div>

            {partyType === "customer" ? (
              <>
                <div className="relative">
                  <label className="text-sm font-medium">Customer</label>
                  <Inputfield
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
                      validateField(
                        "customerQuery",
                        e.target.value,
                        (current) =>
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
                    placeholder="Search customer..."
                  />
                  {errors.customerQuery && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.customerQuery}
                    </p>
                  )}
                  {showCustomerOptions && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                      {filteredCustomers.map((customer) => (
                        <Button
                          key={getId(customer)}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm !text-black !border-0 !shadow-none !rounded-none !bg-white ${
                            customerActiveIndex ===
                            filteredCustomers.findIndex(
                              (item) => getId(item) === getId(customer),
                            )
                              ? "!bg-slate-100"
                              : ""
                          }`}
                          variant="ghost"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCustomer(customer)}
                        >
                          {customer.name}
                          {customer.customerCode
                            ? ` (${customer.customerCode})`
                            : ""}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="relative">
                <label className="text-sm font-medium">Vendor</label>
                <Inputfield
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
                  placeholder="Search vendor..."
                />
                {errors.vendorQuery && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.vendorQuery}
                  </p>
                )}
                {showVendorOptions && filteredVendors.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                    {filteredVendors.map((vendor) => (
                      <Button
                        key={getId(vendor)}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm !text-black !border-0 !shadow-none !rounded-none !bg-white ${
                          vendorActiveIndex ===
                          filteredVendors.findIndex(
                            (item) => getId(item) === getId(vendor),
                          )
                            ? "!bg-slate-100"
                            : ""
                        }`}
                        variant="ghost"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectVendor(vendor)}
                      >
                        {vendor.name}
                        {vendor.vendorCode ? ` (${vendor.vendorCode})` : ""}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Saving..."
                variant="primary"
                className="w-full"
              >
                Save Payment
              </Button>
            </div>
          </form>
        </div>
      </DrawerPanel>

      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {payments.length === 0 ? (
            <NoData
              title="No Payments"
              description="Record a payment to see it listed here."
            />
          ) : filteredPayments.length === 0 ? (
            <NoData
              title="No Matching Payments"
              description="Try searching by amount, party, type, method, or date."
            />
          ) : (
            <div className="overflow-x-auto">
              <div
                className={`max-h-[56vh] overflow-y-auto w-full ${!sidebarOpen ? "max-w-[310px] mobileL:max-w-[330px] tab:max-w-[680px] laptop:max-w-[1424px] laptopL:max-w-[1550px] laptop4k:max-w-full" : "max-w-[220px] mobileL:max-w-[160px] tab:max-w-[480px] laptop:max-w-[1030px] laptopL:max-w-[1245px] laptop4k:max-w-full"}  mx-auto overflow-x-auto relative`}
              >
                <div className="flex gap-2">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">
                          <DateSortHeader
                            label="Date"
                            direction={paymentDateSort}
                            onToggle={() =>
                              setPaymentDateSort((prev) =>
                                prev === "asc" ? "desc" : "asc",
                              )
                            }
                          />
                        </th>
                        <th className="px-5 py-4 font-semibold">Type</th>
                        <th className="px-5 py-4 font-semibold">Amount</th>
                        <th className="px-5 py-4 font-semibold">Description</th>
                        <th className="px-5 py-4 font-semibold">Party</th>
                        <th className="px-5 py-4 font-semibold">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr
                          key={getId(payment)}
                          className={` ${getRowStyle(payment.type)}`}
                        >
                          <td className="px-5 py-4">
                            {formatDateLabel(
                              payment.paidAt || payment.createdAt,
                            )}
                          </td>
                          <td className="px-5 py-4 capitalize">
                            {payment.type}
                          </td>
                          <td className="px-5 py-4">
                            Rs{Number(payment.amount).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {payment.description || payment.notes || "-"}
                          </td>
                          <td className="px-5 py-4">
                            {payment.partyType === "vendor"
                              ? payment.vendor?.name || "Vendor"
                              : payment.customerId?.name ||
                                payment.customer?.name ||
                                "Customer"}
                          </td>
                          <td className="px-5 py-4 capitalize">
                            {payment.method}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <TablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default PaymentsPage;
