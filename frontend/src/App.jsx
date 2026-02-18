// App.jsx - COMPLETE WITH ALL ROLES

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPages";
import ServicePage from "./pages/ServicePage";
import LoginPage from "./pages/LoginPage";
import Profilepage from "./pages/Profilepage";

// Dashboard Layouts
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CountryAdminDashboard from "./pages/CountryAdminDashboard";
import BranchAdminDashboard from "./pages/BranchAdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AgentDashboard from "./pages/AgentDashboard";

// Shared Pages
import Productpage from "./pages/Productpage";
import Orderpage from "./pages/Orderpage";
import Salespage from "./pages/Salespage";
import StockTransaction from "./pages/StockTransaction";
import Categorypage from "./pages/Categorypage";
import Notificationpage from "./pages/Notificationpage";
import Supplierpage from "./pages/Supplierpage";
import Activitylogpage from "./pages/Activitylogpage";
import Dashboardpage from "./pages/Dashboardpage";
// import Userstatus from "./pages/Userstatus";
import NotificationPageRead from "./pages/Notificationpageread";

// Invoice Pages
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import InvoiceEditPage from "./pages/InvoiceEditPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import CustomersPage from "./pages/CustomersPage";
import PurchaseBillsPage from "./pages/PurchaseBillsPage";
import LedgerPage from "./pages/LedgerPage";

// NEW PAGES - Hierarchy Management
import CountriesPage from "./pages/CountriesPage";
import BranchesPage from "./pages/BranchesPage";
import ExchangeRatesPage from "./pages/ExchangeRatesPage";

// NEW PAGES - Client Requirements
import ShipmentsPage from "./pages/ShipmentsPage";
import ShipmentDetailPage from "./pages/ShipmentDetailPage";
import CreateShipmentPage from "./pages/CreateShipmentPage";
import ClearingJobsPage from "./pages/ClearingJobsPage";
import ClearingJobDetailPage from "./pages/ClearingJobDetailPage";

// NEW PAGES - Reports
import GlobalReportsPage from "./pages/GlobalReportsPage";
import CountryReportsPage from "./pages/CountryReportsPage";
import BranchReportsPage from "./pages/BranchReportsPage";

import ProtectedRoute from "./lib/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import NotFoundPage from "./pages/NotFoundPage";
import SetupPage from "./pages/SetupPage";
import UserManagement from "./pages/UserManagement";

