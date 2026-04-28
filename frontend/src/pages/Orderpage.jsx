import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { IoMdAdd } from "react-icons/io";
import { MdEdit, MdDelete } from "react-icons/md";
import FormattedTime from "../lib/FormattedTime";
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
import useKeyboardDropdown from "../hooks/useKeyboardDropdown";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";

function Orderpage() {
  const getId = (value) => value?.id ?? value?.id ?? value;
  const { getorder, isgetorder, editorder, searchdata, issearchdata } =
    useSelector((state) => state.order);
  const { getallproduct } = useSelector((state) => state.product);
  const { getallSupplier } = useSelector((state) => state.supplier);
  const [supplier, setsupplier] = useState("");

  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [query, setquery] = useState("");
  const [status, setstatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedOrder, setselectedOrder] = useState(null);
  const [codeQuery, setCodeQuery] = useState("");
  const [debouncedCodeQuery, setDebouncedCodeQuery] = useState("");
  const [showCodeOptions, setShowCodeOptions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [timestampSort, setTimestampSort] = useState("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getStatusBadge = (status) => {
    const mapping = {
      pending: "bg-yellow-50 text-yellow-700",
      shipped: "bg-blue-50 text-blue-700",
      delivered: "bg-teal-50 text-teal-700",
    };
    return mapping[status] || "bg-gray-200 text-gray-800";
  };
  const isLockedOrder = (order) => {
    const status = String(order?.status || "")
      .trim()
      .toLowerCase();
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

    const statusCheck = validateTextInput(status, "Status", {
      required: true,
      maxLength: 40,
    });
    if (!statusCheck.ok) {
      toast.error(statusCheck.message);
      return;
    }

    const supplierCheck = validateTextInput(supplier, "Vendor", {
      required: false,
      maxLength: 80,
      allowEmpty: true,
    });
    if (!supplierCheck.ok) {
      toast.error(supplierCheck.message);
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
        quantity: validateNumberInput(item.quantity, "Quantity", {
          min: 1,
          allowZero: false,
          integer: true,
        }).value,
        price: resolvedUnitPrice,
      };
    });

    const totalAmount = resolvedProducts.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );

    const updatedData = {
      user: user?.id || " ",
      status: statusCheck.value,
      supplier: supplierCheck.value || undefined,
      Product: resolvedProducts[0],
      products: resolvedProducts,
      totalAmount,
    };

    setIsSubmitting(true);
    dispatch(updatestatusOrder({ OrderId: getId(selectedOrder), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Order updated successfully");
        closeForm();
      })
      .catch((error) => {
        // handleOrderError(error);
      })
      .finally(() => setIsSubmitting(false));
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

  const {
    activeIndex: codeActiveIndex,
    onKeyDown: onCodeKeyDown,
    setActiveIndex: setCodeActiveIndex,
  } = useKeyboardDropdown({
    options: codeOptions,
    isOpen: showCodeOptions && codeOptions.length > 0,
    onSelect: (option) => addToCart(option),
    onClose: () => setShowCodeOptions(false),
  });

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

    const statusCheck = validateTextInput(status, "Status", {
      required: true,
      maxLength: 40,
    });
    if (!statusCheck.ok) {
      toast.error(statusCheck.message);
      return;
    }

    const supplierCheck = validateTextInput(supplier, "Vendor", {
      required: false,
      maxLength: 80,
      allowEmpty: true,
    });
    if (!supplierCheck.ok) {
      toast.error(supplierCheck.message);
      return;
    }

    try {
      const orderData = {
        user: user?.id || "",
        status: statusCheck.value,
        supplier: supplierCheck.value || undefined,
        vendor: supplierCheck.value || undefined,
        products: cartItems.map((item) => ({
          product: item.productId,
          productCode: item.codeId,
          quantity: validateNumberInput(item.quantity, "Quantity", {
            min: 1,
            allowZero: false,
            integer: true,
          }).value,
        })),
      };

      setIsSubmitting(true);
      await dispatch(createdOrder(orderData)).unwrap();

      toast.success("Order created successfully");

      closeForm();

      dispatch(gettingallOrder()); // REFRESH LIST
    } catch (error) {
      // handleOrderError(error);
    } finally {
      setIsSubmitting(false);
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

  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    resetForm();
  };

  const openForm = (order = null) => {
    setIsDrawerMinimized(false);
    if (!order) {
      setselectedOrder(null);
      setstatus("");
      setsupplier("");
      setCartItems([]);
      setCodeQuery("");
      setShowCodeOptions(false);
    }
    setIsFormVisible(true);
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
    openForm(order);
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
  const sortedOrder = useMemo(
    () =>
      sortByDateValue(
        displayOrder || [],
        (order) => order.createdAt,
        timestampSort,
      ),
    [displayOrder, timestampSort],
  );
  const isTableLoading = isgetorder || (query.trim() !== "" && issearchdata);

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* <OrderStatusChart /> */}

      {/* Search + Add */}
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          maxLength={120}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search order..."
        />

        <button
          onClick={openForm}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" />
          Purchase Order
        </button>
      </div>

      <DrawerPanel
        open={isFormVisible}
        title={
          selectedOrder ? "Update Purchase Order" : "Create Purchase Order"
        }
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
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
                  onFocus={() => {
                    setShowCodeOptions(true);
                    setCodeActiveIndex(0);
                  }}
                  onKeyDownCapture={onCodeKeyDown}
                  maxLength={120}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  placeholder="Type product code"
                />
                {showCodeOptions && codeOptions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                    {codeOptions.map((option) => (
                      <button
                        key={`${option.codeId}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          codeActiveIndex ===
                          codeOptions.findIndex(
                            (item) => item.codeId === option.codeId,
                          )
                            ? "bg-slate-50"
                            : ""
                        }`}
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
            <div className="mb-4">
              <label>Vendor (optional)</label>
              <select
                value={supplier}
                onChange={(e) => setsupplier(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">No vendor, stock only</option>
                {getallSupplier?.map((supplier) => (
                  <option key={getId(supplier)} value={getId(supplier)}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={selectedOrder ? "Updating..." : "Creating..."}
              className="mt-4 h-12 w-full rounded-lg bg-teal-800 text-white hover:bg-teal-700"
            >
              {selectedOrder
                ? "Update Purchase Order"
                : "Create Purchase Order"}
            </LoadingButton>
          </form>
        </div>
      </DrawerPanel>

      {/* Orders Table */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {isTableLoading ? (
          <TableSkeleton rows={6} showFilters={false} />
        ) : Array.isArray(displayOrder) && displayOrder.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-slate-500">
                <th className="px-5 py-4 font-medium">#</th>
                <th className="px-5 py-4 font-medium">Products</th>
                <th className="px-5 py-4 font-medium">Total Amount</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <DateSortHeader
                  label="Date"
                  direction={timestampSort}
                  onToggle={() =>
                    setTimestampSort((prev) =>
                      prev === "asc" ? "desc" : "asc",
                    )
                  }
                />
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedOrder.map((order, index) => (
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
