import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import {
  MdDelete,
  MdEdit,
  MdKeyboardDoubleArrowLeft,
  MdOutlineCategory,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime ";
import { FaMoneyBill1Wave } from "react-icons/fa6";

import {
  Addproduct,
  gettingallproducts,
  Searchproduct,
  Removeproduct,
  EditProduct,
} from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { AiOutlineProduct } from "react-icons/ai";

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

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [Category, setCategory] = useState("");
  const [Price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [Desciption, setDesciption] = useState("");
  const [dateAdded, setDateAdded] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
  }, [dispatch, editedProduct, isproductadd]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(Searchproduct(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallproducts());
    }
  }, [query, dispatch]);

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

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to edit products");
      return;
    }

    if (!selectedProduct) return;

    const updatedData = {
      name,
      Category,
      Price,
      quantity,
      Desciption,
      dateAdded: selectedProduct.dateAdded || new Date().toISOString(),
    };
    console.log({ updatedData });

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
      toast.error("You do not have permission to add products");
      return;
    }

    const productData = {
      name,
      Desciption,
      Category,
      Price,
      quantity,
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
    setCategory("");
    setPrice("");
    setQuantity("");
    setDesciption("");
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
    setCategory(product.Category?._id || "");
    setPrice(product.Price);
    setQuantity(product.quantity);
    setDesciption(product.Desciption);
    setIsFormVisible(true);
  };

  const displayProducts = query.trim() !== "" ? searchdata : getallproduct;

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
              ${getallproduct?.reduce((total, p) => total + p.Price, 0) || 0}
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search product..."
        />

        {canWrite && (
          <button
            onClick={() => setIsFormVisible(true)}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Product
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
          {false ? ( // replace false with your loading state if you have one
            <div className="p-10 text-center text-slate-500 animate-pulse">
              Loading products...
            </div>
          ) : !Array.isArray(displayProducts) ||
            displayProducts.length === 0 ? (
            /* Empty State */
            <div className="p-10 text-center">
              <p className="text-slate-500 mb-4">No products found</p>
              <button
                onClick={() => setIsFormVisible(true)}
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg"
              >
                <IoMdAdd />
                Add your first product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Product</th>
                    <th className="px-5 py-4 font-medium">Category</th>
                    <th className="px-5 py-4 font-medium">Description</th>
                    <th className="px-5 py-4 font-medium">Qty</th>
                    <th className="px-5 py-4 font-medium">Price</th>
                    <th className="px-5 py-4 font-medium">Date</th>
                    {!isReadOnlyMode && (
                      <th className="px-5 py-4 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {displayProducts.map((product, index) => (
                    <tr
                      key={product._id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {product.name}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {product.Category?.name || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                        {product.Desciption}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {product.quantity}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        ${product.Price?.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <FormattedTime timestamp={product?.createdAt} />
                      </td>

                      {!isReadOnlyMode && (
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {canDelete && (
                              <button
                                onClick={() => handleremove(product._id)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                                title="Delete"
                              >
                                <MdDelete size={18} />
                              </button>
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
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
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
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white p-6 border-l shadow-2xl z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedProduct ? "Edit Product" : "Add Product"}
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
            {[
              ["Name", name, setName, "text"],
              ["Description", Desciption, setDesciption, "text"],
              ["Price", Price, setPrice, "number"],
              ["Quantity", quantity, setQuantity, "number"],
            ].map(([label, val, setter, type]) => (
              <div key={label}>
                <label className="text-sm font-medium">{label}</label>
                <input
                  type={type}
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            ))}

            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={Category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select category</option>
                {getallCategory?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-teal-700 hover:bg-teal-600 text-white rounded-xl shadow-md mt-4"
            >
              {selectedProduct ? "Update Product" : "Add Product"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Productpage;
