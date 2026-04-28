import { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import FormattedTime from "../lib/FormattedTime";

import {
  CreateSales,
  gettingallSales,
  EditSales,
  DeleteSales,
} from "../features/salesSlice";
import toast from "react-hot-toast";
import { gettingallproducts } from "../features/productSlice";
import { PiInvoiceBold } from "react-icons/pi";
import NoData from "../Components/NoData";
import { createCustomer, getAllCustomers } from "../features/customerSlice";
import axiosInstance from "../lib/axios";
import { Popconfirm } from "antd";
import {
  buildInvoicePrintHtml,
  combineInvoicePagesHtml,
} from "../lib/invoicePrintTemplate";
import DrawerPanel from "../Components/DrawerPanel";
import LoadingButton from "../Components/LoadingButton";
import useKeyboardDropdown from "../hooks/useKeyboardDropdown";
import {
  formatDateLabel,
  formatDateTimeLabel,
  getDateTimestamp,
} from "../lib/dateFormat";
import DateSortHeader from "../Components/DateSortHeader";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";

const sanitizeFileName = (value) =>
  String(value || "invoice")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "invoice";

const splitLongText = (doc, text, width) =>
  doc.splitTextToSize(String(text || "-"), width);

const loadLogoDataUrl = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width || 120;
      canvas.height = image.naturalHeight || image.height || 120;
      const context = canvas.getContext("2d");
      if (!context) return "";
      context.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.error("Failed to load logo", error);
    return "";
  }
};

