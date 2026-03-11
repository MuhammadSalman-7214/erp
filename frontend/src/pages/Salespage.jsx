import { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { MdEdit, MdKeyboardDoubleArrowLeft } from "react-icons/md";
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
import { gettingallCategory } from "../features/categorySlice";
import { gettingallproducts } from "../features/productSlice";
import { PiInvoiceBold } from "react-icons/pi";
import NoData from "../Components/NoData";
import { createCustomer, getAllCustomers } from "../features/customerSlice";

function Salespage() {
  const { getallsales, searchdata } = useSelector((state) => state.sales);

  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customerCode: "",
    phone: "",
    address: "",
    paymentTerms: "",
  });
  const [Product, setProduct] = useState("");
  const [Payment, setPayment] = useState("");
  const [Price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentStatus, setpaymentStatus] = useState("");
  const [Status, setStatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [Category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);

  const [selectedSales, setselectedSales] = useState(null);
  const { getallCategory } = useSelector((state) => state.category);
  const { getAllCustomer } = useSelector((state) => state.customer);

  useEffect(() => {
    dispatch(gettingallCategory());
    dispatch(gettingallproducts()); // fetch products for the dropdown
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
    } else {
      dispatch(gettingallSales());
    }
  }, [query, dispatch]);

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!selectedSales) return;
    if (!customerId) {
      toast.error("Customer is required");
      return;
    }

    const updatedData = {
      customerId,
      products: [{ product: Product, quantity: Number(quantity) }],
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
          customerCode: newCustomerData.customerCode.trim() || undefined,
          contactInfo: {
            phone: newCustomerData.phone.trim(),
            address: newCustomerData.address.trim(),
          },
          paymentTerms: newCustomerData.paymentTerms.trim(),
        };
        const result = await dispatch(createCustomer(payload)).unwrap();
        const newCustomer = result?.customer;
        if (!newCustomer?._id) {
          toast.error("Failed to create customer");
          return;
        }
        resolvedCustomerId = newCustomer._id;
        setCustomerId(newCustomer._id);
        setCustomerSearch(
          newCustomer.customerCode
            ? `${newCustomer.name} (${newCustomer.customerCode})`
            : newCustomer.name,
        );
      } catch (error) {
        toast.error(error || "Failed to create customer");
        return;
      } finally {
        setIsCreatingCustomer(false);
      }
    }

    const salesData = {
      customerId: resolvedCustomerId,
      products: [{ product: Product, quantity: Number(quantity) }],
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
        setFormErrors({
          quantity: `Only ${error.available} items available. You requested ${error.requested}.`,
        });
      }
    }
  };
  const resetForm = () => {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerOptions(false);
    setNewCustomerData({
      customerCode: "",
      phone: "",
      address: "",
      paymentTerms: "",
    });
    setProduct("");
    setPayment("");
    setPrice("");
    setQuantity("");
    setpaymentStatus("");
    setStatus("");
  };
  const closeForm = () => {
    setIsFormVisible(false);
    setselectedSales(null);
    resetForm();
  };
  const handleEditClick = (sales) => {
    setselectedSales(sales);
    setCustomerId(sales.customer?._id || sales.customer || "");
    setCustomerSearch(
      sales.customer?.name ||
        sales.customerName ||
        sales.customer?.customerCode ||
        "",
    );
    setNewCustomerData({
      customerCode: "",
      phone: "",
      address: "",
      paymentTerms: "",
    });

    if (sales.products && sales.products.length > 0) {
      const firstProduct = sales.products[0];
      setProduct(firstProduct.product?._id || "");
      setPrice(firstProduct.price || "");
      setQuantity(firstProduct.quantity || "");
      const productObj = getallproduct.find(
        (p) => p._id === firstProduct.product?._id,
      );

      if (productObj) {
        setUnitPrice(
          productObj.pricing?.currentSalesPrice ?? productObj.Price ?? 0,
        );
      }
    } else {
      setProduct("");
      setPrice("");
      setQuantity("");
    }

    setPayment(sales.paymentMethod || "");
    setpaymentStatus(sales.paymentStatus || "");
    setStatus(sales.status || "");
    setIsFormVisible(true);
  };

  useEffect(() => {
    setProduct(""); // reset selected product when category changes
  }, [Category]);

  const displaySales = query.trim() !== "" ? searchdata : getallsales;

  const customers = Array.isArray(getAllCustomer) ? getAllCustomer : [];
  const selectedCustomer = customers.find(
    (customer) => customer._id === customerId,
  );
  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = normalizedCustomerSearch
    ? customers.filter((customer) => {
        const name = customer.name?.toLowerCase() || "";
        const code = customer.customerCode?.toLowerCase() || "";
        return (
          name.includes(normalizedCustomerSearch) ||
          code.includes(normalizedCustomerSearch)
        );
      })
    : [];
  const exactMatchCustomer = customers.find(
    (customer) =>
      (customer.name || "").toLowerCase() === normalizedCustomerSearch,
  );
  const hasExactMatch = Boolean(exactMatchCustomer);

  const handleSelectCustomer = (customer) => {
    setCustomerId(customer._id);
    setCustomerSearch(
      customer.customerCode
        ? `${customer.name} (${customer.customerCode})`
        : customer.name,
    );
    setNewCustomerData({
      customerCode: "",
      phone: "",
      address: "",
      paymentTerms: "",
    });
    setShowCustomerOptions(false);
  };

  const handleCreateCustomer = async () => {
    const name = customerSearch.trim();
    if (!name) return;
    if (!newCustomerData.phone.trim()) {
      toast.error("Customer phone is required");
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const payload = {
        name,
        customerCode: newCustomerData.customerCode.trim() || undefined,
        contactInfo: {
          phone: newCustomerData.phone.trim(),
          address: newCustomerData.address.trim(),
        },
        paymentTerms: newCustomerData.paymentTerms.trim(),
      };
      const result = await dispatch(createCustomer(payload)).unwrap();
      const newCustomer = result?.customer;
      if (newCustomer?._id) {
        setCustomerId(newCustomer._id);
        setCustomerSearch(
          newCustomer.customerCode
            ? `${newCustomer.name} (${newCustomer.customerCode})`
            : newCustomer.name,
        );
      }
      setShowCustomerOptions(false);
    } catch (error) {
      toast.error(error || "Failed to create customer");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <SalesChart />

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
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeForm} // clicking outside closes the form
        />
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
                            {customer.customerCode && (
                              <div className="text-xs text-slate-500">
                                {customer.customerCode}
                              </div>
                            )}
                          </button>
                        ))
                      : // <div className="px-3 py-2 text-sm text-slate-500">
                        //   No matches found
                        // </div>
                        null}
                    {/* {!hasExactMatch && customerSearch.trim() !== "" && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleCreateCustomer}
                      disabled={isCreatingCustomer}
                      className="w-full text-left px-3 py-2 border-t bg-slate-50 hover:bg-slate-100 text-teal-700 font-medium"
                    >
                      {isCreatingCustomer
                        ? "Creating customer..."
                        : `Create "${customerSearch.trim()}"`}
                    </button>
                    )} */}
                  </div>
                )}
              </div>
              {customerId && selectedCustomer && (
                <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-800 mb-2">
                    Selected Customer Details
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <span>Code: {selectedCustomer.customerCode || "-"}</span>
                    <span>
                      Phone: {selectedCustomer.contactInfo?.phone || "-"}
                    </span>
                    <span>
                      Address: {selectedCustomer.contactInfo?.address || "-"}
                    </span>
                    <span>
                      Payment Terms: {selectedCustomer.paymentTerms || "-"}
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
                        value={newCustomerData.customerCode}
                        onChange={(e) =>
                          setNewCustomerData((prev) => ({
                            ...prev,
                            customerCode: e.target.value,
                          }))
                        }
                        placeholder="Customer code (optional)"
                        className="w-full h-10 px-3 border rounded-xl"
                      />
                      <input
                        type="text"
                        value={newCustomerData.phone}
                        onChange={(e) =>
                          setNewCustomerData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="Phone (required)"
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
                        placeholder="Address (optional)"
                        className="w-full h-10 px-3 border rounded-xl"
                      />
                      <input
                        type="text"
                        value={newCustomerData.paymentTerms}
                        onChange={(e) =>
                          setNewCustomerData((prev) => ({
                            ...prev,
                            paymentTerms: e.target.value,
                          }))
                        }
                        placeholder="Payment terms (optional)"
                        className="w-full h-10 px-3 border rounded-xl"
                      />
                    </div>
                  </div>
                )}
              <div className="mb-4">
                <label>Category</label>
                <select
                  value={Category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                >
                  <option value="">Select a Category</option>
                  {getallCategory?.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label>Product</label>
                <select
                  value={Product}
                  onChange={(e) => {
                    const selectedProductId = e.target.value;
                    setProduct(selectedProductId);

                    const selectedProduct = getallproduct.find(
                      (p) => p._id === selectedProductId,
                    );

                    if (selectedProduct) {
                      const resolvedPrice =
                        selectedProduct.pricing?.currentSalesPrice ??
                        selectedProduct.Price ??
                        0;
                      setUnitPrice(resolvedPrice);
                      setPrice(
                        quantity ? resolvedPrice * Number(quantity) : "",
                      );
                    }
                  }}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                >
                  <option value="">Select a Product</option>
                  {getallproduct
                    ?.filter((p) => p.Category?._id === Category) // ✅ filter by selected category
                    .map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    setQuantity(qty);

                    if (unitPrice) {
                      setPrice(unitPrice * qty);
                    }

                    // Optional: client-side check if you have product stock loaded
                    const productObj = getallproduct.find(
                      (p) => p._id === Product,
                    );
                    if (productObj && qty > productObj.quantity) {
                      setFormErrors((prev) => ({
                        ...prev,
                        quantity: `Only ${productObj.quantity} available`,
                      }));
                    } else {
                      setFormErrors((prev) => ({ ...prev, quantity: "" }));
                    }
                  }}
                />
              </div>
              {formErrors.quantity && (
                <p className="text-red-600 text-sm mt-1">
                  {formErrors.quantity}
                </p>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">Total</label>
                <input
                  type="number"
                  value={Price}
                  readOnly
                  // placeholder="Enter price"
                  className="w-full h-11 px-3 border rounded-xl bg-gray-100 cursor-not-allowed"
                  required
                />
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
                  <th className="px-5 py-4 font-medium">Code</th>
                  <th className="px-5 py-4 font-medium">Product</th>
                  <th className="px-5 py-4 font-medium">Quantity</th>
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
                    <td className="px-5 py-4">{sale.customerCode || "-"}</td>
                    <td className="px-5 py-4">
                      {sale.products?.[0]?.product?.name || "-"}{" "}
                    </td>
                    <td className="px-5 py-4">
                      {sale.products?.[0]?.quantity || "-"}{" "}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      Rs {sale.totalAmount || 0}
                    </td>
                    <td className="px-5 py-4">{sale.status}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <FormattedTime timestamp={sale.createdAt} />
                    </td>
                    <td className="px-5 py-4">{sale.paymentMethod}</td>
                    <td className="px-5 py-4">{sale.paymentStatus}</td>
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
