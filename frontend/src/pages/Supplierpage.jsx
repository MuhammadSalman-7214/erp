import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft, MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";
import {
  SearchSupplier,
  CreateSupplier,
  gettingallSupplier,
  EditSupplier,
  deleteSupplier,
} from "../features/SupplierSlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { gettingallproducts } from "../features/productSlice";
import { AiOutlineProduct } from "react-icons/ai";
import { TfiSupport } from "react-icons/tfi";
import NoData from "../Components/NoData";
import { Popconfirm } from "antd";
import axiosInstance from "../lib/axios";

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
  const [vendorCode, setVendorCode] = useState("");
  const [name, setName] = useState("");
  // const [contactInfo, setContactInfo] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [product, setProduct] = useState("");
  const [vendorBalances, setVendorBalances] = useState({});

  const { getallproduct } = useSelector((state) => state.product);

  const fetchVendorBalances = async () => {
    try {
      const response = await axiosInstance.get("/payment/summary");
      const vendors = response.data?.vendors || [];
      const balancesById = vendors.reduce((acc, vendor) => {
        acc[vendor.vendorId] = vendor;
        return acc;
      }, {});
      setVendorBalances(balancesById);
    } catch (error) {
      console.error("Failed to fetch vendor balances:", error);
    }
  };

  useEffect(() => {
    dispatch(gettingallSupplier());
    dispatch(gettingallproducts());
    fetchVendorBalances();
  }, [dispatch]);

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
        fetchVendorBalances();
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
    if (!name || !phone || !email) {
      toast.error("name, phone and email are required");
      return;
    }

    if (!selectedSupplier) return;

    const updatedData = {
      vendorCode,
      name,
      contactInfo: {
        phone,
        email,
        address,
      },
      openingBalance,
      paymentTerms,
      // optionally keep productsSupplied if needed
      productsSupplied: product ? [product] : [],
    };

    dispatch(EditSupplier({ supplierId: selectedSupplier._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Vendor updated successfully");
        setIsFormVisible(false);
        setSelectedSupplier(null);
        resetForm();
        fetchVendorBalances();
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
    if (!name || !phone || !email) {
      toast.error("name, phone and email are required");
      return;
    }

    const supplierData = {
      vendorCode,
      name,
      contactInfo: {
        phone,
        email,
        address,
      },
      openingBalance,
      paymentTerms,
      productsSupplied: product ? [product] : [],
    };
    dispatch(CreateSupplier(supplierData))
      .unwrap()
      .then(() => {
        toast.success("Vendor added successfully");
        setIsFormVisible(false);
        resetForm();
        setSelectedSupplier(null);
        fetchVendorBalances();
      })
      .catch(() => toast.error("Vendor add unsuccessful"));
  };

  const resetForm = () => {
    setVendorCode("");
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setOpeningBalance("");
    setPaymentTerms("");
  };

  const handleEditClick = (supplier) => {
    if (isReadOnlyMode) {
      toast.error("You can only view suppliers in read-only mode");
      return;
    }

    setSelectedSupplier(supplier);
    setVendorCode(supplier.vendorCode || "");
    setName(supplier.name || "");
    setPhone(supplier.contactInfo?.phone || "");
    setEmail(supplier.contactInfo?.email || "");
    setAddress(supplier.contactInfo?.address || "");
    setOpeningBalance(supplier.openingBalance ?? "");
    setPaymentTerms(supplier.paymentTerms ?? "");
    setIsFormVisible(true);
  };

  const displaySuppliers = query.trim() !== "" ? searchdata : getallSupplier;
  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const summaryTotals = Array.isArray(getallSupplier)
    ? getallSupplier.reduce(
        (acc, supplier) => {
          const vendorSummary = vendorBalances[supplier._id] || {};
          acc.total += Number(vendorSummary.totalAmount || 0);
          acc.paid += Number(vendorSummary.paidAmount || 0);
          acc.remaining += Number(vendorSummary.remainingAmount || 0);
          return acc;
        },
        { total: 0, paid: 0, remaining: 0 },
      )
    : { total: 0, paid: 0, remaining: 0 };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-orange-500 text-white text-lg sm:text-xl p-2">
              <TfiSupport />
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold">
              {getallSupplier?.length || 0}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total Vendors
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-purple-500 text-white text-lg sm:text-xl p-2">
              <AiOutlineProduct />
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold">
              {getallproduct?.length || 0}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Products Linked
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <div className="text-sm text-slate-500">Vendor Total Owed</div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {currency(summaryTotals.total)}
          </div>
          <div className="text-xs text-emerald-600 mt-2">
            Paid: {currency(summaryTotals.paid)}
          </div>
          <div className="text-xs text-red-600 mt-1">
            Remaining: {currency(summaryTotals.remaining)}
          </div>
        </div>

        {/* <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl sm:text-3xl font-bold">Active</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supplier Status
          </p>
        </div> */}
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search vendor..."
        />

        {canWrite && (
          <button
            onClick={() => {
              setIsFormVisible(true);
              setSelectedSupplier(null);
              resetForm();
            }}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Vendor
          </button>
        )}
        {isReadOnlyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            Read-Only Mode
          </div>
        )}
      </div>
      {/* OVERLAY */}
      {isFormVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsFormVisible(false)}
        />
      )}

      {/* SLIDE-IN DRAWER */}
      {isFormVisible && canWrite && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white p-6 border-l shadow-2xl z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedSupplier ? "Edit Vendor" : "Add Vendor"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={() => setIsFormVisible(false)}
              className="cursor-pointer text-2xl"
            />
          </div>

          <form onSubmit={selectedSupplier ? handleEditSubmit : submitSupplier}>
            {/* <div className="mb-4">
              <label>Vendor Code</label>
              <input
                value={vendorCode}
                placeholder="VND-0001"
                onChange={(e) => setVendorCode(e.target.value)}
                type="text"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div> */}

            <div className="mb-4">
              <label>Name</label>
              <input
                value={name}
                placeholder="Enter Vendor name"
                onChange={(e) => setName(e.target.value)}
                type="text"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>

            <div className="mb-4">
              <label>Phone</label>
              <input
                value={phone}
                type="number"
                placeholder="Enter Vendor Phone"
                onChange={(e) => setPhone(e.target.value)}
                // type="text"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>

            <div className="mb-4">
              <label>Email</label>
              <input
                value={email}
                placeholder="example@email.com"
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>

            <div className="mb-4">
              <label>Address</label>
              <input
                type="text"
                placeholder="Enter Vendor Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>

            <div className="mb-4">
              <label>Opening Balance</label>
              <input
                type="number"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>

            <div className="mb-4">
              <label>Payment Terms</label>
              <input
                type="text"
                placeholder="Net 30"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              />
            </div>

            <div className="mb-4">
              <label>Product</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
              >
                <option value="">Select a product</option>
                {getallproduct?.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              {selectedSupplier ? "Update Vendor" : "Add Vendor"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-4">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {!Array.isArray(displaySuppliers) || displaySuppliers.length === 0 ? (
            <div className="p-10 text-center">
              <NoData
                title="No Vendor Found"
                description="Try adjusting filters or add a new vendor to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Name</th>
                    <th className="px-5 py-4 font-medium">Phone</th>
                    <th className="px-5 py-4 font-medium">Email</th>
                    <th className="px-5 py-4 font-medium">Address</th>
                    <th className="px-5 py-4 font-medium">Opening</th>
                    <th className="px-5 py-4 font-medium">Total Owed</th>
                    <th className="px-5 py-4 font-medium">Paid</th>
                    <th className="px-5 py-4 font-medium">Remaining</th>
                    <th className="px-5 py-4 font-medium">Terms</th>
                    <th className="px-5 py-4 font-medium">Date</th>
                    {!isReadOnlyMode && (
                      <th className="px-5 py-4 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {displaySuppliers.map((supplier, index) => {
                    const vendorSummary = vendorBalances[supplier._id] || {};
                    return (
                    <tr
                      key={supplier._id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {supplier.name}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {supplier.contactInfo?.phone || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {supplier.contactInfo?.email || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                        {supplier.contactInfo?.address || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.openingBalance ?? 0}
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {currency(vendorSummary.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-emerald-700 font-medium">
                        {currency(vendorSummary.paidAmount)}
                      </td>
                      <td className="px-5 py-4 text-red-700 font-medium">
                        {currency(vendorSummary.remainingAmount)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.paymentTerms || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <FormattedTime timestamp={supplier.createdAt} />
                      </td>

                      {!isReadOnlyMode && (
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            {canDelete && (
                              <Popconfirm
                                title={
                                  <div className="flex flex-col gap-1 max-w-xs">
                                    <span className="font-semibold text-red-600 text-sm">
                                      Confirm Supplier Deletion
                                    </span>
                                    <span className="text-xs text-gray-600 leading-snug">
                                      This action will permanently remove this
                                      supplier and may affect linked purchase
                                      records. This operation cannot be undone.
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
                                onConfirm={() => handleRemove(supplier._id)}
                              >
                                <button
                                  className="
      p-2 rounded-lg
      bg-slate-100
      hover:bg-red-100
      text-red-600
      transition-all duration-200
      hover:shadow-sm
    "
                                  title="Delete Supplier"
                                >
                                  <MdDelete size={18} />
                                </button>
                              </Popconfirm>
                            )}
                            {canWrite && (
                              <button
                                onClick={() => handleEditClick(supplier)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Supplierpage;
