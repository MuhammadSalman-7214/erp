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
  const { getorder, searchdata } = useSelector((state) => state.order);
  const { getallproduct } = useSelector((state) => state.product);
  const { Authuser } = useSelector((state) => state.auth);
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
  }, [dispatch, Authuser]);

  useEffect(() => {
    if (query.trim() !== "") {
      const timeout = setTimeout(() => {
        dispatch(SearchOrder(query));
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [query, dispatch]);

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
    setDescription(order.Description || "");
    setstatus(order.status || "");
    setIsFormVisible(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!Product || !Price || !quantity) {
      toast.error("Product, Price and Quantity are required");
      return;
    }

    const orderData = {
      user: Authuser?.id || "",
      Description,
      status,
      Product: {
        product: Product,
        price: Number(Price),
        quantity: Number(quantity),
      },
    };

    if (selectedOrder) {
      // Edit
      dispatch(
        updatestatusOrder({
          OrderId: selectedOrder._id,
          updatedData: orderData,
        }),
      )
        .unwrap()
        .then(() => {
          toast.success("Order updated successfully");
          setIsFormVisible(false);
          resetForm();
        })
        .catch(() => toast.error("Failed to update order"));
    } else {
      // Create
      dispatch(createdOrder(orderData))
        .unwrap()
        .then(() => {
          toast.success("Order created successfully");
          resetForm();
        })
        .catch(() => toast.error("Failed to create order"));
    }
  };

  const handleRemove = (id) => {
    dispatch(Removedorder(id))
      .unwrap()
      .then(() => toast.success("Order removed"))
      .catch(() => toast.error("Failed to remove order"));
  };

  // Client-side filter fallback
  const displayOrders = query.trim() ? searchdata : getorder;

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

          <form onSubmit={handleSubmit}>
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
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                placeholder="Enter quantity"
              />
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
            {Array.isArray(displayOrders) && displayOrders.length > 0 ? (
              displayOrders.map((order, index) => (
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
                      className="px-3 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleEditClick(order)}
                      className="px-3 py-1 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                    >
                      Edit
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
