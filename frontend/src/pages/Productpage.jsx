import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd, IoMdTrash } from "react-icons/io";
import {
  MdDelete,
  MdEdit,
  MdKeyboardDoubleArrowLeft,
  MdOutlineCategory,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";
import { FaMoneyBill1Wave, FaPalette } from "react-icons/fa6";

import {
  Addproduct,
  gettingallproducts,
  Searchproduct,
  Removeproduct,
  EditProduct,
  addProductCode,
  updateProductCode,
  deleteProductCode,
} from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { AiOutlineProduct } from "react-icons/ai";
import NoData from "../Components/NoData";
import { Popconfirm } from "antd";

const emptyCode = {
  code: "",
  quantity: "",
};

function Productpage({ readOnly = false }) {
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  // Determine if page is in read-only mode (from props OR role)
  const isReadOnlyMode = readOnly || checkReadOnly("product");
  const canWrite = hasPermission("product", "write");
  const canDelete = hasPermission("product", "delete");

  const { getallproduct, editedProduct, isproductadd, searchdata } =
    useSelector((state) => state.product);

  const { getallCategory } = useSelector((state) => state.category);

  const dispatch = useDispatch();

  const [productCodeQuery, setProductCodeQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [company, setCompany] = useState("");
  const [Category, setCategory] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [dateAdded, setDateAdded] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeProductId, setCodeProductId] = useState(null);
  const [codeForm, setCodeForm] = useState({ ...emptyCode });
  const [codeEdits, setCodeEdits] = useState({});

  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
  }, [dispatch, editedProduct, isproductadd]);

  useEffect(() => {
    if (productCodeQuery.trim() !== "") {
      const debounce = setTimeout(() => {
        dispatch(Searchproduct(productCodeQuery));
      }, 500); // debounce for 0.5s
      return () => clearTimeout(debounce);
    }
    dispatch(gettingallproducts());
  }, [productCodeQuery, dispatch]);

  const handleremove = async (productId) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete products");
      return;
    }

    dispatch(Removeproduct(productId))
      .unwrap()
      .then(() => toast.success("Product removed successfully"))
      .catch((error) => toast.error(error || "Failed to remove product"));
  };

  const handleRowDelete = ({ productId, codeId, codeCount }) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete products");
      return;
    }

    if (codeId && codeCount > 1) {
      dispatch(deleteProductCode({ codeId, productId }))
        .unwrap()
        .then(() => toast.success("Code deleted successfully"))
        .catch((error) => toast.error(error || "Failed to delete code"));
      return;
    }

    handleremove(productId);
  };

  const normalizePrice = (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to edit products");
      return;
    }

    if (!selectedProduct) return;

    const updatedData = {
      name,
      description,
      company,
      Category,
      purchasePrice: normalizePrice(purchasePrice),
      tradePrice: normalizePrice(tradePrice),
      salePrice: normalizePrice(salePrice),
      dateAdded: selectedProduct.dateAdded || new Date().toISOString(),
    };
    dispatch(EditProduct({ id: selectedProduct._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Product updated successfully");
        closeForm();
      })
      .catch(() => toast.error("Failed to update product"));
  };

  const submitProduct = async (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to create products");
      return;
    }

    const productData = {
      name,
      description,
      company,
      Category,
      purchasePrice: normalizePrice(purchasePrice),
      tradePrice: normalizePrice(tradePrice),
      salePrice: normalizePrice(salePrice),
      dateAdded: new Date(dateAdded).toISOString(),
    };

    dispatch(Addproduct(productData))
      .unwrap()
      .then(() => {
        toast.success("Product added successfully");
        closeForm();
      })
      .catch(() => toast.error("Product add unsuccessful"));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCompany("");
    setCategory("");
    setPurchasePrice("");
    setTradePrice("");
    setSalePrice("");
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setSelectedProduct(null);
    resetForm();
  };

  const handleEditClick = (product) => {
    if (isReadOnlyMode) {
      toast.error("You can only view products in read-only mode");
      return;
    }

    setSelectedProduct(product);
    setName(product.name);
    setDescription(product.description || "");
    setCompany(product.company || product.brand || "");
    setCategory(product.Category?._id || "");
    setPurchasePrice(
      product.purchasePrice ?? product.pricing?.currentPurchasePrice ?? "",
    );
    setTradePrice(
      product.tradePrice ?? product.pricing?.currentTradePrice ?? "",
    );
    setSalePrice(
      product.salePrice ??
        product.pricing?.currentSalesPrice ??
        product.Price ??
        "",
    );
    setIsFormVisible(true);
  };

  const openCodeModal = (productId) => {
    setCodeProductId(productId);
    setCodeForm({ ...emptyCode });
    setCodeEdits({});
    setIsCodeModalOpen(true);
  };

  const closeCodeModal = () => {
    setIsCodeModalOpen(false);
    setCodeProductId(null);
    setCodeForm({ ...emptyCode });
    setCodeEdits({});
  };

  const handleAddCode = async () => {
    if (!codeProductId) return;
    if (!codeForm.code.trim()) {
      toast.error("Shade code is required");
      return;
    }

    const payload = {
      code: codeForm.code.trim(),
      quantity: Number(codeForm.quantity || 0),
    };

    dispatch(addProductCode({ productId: codeProductId, codeData: payload }))
      .unwrap()
      .then(() => {
        toast.success("Code added");
        setCodeForm({ ...emptyCode });
      })
      .catch((error) => toast.error(error || "Failed to add code"));
  };

  const handleDeleteCode = (codeId) => {
    if (!codeProductId) return;
    dispatch(deleteProductCode({ codeId, productId: codeProductId }))
      .unwrap()
      .then(() => toast.success("Code deleted"))
      .catch((error) => toast.error(error || "Failed to delete code"));
  };

  const displayProducts =
    productCodeQuery.trim() !== "" ? searchdata || [] : getallproduct;

  const displayRows = useMemo(() => {
    if (!Array.isArray(displayProducts)) return [];
    const rows = [];
    displayProducts.forEach((product) => {
      const codes = Array.isArray(product.productCodes)
        ? product.productCodes
        : [];
      if (!codes.length) {
        rows.push({ product, code: null });
        return;
      }
      codes.forEach((code) => rows.push({ product, code }));
    });
    return rows;
  }, [displayProducts]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = productCodeQuery.trim().toLowerCase();
    if (!normalizedQuery) return displayRows;

    const codeRows = displayRows.filter(({ code }) => {
      if (!code) return false;
      const codeValue = String(code.code || "").toLowerCase();
      const variantValue = String(code.variantName || "").toLowerCase();
      return (
        codeValue.includes(normalizedQuery) ||
        variantValue.includes(normalizedQuery)
      );
    });

    return codeRows.length ? codeRows : displayRows;
  }, [displayRows, productCodeQuery]);

  const codeProduct = useMemo(
    () =>
      getallproduct.find((product) => product._id === codeProductId) || null,
    [getallproduct, codeProductId],
  );

  const totalStoreValue = useMemo(() => {
    if (!Array.isArray(getallproduct)) return 0;
    return getallproduct.reduce((total, product) => {
      const salePrice = Number(
        product.salePrice ??
          product.pricing?.currentSalesPrice ??
          product.Price ??
          0,
      );
      const totalQuantity =
        product.totalQuantity ??
        (product.productCodes || []).reduce(
          (sum, code) => sum + Number(code.quantity || 0),
          0,
        );
      return total + salePrice * Number(totalQuantity || 0);
    }, 0);
  }, [getallproduct]);

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Total Products */}
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-orange-500 text-white text-lg sm:text-xl p-2">
              <AiOutlineProduct />
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold">
              {getallproduct?.length || 0}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total Products
          </p>
        </div>

        {/* Total Store Value */}
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-purple-500 text-white text-lg sm:text-xl p-2">
              <FaMoneyBill1Wave />
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold">
              Rs {totalStoreValue || 0}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total Store Value
          </p>
        </div>

        {/* Total Categories */}
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-red-500 text-white text-lg sm:text-xl p-2">
              <MdOutlineCategory />
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold">
              {getallCategory?.length || 0}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total Categories
          </p>
        </div>
      </div>

      {/* SEARCH + ADD */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={productCodeQuery}
          onChange={(e) => setProductCodeQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search product by name or code..."
        />

        {canWrite && (
          <button
            onClick={() => setIsFormVisible(true)}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Create Product
          </button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="mt-4">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {/* Loading State */}
          {false ? (
            <div className="p-10 text-center text-slate-500 animate-pulse">
              Loading products...
            </div>
          ) : !Array.isArray(displayProducts) || filteredRows.length === 0 ? (
            /* Empty State */
            <div className="p-10 text-center">
              <NoData
                title="No Products Found"
                description="Try adjusting filters or add a new product to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Product</th>
                    <th className="px-5 py-4 font-medium">Product Code</th>
                    <th className="px-5 py-4 font-medium">Description</th>
                    <th className="px-5 py-4 font-medium">Purchase Price</th>
                    <th className="px-5 py-4 font-medium">Trade Price</th>
                    <th className="px-5 py-4 font-medium">Sale Price</th>
                    <th className="px-5 py-4 font-medium">Category</th>
                    <th className="px-5 py-4 font-medium">Qty</th>
                    <th className="px-5 py-4 font-medium">Date</th>
                    {!isReadOnlyMode && (
                      <th className="px-5 py-4 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row, index) => {
                    const product = row.product;
                    const code = row.code;
                    const codeCount = Array.isArray(product.productCodes)
                      ? product.productCodes.length
                      : 0;
                    const isCodeDelete = Boolean(code && codeCount > 1);
                    return (
                      <tr
                        key={`${product._id}-${code?._id || "no-code"}-${index}`}
                        className="border-b last:border-b-0 hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4 text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">
                            {product.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {product.company || product.brand || "-"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {code ? (
                            <div className="text-xs">
                              <span className="inline-flex items-center px-3 py-1 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-md">
                                {code.code}
                              </span>{" "}
                              {code.variantName ? ` • ${code.variantName}` : ""}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {product.description ?? "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          Rs {product.purchasePrice ?? 0}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          Rs {product.tradePrice ?? 0}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          Rs {product.salePrice ?? 0}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {product.Category?.name || "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {code ? (code.quantity ?? 0) : 0}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <FormattedTime timestamp={product?.createdAt} />
                        </td>

                        {!isReadOnlyMode && (
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              {canDelete && (
                                <Popconfirm
                                  title={
                                    <div className="flex flex-col gap-1 max-w-xs">
                                      <span className="font-semibold text-red-600 text-sm">
                                        {isCodeDelete
                                          ? "Confirm Code Deletion"
                                          : "Confirm Product Deletion"}
                                      </span>
                                      <span className="text-xs text-gray-600 leading-snug">
                                        {isCodeDelete
                                          ? "This action will permanently remove this code from inventory. This operation cannot be undone."
                                          : "This action will permanently remove this product from inventory. This operation cannot be undone."}
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
                                  onConfirm={() =>
                                    handleRowDelete({
                                      productId: product._id,
                                      codeId: code?._id,
                                      codeCount,
                                    })
                                  }
                                >
                                  <button
                                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition-all duration-200 hover:shadow-sm"
                                    title="Delete Product"
                                  >
                                    <MdDelete size={18} />
                                  </button>
                                </Popconfirm>
                              )}
                              {canWrite && (
                                <button
                                  onClick={() => handleEditClick(product)}
                                  className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                                  title="Edit"
                                >
                                  <MdEdit size={18} />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  onClick={() => openCodeModal(product._id)}
                                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-orange-100 text-orange-500 text-xs font-semibold transition"
                                  title="Manage Codes"
                                >
                                  <FaPalette size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY */}
      {isFormVisible && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={closeForm} />
      )}

      {/* SLIDE-IN DRAWER */}
      {isFormVisible && (
        <div className="fixed top-0 right-0 w-full sm:w-[480px] h-full bg-white p-6 border-l shadow-2xl z-50 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedProduct ? "Edit Product" : "Create Product"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={closeForm}
              className="cursor-pointer text-2xl"
            />
          </div>

          <form
            onSubmit={selectedProduct ? handleEditSubmit : submitProduct}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={Category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select category</option>
                {getallCategory?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Purchase Price</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Trade Price</label>
              <input
                type="number"
                value={tradePrice}
                onChange={(e) => setTradePrice(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sale Price</label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-teal-700 hover:bg-teal-600 text-white rounded-xl shadow-md mt-4"
            >
              {selectedProduct ? "Update Product" : "Create Product"}
            </button>
          </form>
        </div>
      )}

      {isCodeModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeCodeModal}
        />
      )}

      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Manage Codes</h3>
                <p className="text-xs text-slate-500">
                  {codeProduct?.name || "Product"}{" "}
                  {codeProduct?.company || codeProduct?.brand
                    ? `• ${codeProduct?.company || codeProduct?.brand}`
                    : ""}
                </p>
              </div>
              <button
                onClick={closeCodeModal}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="border rounded-xl p-4 bg-slate-50">
                <h4 className="text-sm font-semibold mb-3">Add New Code</h4>
                <div>
                  <label className="text-xs font-medium">Shade Code</label>
                  <input
                    type="text"
                    value={codeForm.code}
                    onChange={(e) =>
                      setCodeForm((prev) => ({
                        ...prev,
                        code: e.target.value,
                      }))
                    }
                    className="w-full h-9 px-2 border rounded-lg mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCode}
                  className="mt-3 w-full h-10 bg-teal-700 hover:bg-teal-600 text-white rounded-xl"
                >
                  Add Code
                </button>
              </div>
              <div className="border rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500 mb-3">
                  Shade Codes
                </div>

                {codeProduct?.productCodes?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {codeProduct.productCodes.map((code) => (
                      <div
                        key={code._id}
                        className="group relative rounded-xl bg-gradient-to-br from-white to-slate-100 
          p-4 shadow-sm hover:shadow-xl transition-all duration-300 
          hover:-translate-y-1 border border-slate-200 
          flex flex-col justify-between"
                      >
                        {/* Top Section */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-xs text-slate-500 mb-2">
                            Shade Code
                          </div>

                          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-md">
                            {code.code}
                          </span>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-4 mt-4 border-t flex justify-center">
                          <button
                            onClick={() => handleDeleteCode(code._id)}
                            className="flex w-full items-center justify-center gap-1 px-3 py-2 rounded-lg 
              bg-red-200 text-red-600 hover:bg-red-300 
              text-xs font-semibold transition"
                          >
                            <IoMdTrash size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 py-6 text-center">
                    No codes yet for this product.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productpage;
