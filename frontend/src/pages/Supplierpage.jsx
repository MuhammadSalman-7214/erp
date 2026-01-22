import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime ";
import {
  SearchSupplier,
  CreateSupplier,
  gettingallSupplier,
  EditSupplier,
  deleteSupplier,
} from "../features/SupplierSlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";

function Supplierpage({ readOnly = false }) {
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  // Determine if page is in read-only mode
  const isReadOnlyMode = readOnly || checkReadOnly("supplier");
  const canWrite = hasPermission("supplier", "write");
  const canDelete = hasPermission("supplier", "delete");

  const { getallSupplier, editedsupplier, iscreatedsupplier, searchdata } =
    useSelector((state) => state.supplier);
  const dispatch = useDispatch();

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [email, setEmail] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    dispatch(gettingallSupplier());
  }, [dispatch, editedsupplier, iscreatedsupplier]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(SearchSupplier(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallSupplier());
    }
  }, [query, dispatch]);

  const handleRemove = async (supplierId) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete suppliers");
      return;
    }

    dispatch(deleteSupplier(supplierId))
      .unwrap()
      .then(() => {
        toast.success("Supplier removed successfully");
      })
      .catch((error) => {
        toast.error(error || "Failed to remove supplier");
      });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to edit suppliers");
      return;
    }

    if (!selectedSupplier) return;

    const updatedData = {
      name,
      contactInfo: {
        phone: contactInfo,
        email: email,
      },
      // optionally keep productsSupplied if needed
      productsSupplied: selectedSupplier.productsSupplied || [],
    };

    dispatch(EditSupplier({ supplierId: selectedSupplier._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Supplier updated successfully");
        setIsFormVisible(false);
        setSelectedSupplier(null);
        resetForm();
      })
      .catch(() => {
        toast.error("Failed to update supplier");
      });
  };

  const submitSupplier = async (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to add suppliers");
      return;
    }
    const supplierData = {
      name,
      contactInfo: {
        phone: contactInfo, // or separate fields if you have them
        email: email,
      },
      // optionally include productsSupplied if any
      productsSupplied: [], // leave empty if none
    };
    dispatch(CreateSupplier(supplierData))
      .unwrap()
      .then(() => toast.success("Supplier added successfully"))
      .catch(() => toast.error("Supplier add unsuccessful"));
  };

  const resetForm = () => {
    setName("");
    setContactInfo("");
    setEmail("");
  };

  const handleEditClick = (supplier) => {
    if (isReadOnlyMode) {
      toast.error("You can only view suppliers in read-only mode");
      return;
    }

    setSelectedSupplier(supplier);
    setName(supplier.name || "");
    setContactInfo(supplier.contactInfo?.phone || "");
    setEmail(supplier.contactInfo?.email || "");
    setIsFormVisible(true);
  };

  const displaySuppliers = query.trim() !== "" ? searchdata : getallSupplier;

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />

      <div className="mt-10 flex">
        <div className="bg-blue-950 w-56 rounded-xl ml-10 block h-24">
          <h1 className="text-white ml-12 block pt-5 font-bold">
            Total Suppliers
          </h1>
          <p className="text-white font-bold pt-2 ml-24">
            {getallSupplier?.length || "0"}
          </p>
        </div>
      </div>

      <div className="mt-12 ml-5">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-96 h-12 pl-4 pr-12 border-2 border-gray-300 rounded-lg"
            placeholder="Search suppliers"
          />
          {canWrite && (
            <button
              onClick={() => {
                setIsFormVisible(true);
                setSelectedSupplier(null);
              }}
              className="bg-blue-800 text-white w-40 h-12 rounded-lg flex items-center justify-center hover:bg-blue-700"
            >
              <IoMdAdd className="text-xl mr-2" /> Add Supplier
            </button>
          )}
          {isReadOnlyMode && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
              Read-Only Mode
            </div>
          )}
        </div>

        {isFormVisible && canWrite && (
          <div className="absolute top-16 bg-gray-100 right-0 h-svh p-6 border-2 border-gray-300 rounded-lg shadow-md transition-transform transform">
            <div className="text-right">
              <MdKeyboardDoubleArrowLeft
                onClick={() => setIsFormVisible(false)}
                className="cursor-pointer text-2xl"
              />
            </div>

            <h1 className="text-xl font-semibold mb-4">
              {selectedSupplier ? "Edit Supplier" : "Add Supplier"}
            </h1>

            <form
              onSubmit={selectedSupplier ? handleEditSubmit : submitSupplier}
            >
              <div className="mb-4">
                <label>Name</label>
                <input
                  value={name}
                  placeholder="Enter supplier name"
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label>Contact Info</label>
                <input
                  value={contactInfo}
                  placeholder="Enter contact information"
                  onChange={(e) => setContactInfo(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 mt-4"
              >
                {selectedSupplier ? "Update Supplier" : "Add Supplier"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Supplier List</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-base-100 border mb-24 border-gray-200 rounded-lg shadow-md">
              <thead>
                <tr>
                  <th className="px-3 py-2 border w-5">#</th>
                  <th className="px-3 py-2 border">Name</th>
                  <th className="px-3 py-2 border">Contact Info</th>
                  <th className="px-3 py-2 border">Email</th>
                  <th className="px-3 py-2 border">Created At</th>
                  {!isReadOnlyMode && (
                    <th className="px-3 py-2 w-72 border">Operations</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Array.isArray(displaySuppliers) &&
                displaySuppliers.length > 0 ? (
                  displaySuppliers.map((supplier, index) => (
                    <tr key={supplier._id}>
                      <td className="px-3 py-2 border">{index + 1}</td>
                      <td className="px-3 py-2 border">
                        {supplier.name || "-"}
                      </td>
                      <td className="px-3 py-2 border">
                        {supplier.contactInfo?.phone || "-"}
                      </td>
                      <td className="px-3 py-2 border">
                        {supplier.contactInfo?.email || "-"}
                      </td>
                      <td className="px-3 py-2 border">
                        {supplier.createdAt ? (
                          <FormattedTime timestamp={supplier.createdAt} />
                        ) : (
                          "-"
                        )}
                      </td>
                      {!isReadOnlyMode && (
                        <td className="px-4 py-2 border">
                          {canDelete && (
                            <button
                              onClick={() => handleRemove(supplier._id)}
                              className="h-10 w-24 bg-red-500 hover:bg-red-700 rounded-md text-white"
                            >
                              Remove
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => handleEditClick(supplier)}
                              className="h-10 w-24 bg-green-500 ml-10 hover:bg-green-700 rounded-md text-white"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isReadOnlyMode ? "5" : "6"}
                      className="text-center py-4"
                    >
                      No suppliers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Supplierpage;
