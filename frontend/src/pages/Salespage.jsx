import { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime";

import {
  CreateSales,
  gettingallSales,
  EditSales,
  searchsalesdata,
} from "../features/salesSlice";
import SalesChart from "../lib/Salesgraph";
import toast from "react-hot-toast";
import { gettingallproducts } from "../features/productSlice";
import { PiInvoiceBold } from "react-icons/pi";
import NoData from "../Components/NoData";
import { createCustomer, getAllCustomers } from "../features/customerSlice";
import axiosInstance from "../lib/axios";

function Salespage() {
  const getId = (value) => value?.id ?? value?.id ?? value;
  const { getallsales, searchdata } = useSelector((state) => state.sales);

  const { getallproduct } = useSelector((state) => state.product);

  const dispatch = useDispatch();
  const [query, setquery] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    phone: "",
    address: "",
  });
  const [Payment, setPayment] = useState("");
  // const [paymentStatus, setpaymentStatus] = useState("");
  const [Status, setStatus] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [codeQuery, setCodeQuery] = useState("");
  const [debouncedCodeQuery, setDebouncedCodeQuery] = useState("");
  const [showCodeOptions, setShowCodeOptions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billSale, setBillSale] = useState(null);
  const [payments, setPayments] = useState([]);

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
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(searchsalesdata(query));
      }, 500);
      return () => clearTimeout(repeatTimeout);
    }
    dispatch(gettingallSales());
  }, [query, dispatch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCodeQuery(codeQuery.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [codeQuery]);

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
  console.log({ getallproduct });

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

  const cartSubTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [cartItems],
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

  const handlePrintBill = () => {
    if (!billSale) return;

    const items = Array.isArray(billSale.products) ? billSale.products : [];

    const rows = items
      .map((item, index) => {
        const name = item.product?.name || "Product";
        const description = item.product?.description || "";
        const company = item.product?.company || item.product?.brand || "";
        const code = item.productCode?.code || "-";

        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const total = qty * price;

        return `
        <tr>
          <td>${index + 1}</td>

          <td>
            <div class="product-name">${name}</div>
            ${
              description
                ? `<div class="product-desc">${description}</div>`
                : ""
            }
            ${company ? `<div class="product-company">${company}</div>` : ""}
          </td>

          <td><span class="badge">${code}</span></td>

          <td class="num">${qty}</td>
          <td class="num">Rs ${price.toLocaleString()}</td>
          <td class="num">Rs ${total.toLocaleString()}</td>
        </tr>
      `;
      })
      .join("");

    const customerPhone =
      billSale.customer?.contactInfo?.phone || billSale.customer?.phone || "-";

    const customerAddress =
      billSale.customer?.contactInfo?.address ||
      billSale.customer?.address ||
      "-";

    const createdAt = billSale.createdAt
      ? new Date(billSale.createdAt).toLocaleString()
      : new Date().toLocaleString();

    // ✅ PUT YOUR LOGO URL HERE
    const logoUrl = "https://via.placeholder.com/80x80?text=Logo";

    const printWindow = window.open("", "_blank", "width=900,height=650");

    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    printWindow.document.write(`
<html>
<head>
  <title>Invoice</title>

  <style>
    * { box-sizing: border-box; }

    @page {
      size: A5;
      margin: 0;
    }

    html, body {
      width: 148mm;
      height: 210mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
    }

    body {
      font-family: "Inter", sans-serif;
      margin: 0;
      color: #0f172a;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .sheet {
      width: 148mm;
      min-height: 210mm;
      padding: 10mm;
    }

    @media print {
      body {
        display: block;
        min-height: auto;
      }
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .left {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .logo {
      width: 45px;
      height: 45px;
      border-radius: 6px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
    }

    .company h1 {
      margin: 0;
      font-size: 16px;
      color: #0f766e;
    }

    .company p {
      margin: 0;
      font-size: 11px;
      color: #64748b;
    }

    .meta {
      font-size: 11px;
      text-align: right;
    }

    /* CARDS */
    .section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      background: #f8fafc;
      font-size: 11px;
    }

    .card h3 {
      margin: 0 0 4px;
      font-size: 10px;
      color: #0f766e;
    }

    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }

    thead {
      background: #0f766e;
      color: #fff;
    }

    th, td {
      padding: 6px;
    }

    td {
      border-bottom: 1px solid #e2e8f0;
    }

    .num {
      text-align: right;
    }

    /* PRODUCT */
    .product-name {
      font-weight: 600;
    }

    .product-desc {
      font-size: 9px;
      color: #64748b;
    }

    .product-company {
      font-size: 9px;
      color: #94a3b8;
    }

    .badge {
      background: #eef2ff;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 9px;
    }

    /* TOTAL */
    .totals {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }

    .totals table {
      width: 200px;
      font-size: 11px;
    }

    .totals td {
      padding: 3px 0;
    }

    .grand {
      font-weight: 700;
      border-top: 1px dashed #cbd5e1;
      padding-top: 5px;
    }

    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }

  </style>
</head>

<body>

<div class="sheet">

  <!-- HEADER -->
  <div class="header">
    <div class="left">
      <img src="${logoUrl}" class="logo"/>
      <div class="company">
        <h1>Imran Traders</h1>
        <p>Sales Invoice</p>
      </div>
    </div>

    <div class="meta">
      <div>Date: ${createdAt}</div>
      <div>Status: ${billSale.status}</div>
      <div>Payment: ${billSale.paymentStatus || "-"}</div>
    </div>
  </div>

  <!-- INFO -->
  <div class="section">
    <div class="card">
      <h3>Customer</h3>
      <div>${billSale.customerName || "Customer"}</div>
      <div>${customerPhone}</div>
      <div>${customerAddress}</div>
    </div>

    <div class="card">
      <h3>Order</h3>
      <div>Method: ${billSale.paymentMethod || "-"}</div>
      <div>Items: ${items.length}</div>
      <div>Qty: ${items.reduce((s, i) => s + Number(i.quantity || 0), 0)}</div>
    </div>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Code</th>
        <th class="num">Qty</th>
        <th class="num">Price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- TOTAL -->
  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td class="num">Rs ${Number(billSale.totalAmount || 0).toLocaleString()}</td>
      </tr>
      <tr>
        <td class="grand">Total</td>
        <td class="num grand">Rs ${Number(billSale.totalAmount || 0).toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    Thank you for your business
  </div>

</div>

<script>
  window.onload = () => {
    window.print();
    setTimeout(() => window.close(), 200);
  };
</script>

</body>
</html>
`);

    printWindow.document.close();
  };

  const buildCartItemsFromSale = (sale) => {
    const products = Array.isArray(sale?.products) ? sale.products : [];
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
        quantity: Number(item.quantity || 0),
        availableQty: Number(
          codeRecord?.quantity ?? availableQtyByCode.get(String(codeId)) ?? 0,
        ),
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
      // paymentStatus,
      status: Status,
    };

    dispatch(EditSales({ salesId: getId(selectedSales), updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Sale updated successfully");
        setIsFormVisible(false);
        setselectedSales(null);
        resetForm();
      })
      .catch((error) => {
        console.error("Error updating sale:", error);
        toast.error("Failed to update sale");
      });
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
    const customerName = customerSearch.trim();
    if (!resolvedCustomerId) {
      if (!customerName) {
        toast.error("Customer name is required");
        return;
      }
      if (!newCustomerData.phone.trim()) {
        toast.error("Customer phone is required");
        return;
      }
      if (!newCustomerData.address.trim()) {
        toast.error("Customer address is required");
        return;
      }
      setIsCreatingCustomer(true);
      try {
        const payload = {
          name: customerName,
          contactInfo: {
            phone: newCustomerData.phone.trim(),
            address: newCustomerData.address.trim(),
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
        const resolvedPrice = Number(item.unitPrice);
        return {
          product: item.productId,
          productCode: item.codeId,
          quantity: Number(item.quantity),
          ...(Number.isFinite(resolvedPrice) ? { price: resolvedPrice } : {}),
        };
      }),
      paymentMethod: Payment,
      // paymentStatus,
      status: Status,
    };

    try {
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
      }
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
    // setpaymentStatus("");
    setStatus("");
    setCartItems([]);
    setCodeQuery("");
    setShowCodeOptions(false);
  };
  const closeForm = () => {
    setIsFormVisible(false);
    setselectedSales(null);
    resetForm();
  };
  const handleEditClick = (sales) => {
    setselectedSales(sales);
    setCustomerId(getId(sales.customer) || sales.customer || "");
    setCustomerSearch(sales.customer?.name || sales.customerName || "");
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setCartItems(buildCartItemsFromSale(sales));
    setCodeQuery("");
    setShowCodeOptions(false);
    setPayment(sales.paymentMethod || "");
    // setpaymentStatus(sales.paymentStatus || "");
    setStatus(sales.status || "");
    setIsFormVisible(true);
  };

  const displaySales = query.trim() !== "" ? searchdata : getallsales;

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

  const handleSelectCustomer = (customer) => {
    setCustomerId(getId(customer));
    setCustomerSearch(customer.name);
    setNewCustomerData({
      phone: "",
      address: "",
    });
    setShowCustomerOptions(false);
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {/* <SalesChart /> */}

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          value={query}
          onChange={(e) => setquery(e.target.value)}
          type="text"
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Enter your product"
        />
        <button
          onClick={() => {
            setIsFormVisible(true);
            setselectedSales(null);
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Create Sales
        </button>
      </div>

      {/* OVERLAY */}
      {isFormVisible && (
        <div className="fixed inset-0 bg-black/40 z-[60]" onClick={closeForm} />
      )}

      {/* FORM SLIDE-IN */}
      {isFormVisible && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white border-l shadow-2xl z-[70] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold">
              {selectedSales ? "Edit Sale" : "Create Sale"}
            </h2>
            <MdKeyboardDoubleArrowLeft
              onClick={closeForm}
              className="cursor-pointer text-2xl text-gray-600 hover:text-gray-800 transition"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {/* Form */}
            <form
              onSubmit={selectedSales ? handleEditSubmit : submitsales}
              className="flex-1 flex flex-col gap-4 overflow-y-auto"
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
                  onFocus={() => setShowCustomerOptions(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!customerId && exactMatchCustomer) {
                        handleSelectCustomer(exactMatchCustomer);
                      } else {
                        setShowCustomerOptions(false);
                      }
                    }, 150);
                  }}
                  placeholder="Search or create customer (name or phone)"
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
                            className="w-full text-left px-3 py-2 hover:bg-slate-100"
                          >
                            <div className="text-sm font-medium text-slate-800">
                              {customer.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {customer.contactInfo?.phone ||
                                customer.phone ||
                                "-"}
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
                    <span>
                      Phone: {selectedCustomer.contactInfo?.phone || "-"}
                    </span>
                    <span>
                      Address: {selectedCustomer.contactInfo?.address || "-"}
                    </span>
                  </div>
                </div>
              )}
              {!customerId &&
                customerSearch.trim() !== "" &&
                !hasExactMatch && (
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
                    onFocus={() => setShowCodeOptions(true)}
                    className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                    placeholder="Type product code"
                  />
                  {showCodeOptions && codeOptions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-white shadow">
                      {codeOptions.map((option) => (
                        <button
                          key={`${option.codeId}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
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

                  const isExceeded =
                    Number(item.quantity || 0) > Number(available);

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
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-700 font-medium">
                  Payment Method
                </label>
                <select
                  value={Payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">Select Payment</option>
                  <option value="cash">Cash</option>
                  <option value="creditcard">Credit Card</option>
                  <option value="banktransfer">Bank Transfer</option>
                </select>
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

              <button
                disabled={hasStockIssue}
                className={`w-full py-3 rounded-xl ${
                  hasStockIssue
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-teal-700 hover:bg-teal-600 text-white"
                }`}
              >
                {selectedSales ? "Update Sale" : "Create Sale"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BILL PREVIEW MODAL */}
      {showBillModal && billSale && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={closeBillPreview}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border overflow-hidden">
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

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-teal-700">
                        Sales Invoice
                      </h2>
                      <p className="text-sm text-slate-500">
                        Imran Trader • Sales Department
                      </p>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold">Date:</span>{" "}
                        {billSale.createdAt
                          ? new Date(billSale.createdAt).toLocaleString()
                          : new Date().toLocaleString()}
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
                    <table className="w-full text-sm">
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
                        <span>Tax</span>
                        <span>Rs 0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>Rs 0</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold text-slate-800 border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(billSale.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-xs text-slate-500 text-center">
                    Thank you for your business. This invoice is system
                    generated.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t bg-slate-50">
                <button
                  onClick={closeBillPreview}
                  className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrintBill}
                  className="px-5 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-600"
                >
                  Print Bill
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden">
        {!displaySales || displaySales.length === 0 ? (
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
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Products</th>
                  <th className="px-5 py-4 font-medium">Total Amount</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Payment</th>
                  <th className="px-5 py-4 font-medium">Payment Status</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displaySales.map((sale, index) => (
                  <tr
                    key={getId(sale)}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>
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
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      Rs {sale.totalAmount || 0}
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
                          info?.paymentStatus ||
                          sale.paymentStatus ||
                          "unpaid";
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
                          onClick={() => handleEditClick(sale)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
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
