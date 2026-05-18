import { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
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
import InputField from "../Components/InputField";
import SelectField from "../Components/SelectField";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";

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
      return "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200";
    }
    if (normalizedType === "stock-out") {
      return "bg-amber-50/70 hover:bg-amber-100/80 border-amber-200";
    }
    return "bg-white hover:bg-slate-50 border-slate-200";
  };
  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* <Stocktanscationgraph /> */}

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <InputField
          containerClassName="w-full md:w-96"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          maxLength={120}
          placeholder="Enter your Stock"
        />
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
            <SelectField
              containerClassName="mb-4"
              label="Product"
              value={product}
              onChange={(e) => {
                setproduct(e.target.value);
                setProductCode("");
              }}
              placeholder="Select a product"
              options={getallproduct?.map((product) => ({
                label: `${product.name}${product.company || product.brand ? ` • ${product.company || product.brand}` : ""}`,
                value: product.id,
              }))}
            />

            <SelectField
              containerClassName="mb-4"
              label="Product Code"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="Select a product code"
              options={availableCodes.map((code) => ({
                label: `${code.code}${code.variantName ? ` (${code.variantName})` : ""}`,
                value: code.id,
              }))}
            />

            <SelectField
              containerClassName="mb-4"
              label="Type"
              value={type}
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
              placeholder="Select type"
              options={[
                { label: "Stock-in", value: "Stock-in" },
                { label: "Stock-out", value: "Stock-out" },
              ]}
              error={errors.type}
            />

            <InputField
              containerClassName="mb-4"
              label="Quantity"
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
              error={errors.quantity}
            />

            <SelectField
              containerClassName="mb-4"
              label="Vendor"
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
              placeholder="Select a Vendor"
              options={getallSupplier?.map((supplier) => ({
                label: supplier.name,
                value: supplier.id,
              }))}
              error={errors.supplier}
            />

            <button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              {iscreatedStocks ? "Add Stock...." : "Add Stock"}
            </button>
          </form>
        </div>
      </DrawerPanel>

      {/* Table Card */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {Array.isArray(displaystock) && displaystock.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-slate-500">
                <th className="px-5 py-4 font-medium">#</th>
                <DateSortHeader
                  label="Date"
                  direction={transactionDateSort}
                  onToggle={() =>
                    setTransactionDateSort((prev) =>
                      prev === "asc" ? "desc" : "asc",
                    )
                  }
                />
                <th className="px-5 py-4 font-medium">Product</th>
                <th className="px-5 py-4 font-medium">Product Code</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Quantity</th>
                <th className="px-5 py-4 font-medium">Vendor/Customer</th>
              </tr>
            </thead>

            <tbody>
              {sortedStock.map((stock, index) => (
                <tr
                  key={stock.id}
                  className={`border-b last:border-b-0 transition ${getRowStyle(
                    stock.type,
                  )}`}
                >
                  <td className="px-5 py-4">{index + 1}</td>
                  <td className="px-5 py-4">
                    <FormattedTime timestamp={stock.transactionDate} />
                  </td>
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
                    <span className="inline-flex items-center px-3 py-1 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-md">
                      {stock.productCode?.code || "-"}
                    </span>{" "}
                  </td>
                  <td className="px-5 py-4">{stock.type}</td>
                  <td className="px-5 py-4">{stock.quantity}</td>
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
  );
}

export default StockTransaction;
