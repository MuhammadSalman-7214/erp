import { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";
import Stocktanscationgraph from "../lib/Stocktanscationgraph";
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

function StockTransaction({ readOnly = false }) {
  const { getallStocks, isgetallStocks, iscreatedStocks, searchdata } =
    useSelector((state) => state.stocktransaction);

  const { getallSupplier } = useSelector((state) => state.supplier);
  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [product, setproduct] = useState("");
  const [productCode, setProductCode] = useState("");
  const [type, settype] = useState("");
  const [quantity, setquantity] = useState("");
  const [supplier, setsupplier] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
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
  };

  const submitstocktranscation = async (event) => {
    event.preventDefault();

    if (!type || !product || !productCode || !quantity) {
      toast.error("Please fill all required fields!");
      return;
    }

    const StocksData = { product, productCode, type, quantity, supplier };
    dispatch(createStockTransaction(StocksData))
      .unwrap()
      .then(() => {
        toast.success("Stock added successfully");
        resetForm();
      })
      .catch((err) => {
        console.error("Error creating stock:", err);
        toast.error("Stock add unsuccessful");
      });
  };

  const displaystock = query.trim() !== "" ? searchdata : getallStocks;
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

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Enter your Stock"
        />

        {canWrite && (
          <button
            onClick={() => {
              setIsFormVisible(true);
              setSelectedProduct(null);
            }}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Stock
          </button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
      </div>
      {/* Overlay */}
      {isFormVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsFormVisible(false)}
        />
      )}
      {isFormVisible && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white p-6 border-l shadow-2xl z-50 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Add Stock</h2>
            <MdKeyboardDoubleArrowLeft
              onClick={() => setIsFormVisible(false)}
              className="cursor-pointer text-2xl"
            />
          </div>

          <form onSubmit={submitstocktranscation}>
            <div className="mb-4">
              <label>Product</label>
              <select
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
              </select>
            </div>

            <div className="mb-4">
              <label>Product Code</label>
              <select
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
              </select>
            </div>

            <div className="mb-4">
              <label>Type</label>
              <select
                value={type}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                onChange={(e) => settype(e.target.value)}
              >
                <option value="">Select type</option>

                <option value={"Stock-in"}>Stock-in</option>
                <option value={"Stock-out"}>Stock-out</option>
              </select>
            </div>

            <div className="mb-4">
              <label>Quantity</label>
              <input
                type="number"
                placeholder="Enter product quantity"
                value={quantity}
                onChange={(e) => setquantity(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              />
            </div>

            <div className="mb-4">
              <label>Vendor</label>
              <select
                value={supplier}
                onChange={(e) => setsupplier(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
              >
                <option value="">Select a Vendor</option>
                {getallSupplier?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              {iscreatedStocks ? "Add Stock...." : "Add Stock"}
            </button>
          </form>
        </div>
      )}

      {/* Table Card */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {Array.isArray(displaystock) && displaystock.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-slate-500">
                <th className="px-5 py-4 font-medium">#</th>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Product</th>
                <th className="px-5 py-4 font-medium">Product Code</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Quantity</th>
                <th className="px-5 py-4 font-medium">Vendor/Customer</th>
              </tr>
            </thead>

            <tbody>
              {displaystock.map((stock, index) => (
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
