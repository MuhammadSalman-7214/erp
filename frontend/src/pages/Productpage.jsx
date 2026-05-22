import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd, IoMdTrash } from "react-icons/io";
import { MdDelete, MdEdit, MdOutlineCategory } from "react-icons/md";
import { AiOutlineDownload } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import FormattedTime from "../lib/FormattedTime";
import { FaMoneyBill1Wave, FaPalette } from "react-icons/fa6";

import {
  Addproduct,
  gettingallproducts,
  Searchproduct,
  Removeproduct,
  EditProduct,
  addProductCode,
  deleteProductCode,
} from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { AiOutlineProduct } from "react-icons/ai";
import NoData from "../Components/NoData";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";
import { Button, ConfirmDialog, Inputfield, SelectDropdown } from "../UI";

const emptyCode = {
  code: "",
};

const formatStockFileName = () => "Stock.pdf";

const normalizePdfText = (value) =>
  String(value || "-")
    .replace(/\s+/g, " ")
    .trim();

function Productpage({ readOnly = false }) {
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();

  // Determine if page is in read-only mode (from props OR role)
  const isReadOnlyMode = readOnly || checkReadOnly("product");
  const canWrite = hasPermission("product", "write");
  const canDelete = hasPermission("product", "delete");

  const {
    getallproduct,
    editedProduct,
    isproductadd,
    searchdata,
    isallproductget,
  } = useSelector((state) => state.product);

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
  const [dateAdded] = useState(new Date().toISOString().split("T")[0]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeProductId, setCodeProductId] = useState(null);
  const [codeForm, setCodeForm] = useState({ ...emptyCode });
  const [createdAtSort, setCreatedAtSort] = useState("asc");
  const [errors, setErrors] = useState({});
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);

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

  const getId = (value) => value?.id ?? value?.id ?? value;

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to edit products");
      return;
    }

    if (!selectedProduct) return;

    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Product name", {
        required: true,
        minLength: 2,
        maxLength: 150,
      }),
    );
    if (!nameCheck.ok) {
      toast.error(nameCheck.message);
      return;
    }

    const descriptionCheck = validateField(
      "description",
      description,
      (value) =>
        validateTextInput(value, "Description", {
          required: false,
          maxLength: 500,
          allowEmpty: true,
        }),
    );
    if (!descriptionCheck.ok) {
      toast.error(descriptionCheck.message);
      return;
    }

    const companyCheck = validateField("company", company, (value) =>
      validateTextInput(value, "Company", {
        required: false,
        maxLength: 120,
        allowEmpty: true,
      }),
    );
    if (!companyCheck.ok) {
      toast.error(companyCheck.message);
      return;
    }

    if (!Category) {
      toast.error("Category is required");
      return;
    }

    const purchaseCheck = validateField(
      "purchasePrice",
      purchasePrice,
      (value) =>
        validateNumberInput(value, "Purchase price", {
          min: 0,
          allowZero: true,
        }),
    );
    if (!purchaseCheck.ok) {
      toast.error(purchaseCheck.message);
      return;
    }

    const tradeCheck = validateField("tradePrice", tradePrice, (value) =>
      validateNumberInput(value, "Trade price", {
        min: 0,
        allowZero: true,
      }),
    );
    if (!tradeCheck.ok) {
      toast.error(tradeCheck.message);
      return;
    }

    const saleCheck = validateField("salePrice", salePrice, (value) =>
      validateNumberInput(value, "Sale price", {
        min: 0,
        allowZero: true,
      }),
    );
    if (!saleCheck.ok) {
      toast.error(saleCheck.message);
      return;
    }

    const updatedData = {
      name: nameCheck.value,
      description: descriptionCheck.value,
      company: companyCheck.value,
      Category,
      purchasePrice: purchaseCheck.value,
      tradePrice: tradeCheck.value,
      salePrice: saleCheck.value,
      dateAdded: selectedProduct.dateAdded || new Date().toISOString(),
    };
    setIsFormSubmitting(true);
    dispatch(EditProduct({ id: getId(selectedProduct), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Product updated successfully");
        closeForm();
      })
      .catch(() => toast.error("Failed to update product"))
      .finally(() => setIsFormSubmitting(false));
  };

  const submitProduct = async (event) => {
    event.preventDefault();

    if (!canWrite) {
      toast.error("You do not have permission to create products");
      return;
    }

    const nameCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Product name", {
        required: true,
        minLength: 2,
        maxLength: 150,
      }),
    );
    if (!nameCheck.ok) {
      toast.error(nameCheck.message);
      return;
    }

    const descriptionCheck = validateField(
      "description",
      description,
      (value) =>
        validateTextInput(value, "Description", {
          required: false,
          maxLength: 500,
          allowEmpty: true,
        }),
    );
    if (!descriptionCheck.ok) {
      toast.error(descriptionCheck.message);
      return;
    }

    const companyCheck = validateField("company", company, (value) =>
      validateTextInput(value, "Company", {
        required: false,
        maxLength: 120,
        allowEmpty: true,
      }),
    );
    if (!companyCheck.ok) {
      toast.error(companyCheck.message);
      return;
    }

    if (!Category) {
      toast.error("Category is required");
      return;
    }

    const purchaseCheck = validateField(
      "purchasePrice",
      purchasePrice,
      (value) =>
        validateNumberInput(value, "Purchase price", {
          min: 0,
          allowZero: true,
        }),
    );
    if (!purchaseCheck.ok) {
      toast.error(purchaseCheck.message);
      return;
    }

    const tradeCheck = validateField("tradePrice", tradePrice, (value) =>
      validateNumberInput(value, "Trade price", {
        min: 0,
        allowZero: true,
      }),
    );
    if (!tradeCheck.ok) {
      toast.error(tradeCheck.message);
      return;
    }

    const saleCheck = validateField("salePrice", salePrice, (value) =>
      validateNumberInput(value, "Sale price", {
        min: 0,
        allowZero: true,
      }),
    );
    if (!saleCheck.ok) {
      toast.error(saleCheck.message);
      return;
    }

    const productData = {
      name: nameCheck.value,
      description: descriptionCheck.value,
      company: companyCheck.value,
      Category,
      purchasePrice: purchaseCheck.value,
      tradePrice: tradeCheck.value,
      salePrice: saleCheck.value,
      dateAdded: new Date(dateAdded).toISOString(),
    };

    setIsFormSubmitting(true);
    dispatch(Addproduct(productData))
      .unwrap()
      .then(() => {
        toast.success("Product added successfully");
        closeForm();
      })
      .catch(() => toast.error("Product add unsuccessful"))
      .finally(() => setIsFormSubmitting(false));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCompany("");
    setCategory("");
    setPurchasePrice("");
    setTradePrice("");
    setSalePrice("");
    setErrors({});
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    setSelectedProduct(null);
    resetForm();
  };

  const openForm = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setName(product.name || "");
      setDescription(product.description || "");
      setCompany(product.company || product.brand || "");
      setCategory(getId(product.Category) || "");
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
    } else {
      setSelectedProduct(null);
      resetForm();
    }

    setErrors({});
    setIsDrawerMinimized(false);
    setIsFormVisible(true);
  };

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

  const handleEditClick = (product) => {
    if (isReadOnlyMode) {
      toast.error("You can only view products in read-only mode");
      return;
    }

    openForm(product);
  };

  const openCodeModal = (productId) => {
    setCodeProductId(productId);
    setCodeForm({ ...emptyCode });
    setIsCodeSubmitting(false);
    setIsCodeModalOpen(true);
  };

  const closeCodeModal = () => {
    setIsCodeModalOpen(false);
    setCodeProductId(null);
    setCodeForm({ ...emptyCode });
    setIsCodeSubmitting(false);
  };

  const handleAddCode = async () => {
    if (!codeProductId) return;
    const codeCheck = validateField("code", codeForm.code, (value) =>
      validateTextInput(value, "Shade code", {
        required: true,
        minLength: 1,
        maxLength: 60,
      }),
    );
    if (!codeCheck.ok) {
      toast.error(codeCheck.message);
      return;
    }

    const payload = {
      code: codeCheck.value,
    };

    setIsCodeSubmitting(true);
    dispatch(addProductCode({ productId: codeProductId, codeData: payload }))
      .unwrap()
      .then(() => {
        toast.success("Code added");
        setCodeForm({ ...emptyCode });
      })
      .catch((error) => toast.error(error || "Failed to add code"))
      .finally(() => setIsCodeSubmitting(false));
  };

  const handleDeleteCode = (codeId) => {
    if (!codeProductId) return;
    dispatch(deleteProductCode({ codeId, productId: codeProductId }))
      .unwrap()
      .then(() => toast.success("Code deleted"))
      .catch((error) => toast.error(error || "Failed to delete code"));
  };

  const displayProducts = useMemo(
    () => (productCodeQuery.trim() !== "" ? searchdata || [] : getallproduct),
    [productCodeQuery, searchdata, getallproduct],
  );

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

  const sortedRows = useMemo(
    () =>
      sortByDateValue(
        filteredRows || [],
        (row) => row.product?.createdAt,
        createdAtSort,
      ),
    [filteredRows, createdAtSort],
  );

  const stockReportRows = useMemo(() => {
    return sortedRows.map((row, index) => {
      const product = row.product || {};
      const code = row.code || null;

      return {
        no: index + 1,
        productName: normalizePdfText(product.name),
        productCode: normalizePdfText(code?.code || "-"),
        company: normalizePdfText(product.company || product.brand || "-"),
        category: normalizePdfText(product.Category?.name || "-"),
        description: normalizePdfText(product.description || "-"),
        qty: Number(code?.quantity ?? product.totalQuantity ?? 0),
      };
    });
  }, [sortedRows]);

  const handleDownloadStock = () => {
    if (!stockReportRows.length) {
      toast.error("No stock data available to download");
      return;
    }

    const toastId = toast.loading("Preparing stock PDF...");

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const topBandHeight = 18;
      const generatedAt = new Date().toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      pdf.setFillColor(15, 118, 110);
      pdf.rect(0, 0, pageWidth, topBandHeight, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Stock Report", marginX, 11);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`Generated: ${generatedAt}`, pageWidth - marginX, 11, {
        align: "right",
      });

      autoTable(pdf, {
        startY: topBandHeight + 8,
        head: [
          [
            "#",
            "Product Name",
            "Product Code",
            "Quantity",
            "Company",
            "Category",
            "Description",
          ],
        ],
        body: stockReportRows.map((row) => [
          row.no,
          row.productName,
          row.productCode,
          row.qty,
          row.company,
          row.category,
          row.description,
        ]),
        margin: { left: marginX, right: marginX, top: 10, bottom: 12 },
        theme: "grid",
        pageBreak: "auto",
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 2.2,
          overflow: "linebreak",
          valign: "middle",
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: (data) => {
          const footerY = pageHeight - 7;
          pdf.setDrawColor(203, 213, 225);
          pdf.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
          pdf.setFontSize(8);
          pdf.setTextColor(71, 85, 105);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Stock Report`, marginX, footerY);
          pdf.text(`Page ${data.pageNumber}`, pageWidth - marginX, footerY, {
            align: "right",
          });
        },
      });

      pdf.save(formatStockFileName());
      toast.success("Stock PDF downloaded", { id: toastId });
    } catch (error) {
      console.error("Failed to generate stock PDF", error);
      toast.error("Failed to download stock PDF", { id: toastId });
    }
  };

  const codeProduct = useMemo(
    () =>
      getallproduct.find((product) => getId(product) === codeProductId) || null,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 lg:grid-cols-3">
        <div className="rounded-xl p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Total Products
            </div>
            <AiOutlineProduct className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 transition-all duration-300">
            {getallproduct?.length || 0}
          </div>
        </div>

        <div className="rounded-xl p-5 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Total Store Value
            </div>
            <FaMoneyBill1Wave className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 transition-all duration-300">
            Rs {totalStoreValue || 0}
          </div>
        </div>

        <div className="rounded-xl p-5 border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Total Categories
            </div>
            <MdOutlineCategory className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700 transition-all duration-300">
            {getallCategory?.length || 0}
          </div>
        </div>
      </div>

      {/* SEARCH + ADD */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <Inputfield
          type="text"
          value={productCodeQuery}
          onChange={(e) => setProductCodeQuery(e.target.value)}
          maxLength={120}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search by name, code, company, or category..."
        />

        <Button
          type="button"
          onClick={handleDownloadStock}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 h-10 rounded-xl flex items-center justify-center shadow-md transition"
        >
          <AiOutlineDownload className="text-lg mr-2" />
          Download Stock
        </Button>

        {canWrite && (
          <Button
            onClick={() => openForm()}
            className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
          >
            <IoMdAdd className="text-xl mr-2" /> Create Product
          </Button>
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
          {isallproductget ? (
            <TableSkeleton rows={6} showFilters={false} />
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
                    <DateSortHeader
                      label="Date"
                      direction={createdAtSort}
                      onToggle={() =>
                        setCreatedAtSort((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                    />
                    {!isReadOnlyMode && (
                      <th className="px-5 py-4 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row, index) => {
                    const product = row.product;
                    const code = row.code;
                    const codeCount = Array.isArray(product.productCodes)
                      ? product.productCodes.length
                      : 0;
                    const isCodeDelete = Boolean(code && codeCount > 1);
                    return (
                      <tr
                        key={`${getId(product)}-${getId(code) || "no-code"}-${index}`}
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
                                <ConfirmDialog
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
                                      productId: getId(product),
                                      codeId: getId(code),
                                      codeCount,
                                    })
                                  }
                                >
                                  <Button
                                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition-all duration-200 hover:shadow-sm"
                                    title="Delete Product"
                                  >
                                    <MdDelete size={18} />
                                  </Button>
                                </ConfirmDialog>
                              )}
                              {canWrite && (
                                <Button
                                  onClick={() => handleEditClick(product)}
                                  className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                                  title="Edit"
                                >
                                  <MdEdit size={18} />
                                </Button>
                              )}
                              {canWrite && (
                                <Button
                                  onClick={() => openCodeModal(getId(product))}
                                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-orange-100 text-orange-500 text-xs font-semibold transition"
                                  title="Manage Codes"
                                >
                                  <FaPalette size={16} />
                                </Button>
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

      <DrawerPanel
        open={isFormVisible}
        title={selectedProduct ? "Edit Product" : "Create Product"}
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[480px]"
      >
        <div className="p-6">
          <form
            onSubmit={selectedProduct ? handleEditSubmit : submitProduct}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Name</label>
              <Inputfield
                type="text"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  validateField("name", value, (current) =>
                    validateTextInput(current, "Product name", {
                      required: true,
                      minLength: 2,
                      maxLength: 150,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("name", e.target.value, (current) =>
                    validateTextInput(current, "Product name", {
                      required: true,
                      minLength: 2,
                      maxLength: 150,
                    }),
                  )
                }
                maxLength={150}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Inputfield
                type="text"
                value={description}
                onChange={(e) => {
                  const value = e.target.value;
                  setDescription(value);
                  validateField("description", value, (current) =>
                    validateTextInput(current, "Description", {
                      required: false,
                      maxLength: 500,
                      allowEmpty: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("description", e.target.value, (current) =>
                    validateTextInput(current, "Description", {
                      required: false,
                      maxLength: 500,
                      allowEmpty: true,
                    }),
                  )
                }
                maxLength={500}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.description}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <Inputfield
                type="text"
                value={company}
                onChange={(e) => {
                  const value = e.target.value;
                  setCompany(value);
                  validateField("company", value, (current) =>
                    validateTextInput(current, "Company", {
                      required: false,
                      maxLength: 120,
                      allowEmpty: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("company", e.target.value, (current) =>
                    validateTextInput(current, "Company", {
                      required: false,
                      maxLength: 120,
                      allowEmpty: true,
                    }),
                  )
                }
                maxLength={120}
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-500">{errors.company}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <SelectDropdown
                value={Category}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategory(value);
                  validateField("Category", value, (current) =>
                    validateTextInput(current, "Category", {
                      required: true,
                      maxLength: 80,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("Category", e.target.value, (current) =>
                    validateTextInput(current, "Category", {
                      required: true,
                      maxLength: 80,
                    }),
                  )
                }
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select category</option>
                {getallCategory?.map((c) => (
                  <option key={getId(c)} value={getId(c)}>
                    {c.name}
                  </option>
                ))}
              </SelectDropdown>
              {errors.Category && (
                <p className="mt-1 text-sm text-red-500">{errors.Category}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Purchase Price</label>
              <Inputfield
                type="number"
                value={purchasePrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setPurchasePrice(value);
                  validateField("purchasePrice", value, (current) =>
                    validateNumberInput(current, "Purchase price", {
                      min: 0,
                      allowZero: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("purchasePrice", e.target.value, (current) =>
                    validateNumberInput(current, "Purchase price", {
                      min: 0,
                      allowZero: true,
                    }),
                  )
                }
                min="0"
                step="0.01"
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {errors.purchasePrice && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.purchasePrice}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Trade Price</label>
              <Inputfield
                type="number"
                value={tradePrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setTradePrice(value);
                  validateField("tradePrice", value, (current) =>
                    validateNumberInput(current, "Trade price", {
                      min: 0,
                      allowZero: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("tradePrice", e.target.value, (current) =>
                    validateNumberInput(current, "Trade price", {
                      min: 0,
                      allowZero: true,
                    }),
                  )
                }
                min="0"
                step="0.01"
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {errors.tradePrice && (
                <p className="mt-1 text-sm text-red-500">{errors.tradePrice}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Sale Price</label>
              <Inputfield
                type="number"
                value={salePrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setSalePrice(value);
                  validateField("salePrice", value, (current) =>
                    validateNumberInput(current, "Sale price", {
                      min: 0,
                      allowZero: true,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("salePrice", e.target.value, (current) =>
                    validateNumberInput(current, "Sale price", {
                      min: 0,
                      allowZero: true,
                    }),
                  )
                }
                min="0"
                step="0.01"
                className="w-full h-11 px-3 border border-gray-300 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {errors.salePrice && (
                <p className="mt-1 text-sm text-red-500">{errors.salePrice}</p>
              )}
            </div>

            <LoadingButton
              type="submit"
              loading={isFormSubmitting}
              loadingText={selectedProduct ? "Updating..." : "Creating..."}
              className="mt-4 h-12 w-full rounded-xl bg-teal-700 text-white shadow-md hover:bg-teal-600"
            >
              {selectedProduct ? "Update Product" : "Create Product"}
            </LoadingButton>
          </form>
        </div>
      </DrawerPanel>

      {isCodeModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={closeCodeModal}
        />
      )}

      {isCodeModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl border flex flex-col overflow-hidden"
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
              <Button
                onClick={closeCodeModal}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </Button>
            </div>

            <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="border rounded-xl p-4 bg-slate-50">
                <h4 className="text-sm font-semibold mb-3">Add New Code</h4>
                <div>
                  <label className="text-xs font-medium">Shade Code</label>
                  <Inputfield
                    type="text"
                    value={codeForm.code}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCodeForm((prev) => ({
                        ...prev,
                        code: value,
                      }));
                      validateField("code", value, (current) =>
                        validateTextInput(current, "Shade code", {
                          required: true,
                          minLength: 1,
                          maxLength: 60,
                        }),
                      );
                    }}
                    onBlur={(e) =>
                      validateField("code", e.target.value, (current) =>
                        validateTextInput(current, "Shade code", {
                          required: true,
                          minLength: 1,
                          maxLength: 60,
                        }),
                      )
                    }
                    maxLength={60}
                    className="w-full h-9 px-2 border rounded-lg mt-1"
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs text-red-500">{errors.code}</p>
                  )}
                </div>
                <LoadingButton
                  type="button"
                  onClick={handleAddCode}
                  loading={isCodeSubmitting}
                  loadingText="Adding..."
                  className="mt-3 w-full h-10 bg-teal-700 hover:bg-teal-600 text-white rounded-xl"
                >
                  Add Code
                </LoadingButton>
              </div>
              <div className="border rounded-2xl bg-slate-50 p-4 flex flex-col min-h-0">
                <div className="text-xs font-semibold text-slate-500 mb-3">
                  Shade Codes
                </div>

                {codeProduct?.productCodes?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pr-1">
                    {codeProduct.productCodes.map((code) => (
                      <div
                        key={getId(code)}
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
                          <Button
                            onClick={() => handleDeleteCode(getId(code))}
                            className="flex w-full items-center justify-center gap-1 px-3 py-2 rounded-lg 
              bg-red-200 text-red-600 hover:bg-red-300 
              text-xs font-semibold transition"
                          >
                            <IoMdTrash size={16} /> Delete
                          </Button>
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
