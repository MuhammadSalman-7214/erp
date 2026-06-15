import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { IoMdAdd, IoMdSearch } from "react-icons/io";
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
import { gettingallSupplier } from "../features/SupplierSlice";
import useKeyboardDropdown from "../hooks/useKeyboardDropdown";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";
import {
  Button,
  ConfirmDialog,
  Inputfield,
  SelectDropdown,
  Tooltip,
} from "../UI";

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
                  Order Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search orders by name, code or status.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {sortedOrder.length} records shown
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
              maxLength={120}
              placeholder="Search by name, code, status..."
            />
          </div>
          <div className="flex items-end">
            <Button onClick={openForm} variant="primary">
              <IoMdAdd className="text-xl mr-2" />
              Purchase Order
            </Button>
          </div>
        </div>
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
                <Inputfield
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
                  placeholder="Type product code"
                />
                {showCodeOptions && codeOptions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                    {codeOptions.map((option) => (
                      <Button
                        key={`${option.codeId}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        variant="ghost"
                        className={`w-full !justify-start px-3 py-2 text-sm !text-black !border-0 !shadow-none !rounded-none !bg-white ${
                          codeActiveIndex ===
                          codeOptions.findIndex(
                            (item) => item.codeId === option.codeId,
                          )
                            ? "!bg-slate-100"
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
                      </Button>
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
                        <Inputfield
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(item.codeId, e.target.value)
                          }
                          className="!max-w-[50px] !px-2 text-center"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          type="button"
                          onClick={() => removeFromCart(item.codeId)}
                          variant="danger"
                        >
                          <MdDelete size={18} />
                        </Button>
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
              <SelectDropdown
                value={status}
                onChange={(value) =>
                  setstatus(value?.target?.value ?? value ?? "")
                }
                placeholder="Select status"
              >
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </SelectDropdown>
            </div>
            <div className="mb-4">
              <label>Vendor (optional)</label>
              <SelectDropdown
                value={supplier}
                onChange={(value) =>
                  setsupplier(value?.target?.value ?? value ?? "")
                }
                placeholder="No vendor, stock only"
              >
                {getallSupplier?.map((supplier) => (
                  <option key={getId(supplier)} value={getId(supplier)}>
                    {supplier.name}
                  </option>
                ))}
              </SelectDropdown>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText={selectedOrder ? "Updating..." : "Creating..."}
              className="w-full"
            >
              {selectedOrder
                ? "Update Purchase Order"
                : "Create Purchase Order"}
            </Button>
          </form>
        </div>
      </DrawerPanel>

      {/* Orders Table */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {isTableLoading ? (
          <TableSkeleton rows={6} showFilters={false} />
        ) : Array.isArray(displayOrder) && displayOrder.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="max-w-[1230px] overflow-x-auto relative">
              <div className="flex gap-2">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="px-5 py-4 font-semibold">#</th>
                      <th className="px-5 py-4 font-semibold">Products</th>
                      <th className="px-5 py-4 font-semibold">Total Amount</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">
                        <DateSortHeader
                          label="Date"
                          direction={timestampSort}
                          onToggle={() =>
                            setTimestampSort((prev) =>
                              prev === "asc" ? "desc" : "asc",
                            )
                          }
                        />
                      </th>
                      <th
                        className="px-5 py-4 font-semibold text-center sticky right-0 bg-slate-50 z-20"
                        style={{
                          boxShadow: "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedOrder.map((order, index) => (
                      <tr
                        key={getId(order) || index}
                        className="group border-b border-slate-100 bg-white transition-colors duration-150 hover:bg-blue-50/30"
                      >
                        <td className="px-4 py-4 text-slate-400 text-xs font-medium">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            {(order.products || []).map((item) => (
                              <div
                                key={getId(item.productCode) || getId(item)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100"
                                style={{
                                  boxShadow: `
    0 0 0 1px rgba(232, 229, 229, 0.9),
    0 0 10px rgba(15,23,42,0.06),
    0 0 20px rgba(15,23,42,0.08)
  `,
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-800 truncate">
                                      {item.product?.name || "N/A"}
                                    </span>
                                    {item.product?.description && (
                                      <span
                                        className="text-xs text-slate-500 truncate max-w-[180px]"
                                        title={item.product.description}
                                      >
                                        {item.product.description}
                                      </span>
                                    )}
                                  </div>
                                  {(item.product?.company ||
                                    item.product?.brand) && (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {item.product?.company ||
                                        item.product?.brand}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  {item.productCode?.code || "—"}
                                </span>
                                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  ×{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-slate-600 font-medium">
                            Rs {order?.totalAmount}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const map = {
                              delivered:
                                "bg-teal-50 text-teal-700 border-teal-200",
                              pending:
                                "bg-amber-50 text-amber-700 border-amber-200",
                              completed:
                                "bg-blue-50 text-blue-700 border-blue-200",
                              cancelled:
                                "bg-rose-50 text-rose-600 border-rose-200",
                            };
                            const dot = {
                              delivered: "bg-teal-400",
                              pending: "bg-amber-400",
                              completed: "bg-blue-500",
                              cancelled: "bg-rose-400",
                            };
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${map[order.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${dot[order.status] || "bg-slate-400"}`}
                                />
                                {order.status}
                              </span>
                            );
                          })()}
                        </td>
                        {/* <td className="px-5 py-4">{order.vendor?.name || "N/A"}</td> */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-slate-700 text-xs font-medium">
                              <FormattedTime timestamp={order.createdAt} />
                            </span>
                          </div>
                        </td>
                          <td
                            className="px-4 py-4 sticky right-0 z-10 bg-gray-50/80 text-center transition-colors duration-150"
                            style={{
                              boxShadow: "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                            }}
                          >
                            <div className="flex justify-center">
                              <div className="flex items-center justify-center gap-2 overflow-hidden">
                              <Tooltip content="Edit Order">
                                <Button
                                  type="button"
                                  onClick={() => handleEditClick(order)}
                                  disabled={isLockedOrder(order)}
                                  variant="info"
                                  aria-label="Edit Order"
                                  size="sm"
                                  className={`metal-btn ${
                                    isLockedOrder(order)
                                      ? " text-blue-300 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  <MdEdit size={16} />
                                </Button>
                              </Tooltip>
                              {isLockedOrder(order) ? (
                                <Tooltip content="Delete Order">
                                  <Button
                                    type="button"
                                    variant="danger"
                                    aria-label="Locked after shipped or delivered"
                                    size="sm"
                                    className="metal-btn cursor-not-allowed"
                                    disabled
                                  >
                                    <MdDelete size={18} />
                                  </Button>
                                </Tooltip>
                              ) : (
                                <ConfirmDialog
                                  title={
                                    <div className="flex flex-col gap-1 max-w-xs">
                                      <span className="font-semibold text-red-600 text-sm">
                                        Confirm Permanent Deletion
                                      </span>
                                      <span className="text-xs text-gray-600 leading-snug">
                                        This action will permanently delete this
                                        order and all related transaction
                                        records. This operation cannot be
                                        undone.
                                      </span>
                                    </div>
                                  }
                                  okText="Yes, Delete"
                                  cancelText="Cancel"
                                  okButtonProps={{
                                    danger: true,
                                    className:
                                      "font-semibold bg-red-50 hover:bg-red-100 border border-red-100",
                                  }}
                                  cancelButtonProps={{
                                    className: "font-medium",
                                  }}
                                  placement="topRight"
                                  onConfirm={() => handleRemove(getId(order))}
                                >
                                  <Tooltip content="Delete Order">
                                    <Button
                                      type="button"
                                      className="metal-btn"
                                      variant="danger"
                                    >
                                      <MdDelete size={18} />
                                    </Button>
                                  </Tooltip>
                                </ConfirmDialog>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center">
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
