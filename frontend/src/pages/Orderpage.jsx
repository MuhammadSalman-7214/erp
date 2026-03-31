import { useEffect, useMemo, useState } from "react";
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
import NoData from "../Components/NoData";
import { Popconfirm } from "antd";
import { gettingallSupplier } from "../features/SupplierSlice";

function Orderpage() {
  const getId = (value) => value?.id ?? value?.id ?? value;
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
  const { getallSupplier } = useSelector((state) => state.supplier);
  const [supplier, setsupplier] = useState("");

  const { user, isUserSignup } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [query, setquery] = useState("");
  const [status, setstatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedOrder, setselectedOrder] = useState(null);
  const [codeQuery, setCodeQuery] = useState("");
  const [debouncedCodeQuery, setDebouncedCodeQuery] = useState("");
  const [showCodeOptions, setShowCodeOptions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const getStatusBadge = (status) => {
    const mapping = {
      pending: "bg-yellow-50 text-yellow-700",
      shipped: "bg-blue-50 text-blue-700",
      delivered: "bg-teal-50 text-teal-700",
    };
    return mapping[status] || "bg-gray-200 text-gray-800";
  };
  const isLockedOrder = (order) => {
    const status = String(order?.status || "").trim().toLowerCase();
    return status === "shipped" || status === "delivered";
  };

  useEffect(() => {
    dispatch(gettingallOrder());
    dispatch(gettingallproducts());
    dispatch(gettingallSupplier());
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
          productId: getId(product),
          codeId: getId(code),
          code: code.code,
          name: product.name,
          description: product.description,
          company: product.company || product.brand || "",
          unitPrice: Number(
            product.purchasePrice ??
              product.pricing?.currentPurchasePrice ??
              code.purchasePrice ??
              0,
          ),
        });
      });
    });
    return results.slice(0, 20);
  }, [debouncedCodeQuery, getallproduct]);

  const buildCartItemsFromOrder = (order) => {
    const list =
      Array.isArray(order?.products) && order.products.length
        ? order.products
        : order?.Product
          ? [order.Product]
          : [];

    return list.map((item) => {
      const productId = getId(item.product) || item.product;
      const codeId = getId(item.productCode) || item.productCode;
      const productRecord = getallproduct.find((p) => getId(p) === productId);
      const codeRecord = productRecord?.productCodes?.find(
        (code) => getId(code) === codeId,
      );
      const resolvedUnitPrice = Number(
        item.price ??
          productRecord?.purchasePrice ??
          productRecord?.pricing?.currentPurchasePrice ??
          codeRecord?.purchasePrice ??
          0,
      );
      return {
        productId,
        codeId,
        name: productRecord?.name || item.product?.name || "Product",
        company:
          productRecord?.company ||
          productRecord?.brand ||
          item.product?.company ||
          item.product?.brand ||
          "",
        code: codeRecord?.code || item.productCode?.code || "code",
        quantity: Number(item.quantity || 0),
        unitPrice: resolvedUnitPrice,
      };
    });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!selectedOrder) return;
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

    const resolvedProducts = cartItems.map((item) => {
      const productRecord = getallproduct.find(
        (p) => getId(p) === item.productId,
      );
      const codeRecord = productRecord?.productCodes?.find(
        (code) => getId(code) === item.codeId,
      );
      const resolvedUnitPrice = Number(
        item.unitPrice ??
          productRecord?.purchasePrice ??
          productRecord?.pricing?.currentPurchasePrice ??
          codeRecord?.purchasePrice ??
          0,
      );
      return {
        product: item.productId,
        productCode: item.codeId,
        quantity: Number(item.quantity),
        price: resolvedUnitPrice,
      };
    });

    const totalAmount = resolvedProducts.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );

    const updatedData = {
      user: user?.id || " ",
      status,
      supplier,
      Product: resolvedProducts[0],
      products: resolvedProducts,
      totalAmount,
    };

    dispatch(updatestatusOrder({ OrderId: getId(selectedOrder), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Order updated successfully");
        setIsFormVisible(false);
        setselectedOrder(null);
        resetForm();
      })
      .catch((error) => {
        // handleOrderError(error);
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
      return [...prev, { ...item, quantity: 1 }];
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

  const submitOrder = async (event) => {
    event.preventDefault();

    if (!supplier) {
      toast.error("Vendor is required");
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

    try {
      const orderData = {
        user: user?.id || "",
        status,
        supplier,
        vendor: supplier,
        products: cartItems.map((item) => ({
          product: item.productId,
          productCode: item.codeId,
          quantity: Number(item.quantity),
        })),
      };

      await dispatch(createdOrder(orderData)).unwrap();

      toast.success("Order created successfully");

      setIsFormVisible(false); // CLOSE MODAL
      resetForm();
      setCartItems([]);
      setCodeQuery("");

      dispatch(gettingallOrder()); // REFRESH LIST
    } catch (error) {
      // handleOrderError(error);
    }
  };

  const resetForm = () => {
    setstatus("");
    setsupplier("");
    setselectedOrder(null);
    setCartItems([]);
    setCodeQuery("");
    setShowCodeOptions(false);
  };

  const handleEditClick = (order) => {
    if (isLockedOrder(order)) {
      toast.error("Shipped or delivered purchase orders cannot be updated");
      return;
    }
    setselectedOrder(order);
    setsupplier(order.supplier || "");
    setCartItems(buildCartItemsFromOrder(order));
    setCodeQuery("");
    setShowCodeOptions(false);
    setstatus(order.status || "");
    setIsFormVisible(true);
  };

  const handleRemove = async (OrderId) => {
    const targetOrder = (Array.isArray(displayOrder) ? displayOrder : []).find(
      (order) => String(getId(order)) === String(OrderId),
    );
    if (isLockedOrder(targetOrder)) {
      toast.error("Shipped or delivered purchase orders cannot be deleted");
      return;
    }
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
      {/* <OrderStatusChart /> */}

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
          <IoMdAdd className="text-xl mr-2" />
          Purchase Order
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
              {selectedOrder
                ? "Update Purchase Order"
                : "Create Purchase Order"}
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
                        {option.company ? ` • ${option.company}` : ""}
                        <span className="text-xs text-slate-600">
                          {" "}
                          - {option.description}
                        </span>
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
                      <div className="col-span-6">
                        <div className="font-medium text-slate-800">
                          {item.name}
                        </div>
                        {item.company ? (
                          <div className="text-xs text-slate-500">
                            {item.company}
                          </div>
                        ) : null}
                      </div>
                      <div className="col-span-3 ">
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
                          className="w-full h-9 px-3 border rounded min-w-[90px]"
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-2">
                  No items added yet.
                </div>
              )}
            </div>
            <div className="mb-4">
              <label>Vendor</label>
              <select
                value={supplier}
                onChange={(e) => setsupplier(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                required
              >
                <option value="">Select a Vendor</option>
                {getallSupplier?.map((supplier) => (
                  <option key={getId(supplier)} value={getId(supplier)}>
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
              {selectedOrder
                ? "Update Purchase Order"
                : "Create Purchase Order"}
            </button>
          </form>
        </div>
      )}

      {/* Orders Table */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {Array.isArray(displayOrder) && displayOrder.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-slate-500">
                <th className="px-5 py-4 font-medium">#</th>
                <th className="px-5 py-4 font-medium">Products</th>
                <th className="px-5 py-4 font-medium">Total Amount</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Timestamp</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayOrder.map((order, index) => (
                <tr
                  key={getId(order) || index}
                  className="border-b last:border-b-0 hover:bg-slate-50 transition"
                >
                  <td className="px-5 py-4">{index + 1}</td>
                  <td className="px-5 py-4">
                    {(order.products?.length
                      ? order.products
                      : order.Product
                        ? [order.Product]
                        : []
                    ).map((item) => (
                      <div
                        key={getId(item.productCode) || item.productCode}
                        className="flex items-center gap-2 px-3 py-2 mb-1 last:mb-0 rounded-md bg-slate-50 border border-slate-300"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">
                              {item.product?.name || "N/A"}
                            </span>
                            {item.product?.description && (
                              <span
                                className="text-xs text-slate-500 truncate max-w-[200px]"
                                title={item.product.description}
                              >
                                — {item.product.description}
                              </span>
                            )}
                          </div>
                          {(item.product?.company || item.product?.brand) && (
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {item.product?.company || item.product?.brand}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {item.productCode?.code || "-"}
                        </span>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                          × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-4">Rs {order?.totalAmount}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>{" "}
                  {/* <td className="px-5 py-4">{order.vendor?.name || "N/A"}</td> */}
                  <td className="px-5 py-4">
                    <FormattedTime timestamp={order.createdAt} />
                  </td>
                  <td className="px-5 py-4 ">
                    {isLockedOrder(order) ? (
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-slate-100 text-slate-300 cursor-not-allowed mr-2"
                        title="Locked after shipped or delivered"
                        disabled
                      >
                        <MdDelete size={18} />
                      </button>
                    ) : (
                      <Popconfirm
                        title={
                          <div className="flex flex-col gap-1 max-w-xs">
                            <span className="font-semibold text-red-600 text-sm">
                              Confirm Permanent Deletion
                            </span>
                            <span className="text-xs text-gray-600 leading-snug">
                              This action will permanently delete this order and
                              all related transaction records. This operation
                              cannot be undone.
                            </span>
                          </div>
                        }
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{
                          danger: true,
                          className: "font-semibold",
                        }}
                        cancelButtonProps={{
                          className: "font-medium",
                        }}
                        placement="topRight"
                        onConfirm={() => handleRemove(getId(order))}
                      >
                        <button
                          className="
      p-2 rounded-lg
      bg-slate-100
      hover:bg-red-100
      text-red-600
      transition-all duration-200
      hover:shadow-sm
      mr-2
    "
                          title="Delete Order"
                        >
                          <MdDelete size={18} />
                        </button>
                      </Popconfirm>
                    )}
                    <button
                      onClick={() => handleEditClick(order)}
                      disabled={isLockedOrder(order)}
                      className={`p-2 rounded-lg transition ${
                        isLockedOrder(order)
                          ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                          : "bg-slate-100 hover:bg-blue-100 text-blue-600"
                      }`}
                      title="Edit"
                    >
                      <MdEdit size={18} />
                    </button>
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
    </div>
  );
}

export default Orderpage;
