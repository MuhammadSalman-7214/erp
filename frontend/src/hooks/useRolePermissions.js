// hooks/useRolePermissions.js
import { useSelector } from "react-redux";
import { useMemo } from "react";

/**
 * Role-based permissions configuration
 * Define what each role can do for each resource
 */
const ROLE_PERMISSIONS = {
  admin: {
    product: { read: true, write: true, delete: true },
    order: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true },
    stock: { read: true, write: true, delete: true },
    category: { read: true, write: true, delete: true },
    supplier: { read: true, write: true, delete: true },
    notification: { read: true, write: true, delete: true },
    user: { read: true, write: true, delete: true },
    activityLog: { read: true, write: false, delete: false },
  },
  manager: {
    product: { read: true, write: true, delete: true },
    order: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true },
    stock: { read: true, write: true, delete: true },
    category: { read: true, write: true, delete: true },
    supplier: { read: true, write: true, delete: true },
    notification: { read: true, write: false, delete: false },
    user: { read: true, write: false, delete: false },
    activityLog: { read: true, write: false, delete: false },
  },
  staff: {
    product: { read: true, write: false, delete: false },
    order: { read: true, write: true, delete: false },
    sales: { read: true, write: true, delete: false },
    stock: { read: true, write: false, delete: false },
    category: { read: true, write: false, delete: false },
    supplier: { read: true, write: false, delete: false },
    notification: { read: true, write: false, delete: false },
    user: { read: false, write: false, delete: false },
    activityLog: { read: true, write: false, delete: false },
  },
};

export const useRolePermissions = () => {
  const { user } = useSelector((state) => state.auth);

  const userRole = useMemo(() => {
    return user?.role || null;
  }, [user]);

  /**
   * Check if user has specific permission for a resource
   * @param {string} resource - The resource name (e.g., 'product', 'order')
   * @param {string} action - The action type ('read', 'write', 'delete')
   * @returns {boolean}
   */
  const hasPermission = (resource, action) => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return false;
    }

    const permissions = ROLE_PERMISSIONS[userRole][resource];
    return permissions ? permissions[action] === true : false;
  };

  /**
   * Check if a resource is read-only for the current user
   * @param {string} resource - The resource name
   * @returns {boolean}
   */
  const isReadOnly = (resource) => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return true;
    }

    const permissions = ROLE_PERMISSIONS[userRole][resource];
    return permissions ? permissions.read && !permissions.write : true;
  };

  /**
   * Check if user can access a resource at all
   * @param {string} resource - The resource name
   * @returns {boolean}
   */
  const canAccess = (resource) => {
    return hasPermission(resource, "read");
  };

  /**
   * Get all permissions for current user role
   * @returns {object}
   */
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
