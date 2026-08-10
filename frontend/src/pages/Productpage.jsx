import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd, IoMdTrash, IoMdSearch } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import { AiOutlineDownload } from "react-icons/ai";
import { FiCamera, FiPrinter } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import FormattedTime from "../lib/FormattedTime";
import { formatCurrency } from "../lib/formatNumber";
import { FaPalette } from "react-icons/fa6";

import {
  Addproduct,
  gettingallproducts,
  Searchproduct,
  Removeproduct,
  EditProduct,
  addProductCode,
  generateProductCode,
  deleteProductCode,
} from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import toast from "react-hot-toast";
import { useRolePermissions } from "../hooks/useRolePermissions";
import NoData from "../Components/NoData";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";
import {
  Button,
  ConfirmDialog,
  Inputfield,
  SelectDropdown,
  Tooltip,
} from "../UI";
import CodeBadge from "../Components/CodeBadge";
import TablePagination from "../UI/TablePagination";
import BarcodeScannerModal from "../Components/BarcodeScannerModal";
import { lookupProductCodeByCode } from "../lib/barcodeApi";
import { printBarcodeLabel, downloadLabelSheetPdf } from "../lib/barcodeLabel";

const emptyCode = {
  code: "",
};

const formatStockFileName = () => "Stock.pdf";

const normalizePdfText = (value) =>
  String(value || "-")
    .replace(/\s+/g, " ")
    .trim();

const getRowQuantity = (row) =>
  Number(row?.code?.quantity ?? row?.product?.totalQuantity ?? 0);

