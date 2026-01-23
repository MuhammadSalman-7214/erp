import { AiOutlineProduct } from "react-icons/ai";
import { RiStockLine } from "react-icons/ri";
import { FiLogOut, FiShoppingCart } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { RiDashboard3Fill } from "react-icons/ri";
import { PiInvoiceBold } from "react-icons/pi";
import { MdPointOfSale, MdOutlineCategory } from "react-icons/md";
import { CiMenuFries } from "react-icons/ci";
import { TfiSupport } from "react-icons/tfi";
import { IoNotificationsOutline } from "react-icons/io5";
import { RxActivityLog } from "react-icons/rx";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/authSlice";
import toast from "react-hot-toast";
import { LuUsers } from "react-icons/lu";
const navItemClass = (isActive) =>
  `flex items-center space-x-3 cursor-pointer p-2 rounded-md transition
   ${
     isActive
       ? "bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
       : "text-gray-700 hover:text-teal-700 hover:bg-gray-100"
   }`;
const NavItem = ({ to, icon, label, sidebarOpen }) => {
  return (
    <NavLink to={to} className={({ isActive }) => navItemClass(isActive)}>
      <div className="relative">
        <span className="text-xl group">
          {icon}

          {/* Tooltip */}
          {!sidebarOpen && (
            <span
              className="absolute left-14 top-1/2 -translate-y-1/2
              bg-gray-900 text-white text-xs px-2 py-1 rounded
              opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none"
            >
              {label}
            </span>
          )}
        </span>
      </div>

      {sidebarOpen && <span>{label}</span>}
    </NavLink>
  );
};

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const dispatch = useDispatch();
  const navigator = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    dispatch(logout())
      .then(() => {
        toast.success("Logout successfully");
        navigator("/");
      })
      .catch((error) => {
        toast.error("Error in logout");
      });
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white border-r shadow-sm z-5
      transition-all duration-300
      ${sidebarOpen ? "w-64" : "w-14"}`}
    >
      <div className="border-b flex justify-between items-center px-2 py-4 h-[8vh]">
        {sidebarOpen && (
          <h1 className="text-xl font-bold text-teal-700">InventoryPro</h1>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <CiMenuFries className="text-xl" />
        </button>
      </div>

      <nav className="space-y-1 p-2">
        <NavItem
          to="/ManagerDashboard"
          icon={<RiDashboard3Fill />}
          label="Dashboard"
          sidebarOpen={sidebarOpen}
        />

        {user?.role === "manager" && (
          <>
            <NavItem
              to="/ManagerDashboard/product"
              icon={<AiOutlineProduct />}
              label="Product"
              sidebarOpen={sidebarOpen}
            />
            {/* 
            <NavItem
              to="/ManagerDashboard/activity-log"
              icon={<RxActivityLog />}
              label="Activity Log"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/ManagerDashboard/supplier"
              icon={<TfiSupport />}
              label="Supplier"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/sales"
              icon={<MdPointOfSale />}
              label="Sales"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/invoices"
              icon={<PiInvoiceBold />}
              label="Invoices"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/order"
              icon={<FiShoppingCart />}
              label="Order"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/stock-transaction"
              icon={<RiStockLine />}
              label="Stock Transaction"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/NotificationPageRead"
              icon={<IoNotificationsOutline />}
              label="Notifications"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/category"
              icon={<MdOutlineCategory />}
              label="Category"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/ManagerDashboard/Userstatus"
              icon={<LuUsers />}
              label="Users"
              sidebarOpen={sidebarOpen}
            />
          </>
        )}

        {user?.role === "admin" && (
          <>
            <NavItem
              to="/AdminDashboard/product"
              icon={<AiOutlineProduct />}
              label="Product"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/activity-log"
              icon={<RxActivityLog />}
              label="Activity Log"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/supplier"
              icon={<TfiSupport />}
              label="Supplier"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/sales"
              icon={<MdPointOfSale />}
              label="Sales"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/invoices"
              icon={<PiInvoiceBold />}
              label="Invoices"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/order"
              icon={<FiShoppingCart />}
              label="Order"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/stock-transaction"
              icon={<RiStockLine />}
              label="Stock Transaction"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/notifications"
              icon={<IoNotificationsOutline />}
              label="Create Notifications"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/AdminDashboard/category"
              icon={<MdOutlineCategory />}
              label="Category"
              sidebarOpen={sidebarOpen}
            />
          </>
        )}

        {user?.role === "staff" && (
          <ul className="space-y-2">
            <NavItem
              to="/StaffDashboard/product"
              icon={<AiOutlineProduct />}
              label="Product"
              sidebarOpen={sidebarOpen}
            />

            {/* <NavItem
              to="/StaffDashboard/activity-log"
              icon={<RxActivityLog />}
              label="Activity Log"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/StaffDashboard/supplier"
              icon={<TfiSupport />}
              label="Supplier"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/StaffDashboard/sales"
              icon={<MdPointOfSale />}
              label="Sales"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/StaffDashboard/order"
              icon={<FiShoppingCart />}
              label="Order"
              sidebarOpen={sidebarOpen}
            />

            {/* <NavItem
              to="/StaffDashboard/stock-transaction"
              icon={<RiStockLine />}
              label="Stock Transaction"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/StaffDashboard/NotificationPageRead"
              icon={<IoNotificationsOutline />}
              label="Notifications"
              sidebarOpen={sidebarOpen}
            />
          </ul>
        )}
      </nav>

      <div className="absolute bottom-0 w-full border-t p-2">
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 w-full p-2 rounded-md text-gray-700 hover:bg-red-50 hover:text-red-600"
        >
          <FiLogOut className="text-xl" />
          {sidebarOpen && <span>Logout</span>}

          {/* Tooltip */}
          {!sidebarOpen && (
            <span className="absolute left-20 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
