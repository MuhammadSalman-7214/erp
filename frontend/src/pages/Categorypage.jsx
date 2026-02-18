import { useState, useEffect } from "react";
import { IoMdAdd } from "react-icons/io";
import FormattedTime from "../lib/FormattedTime";
import {
  MdDelete,
  MdEdit,
  MdKeyboardDoubleArrowLeft,
  MdOutlineCategory,
} from "react-icons/md";
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

function Categorypage() {
  const { getallCategory, searchdata } = useSelector((state) => state.category);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [query, setquery] = useState("");

  const [name, setname] = useState("");
  const [description, setdescription] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { iscreatedCategory } = useSelector((state) => state.category);

  const closeForm = () => {
    setIsFormVisible(false);
    setSelectedCategory(null);
    resetForm();
  };

  useEffect(() => {
    dispatch(gettingallCategory());
  }, [dispatch, iscreatedCategory]);
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
    const CategoryData = { name, description };

    dispatch(CreateCategory(CategoryData))
      .unwrap()
      .then((data) => {
        toast.success("CategoryData added successfully");
        resetForm();
        setIsFormVisible(false);
      })
      .catch((err) => {
        console.error("Error adding category:", err);
        toast.error(err?.message || "Category add unsuccessful");
      });
  };

  const resetForm = () => {
    setname("");
    setdescription("");
  };

  const displayCategory = query.trim() !== "" ? searchdata : getallCategory;
  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setname(category.name);
    setdescription(category.description || "");
    setIsFormVisible(true);
  };
  const updateCategory = (event) => {
    event.preventDefault();

    if (!selectedCategory) return;

    const updatedData = {
      name,
      description,
    };

    dispatch(UpdateCategory({ id: selectedCategory._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Category updated successfully");
        closeForm();
      })
      .catch((err) => toast.error(err));
  };
  return (
    <div className="min-h-[92vh] p-4">
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
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
        />
        <button
          onClick={() => {
            setSelectedCategory(null);
            resetForm();
            setIsFormVisible(true);
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" />
          Add Category
        </button>
      </div>
      {/* OVERLAY */}
      {isFormVisible && (
        <div
          className="app-modal-overlay"
          onClick={() => setIsFormVisible(false)}
        />
      )}

      {/* SLIDE-IN DRAWER */}
      {isFormVisible && (
        <div className="app-modal-drawer app-modal-drawer-md">
          <div className="app-modal-header">
            <h2 className="app-modal-title">
              {selectedCategory ? "Update Category" : "Add Category"}{" "}
            </h2>

            <MdKeyboardDoubleArrowLeft
              onClick={() => setIsFormVisible(false)}
              className="cursor-pointer text-2xl text-slate-500 hover:text-slate-800"
            />
          </div>

          <form
            onSubmit={selectedCategory ? updateCategory : submitCategory}
            className="app-modal-body space-y-4"
          >
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Category Name
              </label>
              <input
                value={name}
                placeholder="Enter category name"
                onChange={(e) => setname(e.target.value)}
                type="text"
                className="w-full h-11 px-4 border border-gray-300 rounded-xl mt-2
            focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Description
              </label>
              <input
                value={description}
                placeholder="Enter category description"
                onChange={(e) => setdescription(e.target.value)}
                type="text"
                className="w-full h-11 px-4 border border-gray-300 rounded-xl mt-2
            focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full h-12 bg-teal-700 hover:bg-teal-600
          text-white rounded-xl shadow-md font-medium mt-6 transition"
            >
              {selectedCategory ? "Update Category" : "Add Category"}{" "}
            </button>
          </form>
        </div>
      )}

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
                    <th className="px-5 py-4 font-medium">Description</th>
                    <th className="px-5 py-4 font-medium">Created Date</th>
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {displayCategory.map((Category, index) => (
                    <tr
                      key={Category._id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {Category.name}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {Category.productCount ?? 0}
                      </td>
                      <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                        {Category.description}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <FormattedTime timestamp={Category.createdAt} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleremove(Category._id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-red-100 text-red-600 transition"
                            title="Delete"
                          >
                            <MdDelete size={18} />
                          </button>

                          <button
                            className="p-2 rounded-xl bg-slate-100 hover:bg-teal-100 text-blue-600 transition"
                            title="Edit"
                            onClick={() => {
                              handleEditClick(Category);
                            }}
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
