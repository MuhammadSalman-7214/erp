import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { ConfigProvider, theme } from "antd";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPages";
import ServicePage from "./pages/ServicePage";
import LoginPage from "./pages/LoginPage";
import Profilepage from "./pages/Profilepage";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Productpage from "./pages/Productpage";
import Orderpage from "./pages/Orderpage";
import Salespage from "./pages/Salespage";
import StockTransaction from "./pages/StockTransaction";
import Categorypage from "./pages/Categorypage";
import Notificationpage from "./pages/Notificationpage";
import Supplierpage from "./pages/Supplierpage";
import Activitylogpage from "./pages/Activitylogpage";
import Dashboardpage from "./pages/Dashboardpage";
import Userstatus from "./pages/Userstatus";
import NotificationPageRead from "./pages/Notificationpageread";
import ProtectedRoute from "./lib/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import InvoiceEditPage from "./pages/InvoiceEditPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import NotFoundPage from "./pages/NotFoundPage";
import PaymentsPage from "./pages/PaymentsPage";
import Customerpage from "./pages/Customerpage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import SupplierDetailPage from "./pages/SupplierDetailPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PriceListPage from "./pages/PriceListPage";
import { fetchCurrentUser } from "./features/authSlice";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

const RoleDashboardLayout = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "manager") return <ManagerDashboard />;
  if (user?.role === "staff") return <StaffDashboard />;

  return <Navigate to="/login" replace />;
};

const ProductByRole = () => {
  const { user } = useSelector((state) => state.auth);
  return user?.role === "staff" ? <Productpage readOnly /> : <Productpage />;
};

const SupplierByRole = () => {
  const { user } = useSelector((state) => state.auth);
  return user?.role === "staff" ? <Supplierpage readOnly /> : <Supplierpage />;
};

const CustomerByRole = () => {
  const { user } = useSelector((state) => state.auth);
  return user?.role === "staff" ? <Customerpage readOnly /> : <Customerpage />;
};

const NotificationsByRole = () => {
  const { user } = useSelector((state) => state.auth);
  return user?.role === "admin" ? <Notificationpage /> : <NotificationPageRead />;
};

const AuthBootstrapper = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return children;
};

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0f766e",
          colorInfo: "#0f766e",
          colorSuccess: "#059669",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          borderRadius: 12,
          fontSize: 14,
        },
        components: {
          Button: {
            controlHeight: 40,
            borderRadius: 12,
          },
          Input: {
            controlHeight: 40,
            borderRadius: 12,
          },
          Select: {
            controlHeight: 40,
            borderRadius: 12,
          },
          Table: {
            borderRadius: 16,
          },
          Drawer: {
            borderRadiusLG: 20,
          },
        },
      }}
    >
      <Router>
        <AuthBootstrapper>
          <div>
            <Toaster />
            <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/about" element={<ServicePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected App Routes (role-based) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboardpage />} />
            <Route path="product" element={<ProductByRole />} />
            <Route path="order" element={<Orderpage />} />
            <Route path="sales" element={<Salespage />} />
            <Route
              path="stock-transaction"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <StockTransaction />
                </ProtectedRoute>
              }
            />
            <Route
              path="category"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Categorypage />
                </ProtectedRoute>
              }
            />
            <Route
              path="price-list"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <PriceListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoices"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="createInvoice"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <CreateInvoicePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoice/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <InvoiceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="editInvoice/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <InvoiceEditPage />
                </ProtectedRoute>
              }
            />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="notifications" element={<NotificationsByRole />} />
            <Route path="Profilepage" element={<Profilepage />} />
            <Route path="supplier" element={<SupplierByRole />} />
            <Route path="supplier/:id" element={<SupplierDetailPage />} />
            <Route path="customer" element={<CustomerByRole />} />
            <Route path="customer/:id" element={<CustomerDetailPage />} />
            <Route
              path="Userstatus"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Userstatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="activity-log"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Activitylogpage />
                </ProtectedRoute>
              }
            />
          </Route>

            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </AuthBootstrapper>
      </Router>
    </ConfigProvider>
  );
}

export default App;
