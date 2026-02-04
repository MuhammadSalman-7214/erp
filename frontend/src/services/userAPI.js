// services/userAPI.js - NEW FILE

import apiClient from "./api";

export const userAPI = {
  // Get users by role (legacy)
  getStaff: () => apiClient.get("/auth/staffuser"),
  getManagers: () => apiClient.get("/auth/manageruser"), // Branch admins
  getAdmins: () => apiClient.get("/auth/countryadmin"), // Country admins

  // Get users by role (new hierarchy)
  getBranchAdmins: () => apiClient.get("/auth/branchadminuser"),
  getCountryAdmins: () => apiClient.get("/auth/countryadminuser"),
  getSuperAdmins: () => apiClient.get("/auth/superadminuser"),
  getAgents: () => apiClient.get("/auth/agentuser"),

  // Advanced queries
  getAllUsers: (params) => apiClient.get("/auth/users", { params }),
  getUsersByBranch: (branchId) =>
    apiClient.get(`/auth/users/branch/${branchId}`),
  getUsersByCountry: (countryId) =>
    apiClient.get(`/auth/users/country/${countryId}`),
  getUserStats: () => apiClient.get("/auth/users/stats"),

  // User management
  deleteUser: (userId) => apiClient.delete(`/auth/removeuser/${userId}`),
  toggleUserStatus: (userId) =>
    apiClient.patch(`/auth/toggleUserStatus/${userId}`),
  updateStaffPermissions: (userId, staffCanEdit) =>
    apiClient.patch(`/auth/users/${userId}/permissions`, { staffCanEdit }),
};
