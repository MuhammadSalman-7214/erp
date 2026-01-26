import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft, MdEdit, MdDelete } from "react-icons/md";
import FormattedTime from "../lib/FormattedTime ";
import OrderStatusChart from "../lib/OrderStatusChart";
import {
  createdOrder,
  Removedorder,
  updatestatusOrder,
  gettingallOrder,
  SearchOrder,
} from "../features/orderSlice";
import { gettingallproducts } from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";

function Orderpage() {
  const {
    getorder,
    isgetorder,
    isorderadd,
    isorderremove,
    editorder,
    iseditorder,
    searchdata,
    isshowgraph,
    statusgraph,
  } = useSelector((state) => state.order);
  const { getallproduct } = useSelector((state) => state.product);
  const { getallCategory } = useSelector((state) => state.category);
  const { user, isUserSignup } = useSelector((state) => state.auth);
  const [formErrors, setFormErrors] = useState({});

  const dispatch = useDispatch();

  const [query, setquery] = useState("");
  const [Product, setProduct] = useState("");
  const [Price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [Description, setDescription] = useState("");
  const [status, setstatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedOrder, setselectedOrder] = useState(null);

  useEffect(() => {
    dispatch(gettingallOrder());
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
  }, [dispatch, user]);

  useEffect(() => {
    dispatch(gettingallOrder());
  }, [dispatch, editorder]);

  useEffect(() => {
    if (query.trim() !== "") {
      const timeout = setTimeout(() => {
        dispatch(SearchOrder(query));
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [query, dispatch]);

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!selectedOrder) return;

    const updatedData = {
      user: user?.id || " ",
      description: Description,
      status,
      products: {
        product: Product,
        quantity: Number(quantity),
        Price: Number(Price),
      },
    };

    dispatch(updatestatusOrder({ OrderId: selectedOrder._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Order updated successfully");
        setIsFormVisible(false);
        setselectedOrder(null);
        resetForm();
      })
      .catch((error) => {
        handleOrderError(error);
      });
  };
  const handleOrderError = (error) => {
    // Stock-related error
    if (error?.available && error?.requested) {
      setFormErrors({
        quantity: `Only ${error.available} items available. You requested ${error.requested}.`,
      });
      return;
    }

    // Validation error from backend
    if (error?.response?.data?.errors) {
      setFormErrors(error.response.data.errors);
      return;
    }

    // Generic fallback
    setFormErrors({
      general:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create order",
    });
  };

  const submitOrder = async (event) => {
    event.preventDefault();

    const errors = {};

    if (!Product) errors.product = "Product is required";
    if (!Price) errors.price = "Price is required";
    if (!quantity) errors.quantity = "Quantity is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const orderData = {
      user: user?.id || "",
      Description,
      status,
      Product: {
        product: Product,
        price: Number(Price),
        quantity: Number(quantity),
      },
    };

    try {
      await dispatch(createdOrder(orderData)).unwrap();
      toast.success("Order created successfully");
      resetForm();
      setFormErrors({});
    } catch (error) {
      handleOrderError(error);
    }
  };

  const resetForm = () => {
    setProduct("");
    setPrice("");
    setQuantity("");
    setDescription("");
    setstatus("");
    setselectedOrder(null);
  };

  const handleEditClick = (order) => {
    setselectedOrder(order);
    setProduct(order.Product.product?._id || "");
    setPrice(order.Product?.price || "");
    setQuantity(order.Product?.quantity || "");
    setstatus(order.status || "");
    setDescription(order.Description || "");
    setIsFormVisible(true);
  };

  const handleRemove = async (OrderId) => {
    dispatch(Removedorder(OrderId))
      .unwrap()
      .then(() => {
        toast.success("Order removed successfully");
      })
      .catch((error) => {
        toast.error(error || "Failed to remove Order");
      });
  };

  const displayOrder = query.trim() !== "" ? searchdata : getorder;

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <OrderStatusChart />

      {/* Search + Add */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search order..."
        />

        <button
          onClick={() => setIsFormVisible(true)}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Add Order
        </button>
      </div>

      {/* Overlay */}
      {isFormVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => {
            setIsFormVisible(false);
            resetForm();
          }}
        />
      )}

      {/* Form slide-in */}
      {isFormVisible && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white p-6 border-l shadow-2xl z-50 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedOrder ? "Edit Order" : "Add Order"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={() => {
                setIsFormVisible(false);
                resetForm();
              }}
              className="cursor-pointer text-2xl"
            />
          </div>

          <form onSubmit={selectedOrder ? handleEditSubmit : submitOrder}>
            <div className="mb-4">
              <label>Product</label>
              <select
                value={Product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select a Product</option>
                {getallproduct?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label>Description</label>
              <input
                type="text"
                value={Description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                placeholder="Enter description"
              />
            </div>

            <div className="mb-4">
              <label>Price</label>
              <input
                type="number"
                value={Price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                placeholder="Enter price"
              />
            </div>

            <div className="mb-4">
              <label>Quantity</label>

              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setFormErrors((prev) => ({ ...prev, quantity: "" }));
                }}
                className={`w-full h-10 px-2 border-2 rounded-lg mt-2 ${
                  formErrors.quantity ? "border-red-500" : ""
                }`}
                placeholder="Enter quantity"
              />

              {formErrors.quantity && (
                <p className="text-red-600 text-sm mt-1">
                  {formErrors.quantity}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setstatus(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select status</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              {selectedOrder ? "Update Order" : "Add Order"}
            </button>
          </form>
        </div>
      )}

      {/* Orders Table */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-slate-500">
              <th className="px-5 py-4 font-medium">#</th>
              <th className="px-5 py-4 font-medium">Product</th>
              <th className="px-5 py-4 font-medium">Quantity</th>
              <th className="px-5 py-4 font-medium">Price</th>
              <th className="px-5 py-4 font-medium">Description</th>
              <th className="px-5 py-4 font-medium">Total Amount</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Created By</th>
              <th className="px-5 py-4 font-medium">Timestamp</th>
              <th className="px-5 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {Array.isArray(displayOrder) && displayOrder.length > 0 ? (
              displayOrder.map((order, index) => (
                <tr
                  key={order._id}
                  className="border-b last:border-b-0 hover:bg-slate-50 transition"
                >
                  <td className="px-5 py-4">{index + 1}</td>
                  <td className="px-5 py-4">
                    {order.Product?.product?.name || "N/A"}
                  </td>
                  <td className="px-5 py-4">{order.Product?.quantity}</td>
                  <td className="px-5 py-4">${order.Product?.price}</td>
                  <td className="px-5 py-4">{order.Description}</td>
                  <td className="px-5 py-4">${order.totalAmount || 0}</td>
                  <td className="px-5 py-4">{order.status}</td>
                  <td className="px-5 py-4">{order.user?.name || "N/A"}</td>
                  <td className="px-5 py-4">
                    <FormattedTime timestamp={order.createdAt} />
                  </td>
                  <td className="px-5 py-4 flex justify-end gap-2">
                    <button
                      onClick={() => handleRemove(order._id)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                      title="Delete"
                    >
                      <MdDelete size={18} />
                    </button>
                    <button
                      onClick={() => handleEditClick(order)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                      title="Edit"
                    >
                      <MdEdit size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-6 text-slate-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Orderpage;
