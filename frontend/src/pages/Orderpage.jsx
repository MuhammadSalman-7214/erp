import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft, MdEdit, MdDelete } from "react-icons/md";
import FormattedTime from "../lib/FormattedTime";
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
import NoData from "../Components/NoData";

function Orderpage() {
  const { getorder, searchdata } = useSelector((state) => state.order);
  const { getallproduct } = useSelector((state) => state.product);
  const { getallSupplier } = useSelector((state) => state.supplier);
  const [supplier, setsupplier] = useState("");

  const { user } = useSelector((state) => state.auth);
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
  const [unitPrice, setUnitPrice] = useState(0);
  const getStatusBadge = (status) => {
    const mapping = {
      pending: "bg-yellow-50 text-yellow-700",
      shipped: "bg-blue-50 text-blue-700",
      delivered: "bg-teal-50 text-teal-700",
    };
    return mapping[status] || "bg-gray-200 text-gray-800";
  };

  useEffect(() => {
    dispatch(gettingallOrder());
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
  }, [dispatch, user]);

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
      Description,
      status,
      supplier,
      Product: {
        product: Product,
        quantity: Number(quantity),
        price: Number(Price),
      },
    };

    dispatch(updatestatusOrder({ OrderId: selectedOrder._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Order updated successfully");
        closeForm();
      })
      .catch((error) => {
        // handleOrderError(error);
      });
  };
  // const handleOrderError = (error) => {
  //   // Stock-related error
  //   if (error?.available && error?.requested) {
  //     setFormErrors({
  //       quantity: `Only ${error.available} items available. You requested ${error.requested}.`,
  //     });
  //     return;
  //   }

  //   // Validation error from backend
  //   if (error?.response?.data?.errors) {
  //     setFormErrors(error.response.data.errors);
  //     return;
  //   }

  //   // Generic fallback
  //   setFormErrors({
  //     general:
  //       error?.response?.data?.message ||
  //       error?.message ||
  //       "Failed to create order",
  //   });
  // };

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
      supplier,
      Product: {
        product: Product,
        price: Number(Price),
        quantity: Number(quantity),
      },
    };

    try {
      await dispatch(createdOrder(orderData)).unwrap();
      toast.success("Order created successfully");
      closeForm();
    } catch (error) {
      // handleOrderError(error);
    }
  };

  const resetForm = () => {
    setProduct("");
    setPrice("");
    setQuantity("");
    setDescription("");
    setstatus("");
    setsupplier("");
    setselectedOrder(null);
  };

  const closeForm = () => {
    setIsFormVisible(false);
    resetForm();
    setFormErrors({});
  };

  const handleEditClick = (order) => {
    setselectedOrder(order);
    setProduct(order.Product.product?._id || "");
    setPrice(order.Product?.price || "");
    setsupplier(order.supplier || "");

    const productObj = getallproduct.find(
      (p) => p._id === order.Product.product?._id,
    );

    if (productObj) setUnitPrice(productObj.Price || 0);
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
    <div className="min-h-[92vh] p-4">
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
          onClick={() => {
            setIsFormVisible(true);
            resetForm();
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Add Order
        </button>
      </div>

      {/* Overlay */}
      {isFormVisible && (
        <div className="app-modal-overlay" onClick={closeForm} />
      )}

      {/* Form slide-in */}
      {isFormVisible && (
        <div className="app-modal-drawer app-modal-drawer-md">
          <div className="app-modal-header">
            <h2 className="app-modal-title">
              {selectedOrder ? "Edit Order" : "Add Order"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={closeForm}
              className="cursor-pointer text-2xl text-slate-500 hover:text-slate-800"
            />
          </div>

          <form
            onSubmit={selectedOrder ? handleEditSubmit : submitOrder}
            className="app-modal-body"
          >
            <div className="mb-4">
              <label>Product</label>
              <select
                value={Product}
                onChange={(e) => {
                  const selectedProductId = e.target.value;
                  setProduct(selectedProductId);

                  // Find selected product from the fetched products list
                  const selectedProduct = getallproduct.find(
                    (p) => p._id === selectedProductId,
                  );

                  if (selectedProduct) {
                    setUnitPrice(selectedProduct.Price); // store unit price
                    setPrice(
                      quantity ? selectedProduct.Price * Number(quantity) : "",
                    ); // update total price
                  } else {
                    setUnitPrice(0);
                    setPrice("");
                  }

                  setFormErrors((prev) => ({ ...prev, product: "" }));
                }}
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
              <label>Quantity</label>

              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  setQuantity(qty);

                  if (unitPrice) {
                    setPrice(unitPrice * qty); // auto-calculate total price
                  }

                  setFormErrors((prev) => ({ ...prev, quantity: "" }));
                }}
                className={`w-full h-10 px-2 border-2 rounded-lg mt-2 `}
                placeholder="Enter quantity"
              />

              {formErrors.quantity && (
                <p className="text-red-600 text-sm mt-1">
                  {formErrors.quantity}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label>Price</label>
              <input
                type="number"
                value={Price}
                readOnly
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-gray-100 cursor-not-allowed"
                placeholder="Price auto-calculated"
              />
            </div>
            <div className="mb-4">
              <label>Supplier</label>
              <select
                value={supplier}
                onChange={(e) => setsupplier(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select a Supplier</option>
                {getallSupplier?.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
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
      <div className="mt-4 app-card overflow-hidden">
        {" "}
        {/* Scrollable Container */}
        <div className="overflow-auto max-h-[600px]">
          {Array.isArray(displayOrder) && displayOrder.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b sticky top-0 z-10">
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-3 font-medium whitespace-nowrap w-12">
                    #
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "180px" }}
                  >
                    Order No
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "150px" }}
                  >
                    Product
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap text-center"
                    style={{ minWidth: "100px" }}
                  >
                    Qty
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "120px" }}
                  >
                    Amount
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "250px" }}
                  >
                    Description
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "120px" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "140px" }}
                  >
                    Created By
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap"
                    style={{ minWidth: "150px" }}
                  >
                    Date
                  </th>
                  <th
                    className="px-4 py-3 font-medium whitespace-nowrap sticky right-0 bg-slate-50"
                    style={{ minWidth: "100px" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayOrder.map((order, index) => (
                  <tr
                    key={order._id}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {order.orderNumber || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-block max-w-[150px] truncate align-middle"
                        title={order.Product?.product?.name || "N/A"}
                      >
                        {order.Product?.product?.name || "N/A"}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                        {order.Product?.quantity}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                      {`${order?.currency} ${order.Product?.price?.toLocaleString()}`}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="inline-block max-w-[250px] truncate align-middle text-slate-600"
                        title={order.Description}
                      >
                        {order.Description || "No description"}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
                    ${getStatusBadge(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                          {order.user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div> */}
                        <span
                          className="text-xs font-medium text-slate-700 truncate max-w-[100px]"
                          title={order.user?.name}
                        >
                          {order.user?.name || "N/A"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      <FormattedTime timestamp={order.createdAt} />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRemove(order._id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                          title="Delete Order"
                        >
                          <MdDelete size={16} />
                        </button>
                        <button
                          disabled={order.status === "delivered"}
                          onClick={() => handleEditClick(order)}
                          className={`p-1.5 rounded-lg transition
                      ${
                        order.status === "delivered"
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }
                    `}
                          title={
                            order.status === "delivered"
                              ? "Cannot edit delivered order"
                              : "Edit Order"
                          }
                        >
                          <MdEdit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10">
              <NoData
                title="No Orders Found"
                description="Try adjusting filters or add a new order to get started."
              />
            </div>
          )}
        </div>
        {/* {displayOrder.length > 0 && (
          <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500 text-center">
            Scroll horizontally to view all columns →
          </div>
        )} */}
      </div>
    </div>
  );
}

export default Orderpage;
