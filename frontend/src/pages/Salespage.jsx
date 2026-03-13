import { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";

import {
  CreateSales,
  gettingallSales,
  EditSales,
  searchsalesdata,
} from "../features/salesSlice";
import SalesChart from "../lib/Salesgraph";
import toast from "react-hot-toast";
import { gettingallproducts } from "../features/productSlice";
import { PiInvoiceBold } from "react-icons/pi";
import NoData from "../Components/NoData";
import { createCustomer, getAllCustomers } from "../features/customerSlice";

function Salespage() {
  const { getallsales, searchdata } = useSelector((state) => state.sales);

  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    phone: "",
    address: "",
  });
  const [Payment, setPayment] = useState("");
  const [paymentStatus, setpaymentStatus] = useState("");
  const [Status, setStatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [codeQuery, setCodeQuery] = useState("");
  const [debouncedCodeQuery, setDebouncedCodeQuery] = useState("");
  const [showCodeOptions, setShowCodeOptions] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  const [selectedSales, setselectedSales] = useState(null);
  const { getAllCustomer } = useSelector((state) => state.customer);
  const getStatusBadge = (status) => {
    const mapping = {
      pending: "bg-yellow-50 text-yellow-700",
      completed: "bg-blue-50 text-blue-700",
      cancelled: "bg-teal-50 text-teal-700",
    };
    return mapping[status] || "bg-gray-200 text-gray-800";
  };
  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(getAllCustomers());
  }, [dispatch]);

  useEffect(() => {
    dispatch(gettingallSales());
  }, [dispatch]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(searchsalesdata(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    }
    dispatch(gettingallSales());
  }, [query, dispatch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCodeQuery(codeQuery.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [codeQuery]);

  const codeOptions = useMemo(() => {
    if (!debouncedCodeQuery) return [];
    const q = debouncedCodeQuery.toLowerCase();
    const results = [];
    getallproduct.forEach((product) => {
      (product.productCodes || []).forEach((code) => {
        const codeValue = String(code.code || "").toLowerCase();
        if (!codeValue.includes(q)) return;
        results.push({
          productId: product._id,
          codeId: code._id,
          code: code.code,
          name: product.name,
          availableQty: Number(code.quantity || 0),
        });
      });
    });
    return results.slice(0, 20);
  }, [debouncedCodeQuery, getallproduct]);

  const availableQtyByCode = useMemo(() => {
    const map = new Map();
    getallproduct.forEach((product) => {
      (product.productCodes || []).forEach((code) => {
        map.set(String(code._id), Number(code.quantity || 0));
      });
    });
    return map;
  }, [getallproduct]);

  const buildCartItemsFromSale = (sale) => {
    const products = Array.isArray(sale?.products) ? sale.products : [];
    return products.map((item) => {
      const productId = item.product?._id || item.product;
      const codeId = item.productCode?._id || item.productCode;
      const productRecord = getallproduct.find((p) => p._id === productId);
      const codeRecord = productRecord?.productCodes?.find(
        (code) => code._id === codeId,
      );
      return {
        productId,
        codeId,
        name: productRecord?.name || item.product?.name || "Product",
        code: codeRecord?.code || item.productCode?.code || "code",
        quantity: Number(item.quantity || 0),
        availableQty: Number(
          codeRecord?.quantity ?? availableQtyByCode.get(String(codeId)) ?? 0,
        ),
      };
    });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!selectedSales) return;
    if (!customerId) {
      toast.error("Customer is required");
      return;
    }
    if (!cartItems.length) {
      toast.error("Add at least one product");
      return;
    }

    const invalidQty = cartItems.some(
      (item) => !item.quantity || Number(item.quantity) <= 0,
    );
    if (invalidQty) {
      toast.error("Quantity is required for all items");
      return;
    }

    const insufficient = cartItems.find((item) => {
      const available =
        item.availableQty ??
        availableQtyByCode.get(String(item.codeId)) ??
        0;
      return Number(item.quantity) > Number(available);
    });
    if (insufficient) {
      const available =
        insufficient.availableQty ??
        availableQtyByCode.get(String(insufficient.codeId)) ??
        0;
      toast.error(
        `Only ${available} available for ${insufficient.code} - ${insufficient.name}`,
      );
      return;
    }

    const updatedData = {
      customerId,
      products: cartItems.map((item) => ({
        product: item.productId,
        productCode: item.codeId,
        quantity: Number(item.quantity),
      })),
      paymentMethod: Payment,
      paymentStatus,
      status: Status,
    };

    dispatch(EditSales({ salesId: selectedSales._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Sale updated successfully");
        setIsFormVisible(false);
        setselectedSales(null);
        resetForm();
      })
      .catch((error) => {
        console.error("Error updating sale:", error);
        toast.error("Failed to update sale");
      });
  };

  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.codeId === item.codeId);
      if (existing) {
        return prev.map((p) =>
          p.codeId === item.codeId
            ? { ...p, quantity: Number(p.quantity || 0) + 1 }
            : p,
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          availableQty: Number(item.availableQty || 0),
        },
      ];
    });
    setCodeQuery("");
    setShowCodeOptions(false);
  };

  const updateCartQuantity = (codeId, value) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.codeId === codeId ? { ...item, quantity: value } : item,
      ),
    );
  };

  const removeFromCart = (codeId) => {
    setCartItems((prev) => prev.filter((item) => item.codeId !== codeId));
  };

  const submitsales = async (event) => {
    event.preventDefault();
    let resolvedCustomerId = customerId;
    const customerName = customerSearch.trim();
    if (!resolvedCustomerId) {
      if (!customerName) {
        toast.error("Customer name is required");
        return;
      }
      if (!newCustomerData.phone.trim()) {
        toast.error("Customer phone is required");
        return;
      }
      setIsCreatingCustomer(true);
      try {
        const payload = {
          name: customerName,
          contactInfo: {
            phone: newCustomerData.phone.trim(),
            address: newCustomerData.address.trim(),
          },
        };
        const result = await dispatch(createCustomer(payload)).unwrap();
        const newCustomer = result?.customer;
        if (!newCustomer?._id) {
          toast.error("Failed to create customer");
          return;
        }
        resolvedCustomerId = newCustomer._id;
        setCustomerId(newCustomer._id);
        setCustomerSearch(newCustomer.name);
      } catch (error) {
        toast.error(error || "Failed to create customer");
        return;
      } finally {
        setIsCreatingCustomer(false);
      }
    }

    if (!cartItems.length) {
      toast.error("Add at least one product");
      return;
    }

    const invalidQty = cartItems.some(
      (item) => !item.quantity || Number(item.quantity) <= 0,
    );
    if (invalidQty) {
      toast.error("Quantity is required for all items");
      return;
    }

    const insufficient = cartItems.find((item) => {
      const available =
        item.availableQty ??
        availableQtyByCode.get(String(item.codeId)) ??
        0;
      return Number(item.quantity) > Number(available);
    });
    if (insufficient) {
      const available =
        insufficient.availableQty ??
        availableQtyByCode.get(String(insufficient.codeId)) ??
        0;
      toast.error(
        `Only ${available} available for ${insufficient.code} - ${insufficient.name}`,
      );
      return;
    }

    const salesData = {
      customerId: resolvedCustomerId,
      products: cartItems.map((item) => ({
        product: item.productId,
        productCode: item.codeId,
        quantity: Number(item.quantity),
      })),
      paymentMethod: Payment,
      paymentStatus,
      status: Status,
    };

    try {
      await dispatch(CreateSales(salesData)).unwrap();
      toast.success("Sale created successfully");
      closeForm();
    } catch (error) {
      if (error?.available && error?.requested) {
        toast.error(
          `Only ${error.available} items available. You requested ${error.requested}.`,
        );
      }
    }
  };
  const resetForm = () => {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerOptions(false);
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setPayment("");
    setpaymentStatus("");
    setStatus("");
    setCartItems([]);
    setCodeQuery("");
    setShowCodeOptions(false);
  };
  const closeForm = () => {
    setIsFormVisible(false);
    setselectedSales(null);
    resetForm();
  };
  const handleEditClick = (sales) => {
    setselectedSales(sales);
    setCustomerId(sales.customer?._id || sales.customer || "");
    setCustomerSearch(sales.customer?.name || sales.customerName || "");
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setCartItems(buildCartItemsFromSale(sales));
    setCodeQuery("");
    setShowCodeOptions(false);
    setPayment(sales.paymentMethod || "");
    setpaymentStatus(sales.paymentStatus || "");
    setStatus(sales.status || "");
    setIsFormVisible(true);
  };

  const displaySales = query.trim() !== "" ? searchdata : getallsales;

  const customers = Array.isArray(getAllCustomer) ? getAllCustomer : [];
  const selectedCustomer = customers.find(
    (customer) => customer._id === customerId,
  );
  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = normalizedCustomerSearch
    ? customers.filter((customer) => {
        const name = customer.name?.toLowerCase() || "";
        return name.includes(normalizedCustomerSearch);
      })
    : [];
  const exactMatchCustomer = customers.find(
    (customer) =>
      (customer.name || "").toLowerCase() === normalizedCustomerSearch,
  );
  const hasExactMatch = Boolean(exactMatchCustomer);

  const handleSelectCustomer = (customer) => {
    setCustomerId(customer._id);
    setCustomerSearch(customer.name);
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setShowCustomerOptions(false);
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* <SalesChart /> */}

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          value={query}
          onChange={(e) => setquery(e.target.value)}
          type="text"
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Enter your product"
        />
        <button
          onClick={() => {
            setIsFormVisible(true);
            setselectedSales(null);
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Add Sales
        </button>
      </div>

      {/* OVERLAY */}
      {isFormVisible && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={closeForm} />
      )}

      {/* FORM SLIDE-IN */}
      {isFormVisible && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white border-l shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold">
              {selectedSales ? "Edit Sale" : "Add Sale"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={closeForm}
              className="cursor-pointer text-2xl text-gray-600 hover:text-gray-800 transition"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {/* Form */}
            <form
              onSubmit={selectedSales ? handleEditSubmit : submitsales}
              className="flex-1 flex flex-col gap-4 overflow-y-auto"
            >
              <div className="flex flex-col gap-1 relative">
                <label className="text-gray-700 font-medium">Customer</label>
                <input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerId("");
                    setShowCustomerOptions(true);
                  }}
                  onFocus={() => setShowCustomerOptions(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!customerId && exactMatchCustomer) {
                        handleSelectCustomer(exactMatchCustomer);
                      } else {
                        setShowCustomerOptions(false);
                      }
                    }, 150);
                  }}
                  placeholder="Search or create customer"
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
                {showCustomerOptions && customerSearch.trim() !== "" && (
                  <div className="absolute z-50 top-[72px] w-full bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredCustomers.length > 0
                      ? filteredCustomers.map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100"
                          >
                            <div className="text-sm font-medium text-slate-800">
                              {customer.name}
                            </div>
                          </button>
                        ))
                      : null}
                  </div>
                )}
              </div>
              {customerId && selectedCustomer && (
                <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-800 mb-2">
                    Customer Details
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <span>
                      Phone: {selectedCustomer.contactInfo?.phone || "-"}
                    </span>
                    <span>
                      Address: {selectedCustomer.contactInfo?.address || "-"}
                    </span>
                  </div>
                </div>
              )}
              {!customerId &&
                customerSearch.trim() !== "" &&
                !hasExactMatch && (
                  <div className="rounded-xl border bg-white p-3">
                    <div className="font-medium text-slate-800 mb-2">
                      New Customer Details
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        value={newCustomerData.phone}
                        onChange={(e) =>
                          setNewCustomerData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="Phone"
                        className="w-full h-10 px-3 border rounded-xl"
                      />
                      <input
                        type="text"
                        value={newCustomerData.address}
                        onChange={(e) =>
                          setNewCustomerData((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        placeholder="Address"
                        className="w-full h-10 px-3 border rounded-xl"
                      />
                    </div>
                  </div>
                )}

              <div className="mb-4">
                <label>Product Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={codeQuery}
                    onChange={(e) => {
                      setCodeQuery(e.target.value);
                      setShowCodeOptions(true);
                    }}
                    onFocus={() => setShowCodeOptions(true)}
                    className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                    placeholder="Type product code"
                  />
                  {showCodeOptions && codeOptions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                      {codeOptions.map((option) => (
                        <button
                          key={`${option.codeId}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => addToCart(option)}
                        >
                          {option.code} - {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label>Cart Preview</label>
                {cartItems.length ? (
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-500 border-b bg-slate-50">
                      <div className="col-span-6">Product</div>
                      <div className="col-span-3">Code</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-1 text-right">X</div>
                    </div>
                    {cartItems.map((item) => (
                      <div
                        key={item.codeId}
                        className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-sm border-b last:border-b-0"
                      >
                        <div className="col-span-6">{item.name}</div>
                        <div className="col-span-3">
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {item.code}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartQuantity(item.codeId, e.target.value)
                            }
                            className="w-full h-8 px-2 border rounded"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            className="text-red-600 text-xs"
                            onClick={() => removeFromCart(item.codeId)}
                          >
                            <MdDelete size={18} />
                          </button>
                        </div>
                        {Number(item.quantity) >
                          Number(
                            item.availableQty ??
                              availableQtyByCode.get(String(item.codeId)) ??
                              0,
                          ) && (
                          <div className="col-span-12 text-xs text-red-600">
                            Only{" "}
                            {item.availableQty ??
                              availableQtyByCode.get(String(item.codeId)) ??
                              0}{" "}
                            available for this code.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-2">
                    No items added yet.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">
                  Payment Method
                </label>
                <select
                  value={Payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">Select Payment</option>
                  <option value="cash">Cash</option>
                  <option value="creditcard">Credit Card</option>
                  <option value="banktransfer">Bank Transfer</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setpaymentStatus(e.target.value)}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">Sale Status</label>
                <select
                  value={Status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full  bg-teal-700 hover:bg-teal-600 text-white rounded-xl shadow-md mt-4 py-3"
              >
                {selectedSales ? "Update Sale" : "Add Sale"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden">
        {!displaySales || displaySales.length === 0 ? (
          <div className="p-10 text-center">
            <NoData
              title="No Sales Found"
              description="Try adjusting filters or add a new sale to get started."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">#</th>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Products</th>
                  <th className="px-5 py-4 font-medium">Total Amount</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Payment</th>
                  <th className="px-5 py-4 font-medium">Payment Status</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displaySales.map((sale, index) => (
                  <tr
                    key={sale._id}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4">{sale.customerName}</td>
                    <td className="px-5 py-4">
                      {(sale.products || []).map((item) => (
                        <div
                          key={item.productCode?._id || item._id}
                          className="flex items-center gap-2 px-3 py-2 mb-1 last:mb-0 rounded-md bg-slate-50 border border-slate-300"
                        >
                          <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                            {item.product?.name || "N/A"}
                          </span>

                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {item.productCode?.code || "-"}
                          </span>

                          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      Rs {sale.totalAmount || 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(sale.status)}`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <FormattedTime timestamp={sale.createdAt} />
                    </td>
                    <td className="px-5 py-4">{sale.paymentMethod}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-semibold
    ${
      sale.paymentStatus === "paid"
        ? "bg-green-100 text-green-700"
        : "bg-yellow-100 text-yellow-700"
    }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>{" "}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(sale)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                        >
                          <MdEdit size={18} />
                        </button>
                        <div
                          className="p-2 rounded-lg bg-slate-50 text-slate-300"
                          title="Invoice auto-generated"
                        >
                          <PiInvoiceBold size={18} />
                        </div>
                      </div>
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

export default Salespage;
