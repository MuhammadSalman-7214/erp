import { useState, useEffect, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import FormattedTime from "../lib/FormattedTime";
import { MdDelete, MdEdit, MdOutlineCategory } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  gettingallCategory,
  CreateCategory,
  RemoveCategory,
  SearchCategory,
  UpdateCategory,
} from "../features/categorySlice";
import toast from "react-hot-toast";
import NoData from "../Components/NoData";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateTextInput } from "../lib/formValidation";
import { Button, ConfirmDialog, Inputfield } from "../UI";

function Categorypage() {
  const { getallCategory, searchdata } = useSelector((state) => state.category);
  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [createdAtSort, setCreatedAtSort] = useState("asc");
  const [name, setname] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setIsSubmitting(true);
      dispatch(UpdateCategory({ id: selectedProduct.id, data: CategoryData }))
        .unwrap()
        .then(() => {
          toast.success("Category updated successfully");
          closeForm();
        })
        .catch((err) => {
          toast.error(err?.message || "Update failed");
        })
        .finally(() => setIsSubmitting(false));
    } else {
      // Create new category
      setIsSubmitting(true);
      dispatch(CreateCategory(CategoryData))
        .unwrap()
        .then(() => {
          toast.success("Category added successfully");
          closeForm();
        })
        .catch((err) => {
          toast.error(err?.message || "Category add unsuccessful");
        })
        .finally(() => setIsSubmitting(false));
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
      sortByDateValue(
        displayCategory || [],
        (category) => category.createdAt,
        createdAtSort,
      ),
    [displayCategory, createdAtSort],
  );

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Total Categories
            </div>
            <MdOutlineCategory className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 transition-all duration-300">
            {getallCategory?.length || "0"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <Inputfield
          type="text"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          placeholder="Search the category"
          maxLength={120}
          className="w-full md:w-96"
        />
        <Button
          onClick={() => {
            openForm();
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" />
          Create Category
        </Button>
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
              <Inputfield
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
                className="mt-2 w-full"
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={selectedProduct ? "Updating..." : "Creating..."}
              className="mt-6 h-12 w-full rounded-xl bg-teal-700 font-medium text-white shadow-md transition hover:bg-teal-600"
            >
              {selectedProduct ? "Update Category" : "Create Category"}
            </LoadingButton>
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
                        setCreatedAtSort((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
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
                          <ConfirmDialog
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
                            <Button
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
                            </Button>
                          </ConfirmDialog>

                          <Button
                            onClick={() => {
                              openForm(Category);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-teal-100 text-blue-600 transition"
                            title="Edit"
                          >
                            <MdEdit size={18} />
                          </Button>
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