function App() {
  //   borderLeft: "6px solid #dc2626",

  return (
    <Router>
      <div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: "220px",
              maxWidth: "420px",
              padding: "14px 18px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
              lineHeight: "1.4",
              background: "#f8fbff",
              color: "#0f172a",
              border: "1px solid #cbdff5",
              borderLeft: "6px solid #4d0000",
              boxShadow: "0 10px 28px rgba(15,23,42,0.14)",
              margin: "0",
            },

            success: {
              style: {
                background: "#e8faf5",
                color: "#134e4a",
                borderLeft: "6px solid rgb(3, 58, 52)",
                boxShadow: "0 10px 25px rgba(3, 58, 52,0.15)",
              },
              iconTheme: {
                primary: "#14b8a6",
                secondary: "#e8faf5",
              },
            },
            error: {
              style: {
                background: "#fff1f1",
                color: "#7f1d1d",
                borderLeft: "6px solid #240202",
                borderColor: "#dc2626",
                boxShadow: "0 10px 25px rgba(220,38,38,0.15)",
              },
              iconTheme: {
                primary: "#dc2626",
                secondary: "#fff1f1",
              },
            },
          }}
        />
        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<ServicePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/login" element={<LoginPage />} />

          {/* ==================== SUPER ADMIN DASHBOARD ==================== */}
          <Route
            path="/SuperAdminDashboard"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboardpage role="superadmin" />} />

            {/* Hierarchy Management */}
            <Route path="countries" element={<CountriesPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="exchange-rates" element={<ExchangeRatesPage />} />

            {/* User Management */}
            {/* <Route path="users" element={<Userstatus />} /> */}
            <Route path="user-management" element={<UserManagement />} />

            <Route path="Profilepage" element={<Profilepage />} />

            {/* Global Reports (USD) */}
            <Route path="reports/global" element={<GlobalReportsPage />} />
            <Route path="reports/country" element={<CountryReportsPage />} />
            <Route path="reports/branch" element={<BranchReportsPage />} />

            {/* Products (Global View) */}
            <Route path="product" element={<Productpage />} />

            {/* Orders (Global View) */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales (Global View) */}
            <Route path="sales" element={<Salespage />} />

            {/* Stock Transaction (Global View) */}
            <Route path="stock-transaction" element={<StockTransaction />} />

            {/* Category (Global) */}
            <Route path="category" element={<Categorypage />} />

            {/* Supplier (Global View) */}
            <Route path="supplier" element={<Supplierpage />} />

            {/* Invoices (Global View) */}
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="createInvoice" element={<CreateInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="editInvoice/:id" element={<InvoiceEditPage />} />

            {/* Customers / Purchase / Ledger */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="purchase-bills" element={<PurchaseBillsPage />} />
            <Route path="ledger" element={<LedgerPage />} />

            {/* Shipments (Global View) */}
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipment/:id" element={<ShipmentDetailPage />} />
            <Route path="createShipment" element={<CreateShipmentPage />} />

            {/* Clearing Jobs (Global View) */}
            <Route path="clearing-jobs" element={<ClearingJobsPage />} />
            <Route
              path="clearing-job/:id"
              element={<ClearingJobDetailPage />}
            />

            {/* Notifications */}
            <Route path="notifications" element={<Notificationpage />} />

            {/* Activity Log */}
            <Route path="activity-log" element={<Activitylogpage />} />
          </Route>

          {/* ==================== COUNTRY ADMIN DASHBOARD ==================== */}
          <Route
            path="/CountryAdminDashboard"
            element={
              <ProtectedRoute allowedRoles={["countryadmin"]}>
                <CountryAdminDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboardpage role="countryadmin" />} />

            {/* Branch Management (for their country) */}
            <Route path="branches" element={<BranchesPage />} />

            {/* User Management (country scope) */}
            <Route path="user-management" element={<UserManagement />} />
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Country Reports (Local Currency) */}
            <Route path="reports/country" element={<CountryReportsPage />} />
            <Route path="reports/branch" element={<BranchReportsPage />} />

            {/* Products (Country Scope) */}
            <Route path="product" element={<Productpage />} />

            {/* Orders (Country Scope) */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales (Country Scope) */}
            <Route path="sales" element={<Salespage />} />

            {/* Stock Transaction (Country Scope) */}
            <Route path="stock-transaction" element={<StockTransaction />} />

            {/* Category */}
            <Route path="category" element={<Categorypage />} />

            {/* Supplier (Country Scope) */}
            <Route path="supplier" element={<Supplierpage />} />

            {/* Invoices (Country Scope) */}
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="createInvoice" element={<CreateInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="editInvoice/:id" element={<InvoiceEditPage />} />

            {/* Customers / Purchase / Ledger */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="purchase-bills" element={<PurchaseBillsPage />} />
            <Route path="ledger" element={<LedgerPage />} />

            {/* Shipments (Country Scope) */}
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipment/:id" element={<ShipmentDetailPage />} />
            <Route path="createShipment" element={<CreateShipmentPage />} />

            {/* Clearing Jobs (Country Scope) */}
            <Route path="clearing-jobs" element={<ClearingJobsPage />} />
            <Route
              path="clearing-job/:id"
              element={<ClearingJobDetailPage />}
            />

            {/* Notifications */}
            <Route path="notifications" element={<Notificationpage />} />
            <Route
              path="NotificationPageRead"
              element={<NotificationPageRead />}
            />

            {/* Activity Log */}
            <Route path="activity-log" element={<Activitylogpage />} />
          </Route>

          {/* ==================== BRANCH ADMIN DASHBOARD ==================== */}
          <Route
            path="/BranchAdminDashboard"
            element={
              <ProtectedRoute allowedRoles={["branchadmin"]}>
                <BranchAdminDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboardpage role="branchadmin" />} />

            {/* User Management (branch scope) */}
            <Route path="user-management" element={<UserManagement />} />
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Branch Reports */}
            <Route path="reports" element={<BranchReportsPage />} />

            {/* Products (Branch Scope - Full Access) */}
            <Route path="product" element={<Productpage />} />

            {/* Orders (Branch Scope) */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales (Branch Scope) */}
            <Route path="sales" element={<Salespage />} />

            {/* Stock Transaction (Branch Scope) */}
            <Route path="stock-transaction" element={<StockTransaction />} />

            {/* Category */}
            <Route path="category" element={<Categorypage />} />

            {/* Supplier (Branch Scope) */}
            <Route path="supplier" element={<Supplierpage />} />

            {/* Invoices (Branch Scope) */}
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="createInvoice" element={<CreateInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="editInvoice/:id" element={<InvoiceEditPage />} />

            {/* Customers / Purchase / Ledger */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="purchase-bills" element={<PurchaseBillsPage />} />
            <Route path="ledger" element={<LedgerPage />} />

            {/* Shipments (Branch Scope) */}
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipment/:id" element={<ShipmentDetailPage />} />
            <Route path="createShipment" element={<CreateShipmentPage />} />

            {/* Clearing Jobs (Branch Scope) */}
            <Route path="clearing-jobs" element={<ClearingJobsPage />} />
            <Route
              path="clearing-job/:id"
              element={<ClearingJobDetailPage />}
            />

            {/* Notifications */}
            <Route
              path="NotificationPageRead"
              element={<NotificationPageRead />}
            />

            {/* Activity Log */}
            <Route path="activity-log" element={<Activitylogpage />} />
          </Route>

          {/* ==================== STAFF DASHBOARD ==================== */}
          <Route
            path="/StaffDashboard"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboardpage role="staff" />} />

            {/* Profile */}
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Products (Read + Write) */}
            <Route path="product" element={<Productpage />} />

            {/* Orders (Create & Edit) */}
            <Route path="order" element={<Orderpage />} />

            {/* Sales (Create & Edit) */}
            <Route path="sales" element={<Salespage />} />

            {/* Customers / Purchase / Ledger */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="purchase-bills" element={<PurchaseBillsPage />} />
            <Route path="ledger" element={<LedgerPage />} />

            {/* Supplier (Read Only) */}
            <Route path="supplier" element={<Supplierpage readOnly />} />

            {/* Invoices */}
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="createInvoice" element={<CreateInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="editInvoice/:id" element={<InvoiceEditPage />} />

            {/* Customers / Purchase / Ledger */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="purchase-bills" element={<PurchaseBillsPage />} />
            <Route path="ledger" element={<LedgerPage />} />

            {/* Shipments (Create & Edit) */}
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipment/:id" element={<ShipmentDetailPage />} />
            <Route path="createShipment" element={<CreateShipmentPage />} />

            {/* Notifications (Read Only) */}
            <Route
              path="NotificationPageRead"
              element={<NotificationPageRead />}
            />

            {/* Activity Log (Read Only) */}
            <Route path="activity-log" element={<Activitylogpage />} />
          </Route>

          {/* ==================== AGENT DASHBOARD (Clearing Agent) ==================== */}
          <Route
            path="/AgentDashboard"
            element={
              <ProtectedRoute allowedRoles={["agent"]}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboardpage role="agent" />} />

            {/* Profile */}
            <Route path="Profilepage" element={<Profilepage />} />

            {/* Clearing Jobs (Assigned to Agent - Update Only) */}
            <Route
              path="clearing-jobs"
              element={<ClearingJobsPage agentView />}
            />
            <Route
              path="clearing-job/:id"
              element={<ClearingJobDetailPage />}
            />

            {/* Notifications */}
            <Route
              path="NotificationPageRead"
              element={<NotificationPageRead />}
            />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
