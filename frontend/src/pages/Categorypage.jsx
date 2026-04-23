import { useState, useEffect, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import FormattedTime from "../lib/FormattedTime";
import TopNavbar from "../Components/TopNavbar";
import {
  MdDelete,
  MdEdit,
  MdOutlineCategory,
  MdOutlinePriceChange,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  gettingallCategory,
  CreateCategory,
  RemoveCategory,
  SearchCategory,
  UpdateCategory,
} from "../features/categorySlice";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import { Popconfirm } from "antd";
import DrawerPanel from "../Components/DrawerPanel";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateTextInput } from "../lib/formValidation";

function Categorypage() {
  const { getallCategory, iscreatedCategory, searchdata } = useSelector(
    (state) => state.category,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [query, setquery] = useState("");
  const [createdAtSort, setCreatedAtSort] = useState("asc");

  const [name, setname] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    dispatch(gettingallCategory());
  }, [dispatch]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(SearchCategory(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallCategory());
    }
  }, [query, dispatch]);

  const handleremove = async (categoryId) => {
    dispatch(RemoveCategory(categoryId))
      .unwrap()
      .then(() => {
        toast.success("category removed successfully");
      })
      .catch((error) => {
        toast.error(error?.message || "Failed to remove category");
      });
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Category name", {
        required: true,
        minLength: 2,
        maxLength: 80,
      }),
    );

    if (!nameCheck.ok) {
      toast.error(nameCheck.message);
      return;
    }

    const CategoryData = { name: nameCheck.value };

    if (selectedProduct) {
      // Update existing category
      dispatch(UpdateCategory({ id: selectedProduct.id, data: CategoryData }))
        .unwrap()
        .then(() => {
          toast.success("Category updated successfully");
          closeForm();
        })
        .catch((err) => {
          toast.error(err?.message || "Update failed");
        });
    } else {
      // Create new category
      dispatch(CreateCategory(CategoryData))
        .unwrap()
        .then(() => {
          toast.success("Category added successfully");
          closeForm();
        })
        .catch((err) => {
          toast.error(err?.message || "Category add unsuccessful");
        });
    }
  };

  const resetForm = () => {
    setname("");
    setErrors({});
  };

  const openForm = (category = null) => {
    setSelectedProduct(category);
    setname(category?.name || "");
    setErrors({});
    setIsDrawerMinimized(false);
    setIsFormVisible(true);
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    setSelectedProduct(null);
    resetForm();
  };

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

  const displayCategory = query.trim() !== "" ? searchdata : getallCategory;
  const sortedCategory = useMemo(
    () =>
      sortByDateValue(displayCategory || [], (category) => category.createdAt, createdAtSort),
    [displayCategory, createdAtSort],
  );

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Total Products */}
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-orange-500 text-white text-lg sm:text-xl p-2">
              <MdOutlineCategory />
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold">
              {getallCategory?.length || "0"}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total Category
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
          <input
          type="text"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          placeholder="Search the category"
          maxLength={120}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
        />
        <button
          onClick={() => {
            openForm();
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" />
          Create Category
        </button>
        <button
          onClick={() => navigate("/price-list")}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <MdOutlinePriceChange className="text-xl mr-2" />
          Price List
        </button>
      </div>
      {/* OVERLAY */}
      <DrawerPanel
        open={isFormVisible}
        title={selectedProduct ? "Edit Category" : "Create Category"}
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={submitCategory} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Category Name
              </label>
              <input
                value={name}
                placeholder="Enter category name"
                onChange={(e) => {
                  const value = e.target.value;
                  setname(value);
                  validateField("name", value, (current) =>
                    validateTextInput(current, "Category name", {
                      required: true,
                      minLength: 2,
                      maxLength: 80,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("name", e.target.value, (current) =>
                    validateTextInput(current, "Category name", {
                      required: true,
                      minLength: 2,
                      maxLength: 80,
                    }),
                  )
                }
                type="text"
                maxLength={80}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 h-11 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                required
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <button
              type="submit"
              className="mt-6 h-12 w-full rounded-xl bg-teal-700 font-medium text-white shadow-md transition hover:bg-teal-600"
            >
              {selectedProduct ? "Update Category" : "Create Category"}
            </button>
          </form>
        </div>
      </DrawerPanel>

      {/* CATEGORY TABLE */}
      <div className="mt-4">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            {Array.isArray(displayCategory) && displayCategory.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Name</th>
                    <th className="px-5 py-4 font-medium">Total Products</th>
                    <DateSortHeader
                      label="Created At"
                      direction={createdAtSort}
                      onToggle={() =>
                        setCreatedAtSort((prev) => (prev === "asc" ? "desc" : "asc"))
                      }
                    />
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedCategory.map((Category, index) => (
                    <tr
                      key={Category.id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {Category.name}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {Category.productCount ?? 0}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <FormattedTime timestamp={Category.createdAt} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Popconfirm
                            title={
                              <div className="flex flex-col gap-1 max-w-xs">
                                <span className="font-semibold text-red-600 text-sm">
                                  Confirm Category Deletion
                                </span>
                                <span className="text-xs text-gray-600 leading-snug">
                                  This action will permanently remove this
                                  category. Products linked to this category may
                                  be affected. This operation cannot be undone.
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
                            onConfirm={() => handleremove(Category.id)}
                          >
                            <button
                              className="
      p-2 rounded-xl
      bg-slate-100
      hover:bg-red-100
      text-red-600
      transition-all duration-200
      hover:shadow-sm
    "
                              title="Delete Category"
                            >
                              <MdDelete size={18} />
                            </button>
                          </Popconfirm>

                          <button
                            onClick={() => {
                              openForm(Category);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-teal-100 text-blue-600 transition"
                            title="Edit"
                          >
                            <MdEdit size={18} />
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
                  title="No Categories Found"
                  description="Try adjusting filters or add a new category to get started."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Categorypage;