function Salespage() {
  const getId = (value) => value?.id ?? value?.id ?? value;
  const { getallsales } = useSelector((state) => state.sales);

  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    phone: "",
    address: "",
  });
  const [Payment, setPayment] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [carage, setCarage] = useState("");
  // const [paymentStatus, setpaymentStatus] = useState("");
  const [Status, setStatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [saleDateSort, setSaleDateSort] = useState("desc");
  const [codeQuery, setCodeQuery] = useState("");
  const [debouncedCodeQuery, setDebouncedCodeQuery] = useState("");
  const [showCodeOptions, setShowCodeOptions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billSale, setBillSale] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const [selectedSales, setselectedSales] = useState(null);
  const { getAllCustomer } = useSelector((state) => state.customer);
  const getStatusBadge = (status) => {
    const mapping = {
      pending: "bg-yellow-50 text-yellow-700",
      completed: "bg-blue-50 text-blue-700",
      cancelled: "bg-teal-50 text-teal-700",
    };
    return mapping[status] || "bg-gray-200 text-gray-800";
  };
  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(getAllCustomers());
  }, [dispatch]);

  useEffect(() => {
    dispatch(gettingallSales());
  }, [dispatch]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await axiosInstance.get("/payment");
        setPayments(res.data.payments || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchPayments();
  }, [getallsales]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCodeQuery(codeQuery.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [codeQuery]);

  useEffect(() => {
    const parsedReceived = Number(receivedAmount || 0);
    if (!Number.isFinite(parsedReceived) || parsedReceived <= 0) {
      setPayment("credit");
      return;
    }

    if (!Payment || Payment === "credit") {
      setPayment("");
    }
  }, [receivedAmount, Payment]);

  const codeOptions = useMemo(() => {
    if (!debouncedCodeQuery) return [];
    const q = debouncedCodeQuery.toLowerCase();
    const results = [];
    getallproduct.forEach((product) => {
      (product.productCodes || []).forEach((code) => {
        const codeValue = String(code.code || "").toLowerCase();
        if (!codeValue.includes(q)) return;
        results.push({
          productId: getId(product),
          codeId: getId(code),
          code: code.code,
          description: product.description,
          name: product.name,
          company: product.company || product.brand || "",
          availableQty: Number(code.quantity || 0),
          unitPrice: Number(
            product.salePrice ??
              product.pricing?.currentSalesPrice ??
              product.Price ??
              code.salePrice ??
              0,
          ),
        });
      });
    });
    return results.slice(0, 20);
  }, [debouncedCodeQuery, getallproduct]);

  const availableQtyByCode = useMemo(() => {
    const map = new Map();
    getallproduct.forEach((product) => {
      (product.productCodes || []).forEach((code) => {
        map.set(String(getId(code)), Number(code.quantity || 0));
      });
    });
    return map;
  }, [getallproduct]);

  const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

  const getSaleTotals = (sale) => {
    const totalAmount = Number(sale?.totalAmount || 0);
    const carageAmount = Number(sale?.carage || 0);
    const subTotal = Math.max(totalAmount - carageAmount, 0);
    const receivedAmountValue = Number.isFinite(Number(sale?.paidAmount))
      ? Number(sale?.paidAmount || 0)
      : Math.max(totalAmount - Number(sale?.remainingAmount || 0), 0);
    const remainingAmountValue = Math.max(totalAmount - receivedAmountValue, 0);

    return {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    };
  };

  const cartSubTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [cartItems],
  );
  const carageAmount = Number(carage || 0);
  const cartGrandTotal = cartSubTotal + carageAmount;
  const parsedReceivedAmount = Number(receivedAmount || 0);
  const remainingAfterReceive = Math.max(
    cartGrandTotal -
      (Number.isFinite(parsedReceivedAmount) ? parsedReceivedAmount : 0),
    0,
  );

  const openBillPreview = (sale) => {
    if (!sale) return;
    setBillSale(sale);
    setShowBillModal(true);
  };

  const closeBillPreview = () => {
    setShowBillModal(false);
    setBillSale(null);
  };

  //   const handlePrintBill = () => {
  //     if (!billSale) return;

  //     const items = Array.isArray(billSale.products) ? billSale.products : [];
  //     const {
  //       totalAmount,
  //       carageAmount,
  //       subTotal,
  //       receivedAmountValue,
  //       remainingAmountValue,
  //     } = getSaleTotals(billSale);

  //     const rows = items
  //       .map((item, index) => {
  //         const name = item.product?.name || "Product";
  //         const description = item.product?.description || "";
  //         const company = item.product?.company || item.product?.brand || "";
  //         const code = item.productCode?.code || "-";

  //         const qty = Number(item.quantity || 0);
  //         const price = Number(item.price || 0);
  //         const total = qty * price;

  //         return `
  //         <tr>
  //           <td>${index + 1}</td>

  //           <td>
  //             <div class="product-name">${name}</div>
  //             ${
  //               description
  //                 ? `<div class="product-desc">${description}</div>`
  //                 : ""
  //             }
  //             ${company ? `<div class="product-company">${company}</div>` : ""}
  //           </td>

  //           <td><span class="badge">${code}</span></td>

  //           <td class="num">${qty}</td>
  //           <td class="num">Rs ${price.toLocaleString()}</td>
  //           <td class="num">Rs ${total.toLocaleString()}</td>
  //         </tr>
  //       `;
  //       })
  //       .join("");

  //     const customerPhone =
  //       billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "-";

  //     const customerAddress =
  //       billSale.customer?.contactInfo?.address ||
  //       billSale.customer?.address ||
  //       "-";

  //     // ✅ PUT YOUR LOGO URL HERE
  //     const logoUrl = "https://via.placeholder.com/80x80?text=Logo";

  //     const printWindow = window.open("", "_blank", "width=900,height=650");

  //     if (!printWindow) {
  //       toast.error("Popup blocked. Please allow popups.");
  //       return;
  //     }

  //     printWindow.document.write(`
  // <html>
  // <head>
  //   <title>Invoice</title>

  //   <style>
  //     * { box-sizing: border-box; }

  //     @page {
  //       size: A5;
  //       margin: 0;
  //     }

  //     html, body {
  //       width: 148mm;
  //       height: 210mm;
  //       margin: 0;
  //       padding: 0;
  //       overflow: hidden;
  //       background: transparent;
  //     }

  //     body {
  //       font-family: "Inter", sans-serif;
  //       margin: 0;
  //       color: #0f172a;
  //       background: transparent;
  //       display: flex;
  //       justify-content: center;
  //       align-items: center;
  //       min-height: 100vh;
  //     }

  //     .sheet {
  //       width: 148mm;
  //       min-height: 210mm;
  //       padding: 10mm;
  //     }

  //     @media print {
  //       body {
  //         display: block;
  //         min-height: auto;
  //       }
  //     }

  //     /* HEADER */
  //     .header {
  //       display: flex;
  //       justify-content: space-between;
  //       align-items: center;
  //       border-bottom: 2px solid #0f766e;
  //       padding-bottom: 10px;
  //       margin-bottom: 12px;
  //     }

  //     .left {
  //       display: flex;
  //       gap: 10px;
  //       align-items: center;
  //     }

  //     .logo {
  //       width: 45px;
  //       height: 45px;
  //       border-radius: 6px;
  //       object-fit: contain;
  //       border: 1px solid #e2e8f0;
  //     }

  //     .company h1 {
  //       margin: 0;
  //       font-size: 16px;
  //       color: #0f766e;
  //     }

  //     .company p {
  //       margin: 0;
  //       font-size: 11px;
  //       color: #64748b;
  //     }

  //     .meta {
  //       font-size: 11px;
  //       text-align: right;
  //     }

  //     /* CARDS */
  //     .section {
  //       display: grid;
  //       grid-template-columns: 1fr 1fr;
  //       gap: 8px;
  //       margin-bottom: 10px;
  //     }

  //     .card {
  //       border: 1px solid #e2e8f0;
  //       border-radius: 8px;
  //       padding: 8px;
  //       background: #f8fafc;
  //       font-size: 11px;
  //     }

  //     .card h3 {
  //       margin: 0 0 4px;
  //       font-size: 10px;
  //       color: #0f766e;
  //     }

  //     /* TABLE */
  //     table {
  //       width: 100%;
  //       border-collapse: collapse;
  //       font-size: 10.5px;
  //     }

  //     thead {
  //       background: #0f766e;
  //       color: #fff;
  //     }

  //     th, td {
  //       padding: 6px;
  //     }

  //     td {
  //       border-bottom: 1px solid #e2e8f0;
  //     }

  //     .num {
  //       text-align: right;
  //     }

  //     /* PRODUCT */
  //     .product-name {
  //       font-weight: 600;
  //     }

  //     .product-desc {
  //       font-size: 9px;
  //       color: #64748b;
  //     }

  //     .product-company {
  //       font-size: 9px;
  //       color: #94a3b8;
  //     }

  //     .badge {
  //       background: #eef2ff;
  //       padding: 2px 6px;
  //       border-radius: 6px;
  //       font-size: 9px;
  //     }

  //     /* TOTAL */
  //     .totals {
  //       margin-top: 10px;
  //       display: flex;
  //       justify-content: flex-end;
  //     }

  //     .totals table {
  //       width: 200px;
  //       font-size: 11px;
  //     }

  //     .totals td {
  //       padding: 3px 0;
  //     }

  //     .grand {
  //       font-weight: 700;
  //       border-top: 1px dashed #cbd5e1;
  //       padding-top: 5px;
  //     }

  //     .footer {
  //       margin-top: 10px;
  //       text-align: center;
  //       font-size: 9px;
  //       color: #94a3b8;
  //     }

  //   </style>
  // </head>

  // <body>

  // <div class="sheet">

  //   <!-- HEADER -->
  //   <div class="header">
  //     <div class="left">
  //       <img src="${logoUrl}" class="logo"/>
  //       <div class="company">
  //         <h1>Imran Traders</h1>
  //         <p>Sales Invoice</p>
  //       </div>
  //     </div>

  //   </div>

  //     <!-- INFO -->
  //     <div class="section">
  //       <div class="card">
  //         <h3>Customer</h3>
  //         <div>${billSale.customerName || "Customer"}</div>
  //       <div>${customerPhone}</div>
  //       <div>${customerAddress}</div>
  //     </div>

  //     <div class="card">
  //       <h3>Order</h3>
  //       <div>Method: ${billSale.paymentMethod || "-"}</div>
  //       <div>Items: ${items.length}</div>
  //       <div>Qty: ${items.reduce((s, i) => s + Number(i.quantity || 0), 0)}</div>
  //       <div>Carage: Rs ${carageAmount.toLocaleString()}</div>
  //       <div>Received: Rs ${receivedAmountValue.toLocaleString()}</div>
  //       <div>Remaining: Rs ${remainingAmountValue.toLocaleString()}</div>
  //     </div>
  //   </div>

  //   <!-- TABLE -->
  //   <table>
  //     <thead>
  //       <tr>
  //         <th>#</th>
  //         <th>Product</th>
  //         <th>Code</th>
  //         <th class="num">Qty</th>
  //         <th class="num">Price</th>
  //         <th class="num">Total</th>
  //       </tr>
  //     </thead>
  //     <tbody>
  //       ${rows}
  //     </tbody>
  //   </table>

  //   <!-- TOTAL -->
  //   <div class="totals">
  //     <table>
  //       <tr>
  //         <td>Subtotal</td>
  //         <td class="num">Rs ${subTotal.toLocaleString()}</td>
  //       </tr>
  //       <tr>
  //         <td>Carage</td>
  //         <td class="num">Rs ${carageAmount.toLocaleString()}</td>
  //       </tr>
  //       <tr>
  //         <td>Received</td>
  //         <td class="num">Rs ${receivedAmountValue.toLocaleString()}</td>
  //       </tr>
  //       <tr>
  //         <td>Remaining</td>
  //         <td class="num">Rs ${remainingAmountValue.toLocaleString()}</td>
  //       </tr>
  //       <tr>
  //         <td class="grand">Total</td>
  //         <td class="num grand">Rs ${totalAmount.toLocaleString()}</td>
  //       </tr>
  //     </table>
  //   </div>

  //   <div class="footer">
  //   </div>

  // </div>

  // <script>
  //   window.onload = () => {
  //     window.print();
  //     setTimeout(() => window.close(), 200);
  //   };
  // </script>

  // </body>
  // </html>
  // `);

  //     printWindow.document.close();
  //   };

  // const handlePrintBillModern = () => {
  //   if (!billSale) return;

  //   const items = Array.isArray(billSale.products) ? billSale.products : [];
  //   const {
  //     totalAmount,
  //     carageAmount,
  //     subTotal,
  //     receivedAmountValue,
  //     remainingAmountValue,
  //   } = getSaleTotals(billSale);

  //   const invoiceHtml = buildInvoicePrintHtml({
  //     documentTitle: "Sales Invoice",
  //     companyName: "Imran Traders",
  //     slogan: "",
  //     invoiceLabel: "Invoice #",
  //     invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
  //     issueLabel: "Date",
  //     issueDate: billSale.createdAt || new Date().toISOString(),
  //     partyLabel: "Invoice To",
  //     partyName: billSale.customerName || "Customer",
  //     partyPhone:
  //       billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "",
  //     partyAddress:
  //       billSale.customer?.contactInfo?.address ||
  //       billSale.customer?.address ||
  //       "",
  //     paymentMethod: billSale.paymentMethod || "-",
  //     status: billSale.status || "-",
  //     items: items.map((item) => {
  //       const qty = Number(item.quantity || 0);
  //       const unitPrice = Number(item.price || 0);
  //       return {
  //         name: item.product?.name || "Product",
  //         description: "",
  //         company: "",
  //         code: item.productCode?.code || "",
  //         quantity: qty,
  //         unitPrice,
  //         total: qty * unitPrice,
  //       };
  //     }),
  //     currency: "Rs",
  //     subTotal,
  //     carage: carageAmount,
  //     totalAmount,
  //     receivedAmount: receivedAmountValue,
  //     remainingAmount: remainingAmountValue,
  //     notes: billSale.notes || "",
  //   });

  //   const gatePassHtml = buildInvoicePrintHtml({
  //     documentTitle: "Gate Pass",
  //     companyName: "Imran Traders",
  //     slogan: "",
  //     invoiceLabel: "Gate Pass #",
  //     invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
  //     issueLabel: "Date",
  //     issueDate: billSale.createdAt || new Date().toISOString(),
  //     partyLabel: "Gate Pass",
  //     partyName: billSale.customerName || "Customer",
  //     partyPhone:
  //       billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "",
  //     partyAddress:
  //       billSale.customer?.contactInfo?.address ||
  //       billSale.customer?.address ||
  //       "",
  //     paymentMethod: billSale.paymentMethod || "-",
  //     status: billSale.status || "-",
  //     items: items.map((item) => ({
  //       name: item.product?.name || "Product",
  //       quantity: Number(item.quantity || 0),
  //       code: item.productCode?.code || "",
  //     })),
  //     showPrices: false,
  //     showSummaryBox: false,
  //     currency: "Rs",
  //     subTotal,
  //     carage: carageAmount,
  //     totalAmount,
  //     receivedAmount: receivedAmountValue,
  //     remainingAmount: remainingAmountValue,
  //     notes: billSale.notes || "",
  //   });

  //   const html = combineInvoicePagesHtml(invoiceHtml, gatePassHtml);

  //   const printWindow = window.open("", "_blank", "width=900,height=650");
  //   if (!printWindow) {
  //     toast.error("Popup blocked. Please allow popups.");
  //     return;
  //   }

  //   printWindow.document.write(html);
  //   printWindow.document.close();
  //   printWindow.onload = () => {
  //     printWindow.focus();
  //     printWindow.print();
  //     setTimeout(() => printWindow.close(), 200);
  //   };
  // };

  const buildCartItemsFromSale = (sale) => {
    const products = Array.isArray(sale?.products) ? sale.products : [];
    const saleWasStocked =
      String(sale?.status || "").toLowerCase() === "completed" ||
      Boolean(sale?.stockOutRecorded);
    return products.map((item) => {
      const productId = getId(item.product) || item.product;
      const codeId = getId(item.productCode) || item.productCode;
      const productRecord = getallproduct.find((p) => getId(p) === productId);
      const codeRecord = productRecord?.productCodes?.find(
        (code) => getId(code) === codeId,
      );
      const resolvedUnitPrice = Number(
        item.price ??
          productRecord?.salePrice ??
          productRecord?.pricing?.currentSalesPrice ??
          productRecord?.Price ??
          codeRecord?.salePrice ??
          0,
      );
      const currentStock = Number(
        codeRecord?.quantity ?? availableQtyByCode.get(String(codeId)) ?? 0,
      );
      const originalQuantity = Number(item.quantity || 0);
      return {
        productId,
        codeId,
        name: productRecord?.name || item.product?.name || "Product",
        company:
          productRecord?.company ||
          productRecord?.brand ||
          item.product?.company ||
          item.product?.brand ||
          "",
        code: codeRecord?.code || item.productCode?.code || "code",
        quantity: originalQuantity,
        originalQuantity,
        availableQty: saleWasStocked
          ? currentStock + originalQuantity
          : currentStock,
        unitPrice: resolvedUnitPrice,
      };
    });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!selectedSales) return;
    if (!customerId) {
      toast.error("Customer is required");
      return;
    }
    const selectedCustomerAddress =
      selectedCustomer?.contactInfo?.address?.trim() || "";
    if (!selectedCustomerAddress) {
      toast.error("Customer address is required");
      return;
    }
    if (!cartItems.length) {
      toast.error("Add at least one product");
      return;
    }

    const invalidQty = cartItems.some(
      (item) => !item.quantity || Number(item.quantity) <= 0,
    );
    if (invalidQty) {
      toast.error("Quantity is required for all items");
      return;
    }
    const invalidPrice = cartItems.some(
      (item) =>
        item.unitPrice === "" ||
        !Number.isFinite(Number(item.unitPrice)) ||
        Number(item.unitPrice) < 0,
    );
    if (invalidPrice) {
      toast.error("Valid price is required for all items");
      return;
    }

    if (Number(receivedAmount || 0) > cartGrandTotal) {
      toast.error("Received amount cannot be greater than cart total");
      return;
    }

    const parsedReceivedAmount = Number(receivedAmount || 0);
    if (parsedReceivedAmount <= 0) {
      setPayment("credit");
    } else if (!["cash", "banktransfer"].includes(Payment)) {
      toast.error(
        "Please select Cash or Bank Transfer when received amount is entered",
      );
      return;
    }

    const insufficient = cartItems.find((item) => {
      const available =
        item.availableQty ?? availableQtyByCode.get(String(item.codeId)) ?? 0;
      return Number(item.quantity) > Number(available);
    });
    if (insufficient) {
      const available =
        insufficient.availableQty ??
        availableQtyByCode.get(String(insufficient.codeId)) ??
        0;
      toast.error(
        `Only ${available} available for ${insufficient.code} - ${insufficient.name}`,
      );
      return;
    }

    const updatedData = {
      customerId,
      products: cartItems.map((item) => {
        const resolvedPrice = Number(item.unitPrice);
        return {
          product: item.productId,
          productCode: item.codeId,
          quantity: Number(item.quantity),
          ...(Number.isFinite(resolvedPrice) ? { price: resolvedPrice } : {}),
        };
      }),
      paymentMethod: Payment,
      receivedAmount: Number(receivedAmount || 0),
      carage: carageAmount,
      status: Status,
    };

    setIsSubmittingSale(true);
    dispatch(EditSales({ salesId: getId(selectedSales), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Sale updated successfully");
        closeForm();
      })
      .catch((error) => {
        console.error("Error updating sale:", error);
        if (error?.available !== undefined && error?.requested !== undefined) {
          toast.error(
            `Only ${error.available} items available. You requested ${error.requested}.`,
          );
          return;
        }
        toast.error(error?.message || "Failed to update sale");
      })
      .finally(() => setIsSubmittingSale(false));
  };

  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.codeId === item.codeId);
      if (existing) {
        return prev.map((p) =>
          p.codeId === item.codeId
            ? { ...p, quantity: Number(p.quantity || 0) + 1 }
            : p,
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          availableQty: Number(item.availableQty || 0),
        },
      ];
    });
    setCodeQuery("");
    setShowCodeOptions(false);
  };
  const hasStockIssue = cartItems.some(
    (item) =>
      Number(item.quantity) >
      Number(
        item.availableQty ?? availableQtyByCode.get(String(item.codeId)) ?? 0,
      ),
  );

  const updateCartQuantity = (codeId, value) => {
    if (value === "") {
      setCartItems((prev) =>
        prev.map((item) =>
          item.codeId === codeId ? { ...item, quantity: "" } : item,
        ),
      );
      return;
    }

    let safeValue = Number(value);

    if (!Number.isFinite(safeValue) || safeValue < 0) {
      safeValue = 0;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.codeId === codeId ? { ...item, quantity: safeValue } : item,
      ),
    );
  };

  const updateCartPrice = (codeId, value) => {
    if (value === "") {
      setCartItems((prev) =>
        prev.map((item) =>
          item.codeId === codeId ? { ...item, unitPrice: "" } : item,
        ),
      );
      return;
    }
    const safeValue = Number(value);
    setCartItems((prev) =>
      prev.map((item) =>
        item.codeId === codeId
          ? { ...item, unitPrice: Number.isFinite(safeValue) ? safeValue : "" }
          : item,
      ),
    );
  };

  const removeFromCart = (codeId) => {
    setCartItems((prev) => prev.filter((item) => item.codeId !== codeId));
  };

  const submitsales = async (event) => {
    event.preventDefault();
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      const customerNameCheck = validateTextInput(
        customerSearch,
        "Customer name",
        {
          required: true,
          minLength: 2,
          maxLength: 120,
        },
      );
      if (!customerNameCheck.ok) {
        toast.error(customerNameCheck.message);
        return;
      }

      const phoneCheck = validateTextInput(
        newCustomerData.phone,
        "Customer phone",
        {
          required: true,
          minLength: 7,
          maxLength: 20,
        },
      );
      if (!phoneCheck.ok) {
        toast.error(phoneCheck.message);
        return;
      }

      const addressCheck = validateTextInput(
        newCustomerData.address,
        "Customer address",
        {
          required: true,
          minLength: 2,
          maxLength: 200,
        },
      );
      if (!addressCheck.ok) {
        toast.error(addressCheck.message);
        return;
      }
      setIsCreatingCustomer(true);
      try {
        const payload = {
          name: customerNameCheck.value,
          contactInfo: {
            phone: phoneCheck.value,
            address: addressCheck.value,
          },
        };
        const result = await dispatch(createCustomer(payload)).unwrap();
        const newCustomer = result?.customer;
        if (!getId(newCustomer)) {
          toast.error("Failed to create customer");
          return;
        }
        resolvedCustomerId = getId(newCustomer);
        setCustomerId(getId(newCustomer));
        setCustomerSearch(newCustomer.name);
      } catch (error) {
        toast.error(error || "Failed to create customer");
        return;
      } finally {
        setIsCreatingCustomer(false);
      }
    }

    const resolvedCustomer =
      customers.find((customer) => getId(customer) === resolvedCustomerId) ||
      null;
    const resolvedCustomerAddress =
      resolvedCustomer?.contactInfo?.address?.trim() ||
      newCustomerData.address.trim();
    if (!resolvedCustomerAddress) {
      toast.error("Customer address is required");
      return;
    }

    const receivedAmountCheck = validateNumberInput(
      receivedAmount || 0,
      "Received amount",
      {
        min: 0,
        allowZero: true,
      },
    );
    if (!receivedAmountCheck.ok) {
      toast.error(receivedAmountCheck.message);
      return;
    }

    const carageCheck = validateNumberInput(carage || 0, "Carage", {
      min: 0,
      allowZero: true,
    });
    if (!carageCheck.ok) {
      toast.error(carageCheck.message);
      return;
    }

    const statusCheck = validateTextInput(Status, "Status", {
      required: false,
      maxLength: 40,
      allowEmpty: true,
    });
    if (!statusCheck.ok) {
      toast.error(statusCheck.message);
      return;
    }

    const paymentCheck = validateTextInput(Payment, "Payment method", {
      required: false,
      maxLength: 40,
      allowEmpty: true,
    });
    if (!paymentCheck.ok) {
      toast.error(paymentCheck.message);
      return;
    }

    if (!cartItems.length) {
      toast.error("Add at least one product");
      return;
    }

    const invalidQty = cartItems.some(
      (item) => !item.quantity || Number(item.quantity) <= 0,
    );
    if (invalidQty) {
      toast.error("Quantity is required for all items");
      return;
    }
    const invalidPrice = cartItems.some(
      (item) =>
        item.unitPrice === "" ||
        !Number.isFinite(Number(item.unitPrice)) ||
        Number(item.unitPrice) < 0,
    );
    if (invalidPrice) {
      toast.error("Valid price is required for all items");
      return;
    }

    const insufficient = cartItems.find((item) => {
      const available =
        item.availableQty ?? availableQtyByCode.get(String(item.codeId)) ?? 0;
      return Number(item.quantity) > Number(available);
    });
    if (insufficient) {
      const available =
        insufficient.availableQty ??
        availableQtyByCode.get(String(insufficient.codeId)) ??
        0;
      toast.error(
        `Only ${available} available for ${insufficient.code} - ${insufficient.name}`,
      );
      return;
    }

    const salesData = {
      customerId: resolvedCustomerId,
      products: cartItems.map((item) => {
        const quantityCheck = validateNumberInput(item.quantity, "Quantity", {
          min: 1,
          allowZero: false,
          integer: true,
        });
        if (!quantityCheck.ok) {
          throw new Error(quantityCheck.message);
        }
        const priceCheck = validateNumberInput(item.unitPrice, "Unit price", {
          min: 0,
          allowZero: true,
        });
        if (!priceCheck.ok) {
          throw new Error(priceCheck.message);
        }
        return {
          product: item.productId,
          productCode: item.codeId,
          quantity: quantityCheck.value,
          price: priceCheck.value,
        };
      }),
      paymentMethod:
        receivedAmountCheck.value <= 0 ? "credit" : paymentCheck.value,
      receivedAmount: receivedAmountCheck.value,
      carage: carageCheck.value,
      // paymentStatus,
      status: statusCheck.value,
    };

    try {
      setIsSubmittingSale(true);
      const result = await dispatch(CreateSales(salesData)).unwrap();
      const createdSale = result?.sale;
      toast.success("Sale created successfully");
      closeForm();
      const resolvedStatus =
        createdSale?.status || salesData.status || "pending";
      if (resolvedStatus === "completed") {
        openBillPreview(createdSale);
      }
    } catch (error) {
      if (error?.available && error?.requested) {
        toast.error(
          `Only ${error.available} items available. You requested ${error.requested}.`,
        );
        return;
      }

      toast.error(error?.message || "Failed to create sale");
    } finally {
      setIsSubmittingSale(false);
    }
  };
  const resetForm = () => {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerOptions(false);
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setPayment("");
    setReceivedAmount("");
    setCarage("");
    // setpaymentStatus("");
    setStatus("");
    setCartItems([]);
    setCodeQuery("");
    setShowCodeOptions(false);
  };
  const closeForm = () => {
    setIsFormVisible(false);
    setIsDrawerMinimized(false);
    setselectedSales(null);
    resetForm();
  };

  const openForm = (sale = null) => {
    if (sale) {
      setselectedSales(sale);
      setCustomerId(getId(sale.customer) || sale.customer || "");
      setCustomerSearch(sale.customer?.name || sale.customerName || "");
      setNewCustomerData({
        phone: "",
        address: "",
      });
      setCartItems(buildCartItemsFromSale(sale));
      setCodeQuery("");
      setShowCodeOptions(false);
      setPayment(sale.paymentMethod || "");
      setReceivedAmount(String(sale.paidAmount ?? 0));
      setCarage(String(sale.carage ?? 0));
      setStatus(sale.status || "");
    } else {
      setselectedSales(null);
      resetForm();
    }

    setIsDrawerMinimized(false);
    setIsFormVisible(true);
  };

  const handleEditClick = (sales) => {
    openForm(sales);
  };

  const filteredSales = useMemo(() => {
    const sales = Array.isArray(getallsales) ? getallsales : [];
    const normalizedQuery = query.trim().toLowerCase();
    const fromStartTimestamp = dateFrom
      ? new Date(`${dateFrom}T00:00:00`).getTime()
      : 0;
    const fromEndTimestamp = dateFrom
      ? new Date(`${dateFrom}T23:59:59.999`).getTime()
      : 0;
    const toEndTimestamp = dateTo
      ? new Date(`${dateTo}T23:59:59.999`).getTime()
      : 0;

    return sales.filter((sale) => {
      const saleTimestamp = getDateTimestamp(sale.createdAt);
      if (!saleTimestamp) return false;

      if (dateFrom && dateTo) {
        if (
          saleTimestamp < fromStartTimestamp ||
          saleTimestamp > toEndTimestamp
        ) {
          return false;
        }
      } else if (dateFrom) {
        const sameDay =
          saleTimestamp >= fromStartTimestamp &&
          saleTimestamp <= fromEndTimestamp;
        if (!sameDay) return false;
      } else if (dateTo) {
        if (saleTimestamp > toEndTimestamp) return false;
      }

      if (!normalizedQuery) return true;

      const customerName = String(
        sale.customerName || sale.customer?.name || "",
      ).toLowerCase();
      const customerPhone = String(
        sale.customer?.contactInfo?.phone ||
          sale.customer?.phone ||
          sale.customerPhone ||
          "",
      )
        .toLowerCase()
        .replace(/[^\d+]/g, "");
      const customerCode = String(
        sale.customer?.customerCode || sale.customerCode || "",
      )
        .toLowerCase()
        .trim();
      const invoiceNumber = String(sale.invoiceNumber || "").toLowerCase();
      const statusValue = String(sale.status || "").toLowerCase();
      const paymentValue = String(sale.paymentMethod || "").toLowerCase();

      const normalizedPhoneQuery = normalizedQuery.replace(/[^\d+]/g, "");

      return (
        customerName.includes(normalizedQuery) ||
        invoiceNumber.includes(normalizedQuery) ||
        statusValue.includes(normalizedQuery) ||
        paymentValue.includes(normalizedQuery) ||
        customerCode.includes(normalizedQuery) ||
        (normalizedPhoneQuery && customerPhone.includes(normalizedPhoneQuery))
      );
    });
  }, [getallsales, query, dateFrom, dateTo]);

  const sortedSales = useMemo(
    () =>
      sortByDateValue(
        filteredSales || [],
        (sale) => sale.createdAt,
        saleDateSort,
      ),
    [filteredSales, saleDateSort],
  );

  const customers = Array.isArray(getAllCustomer) ? getAllCustomer : [];
  const selectedCustomer = customers.find(
    (customer) => getId(customer) === customerId,
  );
  const normalizeText = (value = "") => String(value).trim().toLowerCase();
  const normalizePhone = (value = "") => String(value).replace(/[^\d+]/g, "");
  const normalizedCustomerSearch = normalizeText(customerSearch);
  const normalizedPhoneSearch = normalizePhone(customerSearch);
  const filteredCustomers =
    normalizedCustomerSearch || normalizedPhoneSearch
      ? customers.filter((customer) => {
          const name = normalizeText(customer.name);
          const phone = normalizePhone(
            customer.contactInfo?.phone || customer.phone || "",
          );
          return (
            (normalizedCustomerSearch &&
              name.includes(normalizedCustomerSearch)) ||
            (normalizedPhoneSearch && phone.includes(normalizedPhoneSearch))
          );
        })
      : [];
  const exactMatchCustomer = customers.find((customer) => {
    const name = normalizeText(customer.name);
    const phone = normalizePhone(
      customer.contactInfo?.phone || customer.phone || "",
    );
    return (
      name === normalizedCustomerSearch ||
      (normalizedPhoneSearch && phone === normalizedPhoneSearch)
    );
  });
  const hasExactMatch = Boolean(exactMatchCustomer);

  const paymentInfoBySaleId = useMemo(() => {
    const sales = Array.isArray(getallsales) ? getallsales : [];
    const relevantPayments = Array.isArray(payments)
      ? payments.filter(
          (payment) =>
            payment?.partyType === "customer" &&
            payment?.type === "received" &&
            Number(payment.amount) > 0,
        )
      : [];

    const resolvePaymentCustomerKey = (payment) => {
      const customerId =
        getId(payment?.customerId) ||
        payment?.customerId ||
        getId(payment?.customer) ||
        "";
      if (customerId) return String(customerId);
      const code = normalizeText(payment?.customer?.code);
      const name = normalizeText(payment?.customer?.name);
      return code || name ? `${code}|${name}` : "";
    };

    const resolveSaleCustomerKey = (sale) => {
      const customerId = getId(sale?.customer) || sale?.customer || "";
      if (customerId) return String(customerId);
      const name = normalizeText(sale?.customerName);
      return name ? `|${name}` : "";
    };

    const invoicePaymentMap = new Map();
    const customerPaymentPool = new Map();

    relevantPayments.forEach((payment) => {
      const amount = Number(payment.amount) || 0;
      if (!amount) return;
      const invoiceId = getId(payment?.invoice) || payment?.invoice || "";
      if (invoiceId) {
        const key = String(invoiceId);
        invoicePaymentMap.set(key, (invoicePaymentMap.get(key) || 0) + amount);
        return;
      }
      const customerKey = resolvePaymentCustomerKey(payment);
      if (!customerKey) return;
      customerPaymentPool.set(
        customerKey,
        (customerPaymentPool.get(customerKey) || 0) + amount,
      );
    });

    const salesSorted = [...sales].sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

    const results = new Map();

    salesSorted.forEach((sale) => {
      const saleId = String(getId(sale) || "");
      const totalAmount = Number(sale?.totalAmount) || 0;
      const invoiceId = getId(sale?.invoice) || sale?.invoice || "";
      const invoicePaid = invoiceId
        ? Number(invoicePaymentMap.get(String(invoiceId)) || 0)
        : 0;

      let paidAmount = Math.min(invoicePaid, totalAmount);
      let remainingAmount = Math.max(totalAmount - paidAmount, 0);

      if (remainingAmount > 0) {
        const customerKey = resolveSaleCustomerKey(sale);
        const poolAmount = Number(customerPaymentPool.get(customerKey) || 0);
        if (poolAmount > 0) {
          const applied = Math.min(poolAmount, remainingAmount);
          paidAmount += applied;
          remainingAmount -= applied;
          customerPaymentPool.set(customerKey, poolAmount - applied);
        }
      }

      const paymentStatus =
        remainingAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

      results.set(saleId, { paidAmount, remainingAmount, paymentStatus });
    });

    return results;
  }, [getallsales, payments]);

  const billPreviewHtml = useMemo(() => {
    if (!billSale) return "";

    const items = Array.isArray(billSale.products) ? billSale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(billSale);

    const invoiceHtml = buildInvoicePrintHtml({
      documentTitle: "Sales Invoice",
      companyName: "Imran Traders",
      slogan: "",
      invoiceLabel: "Invoice #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Invoice To",
      partyName: billSale.customerName || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          name: item.product?.name || "Product",
          description: "",
          company: "",
          code: item.productCode?.code || "",
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        };
      }),
      currency: "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount: receivedAmountValue,
      remainingAmount: remainingAmountValue,
      notes: billSale.notes || "",
    });
    const gatePassHtml = buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "",
      invoiceLabel: "Gate Pass #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Gate Pass",
      partyName: billSale.customerName || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => ({
        name: item.product?.name || "Product",
        quantity: Number(item.quantity || 0),
        code: item.productCode?.code || "",
      })),
      showPrices: false,
      currency: "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount: receivedAmountValue,
      remainingAmount: remainingAmountValue,
      notes: billSale.notes || "",
    });

    return combineInvoicePagesHtml(invoiceHtml, gatePassHtml);
  }, [billSale]);

  const currentBillTotals = billSale ? getSaleTotals(billSale) : null;

  const openPrintWindow = (html) => {
    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 200);
    };
  };

  const buildBillPdfData = () => {
    if (!billSale) return null;

    const items = Array.isArray(billSale.products) ? billSale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(billSale);

    return {
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueDate: billSale.createdAt || new Date().toISOString(),
      customerName: billSale.customerName || "Customer",
      customerPhone:
        billSale.customer?.contactInfo?.phone ||
        billSale.customer?.phone ||
        "-",
      customerAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        "-",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          name: item.product?.name || "Product",
          code: item.productCode?.code || "-",
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        };
      }),
      subTotal,
      carageAmount,
      totalAmount,
      receivedAmountValue,
      remainingAmountValue,
      notes: String(billSale.notes || "").trim(),
    };
  };

  const downloadBillPdf = async () => {
    const data = buildBillPdfData();
    if (!data) return;

    const fileName = `${sanitizeFileName(data.invoiceNumber || "invoice")}.pdf`;

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      pdf.setProperties({ title: fileName });

      const marginX = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - marginX * 2;
      let y = 12;
      const logoDataUrl = await loadLogoDataUrl(
        `${window.location.origin}/ITLOGO.svg`,
      );

      const addWrappedText = (
        text,
        x,
        currentY,
        width = contentWidth,
        lineHeight = 4.5,
        fontSize = 9,
        style = "normal",
      ) => {
        pdf.setFont("helvetica", style);
        pdf.setFontSize(fontSize);
        const lines = splitLongText(pdf, text, width);
        pdf.text(lines, x, currentY);
        return currentY + lines.length * lineHeight;
      };

      const addLine = (currentY) => {
        pdf.setDrawColor(203, 213, 225);
        pdf.line(marginX, currentY, pageWidth - marginX, currentY);
      };

      const headerTop = 11;
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, "PNG", marginX, headerTop, 16, 16);
      }

      const headerTextX = logoDataUrl ? marginX + 20 : marginX;
      pdf.setTextColor(15, 23, 42);
      y = addWrappedText(
        "Imran Traders",
        headerTextX,
        headerTop + 4,
        contentWidth - (logoDataUrl ? 20 : 0),
        5,
        16,
        "bold",
      );
      y = addWrappedText(
        "Billing and stock management",
        headerTextX,
        y + 1,
        contentWidth - (logoDataUrl ? 20 : 0),
        4,
        9,
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("Sales Invoice", pageWidth - marginX, 14, { align: "right" });
      y = Math.max(y + 4, 24);
      addLine(y);
      y += 7;

      const detailsLeft = [
        ["Customer", data.customerName],
        ["Phone", data.customerPhone],
        ["Address", data.customerAddress],
        ["Payment", data.paymentMethod],
      ];

      pdf.setFontSize(9);
      let detailsY = y;
      detailsLeft.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, marginX, detailsY);
        pdf.setFont("helvetica", "normal");
        const wrapped = splitLongText(pdf, value, 65);
        pdf.text(wrapped, marginX + 18, detailsY);
        detailsY += Math.max(wrapped.length * 4.2, 4.2);
      });

      const detailsRight = [
        ["Invoice #", data.invoiceNumber],
        ["Date", formatDateLabel(data.issueDate)],
      ];

      let detailsRightY = y;
      detailsRight.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, pageWidth / 2 + 4, detailsRightY);
        pdf.setFont("helvetica", "normal");
        const wrapped = splitLongText(pdf, value, 40);
        pdf.text(wrapped, pageWidth / 2 + 22, detailsRightY);
        detailsRightY += Math.max(wrapped.length * 4.2, 4.2);
      });

      y = Math.max(detailsY, detailsRightY) + 5;
      addLine(y);
      y += 6;

      autoTable(pdf, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [["No", "Item Description", "Qty", "Price", "Total"]],
        body: data.items.length
          ? data.items.map((item, index) => [
              String(index + 1),
              item.code && item.code !== "-"
                ? `${item.code} - ${item.name}`
                : item.name,
              String(item.quantity),
              formatCurrency(item.unitPrice),
              formatCurrency(item.total),
            ])
          : [["-", "No items", "-", "-", "-"]],
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 1.5,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 12, halign: "center" },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
        },
        theme: "grid",
      });

      const tableEndY = pdf.lastAutoTable?.finalY || y;
      let summaryY = tableEndY + 6;
      if (summaryY > pageHeight - 35) {
        pdf.addPage();
        summaryY = 14;
      }

      const summaryX = pageWidth - marginX - 42;
      const summary = [
        ["Sub Total", formatCurrency(data.subTotal)],
        ["Carage", formatCurrency(data.carageAmount)],
        ["Received", formatCurrency(data.receivedAmountValue)],
        ["Remaining", formatCurrency(data.remainingAmountValue)],
      ];

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      summary.forEach(([label, value]) => {
        pdf.text(label, summaryX, summaryY);
        pdf.text(value, pageWidth - marginX, summaryY, { align: "right" });
        summaryY += 4.8;
      });

      pdf.setFillColor(15, 118, 110);
      pdf.rect(summaryX - 2, summaryY - 1.2, 44, 6, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Total Bill", summaryX, summaryY + 2.6);
      pdf.text(
        formatCurrency(data.totalAmount),
        pageWidth - marginX,
        summaryY + 2.6,
        {
          align: "right",
        },
      );

      if (data.notes) {
        const notesY = summaryY + 10;
        if (notesY > pageHeight - 15) {
          pdf.addPage();
          y = 14;
        } else {
          y = notesY;
        }
        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.text("Notes:", marginX, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(splitLongText(pdf, data.notes, contentWidth), marginX, y + 4);
      }

      const footerPhone = "03113208249 / 03005246494";
      const footerAddress = "Defence Road Opposite DHA RAHBAR";
      let footerY = pageHeight - 12;
      if (y > footerY - 8) {
        pdf.addPage();
        footerY = pageHeight - 12;
      }

      pdf.setDrawColor(203, 213, 225);
      pdf.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(`Phone: ${footerPhone}`, marginX, footerY, { align: "left" });
      pdf.text(`Address: ${footerAddress}`, pageWidth - marginX, footerY, {
        align: "right",
      });

      pdf.save(fileName);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download bill");
    }
  };

  const buildBillInvoiceHtml = () => {
    if (!billSale) return "";

    const items = Array.isArray(billSale.products) ? billSale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(billSale);

    return buildInvoicePrintHtml({
      documentTitle: "Sales Invoice",
      companyName: "Imran Traders",
      slogan: "",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Invoice #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Invoice To",
      partyName: billSale.customerName || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          name: item.product?.name || "Product",
          description: "",
          company: "",
          code: item.productCode?.code || "",
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        };
      }),
      currency: "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount: receivedAmountValue,
      remainingAmount: remainingAmountValue,
      notes: billSale.notes || "",
    });
  };

  const buildBillGatePassHtml = () => {
    if (!billSale) return "";

    const items = Array.isArray(billSale.products) ? billSale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(billSale);

    return buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Gate Pass #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Gate Pass",
      partyName: billSale.customerName || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => ({
        name: item.product?.name || "Product",
        quantity: Number(item.quantity || 0),
        code: item.productCode?.code || "",
      })),
      showPrices: false,
      showSummaryBox: false,
      currency: "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount: receivedAmountValue,
      remainingAmount: remainingAmountValue,
      notes: billSale.notes || "",
    });
  };

  const handlePrintBillOnly = () => {
    const invoiceHtml = buildBillInvoiceHtml();
    if (!invoiceHtml) return;
    openPrintWindow(invoiceHtml);
  };

  const handleDownloadBillOnly = async () => {
    await downloadBillPdf();
  };

  const handlePrintGatePassOnly = () => {
    const gatePassHtml = buildBillGatePassHtml();
    if (!gatePassHtml) return;
    openPrintWindow(gatePassHtml);
  };

  const handlePrintBoth = () => {
    if (!billSale || !billPreviewHtml) return;
    openPrintWindow(billPreviewHtml);
  };

  const handleSelectCustomer = (customer) => {
    setCustomerId(getId(customer));
    setCustomerSearch(customer.name);
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setShowCustomerOptions(false);
  };

  const {
    activeIndex: customerActiveIndex,
    onKeyDown: onCustomerKeyDown,
    setActiveIndex: setCustomerActiveIndex,
  } = useKeyboardDropdown({
    options: filteredCustomers,
    isOpen: showCustomerOptions && customerSearch.trim() !== "",
    onSelect: (customer) => handleSelectCustomer(customer),
    onClose: () => setShowCustomerOptions(false),
  });

  const {
    activeIndex: codeActiveIndex,
    onKeyDown: onCodeKeyDown,
    setActiveIndex: setCodeActiveIndex,
  } = useKeyboardDropdown({
    options: codeOptions,
    isOpen: showCodeOptions && codeOptions.length > 0,
    onSelect: (option) => addToCart(option),
    onClose: () => setShowCodeOptions(false),
  });

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* <SalesChart /> */}

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          value={query}
          onChange={(e) => setquery(e.target.value)}
          type="text"
          maxLength={120}
          className="w-full md:w-80 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search invoice, customer, phone..."
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full md:w-44 h-10 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full md:w-44 h-10 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Date to"
        />
        <button
          onClick={() => {
            setquery("");
            setDateFrom("");
            setDateTo("");
          }}
          className="bg-white border hover:bg-slate-200 text-slate-700 px-5 h-10 rounded-xl flex items-center justify-center"
          type="button"
        >
          Reset
        </button>
        <button
          onClick={() => openForm()}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Create Sales
        </button>
      </div>

      <DrawerPanel
        open={isFormVisible}
        title={selectedSales ? "Edit Sale" : "Create Sale"}
        onClose={closeForm}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
        bodyClassName="p-6"
        className="bg-white border-l"
      >
        <form
          onSubmit={selectedSales ? handleEditSubmit : submitsales}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1 relative">
            <label className="text-gray-700 font-medium">Customer</label>
            <input
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setCustomerId("");
                setShowCustomerOptions(true);
              }}
              onFocus={() => {
                setShowCustomerOptions(true);
                setCustomerActiveIndex(0);
              }}
              onKeyDownCapture={onCustomerKeyDown}
              onBlur={() => {
                setTimeout(() => {
                  if (!customerId && exactMatchCustomer) {
                    handleSelectCustomer(exactMatchCustomer);
                  } else {
                    setShowCustomerOptions(false);
                  }
                  setCustomerActiveIndex(-1);
                }, 150);
              }}
              placeholder="Search or create customer (name or phone)"
              maxLength={120}
              className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
            {showCustomerOptions && customerSearch.trim() !== "" && (
              <div className="absolute z-50 top-[72px] w-full bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {filteredCustomers.length > 0
                  ? filteredCustomers.map((customer) => (
                      <button
                        key={getId(customer)}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCustomer(customer)}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-100 ${
                          customerActiveIndex ===
                          filteredCustomers.findIndex(
                            (item) => getId(item) === getId(customer),
                          )
                            ? "bg-slate-100"
                            : ""
                        }`}
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {customer.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {customer.contactInfo?.phone || customer.phone || "-"}
                        </div>
                      </button>
                    ))
                  : null}
              </div>
            )}
          </div>
          {customerId && selectedCustomer && (
            <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
              <div className="font-medium text-slate-800 mb-2">
                Customer Details
              </div>
              <div className="grid grid-cols-1 gap-1">
                <span>Phone: {selectedCustomer.contactInfo?.phone || "-"}</span>
                <span>
                  Address: {selectedCustomer.contactInfo?.address || "-"}
                </span>
              </div>
            </div>
          )}
          {!customerId && customerSearch.trim() !== "" && !hasExactMatch && (
            <div className="rounded-xl border bg-white p-3">
              <div className="font-medium text-slate-800 mb-2">
                New Customer Details
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  value={newCustomerData.phone}
                  onChange={(e) =>
                    setNewCustomerData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="Phone"
                  maxLength={20}
                  inputMode="tel"
                  className="w-full h-10 px-3 border rounded-xl"
                  required
                />
                <input
                  type="text"
                  value={newCustomerData.address}
                  onChange={(e) =>
                    setNewCustomerData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Address"
                  maxLength={200}
                  className="w-full h-10 px-3 border rounded-xl"
                  required
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label>Product Code</label>
            <div className="relative">
              <input
                type="text"
                value={codeQuery}
                onChange={(e) => {
                  setCodeQuery(e.target.value);
                  setShowCodeOptions(true);
                }}
                onFocus={() => {
                  setShowCodeOptions(true);
                  setCodeActiveIndex(0);
                }}
                onKeyDownCapture={onCodeKeyDown}
                maxLength={120}
                className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                placeholder="Type product code"
              />
              {showCodeOptions && codeOptions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                  {codeOptions.map((option) => (
                    <button
                      key={`${option.codeId}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                        codeActiveIndex ===
                        codeOptions.findIndex(
                          (item) => item.codeId === option.codeId,
                        )
                          ? "bg-slate-50"
                          : ""
                      }`}
                      onClick={() => addToCart(option)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate">
                            {option.code} - {option.name}
                            {option.company ? ` • ${option.company}` : ""}
                            <span className="text-xs text-slate-600">
                              {" "}
                              - {option.description}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500">
                            Available: {option.availableQty}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {formatCurrency(option.unitPrice)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label>Cart Preview</label>
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b">
              <span className="flex-1">Product</span>
              <span className="w-16 text-center">Qty</span>
              <span className="w-20 text-center">Price</span>
              <span className="w-6"></span>
            </div>
            {cartItems.map((item) => {
              const available =
                item.availableQty ??
                availableQtyByCode.get(String(item.codeId)) ??
                0;

              const isExceeded = Number(item.quantity || 0) > Number(available);

              return (
                <div
                  key={item.codeId}
                  className="flex items-center gap-2 px-3 py-3 border-b last:border-b-0 text-sm"
                >
                  {/* PRODUCT */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {item.name}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      {item.company && (
                        <span className="truncate">{item.company}</span>
                      )}

                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full whitespace-nowrap">
                        {item.code}
                      </span>
                    </div>

                    <div className="mt-1">
                      {!isExceeded ? (
                        <div className="text-xs text-teal-700">
                          Available: {available}
                        </div>
                      ) : (
                        <div className="text-xs text-red-600 font-medium">
                          Only {available} available
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateCartQuantity(item.codeId, e.target.value)
                    }
                    className={`w-16 h-9 text-center border rounded-lg ${
                      isExceeded ? "border-red-500 focus:ring-red-500" : ""
                    }`}
                  />

                  {/* PRICE */}
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateCartPrice(item.codeId, e.target.value)
                    }
                    min="0"
                    step="0.01"
                    className="w-20 h-9 text-center border rounded-lg"
                  />

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.codeId)}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <MdDelete size={18} />
                  </button>

                  {/* ERROR */}
                  {/* {Number(item.quantity) >
                      Number(
                        item.availableQty ??
                          availableQtyByCode.get(String(item.codeId)) ??
                          0,
                      ) && (
                      <div className="w-full text-xs text-red-600 mt-1">
                        Only{" "}
                        {item.availableQty ??
                          availableQtyByCode.get(String(item.codeId)) ??
                          0}{" "}
                        available
                      </div>
                    )} */}
                </div>
              );
            })}
            <div className="flex items-center justify-between px-3 py-3 bg-slate-50 border-t text-sm">
              <span className="font-semibold text-slate-700">Cart Total</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(cartSubTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-white border-t text-sm">
              <span className="font-semibold text-slate-700">Carage</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={carage}
                onChange={(e) => setCarage(e.target.value)}
                className="w-28 h-9 px-2 text-right border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between px-3 py-3 bg-teal-50 border-t text-sm">
              <span className="font-semibold text-slate-700">Total Amount</span>
              <span className="font-bold text-teal-700">
                {formatCurrency(cartGrandTotal)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-700 font-medium">Received Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="Enter amount received"
            />
            <div className="text-xs text-slate-500">
              Remaining: {formatCurrency(remainingAfterReceive)}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-700 font-medium">Payment Method</label>
            <select
              value={Payment}
              onChange={(e) => setPayment(e.target.value)}
              className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required={Number(receivedAmount || 0) > 0}
              disabled={Number(receivedAmount || 0) <= 0}
            >
              {Number(receivedAmount || 0) <= 0 ? (
                <option value="credit">Credit</option>
              ) : (
                <>
                  <option value="">Select Payment</option>
                  <option value="cash">Cash</option>
                  <option value="banktransfer">Bank Transfer</option>
                </>
              )}
            </select>
            <div className="text-xs text-slate-500">
              {Number(receivedAmount || 0) <= 0
                ? "No received amount means the sale will default to credit."
                : "Received amount entered: choose Cash or Bank Transfer."}
            </div>
          </div>

          {/* Payment Status intentionally disabled in sales flow */}

          <div className="flex flex-col gap-1">
            <label className="text-gray-700 font-medium">Sale Status</label>
            <select
              value={Status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            >
              <option value="">Select Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <LoadingButton
            type="submit"
            loading={isCreatingCustomer || isSubmittingSale}
            loadingText={
              isCreatingCustomer
                ? "Creating customer..."
                : selectedSales
                  ? "Updating..."
                  : "Creating..."
            }
            disabled={hasStockIssue}
            className={`w-full py-3 rounded-xl ${
              hasStockIssue
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-teal-700 hover:bg-teal-600 text-white"
            }`}
          >
            {selectedSales ? "Update Sale" : "Create Sale"}
          </LoadingButton>
        </form>
      </DrawerPanel>

      {/* BILL PREVIEW MODAL */}
      {showBillModal && billSale && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={closeBillPreview}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Sales Bill Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review the invoice before printing
                  </p>
                </div>
                <button
                  onClick={closeBillPreview}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="absolute inset-x-0 top-[57px] bottom-[72px] z-20 bg-slate-100 p-4">
                <div className="mx-auto h-full w-full max-w-[900px] overflow-hidden rounded-xl border bg-white shadow-sm">
                  <iframe
                    title="Sales Bill Preview"
                    srcDoc={billPreviewHtml}
                    className="h-full w-full border-0"
                  />
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-teal-700">
                        Sales Invoice
                      </h2>
                      <p className="text-sm text-slate-500">Imran Trader</p>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold">Date:</span>{" "}
                        {formatDateTimeLabel(billSale.createdAt || new Date())}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {billSale.status}
                      </div>
                      <div>
                        <span className="font-semibold">Payment:</span>{" "}
                        {billSale.paymentStatus || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                        Customer
                      </h4>
                      <p className="text-sm font-semibold text-slate-800">
                        {billSale.customerName || "Customer"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Phone:{" "}
                        {billSale.customer?.contactInfo?.phone ||
                          billSale.customer?.phone ||
                          "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Address:{" "}
                        {billSale.customer?.contactInfo?.address ||
                          billSale.customer?.address ||
                          "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                        Sale Info
                      </h4>
                      <p className="text-sm text-slate-600">
                        Subtotal:{" "}
                        {formatCurrency(
                          Math.max(
                            Number(billSale.totalAmount || 0) -
                              Number(billSale.carage || 0),
                            0,
                          ),
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Carage: {formatCurrency(billSale.carage || 0)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Received Amount:{" "}
                        {formatCurrency(
                          currentBillTotals?.receivedAmountValue || 0,
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Remaining Amount:{" "}
                        {formatCurrency(
                          currentBillTotals?.remainingAmountValue || 0,
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Payment Method: {billSale.paymentMethod || "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Items: {(billSale.products || []).length}
                      </p>
                      <p className="text-sm text-slate-600">
                        Total Qty:{" "}
                        {(billSale.products || []).reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-[15px]">
                      <thead className="bg-teal-700 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Description</th>
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Unit</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(billSale.products || []).map((item, idx) => {
                          const qty = Number(item.quantity || 0);
                          const price = Number(item.price || 0);
                          return (
                            <tr
                              key={getId(item.productCode) || idx}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-4 py-3 text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 text-slate-800">
                                {item.product?.name || "Product"}
                                {item.product?.company || item.product?.brand
                                  ? ` • ${item.product?.company || item.product?.brand}`
                                  : ""}
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {item.product.description || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.productCode?.code || "-"}
                              </td>
                              <td className="px-4 py-3 text-right">{qty}</td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(price)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(price * qty)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <div className="w-64 space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(billSale.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Received</span>
                        <span>
                          {formatCurrency(
                            currentBillTotals?.receivedAmountValue || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining</span>
                        <span>
                          {formatCurrency(
                            currentBillTotals?.remainingAmountValue || 0,
                          )}
                        </span>
                      </div>
                      {/* <div className="flex justify-between">
                        <span>Tax</span>
                        <span>Rs 0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>Rs 0</span>
                      </div> */}
                      <div className="flex justify-between text-base font-semibold text-slate-800 border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(billSale.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t bg-slate-50">
                <button
                  type="button"
                  onClick={closeBillPreview}
                  className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintBillOnly}
                  className="px-5 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-600"
                >
                  Print Bill
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBillOnly}
                  className="px-5 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  Download Bill
                </button>
                <button
                  type="button"
                  onClick={handlePrintGatePassOnly}
                  className="px-5 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                >
                  Print Gate Pass
                </button>
                <button
                  type="button"
                  onClick={handlePrintBoth}
                  className="px-5 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-600"
                >
                  Print Both
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden">
        {!sortedSales || sortedSales.length === 0 ? (
          <div className="p-10 text-center">
            <NoData
              title="No Sales Found"
              description="Try adjusting filters or add a new sale to get started."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">#</th>
                  <th className="px-5 py-4 font-medium">Invoice No</th>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Products</th>
                  <th className="px-5 py-4 font-medium">Carage</th>
                  <th className="px-5 py-4 font-medium">Total Amount</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <DateSortHeader
                    label="Date"
                    direction={saleDateSort}
                    onToggle={() =>
                      setSaleDateSort((prev) =>
                        prev === "asc" ? "desc" : "asc",
                      )
                    }
                  />
                  <th className="px-5 py-4 font-medium">Payment</th>
                  <th className="px-5 py-4 font-medium">Payment Status</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.map((sale, index) => (
                  <tr
                    key={getId(sale)}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {sale.invoiceNumber || "-"}
                    </td>
                    <td className="px-5 py-4">{sale.customerName}</td>
                    <td className="px-5 py-4">
                      {(sale.products || []).map((item) => (
                        <div
                          key={getId(item.productCode) || getId(item)}
                          className="flex items-center gap-2 px-3 py-2 mb-1 last:mb-0 rounded-md bg-slate-50 border border-slate-300"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                              {/* 🔹 Product Name */}
                              <span className="font-semibold truncate">
                                {item.product?.name || "N/A"}
                              </span>

                              {/* 🔹 Description (inline, subtle) */}
                              {item.product?.description && (
                                <span
                                  className="text-xs text-slate-500 truncate max-w-[200px]"
                                  title={item.product.description}
                                >
                                  — {item.product.description}
                                </span>
                              )}
                            </div>

                            {/* 🔹 Company / Brand */}
                            {(item.product?.company || item.product?.brand) && (
                              <div className="text-xs text-slate-400 truncate mt-0.5">
                                {item.product?.company || item.product?.brand}
                              </div>
                            )}
                          </div>

                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {item.productCode?.code || "-"}
                          </span>

                          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {formatCurrency(sale.carage || 0)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(sale.status)}`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <FormattedTime timestamp={sale.createdAt} />
                    </td>
                    <td className="px-5 py-4">{sale.paymentMethod}</td>
                    <td className="px-5 py-4">
                      {(() => {
                        const info = paymentInfoBySaleId.get(
                          String(getId(sale)),
                        );
                        const status =
                          info?.paymentStatus || sale.paymentStatus || "unpaid";
                        const remaining =
                          info?.remainingAmount ??
                          Math.max(Number(sale.totalAmount || 0), 0);

                        const statusClasses =
                          status === "paid"
                            ? "bg-green-100 text-green-700"
                            : status === "partial"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700";

                        return (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-3 py-1 text-xs rounded-full font-semibold capitalize ${statusClasses}`}
                            >
                              {status}
                            </span>
                            {status !== "paid" && (
                              <span className="text-xs text-slate-500">
                                Remaining: {formatCurrency(remaining)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>{" "}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(sale)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                          title="Edit sale"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openBillPreview(sale)}
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                          title="Generate / View Bill"
                        >
                          <PiInvoiceBold size={18} />
                        </button>
                        <Popconfirm
                          title="Delete sale?"
                          description="This will remove the sale, reverse its stock impact, and delete its linked payment records."
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => dispatch(DeleteSales(getId(sale)))}
                        >
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                            title="Delete sale"
                          >
                            <MdDelete size={18} />
                          </button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Salespage;
