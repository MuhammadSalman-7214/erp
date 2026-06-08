import { useEffect, useMemo, useState } from "react";
import { IoMdAdd, IoMdRefresh } from "react-icons/io";
import { MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import FormattedTime from "../lib/FormattedTime";
import { CgSoftwareDownload } from "react-icons/cg";
import { IoMdSearch } from "react-icons/io";

import {
  CreateSales,
  gettingallSales,
  EditSales,
} from "../features/salesSlice";
import toast from "react-hot-toast";
import { gettingallproducts } from "../features/productSlice";
import { PiInvoiceBold } from "react-icons/pi";
import NoData from "../Components/NoData";
import { createCustomer, getAllCustomers } from "../features/customerSlice";
import axiosInstance from "../lib/axios";
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
import {
  Button,
  ConfirmDialog,
  Inputfield,
  SelectDropdown,
  Tooltip,
} from "../UI";
import { AiOutlineDownload } from "react-icons/ai";

const sanitizeFileName = (value) =>
  String(value || "invoice")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "invoice";

const normalizePaymentMethod = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

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

    if (
      !normalizePaymentMethod(Payment) ||
      normalizePaymentMethod(Payment) === "credit"
    ) {
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
    const normalizedPayment = normalizePaymentMethod(Payment);
    if (parsedReceivedAmount <= 0) {
      setPayment("credit");
    } else if (!["cash", "banktransfer"].includes(normalizedPayment)) {
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
      paymentMethod: normalizedPayment,
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
      setPayment(normalizePaymentMethod(sale.paymentMethod));
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
      const paymentValue = normalizePaymentMethod(sale.paymentMethod);

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

  const buildBillPdfData = (sale = billSale) => {
    if (!sale) return null;

    const items = Array.isArray(sale.products) ? sale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(sale);

    return {
      invoiceNumber: sale.invoiceNumber || sale.id || "-",
      issueDate: sale.createdAt || new Date().toISOString(),
      customerName: sale.customerName || "Customer",
      customerPhone:
        sale.customer?.contactInfo?.phone || sale.customer?.phone || "-",
      customerAddress:
        sale.customer?.contactInfo?.address || sale.customer?.address || "-",
      paymentMethod: sale.paymentMethod || "-",
      status: sale.status || "-",
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
      notes: String(sale.notes || "").trim(),
    };
  };

  const downloadBillPdf = async (sale = billSale) => {
    const data = buildBillPdfData(sale);
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

  // const buildBillInvoiceHtml = () => {
  //   if (!billSale) return "";

  //   const items = Array.isArray(billSale.products) ? billSale.products : [];
  //   const {
  //     totalAmount,
  //     carageAmount,
  //     subTotal,
  //     receivedAmountValue,
  //     remainingAmountValue,
  //   } = getSaleTotals(billSale);

  //   return buildInvoicePrintHtml({
  //     documentTitle: "Sales Invoice",
  //     companyName: "Imran Traders",
  //     slogan: "",
  //     logoUrl: `${window.location.origin}/ITLOGO.svg`,
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
  // };

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

  // const handlePrintBillOnly = () => {
  //   const invoiceHtml = buildBillInvoiceHtml();
  //   if (!invoiceHtml) return;
  //   openPrintWindow(invoiceHtml);
  // };

  const handleDownloadBillOnly = async (sale) => {
    await downloadBillPdf(sale);
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
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      {/* <SalesChart /> */}

      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <IoMdSearch className="text-lg" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Sales Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search invoices, customers, and phone numbers, then narrow by
                  date.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {sortedSales.length} records shown
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Search</label>
            <Inputfield
              value={query}
              onChange={(e) => setquery(e.target.value)}
              type="text"
              maxLength={120}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 focus:outline-none"
              placeholder="Search invoice, customer, phone..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">From</label>
            <Inputfield
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 focus:outline-none"
              placeholder="Date from"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">To</label>
            <Inputfield
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 focus:outline-none"
              placeholder="Date to"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => {
                setquery("");
                setDateFrom("");
                setDateTo("");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
              variant="ghost"
            >
              <IoMdRefresh className="mr-2 text-lg" />
              Reset
            </Button>
          </div>

          <div className="flex items-end">
            <Button onClick={() => openForm()} className="" variant="primary">
              <IoMdAdd className="mr-2 text-xl" />
              Create Sales
            </Button>
          </div>
        </div>
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
            <Inputfield
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
                      <Button
                        key={getId(customer)}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCustomer(customer)}
                        variant="ghost"
                        className={`w-full !justify-start px-3 py-2 text-sm !text-black !border-0 !shadow-none !rounded-none !bg-white ${
                          customerActiveIndex ===
                          filteredCustomers.findIndex(
                            (item) => getId(item) === getId(customer),
                          )
                            ? "!bg-slate-100"
                            : ""
                        }`}
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {customer.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {customer.contactInfo?.phone || customer.phone || "-"}
                        </div>
                      </Button>
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
                <Inputfield
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
                <Inputfield
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
              <Inputfield
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
                    <Button
                      key={`${option.codeId}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      variant="ghost"
                      className={`w-full !justify-start !text-left px-3 py-2 text-sm !text-black !border-0 !shadow-none !rounded-none !bg-white ${
                        codeActiveIndex ===
                        codeOptions.findIndex(
                          (item) => item.codeId === option.codeId,
                        )
                          ? "!bg-slate-100"
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
                            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                              {" - "}
                              {formatCurrency(option.unitPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Button>
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
              <span className="w-6 text-right">x</span>
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

                  <Inputfield
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateCartQuantity(item.codeId, e.target.value)
                    }
                    className={`!max-w-[50px] !px-2 text-center ${
                      isExceeded ? "!border-red-500 !focus:ring-none" : ""
                    }`}
                  />

                  {/* PRICE */}
                  <Inputfield
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateCartPrice(item.codeId, e.target.value)
                    }
                    min="0"
                    step="0.01"
                    className="!max-w-[50px] !px-2 text-center"
                  />

                  {/* DELETE */}
                  <Button
                    type="button"
                    onClick={() => removeFromCart(item.codeId)}
                    variant="danger"
                  >
                    <MdDelete size={18} />
                  </Button>

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
              <Inputfield
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
            <Inputfield
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
            <SelectDropdown
              value={Payment}
              onChange={(value) =>
                setPayment(value?.target?.value ?? value ?? "")
              }
              placeholder="Select payment method"
              className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required={Number(receivedAmount || 0) > 0}
              disabled={Number(receivedAmount || 0) <= 0}
            >
              {Number(receivedAmount || 0) <= 0 ? (
                <option value="credit">Credit</option>
              ) : (
                <>
                  <option value="cash">Cash</option>
                  <option value="banktransfer">Bank Transfer</option>
                </>
              )}
            </SelectDropdown>
            <div className="text-xs text-slate-500">
              {Number(receivedAmount || 0) <= 0
                ? "No received amount means the sale will default to credit."
                : "Received amount entered: choose Cash or Bank Transfer."}
            </div>
          </div>

          {/* Payment Status intentionally disabled in sales flow */}

          <div className="flex flex-col gap-1">
            <label className="text-gray-700 font-medium">Sale Status</label>
            <SelectDropdown
              value={Status}
              onChange={(value) =>
                setStatus(value?.target?.value ?? value ?? "")
              }
              placeholder="Select status"
              className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </SelectDropdown>
          </div>

          <Button
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
            className="w-full"
            variant="primary"
          >
            {selectedSales ? "Update Sale" : "Create Sale"}
          </Button>
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
              <div className="flex items-center justify-between px-6 py-2 border-b bg-slate-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Sales Bill Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review the invoice before printing
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    className="bg-white border border-slate-300 shadow-sm"
                    onClick={closeBillPreview}
                  >
                    Close
                  </Button>
                </div>
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
                <Button
                  type="button"
                  onClick={handlePrintBoth}
                  className="px-5 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-600"
                >
                  Print Bill
                </Button>
                <Button
                  type="button"
                  onClick={handlePrintGatePassOnly}
                  className="px-5 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                >
                  Print Gate Pass
                </Button>
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
            <div className="max-w-[1230px] overflow-x-auto relative">
              <div className="flex gap-2 w-max">
                <table className="w-full text-sm border-collapse">
                  {/* HEADER */}
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-[.25] bg-slate-50 border-y border-slate-200">
                      <th className="px-4 py-4 font-semibold">#</th>
                      <th className="px-4 py-4 font-semibold">Invoice No</th>
                      <th className="px-4 py-4 font-semibold">Customer</th>
                      <th className="px-4 py-4 font-semibold">Products</th>
                      <th className="px-4 py-4 font-semibold">Carage</th>
                      <th className="px-4 py-4 font-semibold">Total Amount</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                      <th className="px-4 py-4 ">
                        <DateSortHeader
                          label="Date"
                          direction={saleDateSort}
                          onToggle={() =>
                            setSaleDateSort((prev) =>
                              prev === "asc" ? "desc" : "asc",
                            )
                          }
                        />
                      </th>
                      <th className="px-4 py-4 font-semibold">Payment</th>
                      <th className="px-4 py-4 font-semibold">
                        Payment Status
                      </th>
                      <th
                        className="px-4 py-4 font-semibold text-center sticky right-0 bg-slate-50 z-20"
                        style={{
                          boxShadow: "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* BODY */}
                  <tbody className="divide-y divide-slate-100">
                    {sortedSales.map((sale, index) => (
                      <tr
                        key={getId(sale)}
                        className="group bg-white hover:bg-blue-50/30 transition-colors duration-150"
                      >
                        {/* # */}
                        <td className="px-4 py-4 text-slate-400 text-xs font-medium">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        {/* INVOICE NO */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-[#baf4d73d] border border-[#6ee7b769] rounded-md text-teal-800 text-xs font-mono font-semibold tracking-wide">
                            {sale.invoiceNumber || "—"}
                          </span>
                        </td>

                        {/* CUSTOMER */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            {/* <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {(sale.customerName || "?")[0].toUpperCase()}
                            </div> */}
                            <span className="text-slate-700 font-medium whitespace-nowrap">
                              {sale.customerName || "—"}
                            </span>
                          </div>
                        </td>

                        {/* PRODUCTS */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1.5">
                            {(sale.products || []).map((item) => (
                              <div
                                key={getId(item.productCode) || getId(item)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100"
                                style={{
                                  boxShadow: `
    0 0 0 1px rgba(232, 229, 229, 0.9),
    0 0 10px rgba(15,23,42,0.06),
    0 0 20px rgba(15,23,42,0.08)
  `,
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-800 truncate">
                                      {item.product?.name || "N/A"}
                                    </span>
                                    {item.product?.description && (
                                      <span
                                        className="text-xs text-slate-500 truncate max-w-[180px]"
                                        title={item.product.description}
                                      >
                                        {item.product.description}
                                      </span>
                                    )}
                                  </div>
                                  {(item.product?.company ||
                                    item.product?.brand) && (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {item.product?.company ||
                                        item.product?.brand}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  {item.productCode?.code || "—"}
                                </span>
                                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  ×{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* CARAGE */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-slate-600 font-medium">
                            {formatCurrency(sale.carage || 0)}
                          </span>
                        </td>

                        {/* TOTAL AMOUNT */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-slate-900 font-bold text-[13px]">
                            {formatCurrency(sale.totalAmount)}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const map = {
                              pending:
                                "bg-amber-50 text-amber-700 border-amber-200",
                              completed:
                                "bg-blue-50 text-blue-700 border-blue-200",
                              cancelled:
                                "bg-rose-50 text-rose-600 border-rose-200",
                            };
                            const dot = {
                              pending: "bg-amber-400",
                              completed: "bg-blue-500",
                              cancelled: "bg-rose-400",
                            };
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${map[sale.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${dot[sale.status] || "bg-slate-400"}`}
                                />
                                {sale.status}
                              </span>
                            );
                          })()}
                        </td>

                        {/* DATE */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-slate-700 text-xs font-medium">
                              <FormattedTime timestamp={sale.createdAt} />
                            </span>
                          </div>
                        </td>

                        {/* PAYMENT METHOD */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const map = {
                              cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
                              banktransfer:
                                "bg-blue-50 text-blue-700 border-blue-200",
                              credit:
                                "bg-orange-50 text-orange-700 border-orange-200",
                            };
                            const method = normalizePaymentMethod(
                              sale.paymentMethod,
                            );
                            const label =
                              method === "banktransfer"
                                ? "Bank Transfer"
                                : method
                                  ? method.charAt(0).toUpperCase() +
                                    method.slice(1)
                                  : "—";
                            return (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${map[method] || "bg-slate-100 text-slate-500 border-slate-200"}`}
                              >
                                {label}
                              </span>
                            );
                          })()}
                        </td>

                        {/* PAYMENT STATUS */}
                        <td className="px-4 py-4 whitespace-nowrap">
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
                            const map = {
                              paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                              partial: "bg-sky-50 text-sky-700 border-sky-200",
                              unpaid:
                                "bg-rose-50 text-rose-600 border-rose-200",
                            };
                            const dot = {
                              paid: "bg-emerald-500",
                              partial: "bg-sky-500",
                              unpaid: "bg-rose-400",
                            };
                            return (
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 w-fit px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${map[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${dot[status] || "bg-slate-400"}`}
                                  />
                                  {status}
                                </span>
                                {/* {status !== "paid" && (
                                  <span className="text-xs text-slate-400 font-medium">
                                    Due: {formatCurrency(remaining)}
                                  </span>
                                )} */}
                              </div>
                            );
                          })()}
                        </td>

                        {/* STICKY ACTIONS */}
                        <td
                          className="px-4 py-4 sticky right-0 z-10 bg-gray-50/80 transition-colors duration-150"
                          style={{
                            boxShadow: "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                          }}
                        >
                          <div className="flex justify-end">
                            <div className="flex items-center gap-2  overflow-hidden">
                              <Tooltip content="Edit sale">
                                <Button
                                  type="button"
                                  onClick={() => handleEditClick(sale)}
                                  variant="info"
                                  aria-label="Edit sale"
                                  size="sm"
                                  className="metal-btn"
                                >
                                  <MdEdit size={16} />
                                </Button>
                              </Tooltip>
                              {/* <div className="w-px h-5 bg-slate-200" /> */}
                              <Tooltip content="Print Bill">
                                <Button
                                  type="button"
                                  onClick={() => openBillPreview(sale)}
                                  variant="orange"
                                  aria-label="Print Bill"
                                  size="sm"
                                  className="metal-btn"
                                >
                                  <PiInvoiceBold size={16} />
                                </Button>
                              </Tooltip>
                              {/* <div className="w-px h-5 bg-slate-200" /> */}
                              <Tooltip content="Download Bill">
                                <Button
                                  type="button"
                                  onClick={() => handleDownloadBillOnly(sale)}
                                  variant="violet"
                                  aria-label="Download Bill"
                                  size="sm"
                                  className="metal-btn"
                                >
                                  <CgSoftwareDownload size={18} />
                                </Button>
                              </Tooltip>
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
        )}
      </div>
    </div>
  );
}

export default Salespage;
