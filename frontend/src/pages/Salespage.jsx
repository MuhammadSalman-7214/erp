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
import axiosInstance from "../lib/axios";

function Salespage() {
  const { getallsales, searchdata } = useSelector((state) => state.sales);

  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [name, setName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
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
  const [customerBalances, setCustomerBalances] = useState([]);

  const fetchCustomerBalances = async () => {
    try {
      const response = await axiosInstance.get("/payment/summary");
      setCustomerBalances(response.data?.customers || []);
    } catch (error) {
      console.error("Failed to load customer balances:", error);
    }
  };

  useEffect(() => {
    dispatch(gettingallCategory());
    dispatch(gettingallproducts()); // fetch products for the dropdown
    fetchCustomerBalances();
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

    const updatedData = {
      customerName: name,
      customerCode,
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
        fetchCustomerBalances();
      })
      .catch((error) => {
        console.error("Error updating sale:", error);
        toast.error("Failed to update sale");
      });
  };

  const submitsales = async (event) => {
    event.preventDefault();

    const salesData = {
      customerName: name,
      customerCode,
      products: [{ product: Product, quantity: Number(quantity) }],
      paymentMethod: Payment,
      paymentStatus,
      status: Status,
    };

    try {
      await dispatch(CreateSales(salesData)).unwrap();
      toast.success("Sale created successfully");
      fetchCustomerBalances();
    } catch (error) {
      if (error?.available && error?.requested) {
        setFormErrors({
          quantity: `Only ${error.available} items available. You requested ${error.requested}.`,
        });
      }
    }
  };
  const resetForm = () => {
    setName("");
    setCustomerCode("");
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
    setName(sales.customerName);
    setCustomerCode(sales.customerCode || "");

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
  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const displayCustomerBalances = customerBalances.filter((customer) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      String(customer.customerName || "")
        .toLowerCase()
        .includes(q) ||
      String(customer.customerCode || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const totals = customerBalances.reduce(
    (acc, item) => {
      acc.total += Number(item.totalAmount || 0);
      acc.paid += Number(item.paidAmount || 0);
      acc.remaining += Number(item.remainingAmount || 0);
      return acc;
    },
    { total: 0, paid: 0, remaining: 0 },
  );

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <SalesChart />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-sm text-slate-500">Customer Total Sales</div>
          <div className="text-xl font-bold mt-1">{currency(totals.total)}</div>
        </div>
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-sm text-slate-500">Collected</div>
          <div className="text-xl font-bold mt-1 text-emerald-700">
            {currency(totals.paid)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-sm text-slate-500">Remaining to Collect</div>
          <div className="text-xl font-bold mt-1 text-red-700">
            {currency(totals.remaining)}
          </div>
        </div>
      </div>

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
              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">
                  Customer Code
                </label>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="Optional unique code"
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
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
        <div className="px-5 py-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-700">Customer Balances</h3>
        </div>
        {!displayCustomerBalances.length ? (
          <div className="p-5 text-slate-500 text-sm">
            No customer balance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Code</th>
                  <th className="px-5 py-4 font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Paid</th>
                  <th className="px-5 py-4 font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {displayCustomerBalances.map((customer) => (
                  <tr
                    key={customer.customerKey}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4">{customer.customerName}</td>
                    <td className="px-5 py-4">
                      {customer.customerCode || "-"}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {currency(customer.totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-emerald-700 font-medium">
                      {currency(customer.paidAmount)}
                    </td>
                    <td className="px-5 py-4 text-red-700 font-medium">
                      {currency(customer.remainingAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