function Productpage({ readOnly = false }) {
  const { hasPermission, isReadOnly: checkReadOnly } = useRolePermissions();
  const { sidebarOpen } = useSelector((state) => state.sidebar);

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
    pagination,
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
  const [isCodeGenerating, setIsCodeGenerating] = useState(false);
  const [showFindScanner, setShowFindScanner] = useState(false);
  const [showAddCodeScanner, setShowAddCodeScanner] = useState(false);

  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(
      gettingallproducts({
        page: currentPage,
        pageSize: PAGE_SIZE,
        sortDir: createdAtSort,
      }),
    );
    dispatch(gettingallCategory());
  }, [dispatch, editedProduct, isproductadd, currentPage, createdAtSort]);

  useEffect(() => {
    setCurrentPage(1);
  }, [productCodeQuery]);

  useEffect(() => {
    if (productCodeQuery.trim() === "") {
      dispatch(
        gettingallproducts({
          page: 1,
          pageSize: PAGE_SIZE,
          sortDir: createdAtSort,
        }),
      );
    }
  }, [dispatch, productCodeQuery, createdAtSort]);
  useEffect(() => {
    if (productCodeQuery.trim() !== "") {
      const debounce = setTimeout(() => {
        dispatch(Searchproduct(productCodeQuery));
      }, 500); // debounce for 0.5s
      return () => clearTimeout(debounce);
    }
    // dispatch(gettingallproducts());
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
        setCurrentPage(1);
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

    try {
      const existing = await lookupProductCodeByCode(codeCheck.value);
      const matches =
        existing?.match === "single"
          ? [existing]
          : existing?.match === "multiple"
            ? existing.options
            : [];
      const usedElsewhere = matches.some(
        (entry) => String(entry.product?.id) !== String(codeProductId),
      );
      if (usedElsewhere) {
        toast(
          `Heads up: "${codeCheck.value}" is already used on another product.`,
          { icon: "⚠️" },
        );
      }
    } catch {
      // A 404 just means the code isn't used anywhere yet — nothing to warn about.
    }

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

  const handleScanNewCode = (rawCode) => {
    const scanned = String(rawCode || "").trim();
    if (!scanned) return;

    setCodeForm((prev) => ({ ...prev, code: scanned }));
    validateField("code", scanned, (current) =>
      validateTextInput(current, "Shade code", {
        required: true,
        minLength: 1,
        maxLength: 60,
      }),
    );
    setShowAddCodeScanner(false);
  };

  const handleGenerateCode = () => {
    if (!codeProductId) return;
    setIsCodeGenerating(true);
    dispatch(generateProductCode({ productId: codeProductId, codeData: {} }))
      .unwrap()
      .then((result) => {
        toast.success(`Barcode ${result.productCode?.code} generated`);
      })
      .catch((error) => toast.error(error || "Failed to generate barcode"))
      .finally(() => setIsCodeGenerating(false));
  };

  const handlePrintLabel = (code) => {
    const printed = printBarcodeLabel({
      code: code.code,
      productName: codeProduct?.name,
      variantName: code.variantName,
      price: codeProduct?.salePrice || codeProduct?.Price,
    });
    if (!printed) {
      toast.error("Please allow pop-ups to print the label");
    }
  };

  const handlePrintAllLabels = () => {
    const codes = codeProduct?.productCodes || [];
    if (!codes.length) {
      toast.error("No codes to print for this product");
      return;
    }
    downloadLabelSheetPdf(
      codes.map((code) => ({
        code: code.code,
        productName: codeProduct?.name,
        price: codeProduct?.salePrice || codeProduct?.Price,
      })),
      `${String(codeProduct?.name || "product").replace(/[^a-z0-9-_]+/gi, "_")}_labels.pdf`,
    );
  };

  const resolveFindScannedCode = (rawCode) => {
    const scanned = String(rawCode || "").trim();
    if (!scanned) return;

    setShowFindScanner(false);
    setProductCodeQuery(scanned);
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

    const matchesSearch = ({ product, code }) => {
      const productName = String(product?.name || "").toLowerCase();
      const company = String(
        product?.company || product?.brand || "",
      ).toLowerCase();
      const category = String(product?.Category?.name || "").toLowerCase();
      const productDescription = String(
        product?.description || "",
      ).toLowerCase();
      const codeValue = String(code?.code || "").toLowerCase();
      const variantValue = String(code?.variantName || "").toLowerCase();

      return (
        productName.includes(normalizedQuery) ||
        company.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        productDescription.includes(normalizedQuery) ||
        codeValue.includes(normalizedQuery) ||
        variantValue.includes(normalizedQuery)
      );
    };

    const codeRows = displayRows.filter((row) => {
      if (!row?.product) return false;
      return matchesSearch(row);
    });

    return codeRows;
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

  const tableTotals = useMemo(() => {
    return sortedRows.reduce(
      (acc, row) => {
        const product = row.product || {};
        const quantity = getRowQuantity(row);
        const purchasePrice = Number(product.purchasePrice ?? 0);
        const tradePrice = Number(product.tradePrice ?? 0);
        const salePrice = Number(product.salePrice ?? 0);

        acc.rowCount += 1;
        acc.totalQuantity += quantity;
        acc.purchaseValue += quantity * purchasePrice;
        acc.tradeValue += quantity * tradePrice;
        acc.storeValue += quantity * salePrice;

        const productId = getId(product);
        if (productId !== undefined && productId !== null) {
          acc.uniqueProductIds.add(productId);
        }

        return acc;
      },
      {
        rowCount: 0,
        totalQuantity: 0,
        purchaseValue: 0,
        tradeValue: 0,
        storeValue: 0,
        uniqueProductIds: new Set(),
      },
    );
  }, [sortedRows]);

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
        qty: getRowQuantity(row),
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

  return (
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <IoMdSearch className="text-lg" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Product Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search products by name, code, company, or category.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {sortedRows.length} records shown
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Search</label>
            <Inputfield
              type="text"
              value={productCodeQuery}
              onChange={(e) => setProductCodeQuery(e.target.value)}
              maxLength={120}
              placeholder="Search by name, code, company, or category..."
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleDownloadStock}
              variant="secondary"
            >
              <AiOutlineDownload size={18} />
              Download Stock
            </Button>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => setShowFindScanner(true)}
              variant="outline"
            >
              <FiCamera size={16} />
              Scan to Find
            </Button>
          </div>

          {canWrite && (
            <div className="flex items-end">
              <Button onClick={() => openForm()} variant="primary">
                <IoMdAdd size={18} />
                Create Product
              </Button>
            </div>
          )}

          {isReadOnlyMode && (
            <div className="flex items-end">
              <div className="inline-flex h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-700 shadow-sm">
                Read-Only Mode
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
              <div
                className={`max-h-[56vh] overflow-y-auto w-full ${!sidebarOpen ? "max-w-[310px] mobileL:max-w-[330px] tab:max-w-[680px] laptop:max-w-[1424px] laptopL:max-w-[1550px] laptop4k:max-w-full" : "max-w-[220px] mobileL:max-w-[160px] tab:max-w-[480px] laptop:max-w-[1030px] laptopL:max-w-[1246px] laptop4k:max-w-full"}  mx-auto overflow-x-auto relative`}
              >
                <div
                  className={`flex gap-2 ${sidebarOpen ? "w-max" : "w-full"}`}
                >
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">#</th>
                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 font-semibold">
                          Product Code
                        </th>
                        <th className="px-5 py-4 font-semibold">Description</th>
                        <th className="px-5 py-4 font-semibold ">Quantity</th>

                        <th className="px-5 py-4 font-semibold">
                          Purchase Price
                        </th>
                        <th className="px-5 py-4 font-semibold">Trade Price</th>
                        <th className="px-5 py-4 font-semibold">Sale Price</th>
                        <th className="px-5 py-4 font-semibold">Category</th>
                        <th className="px-5 py-4 font-semibold">
                          <DateSortHeader
                            label="Date"
                            direction={createdAtSort}
                            onToggle={() =>
                              setCreatedAtSort((prev) =>
                                prev === "asc" ? "desc" : "asc",
                              )
                            }
                          />
                        </th>

                        {!isReadOnlyMode && (
                          <th
                            className="px-5 py-4 font-semibold text-center sticky right-0 bg-slate-50 z-40"
                            style={{
                              boxShadow:
                                "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                            }}
                          >
                            Actions
                          </th>
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
                            className="group border-b border-slate-100 bg-white transition-colors duration-150 hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-4 text-xs font-medium text-slate-400">
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
                                  <CodeBadge>{code.code}</CodeBadge>{" "}
                                  {code.variantName
                                    ? ` • ${code.variantName}`
                                    : ""}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {product.description ?? "-"}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {(() => {
                                const quantity = getRowQuantity(row);
                                return quantity > 0 ? (
                                  <span className="inline-flex w-full items-center rounded-full  px-2.5 py-1 text-sm font-semibold text-teal-700">
                                    {quantity}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    Out of stock
                                  </span>
                                );
                              })()}
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

                            <td className="px-5 py-4 text-slate-600">
                              <FormattedTime timestamp={product?.createdAt} />
                            </td>

                            {!isReadOnlyMode && (
                              <td
                                className="px-4 py-4 sticky right-0 z-10 bg-gray-50/80 text-center transition-colors duration-150"
                                style={{
                                  boxShadow:
                                    "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                                }}
                              >
                                <div className="flex justify-center">
                                  <div className="flex items-center justify-center gap-2 overflow-hidden">
                                    {canWrite && (
                                      <Tooltip content="Edit Product">
                                        <Button
                                          type="button"
                                          onClick={() =>
                                            handleEditClick(product)
                                          }
                                          size="sm"
                                          className="metal-btn"
                                          variant="info"
                                        >
                                          <MdEdit size={18} />
                                        </Button>
                                      </Tooltip>
                                    )}
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
                                        onConfirm={() =>
                                          handleRowDelete({
                                            productId: getId(product),
                                            codeId: getId(code),
                                            codeCount,
                                          })
                                        }
                                      >
                                        <Tooltip content="Delete Product">
                                          <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            className="metal-btn"
                                          >
                                            <MdDelete size={18} />
                                          </Button>
                                        </Tooltip>
                                      </ConfirmDialog>
                                    )}

                                    {canWrite && (
                                      <Tooltip content="Manage Code">
                                        <Button
                                          type="button"
                                          onClick={() =>
                                            openCodeModal(getId(product))
                                          }
                                          size="sm"
                                          className="metal-btn"
                                          variant="orange"
                                        >
                                          <FaPalette size={16} />
                                        </Button>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="sticky z-20 bottom-0 bg-slate-50 border-t-2 border-slate-200 text-sm font-semibold text-slate-700">
                        <td
                          className="px-5 py-4 text-md text-teal-800"
                          colSpan={4}
                          // style={{
                          //   background:
                          //     "linear-gradient(135deg,rgb(203, 250, 246) 0%,rgb(182, 227, 247) 55%,rgb(201, 221, 251) 100%)",
                          // }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold uppercase">
                              Grand Total
                            </span>
                            {/* <span className="text-sm text-cyan-50/95">
                              {tableTotals.rowCount} rows,{" "}
                              {tableTotals.uniqueProductIds.size} unique
                              products
                            </span> */}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 ">
                            <span className="inline-flex w-fit items-center rounded-full border border-teal-200 bg-teal-50/90  px-3 py-1 text-base font-bold text-teal-800 shadow-sm">
                              {tableTotals.totalQuantity.toLocaleString()}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-teal-700/80">
                              Total Quantity
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50/90 px-3 py-1 text-base font-bold text-violet-800 shadow-sm">
                              {formatCurrency(tableTotals.purchaseValue)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-violet-700/80">
                              Purchase Value
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-base font-bold text-amber-800 shadow-sm">
                              {formatCurrency(tableTotals.tradeValue)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700/80">
                              Trade Value
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-base font-bold text-emerald-800 shadow-sm">
                              {formatCurrency(tableTotals.storeValue)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700/80">
                              Store Value
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {/* <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                              Inventory Snapshot
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                              Totals reflect the visible rows
                            </span>
                          </div> */}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {/* <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                              Date
                            </span>
                            <span className="text-sm font-medium text-slate-600">
                              Summary
                            </span>
                          </div> */}
                        </td>

                        {!isReadOnlyMode && (
                          <td
                            className="sticky right-0 z-20 bg-gray-50/80 px-4 py-4 text-center text-white"
                            style={{
                              boxShadow:
                                "inset 8px 0 16px -8px rgba(166, 174, 192, 0.45)",
                            }}
                          >
                            <div className="flex flex-col gap-1">
                              {/* <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                                Actions
                              </span> */}
                              <span className="text-sm font-semibold text-emerald-700/80">
                                Summary
                              </span>
                            </div>
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
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
              <label className="text-xs font-medium text-slate-600">Name</label>
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
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Description
              </label>
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
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.description}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Company
              </label>
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
                required
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-500">{errors.company}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Category
              </label>
              <SelectDropdown
                value={Category}
                onChange={(value) => {
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
                placeholder="Select Category"
              >
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
              <label className="text-xs font-medium text-slate-600">
                Purchase Price
              </label>
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
              />
              {errors.purchasePrice && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.purchasePrice}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Trade Price
              </label>
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
              />
              {errors.tradePrice && (
                <p className="mt-1 text-sm text-red-500">{errors.tradePrice}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Sale Price
              </label>
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
              />
              {errors.salePrice && (
                <p className="mt-1 text-sm text-red-500">{errors.salePrice}</p>
              )}
            </div>

            <LoadingButton
              type="submit"
              loading={isFormSubmitting}
              loadingText={selectedProduct ? "Updating..." : "Creating..."}
              className="mt-4 h-12 w-full rounded-xl bg-teal-700 text-white shadow-sm hover:bg-teal-600"
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
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl border flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Manage Codes
                </h3>
                <p className="text-xs text-slate-500">
                  {codeProduct?.name || "Product"}{" "}
                  {codeProduct?.company || codeProduct?.brand
                    ? `• ${codeProduct?.company || codeProduct?.brand}`
                    : ""}
                </p>
              </div>
              <Button onClick={closeCodeModal} variant="outline">
                Close
              </Button>
            </div>

            <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="text-sm font-semibold mb-3">Add New Code</h4>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">
                      Shade Code
                    </label>
                    <Button
                      type="button"
                      onClick={() => setShowAddCodeScanner(true)}
                      variant="outline"
                      size="sm"
                      className="!gap-1.5"
                    >
                      <FiCamera size={12} /> Scan
                    </Button>
                  </div>
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
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs text-red-500">{errors.code}</p>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAddCode}
                    loading={isCodeSubmitting}
                    loadingText="Adding..."
                    variant="primary"
                    className="flex-1"
                  >
                    Add Code
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGenerateCode}
                    loading={isCodeGenerating}
                    loadingText="Generating..."
                    variant="outline"
                    className="flex-1"
                  >
                    <FiCamera size={14} /> Generate Barcode
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  No barcode on the product yet? Generate one here, then print
                  and stick a label on the item.
                </p>
              </div>
              <div className="border rounded-lg bg-slate-50 p-4 flex flex-col min-h-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500">
                    Shade Codes
                  </div>
                  {codeProduct?.productCodes?.length ? (
                    <Button
                      type="button"
                      onClick={handlePrintAllLabels}
                      variant="outline"
                      size="sm"
                      className="!gap-1.5"
                    >
                      <FiPrinter size={14} /> Print All Labels
                    </Button>
                  ) : null}
                </div>

                {codeProduct?.productCodes?.length ? (
                  <div className="grid grid-cols-1 gap-3 pr-1 sm:grid-cols-2 lg:grid-cols-4">
                    {codeProduct.productCodes.map((code) => (
                      <div
                        key={getId(code)}
                        className="group relative rounded-lg bg-gradient-to-br from-white to-slate-100 
          p-4 shadow-sm hover:shadow-xl transition-all duration-300 
          hover:-translate-y-1 border border-slate-200 
          flex flex-col justify-between"
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-2 text-xs text-slate-500">
                            Shade Code
                          </div>

                          <CodeBadge>{code.code}</CodeBadge>
                        </div>

                        <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
                          <Button
                            onClick={() => handlePrintLabel(code)}
                            variant="outline"
                            className="flex flex-1 items-center justify-center gap-1 text-xs font-semibold"
                          >
                            <FiPrinter size={14} /> Print
                          </Button>
                          <Button
                            onClick={() => handleDeleteCode(getId(code))}
                            variant="danger"
                            className="flex flex-1 items-center justify-center gap-1
              bg-red-200 text-red-600 hover:bg-red-300
              text-xs font-semibold"
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
      <BarcodeScannerModal
        open={showFindScanner}
        onClose={() => setShowFindScanner(false)}
        onDetected={resolveFindScannedCode}
        title="Scan to find a product"
        helperText="Scan a barcode to jump straight to that product's codes, or type the code below."
        manualPlaceholder="Type product code"
      />
      <BarcodeScannerModal
        open={showAddCodeScanner}
        onClose={() => setShowAddCodeScanner(false)}
        onDetected={handleScanNewCode}
        title="Scan the product's barcode"
        helperText="Scan the barcode printed on the physical item to fill in the code below."
        manualPlaceholder="Type the code"
      />
    </div>
  );
}

export default Productpage;
