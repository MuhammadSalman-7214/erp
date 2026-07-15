import { useState, useEffect, useMemo } from "react";
import { IoMdAdd, IoMdSearch } from "react-icons/io";
import FormattedTime from "../lib/FormattedTime";
import { MdDelete, MdEdit } from "react-icons/md";
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
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateTextInput } from "../lib/formValidation";
import { Button, ConfirmDialog, Inputfield, Tooltip } from "../UI";
import TablePagination from "../UI/TablePagination";

function Categorypage() {
  const { getallCategory, searchdata, pagination } = useSelector(
    (state) => state.category,
  );
  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [createdAtSort, setCreatedAtSort] = useState("asc");
  const [name, setname] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sidebarOpen } = useSelector((state) => state.sidebar);

  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(
      gettingallCategory({
        page: currentPage,
        pageSize: PAGE_SIZE,
        sortDir: createdAtSort,
      }),
    );
  }, [dispatch, currentPage, createdAtSort]);

  useEffect(() => {
    if (query.trim() !== "") {
      const timer = setTimeout(() => {
        dispatch(SearchCategory(query));
      }, 500);

      return () => clearTimeout(timer);
    }

    dispatch(
      gettingallCategory({
        page: currentPage,
        pageSize: PAGE_SIZE,
        sortDir: createdAtSort,
      }),
    );
  }, [query, currentPage, createdAtSort, dispatch]);

  const handleremove = async (categoryId) => {
    dispatch(RemoveCategory(categoryId))
      .unwrap()
      .then(() => {
        toast.success("Category removed successfully");
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
                  Category Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search category by name.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {sortedCategory.length} records shown
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
              placeholder="Search by name..."
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                openForm();
              }}
              variant="primary"
            >
              <IoMdAdd size={18} />
              Create Category
            </Button>
          </div>
        </div>
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
                className="mt-1"
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText={selectedProduct ? "Updating..." : "Creating..."}
              variant="primary"
              className="w-full"
            >
              {selectedProduct ? "Update Category" : "Create Category"}
            </Button>
          </form>
        </div>
      </DrawerPanel>

      {/* CATEGORY TABLE */}
      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {Array.isArray(displayCategory) && displayCategory.length > 0 ? (
            <div className="overflow-x-auto">
              <div
                className={`max-h-[56vh] overflow-y-auto w-full ${!sidebarOpen ? "max-w-[310px] mobileL:max-w-[330px] tab:max-w-[680px] laptop:max-w-[1424px] laptopL:max-w-[1550px] laptop4k:max-w-full" : "max-w-[220px] mobileL:max-w-[160px] tab:max-w-[480px] laptop:max-w-[1030px] laptopL:max-w-[1246px] laptop4k:max-w-full"}  mx-auto overflow-x-auto relative`}
              >
                <div className="flex gap-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">#</th>
                        <th className="px-5 py-4 font-semibold">Name</th>
                        <th className="px-5 py-4 font-semibold">
                          Total Products
                        </th>
                        <th className="px-5 py-4 font-semibold">
                          <DateSortHeader
                            label="Created At"
                            direction={createdAtSort}
                            onToggle={() =>
                              setCreatedAtSort((prev) =>
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
                      {sortedCategory.map((Category, index) => (
                        <tr
                          key={Category.id}
                          className="group border-b border-slate-100 bg-white transition-colors duration-150 hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-4 text-slate-500">
                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {Category.name}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {Category.productCount ?? 0}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <FormattedTime timestamp={Category.createdAt} />
                          </td>
                          <td
                            className="px-4 py-4 sticky right-0 z-10 bg-gray-50/80 text-center transition-colors duration-150"
                            style={{
                              boxShadow:
                                "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                            }}
                          >
                            <div className="flex justify-center">
                              <div className="flex items-center justify-center gap-2 overflow-hidden">
                                <Tooltip content="Edit Category">
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      openForm(Category);
                                    }}
                                    className="metal-btn"
                                    title="Edit"
                                    variant="info"
                                  >
                                    <MdEdit size={18} />
                                  </Button>
                                </Tooltip>
                                <ConfirmDialog
                                  title={
                                    <div className="flex flex-col gap-1 max-w-xs">
                                      <span className="font-semibold text-red-600 text-sm">
                                        Confirm Category Deletion
                                      </span>
                                      <span className="text-xs text-gray-600 leading-snug">
                                        This action will permanently remove this
                                        category. Products linked to this
                                        category may be affected. This operation
                                        cannot be undone.
                                      </span>
                                    </div>
                                  }
                                  okText="Delete"
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
                                  onConfirm={() => handleremove(Category.id)}
                                >
                                  <Tooltip content="Delete Category">
                                    <Button
                                      type="button"
                                      className="metal-btn"
                                      variant="danger"
                                      title="Delete Category"
                                    >
                                      <MdDelete size={18} />
                                    </Button>
                                  </Tooltip>
                                </ConfirmDialog>
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
            <div className="p-10">
              <NoData
                title="No Categories Found"
                description="Try adjusting filters or add a new category to get started."
              />
            </div>
          )}
        </div>
      </div>
      <TablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default Categorypage;
