import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
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

function App() {
  return (
    <Router>
      <div>
        <Toaster />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<ServicePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ========== MANAGER DASHBOARD ========== */}
          <Route
            path="/ManagerDashboard"
            element={
              <ProtectedRoute allowedRoles={["manager"]}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Manager */}
            <Route index element={<Dashboardpage />} />

            {/* Product - Manager (full access) */}
            <Route path="product" element={<Productpage />} />

            {/* Order - Manager */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales - Manager */}
            <Route path="sales" element={<Salespage />} />

            {/* Stock Transaction - Manager */}
            <Route path="stock-transaction" element={<StockTransaction />} />

            {/* Category - Manager */}
            <Route path="category" element={<Categorypage />} />

            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="createInvoice" element={<CreateInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="editInvoice/:id" element={<InvoiceEditPage />} />

            {/* Notifications (Read) - Manager */}
            <Route
              path="NotificationPageRead"
              element={<NotificationPageRead />}
            />

            {/* Profile - Manager */}
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Supplier - Manager */}
            <Route path="supplier" element={<Supplierpage />} />

            {/* User Status - Manager */}
            <Route path="Userstatus" element={<Userstatus />} />
          </Route>

          {/* ========== ADMIN DASHBOARD ========== */}
          <Route
            path="/AdminDashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Admin */}
            <Route index element={<Dashboardpage />} />

            {/* Product - Admin */}
            <Route path="product" element={<Productpage />} />

            {/* Order - Admin */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales - Admin */}
            <Route path="sales" element={<Salespage />} />

            {/* Stock Transaction - Admin */}
            <Route path="stock-transaction" element={<StockTransaction />} />

            {/* Category - Admin */}
            <Route path="category" element={<Categorypage />} />

            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="createInvoice" element={<CreateInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="editInvoice/:id" element={<InvoiceEditPage />} />

            {/* Notifications (Create) - Admin */}
            <Route path="notifications" element={<Notificationpage />} />

            {/* Profile - Admin */}
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Supplier - Admin */}
            <Route path="supplier" element={<Supplierpage />} />

            {/* Activity Log - Admin Only */}
            <Route path="activity-log" element={<Activitylogpage />} />

            {/* User Status - Admin */}
            <Route path="Userstatus" element={<Userstatus />} />
          </Route>

          {/* ========== STAFF DASHBOARD ========== */}
          <Route
            path="/StaffDashboard"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Staff */}
            <Route index element={<Dashboardpage />} />

            {/* Product - Staff (read-only) */}
            <Route path="product" element={<Productpage readOnly />} />

            {/* Order - Staff */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales - Staff */}
            <Route path="sales" element={<Salespage />} />

            {/* Notifications (Read) - Staff */}
            <Route
              path="NotificationPageRead"
              element={<NotificationPageRead />}
            />

            {/* Profile - Staff */}
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Supplier - Staff (read-only) */}
            <Route path="supplier" element={<Supplierpage readOnly />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
