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
import { Popconfirm } from "antd";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import InputField from "../Components/InputField";
import { validateTextInput } from "../lib/formValidation";
import { Button, Table } from "antd";

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
        <InputField
          containerClassName="w-full md:w-96"
          value={query}
          onChange={(e) => setquery(e.target.value)}
          placeholder="Search the category"
          maxLength={120}
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
            <InputField
              label="Category Name"
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
              required
              error={errors.name}
            />

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
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden p-2">
          {Array.isArray(displayCategory) && displayCategory.length > 0 ? (
            <Table
              rowKey="id"
              pagination={false}
              dataSource={sortedCategory}
              className="erp-ant-table"
              columns={[
                {
                  title: "#",
                  render: (_, __, index) => index + 1,
                  width: 70,
                },
                {
                  title: "Name",
                  dataIndex: "name",
                  render: (value) => (
                    <span className="font-semibold text-slate-800">{value}</span>
                  ),
                },
                {
                  title: "Total Products",
                  dataIndex: "productCount",
                  render: (value) => value ?? 0,
                  width: 140,
                },
                {
                  title: (
                    <DateSortHeader
                      label="Created At"
                      direction={createdAtSort}
                      onToggle={() =>
                        setCreatedAtSort((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                    />
                  ),
                  dataIndex: "createdAt",
                  render: (_, record) => (
                    <span className="text-slate-600">
                      <FormattedTime timestamp={record.createdAt} />
                    </span>
                  ),
                  width: 180,
                },
                {
                  title: <div className="text-right">Actions</div>,
                  key: "actions",
                  render: (_, record) => (
                    <div className="flex justify-end gap-2">
                      <Popconfirm
                        title={
                          <div className="flex flex-col gap-1 max-w-xs">
                            <span className="font-semibold text-red-600 text-sm">
                              Confirm Category Deletion
                            </span>
                            <span className="text-xs text-gray-600 leading-snug">
                              This action will permanently remove this category.
                              Products linked to this category may be affected.
                              This operation cannot be undone.
                            </span>
                          </div>
                        }
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, className: "font-semibold" }}
                        cancelButtonProps={{ className: "font-medium" }}
                        placement="topRight"
                        onConfirm={() => handleremove(record.id)}
                      >
                        <Button
                          type="default"
                          danger
                          size="middle"
                          icon={<MdDelete size={18} />}
                        />
                      </Popconfirm>
                      <Button
                        type="default"
                        size="middle"
                        icon={<MdEdit size={18} />}
                        onClick={() => openForm(record)}
                      />
                    </div>
                  ),
                  width: 180,
                },
              ]}
            />
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
  );
}

export default Categorypage;
