// services/api.js - COMPLETE & FIXED

import axios from "axios";
// process.env.REACT_APP_BACKEND_URL ||
const API_BASE_URL = "http://localhost:8009/api";

// Create axios instance with credentials
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ✅ FIXED: Response interceptor for better error handling
// In response interceptor, add:
apiClient.interceptors.response.use(
  (response) => {
    const requestUrl = response.config?.url || "";
    const isSignupRequest = requestUrl.includes("/auth/signup");

    // If response includes updated token, refresh it
    if (response.data?.token && !isSignupRequest) {
      localStorage.setItem("token", response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error.response?.data?.message || error.message);
  },
);

// ============== AUTH API ==============
export const authAPI = {
  signup: (data) => apiClient.post("/auth/signup", data),
  login: (data) => apiClient.post("/auth/login", data),
  logout: () => apiClient.post("/auth/logout"),
  updateProfile: (data) => apiClient.put("/auth/updateProfile", data),

  // Legacy role endpoints (for backward compatibility)
  getStaff: () => apiClient.get("/auth/staffuser"),
  getManagers: () => apiClient.get("/auth/manageruser"),
  getAdmins: () => apiClient.get("/auth/countryadmin"),

  // New hierarchy role endpoints
  getBranchAdmins: () => apiClient.get("/auth/branchadminuser"),
  getCountryAdmins: () => apiClient.get("/auth/countryadminuser"),
  getSuperAdmins: () => apiClient.get("/auth/superadminuser"),
  getAgents: () => apiClient.get("/auth/agentuser"),

  // Advanced user queries
  getAllUsers: (params) => apiClient.get("/auth/users", { params }),
  getUsersByBranch: (branchId) =>
    apiClient.get(`/auth/users/branch/${branchId}`),
  getUsersByCountry: (countryId) =>
    apiClient.get(`/auth/users/country/${countryId}`),
  getUserStats: () => apiClient.get("/auth/users/stats"),

  // User management
  removeUser: (userId) => apiClient.delete(`/auth/removeuser/${userId}`),
  toggleUserStatus: (userId) =>
    apiClient.patch(`/auth/toggleUserStatus/${userId}`),
};

// ============== COUNTRY API ==============
export const countryAPI = {
  getAll: () => apiClient.get("/country"),
  getById: (id) => apiClient.get(`/country/${id}`),
  create: (data) => apiClient.post("/country", data),
  update: (countryId, data) => apiClient.put(`/country/${countryId}`, data),
  delete: (countryId) => apiClient.delete(`/country/${countryId}`),
  updateExchangeRate: (countryId, rate) =>
    apiClient.put(`/country/${countryId}/exchange-rate`, {
      exchangeRate: rate,
    }),
  assignAdmin: (countryId, userId) =>
    apiClient.post("/country/assign-admin", { countryId, userId }),
};

// ============== BRANCH API ==============
export const branchAPI = {
  getAll: () => apiClient.get("/branch"),
  getById: (id) => apiClient.get(`/branch/${id}`),
  getByCountry: (countryId) => apiClient.get(`/branch/country/${countryId}`),
  create: (data) => apiClient.post("/branch", data),
  update: (branchId, data) => apiClient.put(`/branch/${branchId}`, data),
  delete: (branchId) => apiClient.delete(`/branch/${branchId}`),
  assignAdmin: (branchId, userId) =>
    apiClient.post("/branch/assign-admin", { branchId, userId }),
};

// ============== PRODUCT API ==============
export const productAPI = {
  getAll: (params) => apiClient.get("/product", { params }),
  getById: (id) => apiClient.get(`/product/${id}`),
  create: (data) => apiClient.post("/product", data),
  update: (id, data) => apiClient.put(`/product/${id}`, data),
  delete: (id) => apiClient.delete(`/product/${id}`),
  getByBranch: (branchId) => apiClient.get(`/product/branch/${branchId}`),
  getByCountry: (countryId) => apiClient.get(`/product/country/${countryId}`),
};

// ============== ORDER API ==============
export const orderAPI = {
  getAll: (params) => apiClient.get("/order", { params }),
  getById: (id) => apiClient.get(`/order/${id}`),
  create: (data) => apiClient.post("/order", data),
  update: (id, data) => apiClient.put(`/order/${id}`, data),
  delete: (id) => apiClient.delete(`/order/${id}`),
  updateStatus: (id, status) =>
    apiClient.patch(`/order/${id}/status`, { status }),
};

// ============== SALES API ==============
export const salesAPI = {
  getAll: (params) => apiClient.get("/sales", { params }),
  getById: (id) => apiClient.get(`/sales/${id}`),
  create: (data) => apiClient.post("/sales", data),
  update: (id, data) => apiClient.put(`/sales/${id}`, data),
  delete: (id) => apiClient.delete(`/sales/${id}`),
  getBranchReport: (branchId, params) =>
    apiClient.get(`/sales/report/branch/${branchId}`, { params }),
  getCountryReport: (countryId, params) =>
    apiClient.get(`/sales/report/country/${countryId}`, { params }),
  getGlobalReport: (params) =>
    apiClient.get("/sales/report/global", { params }),
};

// ============== SUPPLIER API ==============
export const supplierAPI = {
  getAll: (params) => apiClient.get("/supplier", { params }),
  getById: (id) => apiClient.get(`/supplier/${id}`),
  create: (data) => apiClient.post("/supplier", data),
  update: (id, data) => apiClient.put(`/supplier/${id}`, data),
  delete: (id) => apiClient.delete(`/supplier/${id}`),
};

// ============== SHIPMENT API ==============
export const shipmentAPI = {
  getAll: (params) => apiClient.get("/shipment", { params }),
  getById: (id) => apiClient.get(`/shipment/${id}`),
  create: (data) => apiClient.post("/shipment", data),
  update: (id, data) => apiClient.put(`/shipment/${id}`, data),
  delete: (id) => apiClient.delete(`/shipment/${id}`),
  updateStatus: (id, status, note) =>
    apiClient.patch(`/shipment/${id}/status`, { status, note }),
  addDocument: (id, document) =>
    apiClient.post(`/shipment/${id}/document`, document),
  calculateProfit: (id) => apiClient.get(`/shipment/${id}/profit`),
};

// ============== CLEARING JOB API ==============
export const clearingJobAPI = {
  getAll: (params) => apiClient.get("/clearing-job", { params }),
  getById: (id) => apiClient.get(`/clearing-job/${id}`),
  create: (data) => apiClient.post("/clearing-job", data),
  update: (id, data) => apiClient.put(`/clearing-job/${id}`, data),
  updateStatus: (id, status) =>
    apiClient.patch(`/clearing-job/${id}/status`, { status }),
  addNote: (id, note) =>
    apiClient.post(`/clearing-job/${id}/note`, { message: note }),
  getMyJobs: () => apiClient.get("/clearing-job/my-jobs"),
};

// ============== INVOICE API ==============
export const invoiceAPI = {
  getAll: (params) => apiClient.get("/invoice", { params }),
  getById: (id) => apiClient.get(`/invoice/${id}`),
  create: (data) => apiClient.post("/invoice", data),
  update: (id, data) => apiClient.put(`/invoice/${id}`, data),
  delete: (id) => apiClient.delete(`/invoice/${id}`),
};

// ============== STOCK TRANSACTION API ==============
export const stockTransactionAPI = {
  getAll: (params) => apiClient.get("/stocktransaction", { params }),
  create: (data) => apiClient.post("/stocktransaction", data),
  getByProduct: (productId) =>
    apiClient.get(`/stocktransaction/product/${productId}`),
};

// ============== CATEGORY API ==============
export const categoryAPI = {
  getAll: () => apiClient.get("/category"),
  create: (data) => apiClient.post("/category", data),
  update: (id, data) => apiClient.put(`/category/${id}`, data),
  delete: (id) => apiClient.delete(`/category/${id}`),
};

// ============== NOTIFICATION API ==============
export const notificationAPI = {
  getAll: () => apiClient.get("/notification"),
  create: (data) => apiClient.post("/notification", data),
  markAsRead: (id) => apiClient.patch(`/notification/${id}/read`),
  delete: (id) => apiClient.delete(`/notification/${id}`),
};

// ============== ACTIVITY LOG API ==============
export const activityLogAPI = {
  getAll: (params) => apiClient.get("/activitylogs", { params }),
  getByEntity: (entity, entityId) =>
    apiClient.get(`/activitylogs/entity/${entity}/${entityId}`),
};

export default apiClient;
