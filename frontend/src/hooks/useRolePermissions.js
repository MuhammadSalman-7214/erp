// hooks/useRolePermissions.js - COMPLETE VERSION
import { useSelector } from "react-redux";
import { useMemo } from "react";

const ROLE_PERMISSIONS = {
  superadmin: {
    // Core Operations
    product: { read: true, write: true, delete: true },
    order: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true },
    stockTransaction: { read: true, write: true, delete: true },
    category: { read: true, write: true, delete: true },
    supplier: { read: true, write: true, delete: true },
    invoice: { read: true, write: true, delete: true },

    // Hierarchy Management
    country: { read: true, write: true, delete: true },
    branch: { read: true, write: true, delete: true },
    exchangeRate: { read: true, write: true, delete: true },

    // Client-Specific
    shipment: { read: true, write: true, delete: true },
    clearingJob: { read: true, write: true, delete: true },

    // User Management
    user: { read: true, write: true, delete: true },

    // System
    notification: { read: true, write: true, delete: true },
    activityLog: { read: true, write: false, delete: false },

    // Reports
    reports: { read: true, write: false, delete: false },
  },

  countryadmin: {
    // Core Operations (Country Scope)
    product: { read: true, write: true, delete: true },
    order: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true },
    stockTransaction: { read: true, write: true, delete: true },
    category: { read: true, write: true, delete: true },
    supplier: { read: true, write: true, delete: true },
    invoice: { read: true, write: true, delete: true },

    // Hierarchy Management (Limited)
    country: { read: true, write: false, delete: false }, // Can only view their country
    branch: { read: true, write: true, delete: true }, // Can manage branches in their country
    exchangeRate: { read: true, write: false, delete: false },

    // Client-Specific
    shipment: { read: true, write: true, delete: true },
    clearingJob: { read: true, write: true, delete: true },

    // User Management (Country Scope)
    user: { read: true, write: true, delete: true }, // Can manage users in their country

    // System
    notification: { read: true, write: true, delete: false },
    activityLog: { read: true, write: false, delete: false },

    // Reports
    reports: { read: true, write: false, delete: false },
  },

  branchadmin: {
    // Core Operations (Branch Scope)
    product: { read: true, write: true, delete: true },
    order: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true },
    stockTransaction: { read: true, write: true, delete: true },
    category: { read: true, write: true, delete: false },
    supplier: { read: true, write: true, delete: true },
    invoice: { read: true, write: true, delete: true },

    // Hierarchy Management (Read Only)
    country: { read: true, write: false, delete: false },
    branch: { read: true, write: false, delete: false }, // Can only view their branch
    exchangeRate: { read: true, write: false, delete: false },

    // Client-Specific
    shipment: { read: true, write: true, delete: true },
    clearingJob: { read: true, write: true, delete: true },

    // User Management (Branch Scope - Staff & Agents only)
    user: { read: true, write: true, delete: true },

    // System
    notification: { read: true, write: false, delete: false },
    activityLog: { read: true, write: false, delete: false },

    // Reports
    reports: { read: true, write: false, delete: false },
  },

  staff: {
    // Core Operations (Limited)
    product: { read: true, write: true, delete: false },
    order: { read: true, write: true, delete: false },
    sales: { read: true, write: true, delete: false },
    stockTransaction: { read: true, write: false, delete: false },
    category: { read: true, write: false, delete: false },
    supplier: { read: true, write: false, delete: false },
    invoice: { read: true, write: false, delete: false },

    // Hierarchy Management (Read Only)
    country: { read: false, write: false, delete: false },
    branch: { read: false, write: false, delete: false },
    exchangeRate: { read: false, write: false, delete: false },

    // Client-Specific
    shipment: { read: true, write: true, delete: false },
    clearingJob: { read: true, write: false, delete: false },

    // User Management (None)
    user: { read: false, write: false, delete: false },

    // System
    notification: { read: true, write: false, delete: false },
    activityLog: { read: true, write: false, delete: false },

    // Reports
    reports: { read: false, write: false, delete: false },
  },

  agent: {
    // Core Operations (None - Agents only handle clearing)
    product: { read: false, write: false, delete: false },
    order: { read: false, write: false, delete: false },
    sales: { read: false, write: false, delete: false },
    stockTransaction: { read: false, write: false, delete: false },
    category: { read: false, write: false, delete: false },
    supplier: { read: false, write: false, delete: false },
    invoice: { read: false, write: false, delete: false },

    // Hierarchy Management (None)
    country: { read: false, write: false, delete: false },
    branch: { read: false, write: false, delete: false },
    exchangeRate: { read: false, write: false, delete: false },

    // Client-Specific (ONLY Clearing Jobs)
    shipment: { read: false, write: false, delete: false },
    clearingJob: { read: true, write: true, delete: false }, // Can only update assigned jobs

    // User Management (None)
    user: { read: false, write: false, delete: false },

    // System
    notification: { read: true, write: false, delete: false },
    activityLog: { read: false, write: false, delete: false },

    // Reports
    reports: { read: false, write: false, delete: false },
  },
};

export const useRolePermissions = () => {
  const { user } = useSelector((state) => state.auth);

  const userRole = useMemo(() => {
    return user?.role || null;
  }, [user]);

  const hasPermission = (resource, action) => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return false;
    }

    const permissions = ROLE_PERMISSIONS[userRole][resource];
    return permissions ? permissions[action] === true : false;
  };

  const isReadOnly = (resource) => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return true;
    }

    const permissions = ROLE_PERMISSIONS[userRole][resource];
    return permissions ? permissions.read && !permissions.write : true;
  };

  const canAccess = (resource) => {
    return hasPermission(resource, "read");
  };

  const getAllPermissions = () => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return {};
    }
    return ROLE_PERMISSIONS[userRole];
  };

  return {
    userRole,
    hasPermission,
    isReadOnly,
    canAccess,
    getAllPermissions,
  };
};
