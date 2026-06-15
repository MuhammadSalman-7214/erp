import { useEffect, useMemo, useState } from "react";
import { IoMdAdd, IoMdSearch } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";
import {
  createStockTransaction,
  getAllStockTransactions,
  searchstockdata,
} from "../features/stocktransactionSlice";
import { gettingallSupplier } from "../features/SupplierSlice";
import { gettingallproducts } from "../features/productSlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import NoData from "../Components/NoData";
import DrawerPanel from "../Components/DrawerPanel";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";
import { Button, Inputfield, SelectDropdown } from "../UI";
import CodeBadge from "../Components/CodeBadge";

function StockTransaction({ readOnly = false }) {
  const { getallStocks, iscreatedStocks, searchdata } = useSelector(
    (state) => state.stocktransaction,
  );

  const { getallSupplier } = useSelector((state) => state.supplier);
  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [product, setproduct] = useState("");
  const [productCode, setProductCode] = useState("");
  const [type, settype] = useState("");
  const [quantity, setquantity] = useState("");
  const [supplier, setsupplier] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transactionDateSort, setTransactionDateSort] = useState("asc");
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  // Determine if page is in read-only mode (from props OR role)
  const isReadOnlyMode = readOnly || checkReadOnly("stock");
  const canWrite = hasPermission("stock", "write");
  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(searchstockdata(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    }
    dispatch(getAllStockTransactions());
  }, [query, dispatch]);

  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(getAllStockTransactions());
    dispatch(gettingallSupplier());
  }, [dispatch]);

  const selectedProductRecord = useMemo(
    () => getallproduct.find((p) => p.id === product),
    [getallproduct, product],
  );
  const availableCodes = selectedProductRecord?.productCodes || [];

  const resetForm = () => {
    setproduct("");
    setProductCode("");
    settype("");
    setquantity("");
    setsupplier("");
    setErrors({});
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    setSelectedProduct(null);
    resetForm();
  };

  const openForm = () => {
    setIsDrawerMinimized(false);
    setIsFormVisible(true);
    setErrors({});
  };

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

  const submitstocktranscation = async (event) => {
    event.preventDefault();

    if (!type || !product || !productCode || !quantity) {
      toast.error("Please fill all required fields!");
      return;
    }

    const typeCheck = validateField("type", type, (value) =>
      validateTextInput(value, "Type", {
        required: true,
        maxLength: 40,
      }),
    );
    if (!typeCheck.ok) {
      toast.error(typeCheck.message);
      return;
    }

    const quantityCheck = validateField("quantity", quantity, (value) =>
      validateNumberInput(value, "Quantity", {
        min: 1,
        allowZero: false,
        integer: true,
      }),
    );
    if (!quantityCheck.ok) {
      toast.error(quantityCheck.message);
      return;
    }

    const supplierCheck = validateField("supplier", supplier, (value) =>
      validateTextInput(value, "Vendor", {
        required: false,
        maxLength: 80,
        allowEmpty: true,
      }),
    );
    if (!supplierCheck.ok) {
      toast.error(supplierCheck.message);
      return;
    }

    const StocksData = {
      product,
      productCode,
      type: typeCheck.value,
      quantity: quantityCheck.value,
      supplier: supplierCheck.value || undefined,
    };
    dispatch(createStockTransaction(StocksData))
      .unwrap()
      .then(() => {
        toast.success("Stock added successfully");
        closeForm();
      })
      .catch((err) => {
        console.error("Error creating stock:", err);
        toast.error("Stock add unsuccessful");
      });
  };

  const displaystock = query.trim() !== "" ? searchdata : getallStocks;
  const sortedStock = useMemo(
    () =>
      sortByDateValue(
        displaystock || [],
        (stock) => stock.transactionDate,
        transactionDateSort,
      ),
    [displaystock, transactionDateSort],
  );
  const getRowStyle = (type = "") => {
    const normalizedType = String(type).trim().toLowerCase();
    if (normalizedType === "stock-in") {
      return "bg-emerald-50/70 hover:bg-emerald-100/80 border-[#40de90]";
    }
    if (normalizedType === "stock-out") {
      return "bg-amber-50/70 hover:bg-amber-100/80 border-amber-200";
    }
    return "bg-white hover:bg-slate-50 border-slate-200";
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
                  Stock Filters
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
              {sortedStock.length} records shown
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
              className="w-full"
              placeholder="Search your Stock"
            />
          </div>
        </div>
      </div>

      <DrawerPanel
        open={isFormVisible}
        title="Add Stock"
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={submitstocktranscation}>
            <div className="mb-4">
              <label>Product</label>
              <SelectDropdown
                value={product}
                onChange={(e) => {
                  setproduct(e.target.value);
                  setProductCode("");
                }}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select a product</option>
                {getallproduct?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.company || product.brand
                      ? ` • ${product.company || product.brand}`
                      : ""}
                  </option>
                ))}
              </SelectDropdown>
            </div>

            <div className="mb-4">
              <label>Product Code</label>
              <SelectDropdown
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select a product code</option>
                {availableCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code}
                    {code.variantName ? ` (${code.variantName})` : ""}
                  </option>
                ))}
              </SelectDropdown>
            </div>

            <div className="mb-4">
              <label>Type</label>
              <SelectDropdown
                value={type}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                onChange={(e) => {
                  const value = e.target.value;
                  settype(value);
                  validateField("type", value, (current) =>
                    validateTextInput(current, "Type", {
                      required: true,
                      maxLength: 40,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("type", e.target.value, (current) =>
                    validateTextInput(current, "Type", {
                      required: true,
                      maxLength: 40,
                    }),
                  )
                }
              >
                <option value="">Select type</option>

                <option value={"Stock-in"}>Stock-in</option>
                <option value={"Stock-out"}>Stock-out</option>
              </SelectDropdown>
              {errors.type && (
                <p className="mt-1 text-sm text-red-500">{errors.type}</p>
              )}
            </div>

            <div className="mb-4">
              <label>Quantity</label>
              <Inputfield
                type="number"
                placeholder="Enter product quantity"
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  setquantity(value);
                  validateField("quantity", value, (current) =>
                    validateNumberInput(current, "Quantity", {
                      min: 1,
                      allowZero: false,
                      integer: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("quantity", e.target.value, (current) =>
                    validateNumberInput(current, "Quantity", {
                      min: 1,
                      allowZero: false,
                      integer: true,
                    }),
                  )
                }
                min="1"
                step="1"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            <div className="mb-4">
              <label>Vendor</label>
              <SelectDropdown
                value={supplier}
                onChange={(e) => {
                  const value = e.target.value;
                  setsupplier(value);
                  validateField("supplier", value, (current) =>
                    validateTextInput(current, "Vendor", {
                      required: false,
                      maxLength: 80,
                      allowEmpty: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("supplier", e.target.value, (current) =>
                    validateTextInput(current, "Vendor", {
                      required: false,
                      maxLength: 80,
                      allowEmpty: true,
                    }),
                  )
                }
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select a Vendor</option>
                {getallSupplier?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </SelectDropdown>
              {errors.supplier && (
                <p className="mt-1 text-sm text-red-500">{errors.supplier}</p>
              )}
            </div>

            <Button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              {iscreatedStocks ? "Add Stock...." : "Add Stock"}
            </Button>
          </form>
        </div>
      </DrawerPanel>

      {/* Table Card */}
      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {Array.isArray(displaystock) && displaystock.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="max-w-[1230px] overflow-x-auto relative">
                <div className="flex gap-2">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">#</th>

                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 font-semibold">
                          Product Code
                        </th>
                        <th className="px-5 py-4 font-semibold">Type</th>
                        <th className="px-5 py-4 font-semibold">Quantity</th>
                        <th className="px-5 py-4 font-semibold">
                          <DateSortHeader
                            label="Date"
                            direction={transactionDateSort}
                            onToggle={() =>
                              setTransactionDateSort((prev) =>
                                prev === "asc" ? "desc" : "asc",
                              )
                            }
                          />
                        </th>
                        <th className="px-5 py-4 font-semibold">
                          Vendor/Customer
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedStock.map((stock, index) => (
                        <tr
                          key={stock.id}
                          className={` ${getRowStyle(stock.type)}`}
                        >
                          <td className="px-5 py-4">{index + 1}</td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              {stock.product?.name || "N/A"}
                            </div>
                            {stock.product?.company || stock.product?.brand ? (
                              <div className="text-xs text-slate-500">
                                {stock.product?.company || stock.product?.brand}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-5 py-4">
                            <CodeBadge>
                              {stock.productCode?.code || "-"}
                            </CodeBadge>
                          </td>
                          <td className="px-5 py-4">{stock.type}</td>
                          <td className="px-5 py-4">{stock.quantity}</td>
                          <td className="px-5 py-4">
                            <FormattedTime timestamp={stock.transactionDate} />
                          </td>
                          <td className="px-5 py-4">
                            {stock.type === "Stock-out"
                              ? stock.customer?.name ||
                                stock.customerName ||
                                stock.vendor?.name ||
                                stock.supplier?.name ||
                                "N/A"
                              : stock.vendor?.name ||
                                stock.supplier?.name ||
                                stock.customer?.name ||
                                "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10">
              <NoData
                title="No Stock Transactions Found"
                description="Try adjusting filters or add stock to get started."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockTransaction;
